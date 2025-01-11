import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { jwtVerify } from 'jose'
import { prisma } from './lib/prisma'
import path from 'path'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const userChannels = new Map<string, string>() // socketId -> channelId
const activeUsers = new Set<string>() // Set of online userIds
const userStatuses = new Map<string, { status: string, updatedAt: Date, socketId: string }>();

const isUserOnline = (userId: string) => {
  return activeUsers.has(userId)
}

prisma.user.findFirst().then(user => {
  // console.log('Prisma connection test:', !!user);
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
    // console.log('=== Socket Auth Debug ===');
    // console.log('1. Raw handshake:', {
    //   auth: socket.handshake.auth,
    //   query: socket.handshake.query,
    //   headers: socket.handshake.headers
    // });

    const userId = socket.handshake.auth.userId;
    // console.log('2. Extracted userId:', userId);

    if (!userId) {
      // console.log('3a. Failed: No userId provided');
      return next(new Error('Authentication error'));
    }

    try {
      // console.log('3b. Looking up user in database:', userId);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true }  // Just for logging
      });

      // console.log('4. Database lookup result:', user);

      if (!user) {
        // console.log('5a. Failed: User not found in database');
        return next(new Error('Authentication error'));
      }

      socket.data.userId = userId;
      // console.log('5b. Success: User authenticated:', { userId, socketId: socket.id });
      next();
    } catch (error) {
      console.error('5c. Failed: Database error:', error);
      next(new Error('Authentication error'));
    }
  })

  io.on('connection', async (socket) => {
    // console.log('Client connected:', socket.id)
    const userId = socket.data.userId

    // Mark user as online
    activeUsers.add(userId)
    userStatuses.set(userId, {
      status: 'online',
      updatedAt: new Date(),
      socketId: socket.id
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

    socket.on('disconnect', () => {
      // Mark user as offline
      activeUsers.delete(userId)
      userStatuses.set(userId, {
        status: 'offline',
        updatedAt: new Date(),
        socketId: socket.id
      })

      // Broadcast offline status
      io.emit('status_update', {
        userId,
        status: 'offline',
        updatedAt: new Date()
      })
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
        console.log('Received message data:', data);
        const messageData: {
          content: string;
          authorId: string;
          directChatId?: string;
          channelId?: string;
          parentId?: string;
          attachments?: {  // Make attachments optional with ?
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

        // Set channel type (DM or regular)
        if (data.isDM) {
          messageData.directChatId = data.channelId
        } else {
          messageData.channelId = data.channelId
        }

        // Add parentId if it exists (for thread replies)
        if (data.parentId) {
          messageData.parentId = data.parentId
        }

        // Add attachment if it exists
        if (data.attachment) {
          messageData.attachments = {
            create: {
              url: data.attachment.url,
              type: data.attachment.type,
              name: data.attachment.name
            }
          }
        }

        console.log('Final message data:', messageData);

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
            attachments: true,  // Changed from attachment to attachments
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

        // Join the room (whether channel or DM)
        socket.join(data.channelId)
        
        // Only emit message_received if it's not a reply
        if (!data.parentId) {
          io.to(data.channelId).emit('message_received', savedMessage)
        }

        // If this is a reply, emit updated parent message
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
            console.log('Emitting updated parent message:', updatedParentMessage);
            io.to(data.channelId).emit('message_updated', updatedParentMessage)
          }
        }
      } catch (error) {
        console.error('Error processing message:', error)
      }
    })
    

    socket.on('channel_create', async (data) => {
      // console.log('Channel create event received:', {
      //   data,
      //   socketId: socket.id,
      //   userId: socket.data.userId
      // })
      try {
        const newChannel = await prisma.channel.create({
          data: {
            name: data.name,
            description: data.description || `Channel for ${data.name}`
          }
        })
        
        // console.log('Successfully created channel:', newChannel)
        io.emit('channel_created', newChannel)
      } catch (error) {
        console.error('Error creating channel:', error)
        socket.emit('channel_error', { 
          message: error instanceof Error ? error.message : 'Failed to create channel' 
        })
      }
    })

    socket.on('channel_delete', async (channelId: string) => {
      // console.log('Channel delete event received:', {
      //   channelId,
      //   socketId: socket.id,
      //   userId: socket.data.userId
      // })
      try {
        // Check if it's the general channel
        const channel = await prisma.channel.findUnique({
          where: { id: channelId }
        })

        if (!channel) {
          throw new Error('Channel not found')
        }

        if (channel.name === 'general') {
          throw new Error('Cannot delete the general channel')
        }

        // Use transaction to ensure all operations complete or none do
        await prisma.$transaction([
          // 1. Delete reactions first (due to foreign key constraint)
          prisma.reaction.deleteMany({
            where: {
              message: {
                channelId
              }
            }
          }),
          // 2. Delete channel memberships
          prisma.channelMembership.deleteMany({
            where: { channelId }
          }),
          // 3. Delete messages
          prisma.message.deleteMany({
            where: { channelId }
          }),
          // 4. Delete the channel
          prisma.channel.delete({
            where: { id: channelId }
          })
        ])

        // Keep original event name
        io.emit('channel_delete', channelId)
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
        // Fetch all existing users except the new user
        const existingUsers = await prisma.user.findMany({
          where: { id: { not: data.userId } },
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
      // console.log('DM message received:', {
      //   data,
      //   socketId: socket.id,
      //   userId: socket.data.userId
      // })
      
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

        const chat = await prisma.directChat.findUnique({
          where: { id: data.chatId },
          include: { participants: true }
        })
        
        chat?.participants.forEach(participant => {
          io.to(participant.id).emit('dm_message_received', savedMessage)
        })
        // console.log('Emitted DM message:', savedMessage)
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