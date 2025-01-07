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

    // Log all incoming events for debugging
    socket.onAny((eventName, ...args) => {
      console.log(`Received event "${eventName}"`, args)
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
      console.log('New message received:', data)
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

        io.to(data.channelId).emit('message_received', savedMessage)
      } catch (error) {
        console.error('Error saving message:', error)
      }
    })

    socket.on('channel_create', async (data) => {
      console.log('Channel create received:', data)
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

    socket.on('channel_delete', async (channelName) => {
      console.log('Channel delete received:', channelName)
      try {
        const channel = await prisma.channel.findUnique({
          where: { name: channelName }
        })

        if (!channel) {
          throw new Error('Channel not found')
        }

        if (channel.name === 'general') {
          throw new Error('Cannot delete the general channel')
        }

        await prisma.$transaction([
          prisma.message.deleteMany({
            where: { channelId: channel.id }
          }),
          prisma.channelMembership.deleteMany({
            where: { channelId: channel.id }
          }),
          prisma.channel.delete({
            where: { id: channel.id }
          })
        ])

        console.log('Successfully deleted channel:', channelName)
        io.emit('channel_deleted', channelName)
      } catch (error) {
        console.error('Error deleting channel:', error)
        socket.emit('channel_error', { 
          message: error instanceof Error ? error.message : 'Failed to delete channel' 
        })
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