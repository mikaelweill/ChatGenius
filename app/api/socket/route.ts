import { WebSocketServer } from 'ws'
import { prisma } from "@/lib/prisma"
import { jwtVerify } from "jose"

const wss = new WebSocketServer({ 
  noServer: true,
  path: '/api/socket'
})

// Rest of the original WebSocket code... 