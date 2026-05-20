document.addEventListener('DOMContentLoaded', () => {
    const modeScreen = document.getElementById('mode-screen');
    const configScreen = document.getElementById('config-screen');
    const onlineScreen = document.getElementById('online-screen');
    const player1Setup = document.getElementById('player1-setup');
    const player2Setup = document.getElementById('player2-setup');
    const configModeLabel = document.getElementById('config-mode-label');
    const onlineStatus = document.getElementById('online-status');
    const startBtn = document.getElementById('start-btn');
    const sessionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const roomPrefix = 'emoji-wars-room-';
    const appConfig = window.EMOJI_WARS_CONFIG || {};
    const socketServerUrl = appConfig.socketServerUrl || undefined;
    const socket = typeof io === 'function'
        ? io(socketServerUrl, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 3,
            timeout: 5000
        })
        : null;

    let currentMode = 'local';
    let activeRoom = null;
    let onlineRole = null;
    let lastStartedMatchId = null;
    let lastAppliedActionId = null;
    let lastAppliedSnapshotId = null;

    const hasSocket = () => socket && socket.connected;

    const showScreen = (screen) => {
        [modeScreen, configScreen, onlineScreen].forEach(section => {
            section.classList.toggle('hidden', section !== screen);
        });
    };

    const setConfigCards = ({ showP1 = true, showP2 = true }) => {
        player1Setup.classList.toggle('hidden', !showP1);
        player2Setup.classList.toggle('hidden', !showP2);
    };

    const showConfig = (mode) => {
        currentMode = mode;
        startBtn.textContent = mode === 'online' ? 'PRONTO' : 'INICIAR BATALHA';

        if (mode === 'solo') {
            setConfigCards({ showP1: true, showP2: false });
            configModeLabel.textContent = 'Configure seu time. O rival sera escolhido no inicio da partida.';
        } else if (mode === 'online') {
            setConfigCards({ showP1: onlineRole === 'host', showP2: onlineRole === 'guest' });
            configModeLabel.textContent = onlineRole === 'host'
                ? `Sala ${activeRoom}: voce e o Player 1. Configure seu time e aguarde o Player 2.`
                : `Sala ${activeRoom}: voce e o Player 2. Configure seu time para entrar na partida.`;
        } else {
            setConfigCards({ showP1: true, showP2: true });
            configModeLabel.textContent = 'Configure os dois times';
        }

        showScreen(configScreen);
    };

    const setupSoldierNames = (sliderId, valId, containerId, prefix) => {
        const slider = document.getElementById(sliderId);
        const valSpan = document.getElementById(valId);
        const container = document.getElementById(containerId);

        const updateInputs = () => {
            const count = parseInt(slider.value);
            valSpan.textContent = count;
            container.innerHTML = '';
            
            for(let i = 1; i <= count; i++) {
                const div = document.createElement('div');
                div.style.marginBottom = '5px';
                div.innerHTML = `<input type="text" id="${prefix}-name-${i}" placeholder="Soldado ${i}" value="Soldado ${i}" class="soldier-name-input">`;
                container.appendChild(div);
            }
        };

        slider.addEventListener('input', updateInputs);
        updateInputs();
    };

    setupSoldierNames('p1-count', 'p1-count-val', 'p1-names-container', 'p1');
    setupSoldierNames('p2-count', 'p2-count-val', 'p2-names-container', 'p2');

    const setupEmojiSelector = (containerId) => {
        const container = document.getElementById(containerId);
        const buttons = container.querySelectorAll('.emoji-btn');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    };

    setupEmojiSelector('p1-emoji-selector');
    setupEmojiSelector('p2-emoji-selector');

    const getSelectedEmoji = (containerId) => {
        return document.querySelector(`#${containerId} .emoji-btn.selected`).getAttribute('data-emoji');
    };

    const getRandomFrom = (items) => items[Math.floor(Math.random() * items.length)];

    const getNames = (prefix, count) => {
        const names = [];
        for(let i = 1; i <= count; i++) {
            names.push(document.getElementById(`${prefix}-name-${i}`).value || `Soldado ${i}`);
        }
        return names;
    };

    const makePlayerConfig = (prefix, color, fallbackName) => {
        const count = parseInt(document.getElementById(`${prefix}-count`).value);
        return {
            name: document.getElementById(`${prefix}-name`).value || fallbackName,
            flag: document.getElementById(`${prefix}-flag`).value,
            emoji: getSelectedEmoji(`${prefix}-emoji-selector`),
            count,
            soldierNames: getNames(prefix, count),
            color
        };
    };

    const makeRandomBotConfig = () => {
        const flags = Array.from(document.getElementById('p2-flag').options).map(option => option.value);
        const emojis = Array.from(document.querySelectorAll('#p2-emoji-selector .emoji-btn')).map(btn => btn.dataset.emoji);
        const names = ['Tropa Omega', 'Rivais Pixel', 'Brigada Bot', 'Comando Caos', 'Time Aleatorio'];
        const soldierNames = ['Bot A', 'Bot B', 'Bot C'];
        const count = 1 + Math.floor(Math.random() * 3);

        return {
            name: getRandomFrom(names),
            flag: getRandomFrom(flags),
            emoji: getRandomFrom(emojis),
            count,
            soldierNames: soldierNames.slice(0, count),
            color: '#00f0ff',
            isAI: true
        };
    };

    const startGame = (config) => {
        document.getElementById('ui-container').classList.add('hidden');
        document.getElementById('game-hud').classList.remove('hidden');

        document.getElementById('hud-p1-flag').textContent = config.player1.flag;
        document.getElementById('hud-p1-name').textContent = config.player1.name;
        document.getElementById('hud-p2-flag').textContent = config.player2.flag;
        document.getElementById('hud-p2-name').textContent = config.player2.name;

        if (window.EmojiWarsGame) {
            window.EmojiWarsGame.init(config);
        }
    };

    const roomKey = (room) => `${roomPrefix}${room}`;

    const readRoom = (room) => {
        try {
            const data = JSON.parse(localStorage.getItem(roomKey(room)));
            if (!data || Date.now() - data.updatedAt > 10 * 60 * 1000) return null;
            return data;
        } catch (error) {
            return null;
        }
    };

    const writeRoom = (room, data) => {
        localStorage.setItem(roomKey(room), JSON.stringify({
            ...data,
            updatedAt: Date.now()
        }));
        refreshRooms();
    };

    const getRoomStatus = (data) => {
        if (!data) return 'Livre';
        if (data.started) return 'Em jogo';
        if (data.hostId && data.guestId) return '2 jogadores';
        return 'Aguardando';
    };

    const renderRoomList = (rooms) => {
        for (let room = 1; room <= 3; room++) {
            const status = document.getElementById(`room-${room}-status`);
            const info = rooms && rooms[String(room)];
            status.textContent = info ? info.status : 'Livre';
        }
    };

    function refreshRooms() {
        if (hasSocket()) {
            socket.emit('room:list');
            return;
        }

        for (let room = 1; room <= 3; room++) {
            const data = readRoom(room);
            const status = document.getElementById(`room-${room}-status`);
            if (!data) {
                localStorage.removeItem(roomKey(room));
            }
            status.textContent = getRoomStatus(data);
        }
    }

    const tryStartOnlineMatch = (room, data) => {
        if (!data || !data.hostConfig || !data.guestConfig) return false;

        const gameConfig = data.gameConfig || {
            mode: 'online',
            room,
            localPlayer: onlineRole === 'host' ? 1 : 2,
            matchId: `${room}-${Date.now()}`,
            seed: data.seed,
            player1: data.hostConfig,
            player2: data.guestConfig
        };

        writeRoom(room, {
            ...data,
            started: true,
            gameConfig
        });

        startOnlineGame(gameConfig);
        return true;
    };

    const startOnlineGame = (sharedConfig) => {
        if (!sharedConfig || lastStartedMatchId === sharedConfig.matchId) return;
        lastStartedMatchId = sharedConfig.matchId;
        startGame({
            ...sharedConfig,
            localPlayer: onlineRole === 'host' ? 1 : 2,
            onOnlineAction: publishOnlineAction,
            onOnlineSnapshot: publishOnlineSnapshot
        });
    };

    const publishOnlineAction = (action) => {
        if (!activeRoom || !onlineRole) return;
        if (hasSocket()) {
            socket.emit('game:action', { roomId: activeRoom, action });
            return;
        }

        const data = readRoom(activeRoom);
        if (!data) return;

        writeRoom(activeRoom, {
            ...data,
            lastAction: {
                ...action,
                id: `${sessionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                sourceId: sessionId
            }
        });
    };

    const publishOnlineSnapshot = (snapshot) => {
        if (!activeRoom || !onlineRole) return;
        if (hasSocket()) {
            socket.emit('game:snapshot', { roomId: activeRoom, snapshot });
            return;
        }

        const data = readRoom(activeRoom);
        if (!data) return;

        writeRoom(activeRoom, {
            ...data,
            lastSnapshot: {
                id: `${sessionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                sourceId: sessionId,
                snapshot
            }
        });
    };

    const applyRemoteAction = (data) => {
        const action = data && data.lastAction;
        if (!action || action.sourceId === sessionId || action.id === lastAppliedActionId) return;
        if (!window.EmojiWarsGame || typeof window.EmojiWarsGame.applyOnlineAction !== 'function') return;

        lastAppliedActionId = action.id;
        window.EmojiWarsGame.applyOnlineAction(action);
    };

    const applyRemoteSnapshot = (data) => {
        const payload = data && data.lastSnapshot;
        if (!payload || payload.sourceId === sessionId || payload.id === lastAppliedSnapshotId) return;
        if (!window.EmojiWarsGame || typeof window.EmojiWarsGame.applyOnlineSnapshot !== 'function') return;

        lastAppliedSnapshotId = payload.id;
        window.EmojiWarsGame.applyOnlineSnapshot(payload.snapshot);
    };

    const markReadyOnline = () => {
        if (hasSocket()) {
            if (!activeRoom || !onlineRole) return;
            const ownConfig = onlineRole === 'host'
                ? makePlayerConfig('p1', '#ff3366', 'Exercito Alpha')
                : makePlayerConfig('p2', '#00f0ff', 'Tropa Omega');

            socket.emit('room:ready', {
                roomId: activeRoom,
                role: onlineRole,
                config: ownConfig
            }, (response) => {
                if (!response || !response.ok) {
                    configModeLabel.textContent = response && response.message ? response.message : 'Nao foi possivel marcar pronto.';
                    return;
                }

                configModeLabel.textContent = onlineRole === 'host'
                    ? `Sala ${activeRoom}: Player 1 pronto. Aguardando Player 2.`
                    : `Sala ${activeRoom}: Player 2 pronto. Aguardando Player 1.`;
                startBtn.textContent = 'AGUARDANDO...';
                startBtn.disabled = true;
            });
            return;
        }

        const data = readRoom(activeRoom);
        if (!data || !onlineRole) return;

        const ownConfig = onlineRole === 'host'
            ? makePlayerConfig('p1', '#ff3366', 'Exercito Alpha')
            : makePlayerConfig('p2', '#00f0ff', 'Tropa Omega');

        const nextData = {
            ...data,
            hostConfig: onlineRole === 'host' ? ownConfig : data.hostConfig,
            guestConfig: onlineRole === 'guest' ? ownConfig : data.guestConfig
        };

        writeRoom(activeRoom, nextData);

        if (!tryStartOnlineMatch(activeRoom, nextData)) {
            configModeLabel.textContent = onlineRole === 'host'
                ? `Sala ${activeRoom}: Player 1 pronto. Aguardando Player 2.`
                : `Sala ${activeRoom}: Player 2 pronto. Aguardando Player 1.`;
            startBtn.textContent = 'AGUARDANDO...';
            startBtn.disabled = true;
        }
    };

    document.getElementById('solo-mode-btn').addEventListener('click', () => showConfig('solo'));
    document.getElementById('local-mode-btn').addEventListener('click', () => showConfig('local'));
    document.getElementById('online-mode-btn').addEventListener('click', () => {
        activeRoom = null;
        onlineRole = null;
        refreshRooms();
        onlineStatus.textContent = 'Clique em uma sala livre para ser o Player 1, ou entre em uma sala aguardando para ser o Player 2.';
        showScreen(onlineScreen);
    });

    document.getElementById('back-to-modes-btn').addEventListener('click', () => {
        startBtn.disabled = false;
        startBtn.textContent = 'INICIAR BATALHA';
        showScreen(modeScreen);
    });
    document.getElementById('back-from-online-btn').addEventListener('click', () => showScreen(modeScreen));

    startBtn.addEventListener('click', () => {
        if (currentMode === 'online') {
            markReadyOnline();
            return;
        }

        const player1 = makePlayerConfig('p1', '#ff3366', 'Exercito Alpha');
        const player2 = currentMode === 'solo'
            ? makeRandomBotConfig()
            : makePlayerConfig('p2', '#00f0ff', 'Tropa Omega');

        startGame({
            mode: currentMode,
            room: activeRoom,
            localPlayer: null,
            player1,
            player2
        });
    });

    document.querySelectorAll('.room-card').forEach(button => {
        button.addEventListener('click', () => {
            const room = button.dataset.room;
            if (hasSocket()) {
                activeRoom = room;
                startBtn.disabled = false;
                startBtn.textContent = 'PRONTO';

                socket.emit('room:join', { roomId: room }, (response) => {
                    if (!response || !response.ok) {
                        onlineStatus.textContent = response && response.message ? response.message : 'Nao foi possivel entrar na sala.';
                        return;
                    }

                    onlineRole = response.role;
                    onlineStatus.textContent = onlineRole === 'host'
                        ? `Sala ${room}: voce criou a sala e sera o Player 1.`
                        : `Sala ${room}: voce entrou como Player 2.`;
                    showConfig('online');
                });
                return;
            }

            const data = readRoom(room);
            activeRoom = room;
            startBtn.disabled = false;
            startBtn.textContent = 'PRONTO';

            if (!data) {
                onlineRole = 'host';
                writeRoom(room, {
                    hostId: sessionId,
                    guestId: null,
                    seed: `${room}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    hostConfig: null,
                    guestConfig: null,
                    started: false,
                    gameConfig: null
                });
                onlineStatus.textContent = `Sala ${room}: voce criou a sala e sera o Player 1.`;
                showConfig('online');
                return;
            }

            if (data.hostId === sessionId) {
                onlineRole = 'host';
                showConfig('online');
                return;
            }

            if (data.guestId === sessionId) {
                onlineRole = 'guest';
                showConfig('online');
                return;
            }

            if (!data.guestId && !data.started) {
                onlineRole = 'guest';
                writeRoom(room, { ...data, guestId: sessionId });
                onlineStatus.textContent = `Sala ${room}: voce entrou como Player 2.`;
                showConfig('online');
                return;
            }

            onlineStatus.textContent = `Sala ${room} ja esta ocupada. Escolha outra sala.`;
        });
    });

    window.addEventListener('storage', (event) => {
        if (!event.key || !event.key.startsWith(roomPrefix)) return;
        refreshRooms();
        if (!activeRoom || event.key !== roomKey(activeRoom)) return;

        const data = readRoom(activeRoom);
        if (!data) return;

        if (data.started && data.gameConfig) {
            startOnlineGame(data.gameConfig);
            applyRemoteAction(data);
            applyRemoteSnapshot(data);
            return;
        }

        if (onlineRole === 'host' && data.guestId) {
            configModeLabel.textContent = `Sala ${activeRoom}: Player 2 entrou. Configure seu Player 1 e clique em PRONTO.`;
        }

        if (data.hostConfig && data.guestConfig) {
            tryStartOnlineMatch(activeRoom, data);
        }
    });

    window.addEventListener('beforeunload', () => {
        if (hasSocket()) return;
        if (!activeRoom) return;
        const data = readRoom(activeRoom);
        if (!data) return;
        if (data.hostId === sessionId || data.guestId === sessionId) {
            localStorage.removeItem(roomKey(activeRoom));
        }
    });

    refreshRooms();

    if (socket) {
        socket.on('connect', () => {
            onlineStatus.textContent = 'Servidor online conectado. Escolha uma sala.';
            refreshRooms();
        });

        socket.on('disconnect', () => {
            onlineStatus.textContent = 'Servidor desconectado. O fallback local sera usado se possivel.';
            refreshRooms();
        });

        socket.on('room:list', renderRoomList);

        socket.on('room:guest-joined', ({ roomId }) => {
            if (String(activeRoom) !== String(roomId) || onlineRole !== 'host') return;
            configModeLabel.textContent = `Sala ${activeRoom}: Player 2 entrou. Configure seu Player 1 e clique em PRONTO.`;
        });

        socket.on('match:start', (gameConfig) => {
            startOnlineGame(gameConfig);
        });

        socket.on('game:action', (action) => {
            applyRemoteAction({ lastAction: action });
        });

        socket.on('game:snapshot', (payload) => {
            applyRemoteSnapshot({ lastSnapshot: payload });
        });
    }
});
