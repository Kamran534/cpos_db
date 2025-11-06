const { Server } = require('socket.io');
const { syncNow } = require('../modules/sync/service');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: '*'}
  });

  io.on('connection', (socket) => {
    socket.on('sync:request', async (payload) => {
      try {
        const result = await syncNow(payload?.direction || 'both');
        socket.emit('sync:result', { ok: true, result });
      } catch (e) {
        socket.emit('sync:result', { ok: false, error: e.message });
      }
    });
  });
}

function getIo() { return io; }

module.exports = { initSocket, getIo };


