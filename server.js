// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// { [roomId]: { [socketId]: { ws, nickname, instrument } } }
const rooms = {};
const MAX_USERS_PER_ROOM = 5;

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      if (pathname === '/api/rooms') {
        const roomData = Object.keys(rooms).reduce((acc, roomId) => {
          acc[roomId] = { count: Object.keys(rooms[roomId]).length };
          return acc;
        }, {});
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(roomData));
        return;
      }

      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const wss = new WebSocketServer({ path: '/ws', server: httpServer });

  wss.on('connection', (ws) => {
    ws.id = `user-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Client connected: ${ws.id}`);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        const { type, payload } = data;
        const roomId = ws.roomId;

        switch (type) {
          case 'join-room': {
            const { roomId, nickname } = payload;
            
            if (!rooms[roomId]) rooms[roomId] = {};
            if (Object.keys(rooms[roomId]).length >= MAX_USERS_PER_ROOM) {
              ws.send(JSON.stringify({ type: 'room-full' }));
              return;
            }
            
            ws.roomId = roomId;
            rooms[roomId][ws.id] = { ws, nickname, instrument: 'piano' }; // デフォルトはpiano
            console.log(`[${roomId}] User joined: ${nickname} (${ws.id})`);

            const existingUsers = Object.entries(rooms[roomId])
              .filter(([id]) => id !== ws.id)
              .map(([id, clientData]) => ({ id, nickname: clientData.nickname, instrument: clientData.instrument }));

            ws.send(JSON.stringify({ type: 'join-success', payload: { id: ws.id, users: existingUsers } }));
            
            Object.entries(rooms[roomId]).forEach(([id, clientData]) => {
              if (id !== ws.id) {
                clientData.ws.send(JSON.stringify({ type: 'user-joined', payload: { id: ws.id, nickname, instrument: 'piano' } }));
              }
            });
            break;
          }

          case 'signal': {
            const { to, signal } = payload;
            const targetClient = rooms[roomId]?.[to];
            if (targetClient) {
              targetClient.ws.send(JSON.stringify({ type: 'signal', payload: { from: ws.id, fromNickname: rooms[roomId][ws.id].nickname, signal } }));
            }
            break;
          }

          case 'data-channel-message': {
            const { message } = payload;
            if (!rooms[roomId]) return;

            // 楽器変更メッセージの場合はサーバーの状態も更新
            if (message.type === 'instrumentChange') {
              if (rooms[roomId][ws.id]) {
                rooms[roomId][ws.id].instrument = message.instrument;
              }
            }

            Object.entries(rooms[roomId]).forEach(([id, clientData]) => {
              if (id !== ws.id) {
                clientData.ws.send(JSON.stringify({ type: 'data-channel-message', payload: { from: ws.id, message } }));
              }
            });
            break;
          }
        }
      } catch (e) {
        console.error('Failed to process message:', e);
      }
    });

    const cleanup = () => {
      const roomId = ws.roomId;
      if (roomId && rooms[roomId] && rooms[roomId][ws.id]) {
        console.log(`[${roomId}] Client disconnected: ${rooms[roomId][ws.id].nickname} (${ws.id})`);
        delete rooms[roomId][ws.id];
        
        Object.values(rooms[roomId]).forEach(clientData => {
          clientData.ws.send(JSON.stringify({ type: 'user-left', payload: { id: ws.id } }));
        });

        if (Object.keys(rooms[roomId]).length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted.`);
        }
      } else {
        console.log(`Client disconnected: ${ws.id} (not in a room)`);
      }
    };

    ws.on('close', cleanup);
    ws.on('error', (err) => {
      console.error(`WebSocket error for ${ws.id}:`, err);
      cleanup();
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});