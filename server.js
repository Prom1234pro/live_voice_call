const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const rooms = {};

wss.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'join':
                const { room } = data;
                if (!rooms[room]) {
                    rooms[room] = [];
                }
                rooms[room].push(socket);
                socket.room = room;
                console.log(`User joined room: ${room}`);
                break;

            case 'signal':
                const { targetRoom, signalData } = data;
                const roomSockets = rooms[targetRoom];
                if (roomSockets) {
                    roomSockets.forEach((client) => {
                        if (client !== socket && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'signal',
                                sender: socket.id,
                                data: signalData,
                            }));
                        }
                    });
                }
                break;

            case 'call-started':
                const callRoom = data.room;
                const roomUsers = rooms[callRoom];
                if (roomUsers) {
                    roomUsers.forEach((client) => {
                        if (client !== socket && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'call-started', room: callRoom }));
                        }
                    });
                }
                break;

            default:
                console.log('Unknown message type:', data.type);
        }
    });

    socket.on('close', () => {
        const { room } = socket;
        if (room) {
            rooms[room] = rooms[room].filter((client) => client !== socket);
            if (rooms[room].length === 0) {
                delete rooms[room];
            }
        }
        console.log('A user disconnected');
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
