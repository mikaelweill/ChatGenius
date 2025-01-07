import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export const initializeSocket = (socketIo: SocketIOServer) => {
  io = socketIo;
};

export const emitSocketEvent = (event: string, data: any) => {
  if (!io) {
    console.error('Socket.IO server not initialized');
    return;
  }
  io.emit(event, data);
}; 