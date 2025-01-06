import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { jwtVerify } from 'jose'
import { prisma } from './lib/prisma'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

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

  io.on('connection', (socket) => {
    console.log('Client connected')

    socket.on('join_channel', (channelId) => {
      socket.join(channelId)
      console.log(`User joined channel: ${channelId}`)
    })

    socket.on('new_message', async (data) => {
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

    socket.on('disconnect', () => {
      console.log('Client disconnected')
    })
  })

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000')
  })
}) 