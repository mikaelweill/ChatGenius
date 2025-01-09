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

const userChannels = new Map<string, string>(); // socketId -> channelId

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
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('Authentication error'))
    }

    try {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
      const { payload } = await jwtVerify(token, secret)
      socket.data.userId = payload.id
      next()
    } catch (error) {
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', async (socket) => {

    // Debug ALL incoming events
    socket.onAny((eventName, ...args) => {
      console.log('Received socket event:', {
        event: eventName,
        args: args,
        socketId: socket.id,
        userId: socket.data?.userId
      })
    })

    socket.on('join_channel', (channelId) => {
      // console.log(`Client ${socket.id} joining channel:`, channelId)
      
      // Leave previous channel if any
      const previousChannel = userChannels.get(socket.id)
      if (previousChannel) {
        socket.leave(previousChannel)
        // console.log(`Client ${socket.id} left channel:`, previousChannel)
      }
      
      // Join new channel
      socket.join(channelId)
      userChannels.set(socket.id, channelId)
      // console.log(`Client ${socket.id} joined channel:`, channelId)
    })

    socket.on('new_message', async (data) => {
      console.log('Message received:', {
        data,
        socketId: socket.id,
        userId: socket.data.userId,
        isDM: data.isDM
      })
      
      try {
        // Define the type for messageData
        const messageData: {
          content: string;
          authorId: string;
          directChatId?: string;
          channelId?: string;
        } = {
          content: data.content,
          authorId: socket.data.userId,
        }

        // Add the correct chat ID field
        if (data.isDM) {
          messageData.directChatId = data.channelId // Use dot notation instead of bracket notation
        } else {
          messageData.channelId = data.channelId // Use dot notation instead of bracket notation
        }

        const savedMessage = await prisma.message.create({
          data: messageData,
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

        // Join the room (whether channel or DM)
        socket.join(data.channelId)
        
        // Emit to everyone in the room
        io.to(data.channelId).emit('message_received', savedMessage)
        
        console.log('Message saved and emitted:', {
          message: savedMessage,
          isDM: data.isDM,
          chatId: data.channelId
        })
      } catch (error) {
        console.error('Error processing message:', error)
      }
    })
    

    socket.on('channel_create', async (data) => {
      console.log('Channel create event received:', {
        data,
        socketId: socket.id,
        userId: socket.data.userId
      })
      try {
        const newChannel = await prisma.channel.create({
          data: {
            name: data.name,
            description: data.description || `Channel for ${data.name}`
          }
        })
        
        console.log('Successfully created channel:', newChannel)
        io.emit('channel_created', newChannel)
      } catch (error) {
        console.error('Error creating channel:', error)
        socket.emit('channel_error', { 
          message: error instanceof Error ? error.message : 'Failed to create channel' 
        })
      }
    })

    socket.on('channel_delete', async (channelId: string) => {
      console.log('Channel delete event received:', {
        channelId,
        socketId: socket.id,
        userId: socket.data.userId
      })
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
    
        // Notify connected clients about new DMs
        existingUsers.forEach((existingUser) => {
          io.to(existingUser.id).emit("dm_created", { newUserId: data.userId });
        });
      } catch (error) {
        console.error("Error creating DMs for new user:", error);
      }
    });
    

    socket.on('new_dm_message', async (data) => {
      console.log('DM message received:', {
        data,
        socketId: socket.id,
        userId: socket.data.userId
      })
      
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

        // Get DM participants and emit to them
        const chat = await prisma.directChat.findUnique({
          where: { id: data.chatId },
          include: { participants: true }
        })
        
        chat?.participants.forEach(participant => {
          io.to(participant.id).emit('dm_message_received', savedMessage)
        })
        console.log('Emitted DM message:', savedMessage)
      } catch (error) {
        console.error('Error processing DM message:', error)
      }
    })

    socket.on('add_reaction', async ({ messageId, emoji, channelId }) => {
      try {
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

          io.to(channelId).emit('reaction_removed', {
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
                  id: true,  // Add this to identify who reacted
                  name: true
                }
              }
            }
          })

          io.to(channelId).emit('reaction_added', {
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

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000')
  })
}) 