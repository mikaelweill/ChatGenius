import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { jwtVerify } from 'jose'
import { prisma } from './lib/prisma'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const userChannels = new Map<string, string>(); // socketId -> channelId

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
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
    console.log('Client connected with ID:', socket.id)

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
      console.log(`Client ${socket.id} joining channel:`, channelId)
      
      // Leave previous channel if any
      const previousChannel = userChannels.get(socket.id)
      if (previousChannel) {
        socket.leave(previousChannel)
        console.log(`Client ${socket.id} left channel:`, previousChannel)
      }
      
      // Join new channel
      socket.join(channelId)
      userChannels.set(socket.id, channelId)
      console.log(`Client ${socket.id} joined channel:`, channelId)
    })

    socket.on('new_message', async (data) => {
      console.log('Message event received:', {
        data,
        socketId: socket.id,
        userId: socket.data.userId
      })
      
      try {
        const savedMessage = await prisma.message.create({
          data: {
            content: data.content,
            channelId: data.channelId,
            authorId: socket.data.userId,
          },
          include: {
            author: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        })

        console.log('Message saved and broadcasting to channel:', {
          messageId: savedMessage.id,
          channelId: data.channelId
        })

        io.to(data.channelId).emit('message_received', savedMessage)
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
        const channel = await prisma.channel.findUnique({
          where: { id: channelId }
        })

        if (!channel) {
          throw new Error('Channel not found')
        }

        if (channel.name === 'general') {
          throw new Error('Cannot delete the general channel')
        }

        await prisma.$transaction([
          prisma.message.deleteMany({
            where: { channelId }
          }),
          prisma.channelMembership.deleteMany({
            where: { channelId }
          }),
          prisma.channel.delete({
            where: { id: channelId }
          })
        ])

        console.log('Channel deleted from database:', channelId)
        io.emit('channel_delete', channelId)
      } catch (error) {
        console.error('Error deleting channel:', error)
        socket.emit('channel_error', { 
          message: error instanceof Error ? error.message : 'Failed to delete channel' 
        })
      }
    })

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

    socket.on('disconnect', () => {
      console.log('Client disconnected, ID:', socket.id)
      userChannels.delete(socket.id)
    })
  })

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000')
  })
}) 