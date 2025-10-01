// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// { [roomId]: { [socketId]: ws } }
const rooms = {};
const MAX_USERS_PER_ROOM = 5;

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    // 接続したクライアントにIDを付与
    ws.id = `user-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Client connected: ${ws.id}`);

    ws.on('message', (message) => {
      const data = JSON.parse(message);
      const { type, payload } = data;

      switch (type) {
        case 'join-room': {
          const { roomId, nickname } = payload;
          ws.roomId = roomId; // wsオブジェクトにルームIDを保存
          ws.nickname = nickname; // wsオブジェクトにニックネームを保存

          if (!rooms[roomId]) {
            rooms[roomId] = {};
          }

          if (Object.keys(rooms[roomId]).length >= MAX_USERS_PER_ROOM) {
            ws.send(JSON.stringify({ type: 'room-full' }));
            return;
          }

          // 既存のユーザーリストを作成
          const existingUsers = Object.values(rooms[roomId]).map(client => ({
            id: client.id,
            nickname: client.nickname,
          }));

          // 新規参加者に既存ユーザーリストを送信
          ws.send(JSON.stringify({ type: 'all-users', payload: existingUsers }));
          
          // ルームに新しいユーザーを追加
          rooms[roomId][ws.id] = ws;
          
          // 他のユーザーに新規参加を通知
          Object.values(rooms[roomId]).forEach(client => {
            if (client.id !== ws.id) {
              client.send(JSON.stringify({ type: 'user-joined', payload: { id: ws.id, nickname: ws.nickname } }));
            }
          });
          break;
        }

        // WebRTCシグナル (offer, answer, candidate) の転送
        case 'signal': {
          const { to, signal } = payload;
          const targetClient = rooms[ws.roomId]?.[to];
          if (targetClient) {
            targetClient.send(JSON.stringify({ type: 'signal', payload: { from: ws.id, signal } }));
          }
          break;
        }

        // データチャネルメッセージの転送
        case 'data-channel-message': {
            const { roomId, message } = payload;
            Object.values(rooms[roomId]).forEach(client => {
                if (client.id !== ws.id) {
                    client.send(JSON.stringify({ type: 'data-channel-message', payload: { from: ws.id, message } }));
                }
            });
            break;
        }
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected: ${ws.id}`);
      const roomId = ws.roomId;
      if (roomId && rooms[roomId]) {
        delete rooms[roomId][ws.id];
        
        // 他のユーザーに退出を通知
        Object.values(rooms[roomId]).forEach(client => {
          client.send(JSON.stringify({ type: 'user-left', payload: { id: ws.id } }));
        });

        if (Object.keys(rooms[roomId]).length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted.`);
        }
      }
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