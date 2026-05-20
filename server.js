const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CLIENT_ORIGIN || '*')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins.includes('*') ? true : allowedOrigins,
        methods: ['GET', 'POST']
    }
});
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.get('/health', (req, res) => {
    res.json({ ok: true });
});

const rooms = new Map();

const makeSeed = (roomId) => `${roomId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyRoom = (roomId) => ({
    id: roomId,
    hostId: null,
    guestId: null,
    seed: makeSeed(roomId),
    hostConfig: null,
    guestConfig: null,
    started: false,
    gameConfig: null
});

for (let room = 1; room <= 3; room++) {
    rooms.set(String(room), emptyRoom(String(room)));
}

const roomStatus = (room) => {
    if (!room.hostId) return 'Livre';
    if (room.started) return 'Em jogo';
    if (room.hostId && room.guestId) return '2 jogadores';
    return 'Aguardando';
};

const publicRooms = () => {
    const result = {};
    rooms.forEach((room, id) => {
        result[id] = { status: roomStatus(room) };
    });
    return result;
};

const resetRoom = (roomId) => {
    rooms.set(roomId, emptyRoom(roomId));
};

const emitRooms = () => {
    io.emit('room:list', publicRooms());
};

io.on('connection', (socket) => {
    socket.emit('room:list', publicRooms());

    socket.on('room:list', () => {
        socket.emit('room:list', publicRooms());
    });

    socket.on('room:join', ({ roomId }, reply) => {
        const id = String(roomId);
        const room = rooms.get(id);
        if (!room) {
            reply && reply({ ok: false, message: 'Sala inexistente.' });
            return;
        }

        if (!room.hostId) {
            room.hostId = socket.id;
            room.seed = makeSeed(id);
            socket.join(id);
            reply && reply({ ok: true, role: 'host', roomId: id });
            emitRooms();
            return;
        }

        if (room.hostId === socket.id) {
            socket.join(id);
            reply && reply({ ok: true, role: 'host', roomId: id });
            return;
        }

        if (room.guestId === socket.id) {
            socket.join(id);
            reply && reply({ ok: true, role: 'guest', roomId: id });
            return;
        }

        if (!room.guestId && !room.started) {
            room.guestId = socket.id;
            socket.join(id);
            io.to(room.hostId).emit('room:guest-joined', { roomId: id });
            reply && reply({ ok: true, role: 'guest', roomId: id });
            emitRooms();
            return;
        }

        reply && reply({ ok: false, message: 'Sala ocupada.' });
    });

    socket.on('room:ready', ({ roomId, role, config }, reply) => {
        const id = String(roomId);
        const room = rooms.get(id);
        if (!room) {
            reply && reply({ ok: false, message: 'Sala inexistente.' });
            return;
        }

        if (role === 'host' && room.hostId === socket.id) {
            room.hostConfig = config;
        } else if (role === 'guest' && room.guestId === socket.id) {
            room.guestConfig = config;
        } else {
            reply && reply({ ok: false, message: 'Papel inválido nesta sala.' });
            return;
        }

        reply && reply({ ok: true });

        if (room.hostConfig && room.guestConfig && !room.started) {
            room.started = true;
            room.gameConfig = {
                mode: 'online',
                room: id,
                matchId: `${id}-${Date.now()}`,
                seed: room.seed,
                player1: room.hostConfig,
                player2: room.guestConfig
            };
            io.to(id).emit('match:start', room.gameConfig);
            emitRooms();
        }
    });

    socket.on('game:action', ({ roomId, action }) => {
        const id = String(roomId);
        const room = rooms.get(id);
        if (!room || !room.started) return;

        socket.to(id).emit('game:action', {
            ...action,
            id: `${socket.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            sourceId: socket.id
        });
    });

    socket.on('game:snapshot', ({ roomId, snapshot }) => {
        const id = String(roomId);
        const room = rooms.get(id);
        if (!room || !room.started) return;

        socket.to(id).emit('game:snapshot', {
            id: `${socket.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            sourceId: socket.id,
            snapshot
        });
    });

    socket.on('disconnect', () => {
        rooms.forEach((room, id) => {
            if (room.hostId === socket.id || room.guestId === socket.id) {
                resetRoom(id);
            }
        });
        emitRooms();
    });
});

server.listen(PORT, () => {
    console.log(`Emoji Wars online server running at http://localhost:${PORT}`);
});
