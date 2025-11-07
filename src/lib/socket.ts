import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

let io: Server | undefined;

export function initSocket(server: HttpServer) {
  io = new Server(server, {
    cors: { origin: '*' }
  });

  io.on('connection', (socket) => {
    // Terminal joins its room for targeted sync notifications
    socket.on('terminal:register', (data: { terminalId: string }) => {
      if (data?.terminalId) {
        socket.join(`terminal:${data.terminalId}`);
        console.log(`[Socket] Terminal ${data.terminalId} joined sync room`);
      }
    });

    socket.on('sync:request', async (_payload) => {
      try {
        // syncNow is not available; respond with not implemented
        socket.emit('sync:result', { ok: false, error: 'Sync not implemented' });
      } catch (e: any) {
        socket.emit('sync:result', { ok: false, error: e.message });
      }
    });

    // Handle sync trigger acknowledgment from terminal
    socket.on('sync:ack', (data: { terminalId: string; type: string }) => {
      console.log(`[Socket] Terminal ${data.terminalId} acknowledged sync trigger: ${data.type}`);
    });
  });
}

export function getIo() { return io; }


