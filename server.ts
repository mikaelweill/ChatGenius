import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { prisma } from './lib/prisma'
import { getChatCompletion, getUserSpecificCompletion } from './lib/openai'
import { parseAICommand } from './lib/commandParser'
import { generateSpeech } from './lib/tts'
import { createAIAudioMessage } from './lib/aiAudioMessage'
import { vectorizeMessage, deleteChannelVectors, vectorizePDF } from './lib/vectorize'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const userChannels = new Map<string, string>() // socketId -> channelId
const activeUsers = new Set<string>() // Set of online userIds
const userStatuses = new Map<string, { status: string, updatedAt: Date, socketId: string }>();

const debugLog = (message: string, data: any) => {
  console.log(`🔍 [DEBUG] ${message}:`, JSON.stringify(data, null, 2))
}

const isUserOnline = (userId: string) => {
  return activeUsers.has(userId)
}

prisma.user.findFirst().then(user => {
  // Removed console log
}).catch(err => {
  console.error('Prisma connection error:', err);
});

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Handle static files
      const parsedUrl = parse(req.url!, true)
      const { pathname } = parsedUrl

      // Handle Next.js static files and assets
      if (
        pathname?.startsWith('/_next/') || 
        pathname?.startsWith('/static/') ||
        pathname?.includes('.') // Handle files with extensions
      ) {
        await handle(req, res, parsedUrl)
        return
      }

      // Handle all other routes
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling request:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_APP_URL 
        : '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  io.use(async (socket, next) => {
    const userId = socket.handshake.auth.userId;
    debugLog('Socket auth attempt', {
      socketId: socket.id,
      userId,
      existingSocketsForUser: Array.from(userStatuses.entries())
        .filter(([id]) => id === userId)
        .map(([_, data]) => data.socketId),
      timestamp: new Date().toISOString()
    })

    if (!userId) {
      return next(new Error('Authentication error'));
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true }
      });

      if (!user) {
        return next(new Error('Authentication error'));
      }

      socket.data.userId = userId;
      next();
    } catch (error) {
      console.error('Database error:', error);
      next(new Error('Authentication error'));
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.data.userId

    debugLog('New socket connection', {
      socketId: socket.id,
      userId,
      activeUsers: Array.from(activeUsers),
      timestamp: new Date().toISOString()
    })

    // Mark user as online
    activeUsers.add(userId)
    userStatuses.set(userId, {
      status: 'online',
      updatedAt: new Date(),
      socketId: socket.id
    })

    debugLog('Updated user status', {
      userId,
      socketId: socket.id,
      allUserStatuses: Array.from(userStatuses.entries()),
      timestamp: new Date().toISOString()
    })

    // Send current statuses to the new connection
    const currentStatuses = Array.from(userStatuses.entries()).map(([userId, data]) => ({
      userId,
      status: data.status,
      updatedAt: data.updatedAt
    }))
    socket.emit('initial_statuses', currentStatuses)

    // Broadcast new user's status to all clients
    io.emit('status_update', {
      userId,
      status: 'online',
      updatedAt: new Date()
    })

    socket.on('status', async (data: { userId: string, status: string, updatedAt: Date }) => {
      // Verify the user can only update their own status
      if (data.userId !== userId) {
        console.warn('User tried to update someone else\'s status:', { 
          requestedUserId: data.userId, 
          actualUserId: userId 
        })
        return
      }

      userStatuses.set(userId, {
        status: data.status,
        updatedAt: data.updatedAt,
        socketId: socket.id
      })

      // Broadcast to all clients including sender
      io.emit('status_update', {
        userId,
        status: data.status,
        updatedAt: data.updatedAt
      })
    })

    socket.on('request_statuses', () => {
      // Send current statuses to the requesting client
      const currentStatuses = Array.from(userStatuses.entries()).map(([userId, data]) => ({
        userId,
        status: data.status,
        updatedAt: data.updatedAt
      }))
      socket.emit('initial_statuses', currentStatuses)
    })

    socket.on('disconnect', () => {
      debugLog('Socket disconnecting', {
        socketId: socket.id,
        userId: socket.data.userId,
        currentUserStatuses: Array.from(userStatuses.entries()),
        currentActiveUsers: Array.from(activeUsers),
        timestamp: new Date().toISOString()
      })

      // Mark user as offline
      activeUsers.delete(userId)
      userStatuses.set(userId, {
        status: 'offline',
        updatedAt: new Date(),
        socketId: socket.id
      })

      debugLog('Updated user status after disconnect', {
        userId,
        socketId: socket.id,
        allUserStatuses: Array.from(userStatuses.entries()),
        timestamp: new Date().toISOString()
      })

      // Broadcast offline status
      io.emit('status_update', {
        userId,
        status: 'offline',
        updatedAt: new Date()
      })

      userChannels.delete(socket.id)
    })

    // Debug ALL incoming events
    // socket.onAny((eventName, ...args) => {
    //   console.log('=== Socket Event Debug ===', {
    //     event: eventName,
    //     args: args,
    //     socketId: socket.id,
    //     userId: socket.data?.userId
    //   })
    // })

    socket.on('join_channel', (channelId) => {
      const previousChannel = userChannels.get(socket.id)
      if (previousChannel) {
        socket.leave(previousChannel)
        userChannels.delete(socket.id)
      }
      
      socket.join(channelId)
      userChannels.set(socket.id, channelId)
    })

    socket.on('new_message', async (data) => {
      try {
        // Only log message creation attempts with minimal info
        debugLog('Message creation attempt', {
          authorId: socket.data.userId,
          isDM: data.isDM,
          hasAttachment: !!data.attachment,
          isReply: !!data.parentId,
          timestamp: new Date().toISOString()
        })

        const messageData: {
          content: string;
          authorId: string;
          directChatId?: string;
          channelId?: string;
          parentId?: string;
          attachments?: {
            create: {
              url: string;
              type: string;
              name: string;
            }
          }
        } = {
          content: data.content,
          authorId: socket.data.userId,
        }

        if (data.isDM) {
          messageData.directChatId = data.channelId
        } else {
          messageData.channelId = data.channelId
        }

        if (data.parentId) {
          messageData.parentId = data.parentId
        }

        if (data.attachment) {
          messageData.attachments = {
            create: {
              url: data.attachment.url,
              type: data.attachment.type,
              name: data.attachment.name
            }
          }
        }

        const savedMessage = await prisma.message.create({
          data: messageData,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                status: true
              },
            },
            attachments: true,
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    status: true
                  }
                },
                reactions: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            }
          },
        })

        socket.join(data.channelId)

        // First emit the user's message
        if (!data.parentId) {
          io.to(data.channelId).emit('message_received', savedMessage)
        }

        // Then handle AI command if present
        if (data.isAICommand) {
          try {
            let aiContent;
            let aiUserId;

            if (data.targetUser) {
              // User-specific AI response
              const parsedCommand = parseAICommand(data.content);
              console.log('AI User Command:', {
                targetUser: data.targetUser,
                prompt: parsedCommand.prompt,
                command: parsedCommand.command
              });

              // Find the original user
              const originalUser = await prisma.user.findFirst({
                where: {
                  name: {
                    equals: data.targetUser,
                    mode: 'insensitive'
                  }
                },
                select: { id: true }
              });

              if (!originalUser) {
                console.error('Original user not found:', data.targetUser);
                return;
              }

              // Just construct the AI ID directly
              aiUserId = `ai_${originalUser.id}`;
              aiContent = await getUserSpecificCompletion(
                parsedCommand.prompt,
                data.targetUser,
                data.isDM
              );
              console.log(12345,data.targetUser.toLowerCase(),23114)
              // Handle weillmikael's audio responses
              if (data.targetUser.toLowerCase() === 'weillmikael') {
                console.log('🎯 Server: Attempting audio response for weillmikael');
                try {
                  const audioMessage = await createAIAudioMessage({
                    content: aiContent,
                    aiUserId,
                    channelId: data.channelId,
                    isDM: data.isDM
                  });

                  // Emit the audio message
                  if (data.isDM) {
                    io.to(data.channelId).emit('dm_message_received', audioMessage);
                  } else {
                    io.to(data.channelId).emit('message_received', audioMessage);
                  }
                  return; // Exit after sending audio message
                } catch (error) {
                  console.error('Failed to create audio message, falling back to text:', error);
                  // Continue to regular message creation below
                }
              }
            } else {
              // Regular AI response
              aiContent = await getChatCompletion(data.content.slice(4), data.isDM);
              aiUserId = 'AI_SYSTEM';
            }

            // Regular message creation for non-weillmikael or fallback
            const aiMessage = await prisma.message.create({
              data: {
                content: aiContent,
                authorId: aiUserId,
                ...(data.isDM ? { directChatId: data.channelId } : { channelId: data.channelId })
              },
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    status: true
                  }
                }
              }
            });

            if (data.isDM) {
              io.to(data.channelId).emit('dm_message_received', aiMessage);
            } else {
              io.to(data.channelId).emit('message_received', aiMessage);
            }

            // Add vectorization
            await vectorizeMessage(aiMessage.id).catch(error => {
              console.error('Failed to vectorize AI message:', error);
            });

          } catch (error) {
            console.error('Error processing AI command:', error);
          }
        }

        if (data.parentId) {
          const updatedParentMessage = await prisma.message.findUnique({
            where: { id: data.parentId },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  status: true
                }
              },
              reactions: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              },
              replies: {
                orderBy: {
                  createdAt: 'asc'
                },
                include: {
                  author: {
                    select: {
                      id: true,
                      name: true,
                      status: true
                    }
                  },
                  reactions: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  }
                }
              }
            }
          })
          
          if (updatedParentMessage) {
            io.to(data.channelId).emit('message_updated', updatedParentMessage)
          }
        }

        // Log successful message creation
        debugLog('Message created', {
          messageId: savedMessage.id,
          authorId: socket.data.userId,
          isDM: data.isDM,
          timestamp: new Date().toISOString()
        })

        // Add vectorization
        await vectorizeMessage(savedMessage.id).catch(error => {
          console.error('Failed to vectorize message:', error);
          // Don't throw - we still want to send the message even if vectorization fails
        });

        // Add PDF vectorization if there's a PDF attachment
        if (savedMessage.attachments?.some(att => att.type === 'application/pdf')) {
          for (const attachment of savedMessage.attachments) {
            if (attachment.type === 'application/pdf') {
              await vectorizePDF(attachment.id).catch(error => {
                console.error('Failed to vectorize PDF:', error);
              });
            }
          }
        }
      } catch (error) {
        console.error('Error processing message:', error)
      }
    })
    

    socket.on('channel_create', async (data) => {
      try {
        debugLog('Channel creation attempt', {
          name: data.name,
          userId: socket.data.userId,
          timestamp: new Date().toISOString()
        })

        const newChannel = await prisma.channel.create({
          data: {
            name: data.name,
            description: data.description || `Channel for ${data.name}`
          }
        })
        
        io.emit('channel_created', newChannel)

        debugLog('Channel created', {
          channelId: newChannel.id,
          name: newChannel.name,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error('Error creating channel:', error)
        socket.emit('channel_error', { 
          message: error instanceof Error ? error.message : 'Failed to create channel' 
        })
      }
    })

    socket.on('channel_delete', async (channelId: string) => {
      try {
        debugLog('Channel deletion attempt', {
          channelId,
          userId: socket.data.userId,
          timestamp: new Date().toISOString()
        });

        const channel = await prisma.channel.findUnique({
          where: { id: channelId }
        })

        if (!channel) {
          throw new Error('Channel not found')
        }

        if (channel.name === 'general') {
          throw new Error('Cannot delete the general channel')
        }

        await prisma.$transaction(async (tx) => {
          console.log('🗑️ Starting batch deletion for channel:', channelId);

          // Delete all vectors for channel at once
          try {
            await Promise.all([
              // Delete all vectors for channel in one go
              deleteChannelVectors(channelId),
              
              // Delete DB records
              tx.reaction.deleteMany({
                where: { message: { channelId } }
              }),
              tx.attachment.deleteMany({
                where: { message: { channelId } }
              }),
              tx.channelMembership.deleteMany({
                where: { channelId }
              }),
              tx.message.deleteMany({
                where: { channelId }
              }),
              tx.channel.delete({
                where: { id: channelId }
              })
            ]);
          } catch (error) {
            console.error('❌ Failed to delete channel:', error);
            throw error;
          }
        });

        io.emit('channel_delete', channelId)

        debugLog('Channel deleted', {
          channelId,
          name: channel.name,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error('Error deleting channel:', error)
        socket.emit('channel_error', { 
          message: error instanceof Error ? error.message : 'Failed to delete channel' 
        })
      }
    })

    socket.on("user_signup", async (data) => {
      console.log("New user signup event received:", data);

      try {
        // Fetch all existing users except the new user and AI users
        const existingUsers = await prisma.user.findMany({
          where: { 
            AND: [
              { id: { not: data.userId } },
              { isAI: false }
            ]
          },
          select: { id: true },
        });

        // Create DMs with all existing users
        const createDMs = existingUsers.map((existingUser) =>
          prisma.directChat.create({
            data: {
              participants: {
                connect: [
                  { id: data.userId },
                  { id: existingUser.id },
                ],
              },
            },
          })
        );

        await Promise.all(createDMs);

        console.log(
          `DMs created between new user ${data.userId} and existing users`
        );

        // Broadcast to all clients that a new user has signed up
        io.emit("dm_created", { newUserId: data.userId });
      } catch (error) {
        console.error("Error creating DMs for new user:", error);
      }
    });
    

    socket.on('new_dm_message', async (data) => {
      try {
        const savedMessage = await prisma.message.create({
          data: {
            content: data.content,
            authorId: socket.data.userId,
            directChatId: data.chatId
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })

        // Add vectorization for DM messages
        await vectorizeMessage(savedMessage.id).catch(error => {
          console.error('Failed to vectorize DM:', error);
        });

        const chat = await prisma.directChat.findUnique({
          where: { id: data.chatId },
          include: { participants: true }
        })
        
        chat?.participants.forEach(participant => {
          io.to(participant.id).emit('dm_message_received', savedMessage)
        })
      } catch (error) {
        console.error('Error processing DM message:', error)
      }
    })

    socket.on('add_reaction', async ({ messageId, emoji, channelId }) => {
      try {
        // First find the message to determine if it's a DM or channel message
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { channelId: true, directChatId: true }
        });

        if (!message) {
          console.error('Message not found for reaction');
          return;
        }

        // Ensure we have a valid room ID
        const roomId = message.channelId || message.directChatId;
        if (!roomId) {
          console.error('No valid room ID found for message:', messageId);
          return;
        }

        // Check if THIS user already reacted with this emoji
        const existingReaction = await prisma.reaction.findFirst({
          where: {
            messageId,
            userId: socket.data.userId,
            emoji
          }
        })

        if (existingReaction) {
          // Only remove THIS user's reaction
          await prisma.reaction.delete({
            where: { id: existingReaction.id }
          })

          // Emit to the correct room (channel or DM)
          io.to(roomId).emit('reaction_removed', {
            messageId,
            reactionId: existingReaction.id
          })
        } else {
          // Add new reaction (multiple users can add same emoji)
          const reaction = await prisma.reaction.create({
            data: {
              emoji,
              userId: socket.data.userId,
              messageId
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          })

          // Emit to the correct room (channel or DM)
          io.to(roomId).emit('reaction_added', {
            messageId,
            reaction
          })
        }
      } catch (error) {
        console.error('Error handling reaction:', error)
      }
    })

    socket.on('disconnect', () => {
      userChannels.delete(socket.id)
    })
  })

  const port = process.env.PORT || 3000
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} - env ${process.env.NODE_ENV}`)
  })
}) 