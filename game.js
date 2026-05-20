window.EmojiWarsGame = (function() {
    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Bodies = Matter.Bodies,
          Composite = Matter.Composite,
          Events = Matter.Events,
          World = Matter.World,
          Vector = Matter.Vector;

    let engine, render, runner;
    let config;
    let p1Soldiers = [];
    let p2Soldiers = [];
    let terrainBlocks = [];
    let terrainCatalog = new Map();
    let visualEffects = [];
    let toxicSocks = [];
    let boomerangs = [];
    let pumpkinMines = [];
    let pepperEffects = [];
    let heliBeans = [];
    let magnets = [];
    let frisbees = [];
    let fairies = [];
    let moais = [];
    let deadSoldiers = [];
    let saucerAnim = null;
    let launchTrail = [];
    
    let currentTurn = 1;
    let isAiming = false;
    let activeSoldier = null;
    let dragStart = null;
    let currentWeapon = 'grenade';
    let meteorUses = { 1: 1, 2: 1 };
    let umbrellaUses = { 1: 1, 2: 1 };
    let healthHelmetUses = { 1: 1, 2: 1 };
    let iceCubeUses = { 1: 1, 2: 1 };
    let fairyUses = { 1: 1, 2: 1 };
    let moaiUses = { 1: 1, 2: 1 };
    let fanUses = { 1: 1, 2: 1 };
    let weaponMenuInitialized = false;
    
    let giantTurns = { 1: 0, 2: 0 };
    let frozenTeams = { 1: 0, 2: 0 };
    let hasMoved = false;
    
    let p1Wins = 0;
    let p2Wins = 0;
    let isGameOver = false;
    let isAiThinking = false;
    let seededRandom = null;

    function init(gameConfig) {
        config = gameConfig;
        seededRandom = config.seed ? createSeededRandom(config.seed) : null;
        
        p1Soldiers = [];
        p2Soldiers = [];
        terrainBlocks = [];
        terrainCatalog = new Map();
        visualEffects = [];
        toxicSocks = [];
        boomerangs = [];
        pumpkinMines = [];
        pepperEffects = [];
        heliBeans = [];
        magnets = [];
        frisbees = [];
        fairies = [];
        moais = [];
        deadSoldiers = [];
        saucerAnim = null;
        launchTrail = [];
        currentTurn = 1;
        isAiming = false;
        activeSoldier = null;
        currentWeapon = 'grenade';
        meteorUses = { 1: 1, 2: 1 };
        umbrellaUses = { 1: 1, 2: 1 };
        healthHelmetUses = { 1: 1, 2: 1 };
        iceCubeUses = { 1: 1, 2: 1 };
        fairyUses = { 1: 1, 2: 1 };
        moaiUses = { 1: 1, 2: 1 };
        fanUses = { 1: 1, 2: 1 };
        isGameOver = false;
        isAiThinking = false;
        giantTurns = { 1: 0, 2: 0 };
        frozenTeams = { 1: 0, 2: 0 };
        hasMoved = false;
        
        document.getElementById('night-overlay').classList.remove('active');

        if (render) {
            Render.stop(render);
            if (render.canvas) render.canvas.remove();
        }
        if (runner) Runner.stop(runner);
        if (engine) {
            World.clear(engine.world);
            Engine.clear(engine);
        }

        setupEngine();
        createTerrain();
        spawnSoldiers();
        setupControls();
        setupWeaponMenu();
        setupGameLoop();
        setupCollisions();
        updateTurnUI();
    }

    function createSeededRandom(seed) {
        let value = 0;
        const text = String(seed);
        for (let i = 0; i < text.length; i++) {
            value = (value * 31 + text.charCodeAt(i)) >>> 0;
        }
        return () => {
            value = (value * 1664525 + 1013904223) >>> 0;
            return value / 4294967296;
        };
    }

    function rand() {
        return seededRandom ? seededRandom() : Math.random();
    }

    function setupEngine() {
        engine = Engine.create();
        engine.gravity.y = 1;

        render = Render.create({
            element: document.body,
            engine: engine,
            options: {
                width: window.innerWidth,
                height: window.innerHeight,
                wireframes: false,
                background: 'transparent'
            }
        });

        Render.run(render);
        runner = Runner.create();
        Runner.run(runner, engine);
    }

    function createTerrain() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        const leftWall = Bodies.rectangle(-50, height / 2, 100, height * 2, { isStatic: true });
        const rightWall = Bodies.rectangle(width + 50, height / 2, 100, height * 2, { isStatic: true });
        Composite.add(engine.world, [leftWall, rightWall]);

        const blockSize = 15;
        const cols = Math.floor(width / blockSize);
        
        const freq1 = 0.05 + rand() * 0.08;
        const freq2 = 0.02 + rand() * 0.04;
        const amp1  = 4 + rand() * 6;
        const amp2  = 2 + rand() * 4;
        const phase1 = rand() * Math.PI * 2;
        const phase2 = rand() * Math.PI * 2;
        const baseH  = 18 + rand() * 6; // Terreno muito mais alto com bastante solo
        
        // Terreno correto: elevacoes pra CIMA, reto fica mais BAIXO
        // Para cada coluna, calcula quantas fileiras de blocos existem a partir do chao
        for (let c = 0; c < cols; c++) {
            const terrainHeight = Math.max(2, Math.floor(
                Math.sin(c * freq1 + phase1) * amp1 +
                Math.sin(c * freq2 + phase2) * amp2 +
                baseH
            ));
            
            for (let r = 0; r < terrainHeight; r++) {
                const isTopLayer = r >= terrainHeight - 2;
                const color = isTopLayer ? '#4ade80' : '#8b4513';
                const strokeColor = isTopLayer ? '#166534' : '#451a03';
                // r=0 e o bloco mais baixo, perto do chao
                const yPos = height - 60 - r * blockSize - blockSize / 2;
                let block = Bodies.rectangle(c * blockSize + blockSize / 2, yPos, blockSize, blockSize, {
                    isStatic: true,
                    render: { fillStyle: color, strokeStyle: strokeColor, lineWidth: 1 }
                });
                block.isTerrain = true;
                block.syncId = `t-${c}-${r}`;
                terrainCatalog.set(block.syncId, {
                    x: c * blockSize + blockSize / 2,
                    y: yPos,
                    width: blockSize,
                    height: blockSize,
                    fillStyle: color,
                    strokeStyle: strokeColor
                });
                terrainBlocks.push(block);
                Composite.add(engine.world, block);
            }
        }
    }

    function spawnSoldiers() {
        const width = window.innerWidth;
        const radius = 20;

        const spawnTeam = (count, playerNum, emoji, color, startX, isP1, namesArray) => {
            const teamArray = isP1 ? p1Soldiers : p2Soldiers;
            for (let i = 0; i < count; i++) {
                let x = startX + (rand() * (width / 4)) * (isP1 ? 1 : -1);
                let y = 100 + (rand() * 100);
                
                let body = Bodies.circle(x, y, radius, {
                    restitution: 0.2, friction: 0.9, frictionStatic: 2.0, density: 0.1,
                    inertia: Infinity,
                    render: { visible: false }
                });
                body.player = playerNum;
                body.syncId = `p${playerNum}-${i}`;
                body.emoji = emoji;
                body.color = color;
                body.hp = 100;
                body.maxHp = 100;
                body.name = namesArray[i] || `Soldado ${i+1}`;
                body.isGiant = false;
                teamArray.push(body);
                Composite.add(engine.world, body);
            }
        };

        spawnTeam(config.player1.count, 1, config.player1.emoji, config.player1.color, 150, true, config.player1.soldierNames);
        spawnTeam(config.player2.count, 2, config.player2.emoji, config.player2.color, width - 150, false, config.player2.soldierNames);

        selectNextSoldier();
    }

    function assignIdleAnimations() {
        const animTypes = ['sleeping', 'dancing', 'bouncing', 'nodding', 'spinning', 'floating'];
        const allSoldiers = p1Soldiers.concat(p2Soldiers);
        allSoldiers.forEach(s => {
            if (s !== activeSoldier) {
                s.animType = animTypes[Math.floor(rand() * animTypes.length)];
                s.animOffset = rand() * Math.PI * 2;
            } else {
                s.animType = 'none';
            }
        });
    }

    function selectNextSoldier() {
        if (isGameOver) return;
        
        if (frozenTeams[currentTurn] > 0) {
            frozenTeams[currentTurn]--;
            showGiantAnnouncement("EQUIPE CONGELADA!");
            setTimeout(() => { endTurnSequence(1000); }, 1000);
            return;
        }

        const team = currentTurn === 1 ? p1Soldiers : p2Soldiers;
        if (team.length === 0) {
            checkWinState();
            return;
        }
        activeSoldier = team[Math.floor(rand() * team.length)];
        hasMoved = false;
        launchTrail = [];
        assignIdleAnimations();
        scheduleAiTurn();
    }

    function checkWinState() {
        if (isGameOver) return;
        if (p1Soldiers.length === 0 || p2Soldiers.length === 0) {
            isGameOver = true;
            let winnerName = "";
            if (p1Soldiers.length === 0 && p2Soldiers.length > 0) {
                p2Wins++;
                winnerName = config.player2.name;
            } else if (p2Soldiers.length === 0 && p1Soldiers.length > 0) {
                p1Wins++;
                winnerName = config.player1.name;
            } else {
                winnerName = "Empate!";
            }

            document.getElementById('p1-wins-display').textContent = `Vit?rias: ${p1Wins}`;
            document.getElementById('p2-wins-display').textContent = `Vit?rias: ${p2Wins}`;

            const turnTitle = document.getElementById('current-turn');
            turnTitle.textContent = winnerName === "Empate!" ? "Empate!" : `Vit?ria: ${winnerName}!!`;
            turnTitle.style.color = 'white';

            setTimeout(() => {
                document.getElementById('game-hud').classList.add('hidden');
                document.getElementById('ui-container').classList.remove('hidden');
                document.getElementById('night-overlay').classList.remove('active');
            }, 3000);
        }
    }

    function setupWeaponMenu() {
        const menu = document.getElementById('weapon-menu');
        if (weaponMenuInitialized) {
            menu.classList.add('hidden');
            return;
        }
        weaponMenuInitialized = true;

        const weaponBtns = document.querySelectorAll('.weapon-btn');
        const closeBtn = document.getElementById('close-weapon-btn');
        
        const btnP1 = document.getElementById('p1-arsenal-btn');
        const btnP2 = document.getElementById('p2-arsenal-btn');

        const openMenu = () => { if (!isAiming && canControlCurrentTurn()) menu.classList.remove('hidden'); };
        
        btnP1.addEventListener('click', openMenu);
        btnP2.addEventListener('click', openMenu);

        weaponBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const weapon = e.target.getAttribute('data-weapon');
                if (weapon === 'meteor' && meteorUses[currentTurn] <= 0) {
                    alert("Voc? j? usou o seu Meteoro nesta partida!");
                    return;
                }
                if (weapon === 'umbrella' && umbrellaUses[currentTurn] <= 0) {
                    alert("Voc? j? usou a Chuva ?cida nesta partida!");
                    return;
                }
                if (weapon === 'helmet' && healthHelmetUses[currentTurn] <= 0) {
                    alert("Voc? j? usou o Capacete Sa?de nesta partida!");
                    return;
                }
                if (weapon === 'icecube' && iceCubeUses[currentTurn] <= 0) { alert("Voc? j? usou o Cubo de Gelo!"); return; }
                if (weapon === 'fairy' && fairyUses[currentTurn] <= 0) { alert("Voc? j? usou a Fada Madrinha!"); return; }
                if (weapon === 'moai' && moaiUses[currentTurn] <= 0) { alert("Voc? j? usou a Est?tua Moai!"); return; }
                if (weapon === 'fan' && fanUses[currentTurn] <= 0) { alert("Voc? j? usou o Leque!"); return; }
                
                currentWeapon = weapon;
                menu.classList.add('hidden');

                if (['umbrella', 'saucer', 'lightning', 'helicopter', 'pepper', 'meteor', 'helmet', 'icecube', 'skip', 'fairy', 'moai', 'fan'].includes(weapon)) {
                    publishOnlineAction({ type: 'instantWeapon', weapon });
                    applyInstantWeapon(weapon, true);
                }
            });
        });

        closeBtn.addEventListener('click', () => menu.classList.add('hidden'));
    }

    function isAiTurn() {
        return config && config.mode === 'solo' && currentTurn === 2 && config.player2.isAI;
    }

    function canControlCurrentTurn() {
        if (isAiTurn()) return false;
        if (config && config.mode === 'online') {
            return config.localPlayer === currentTurn;
        }
        return true;
    }

    function scheduleAiTurn() {
        if (!isAiTurn() || isAiThinking || isGameOver || !activeSoldier) return;
        isAiThinking = true;
        document.getElementById('game-instructions').textContent = 'IA pensando...';

        setTimeout(() => {
            if (!isAiTurn() || isGameOver || !activeSoldier) {
                isAiThinking = false;
                return;
            }
            runAiTurn();
        }, 900);
    }

    function runAiTurn() {
        const enemies = p1Soldiers.filter(s => s.hp > 0);
        if (enemies.length === 0) {
            isAiThinking = false;
            checkWinState();
            return;
        }

        const target = enemies.reduce((closest, soldier) => {
            const closestDist = Vector.magnitude(Vector.sub(closest.position, activeSoldier.position));
            const soldierDist = Vector.magnitude(Vector.sub(soldier.position, activeSoldier.position));
            return soldierDist < closestDist ? soldier : closest;
        }, enemies[0]);

        const moveDir = Math.sign(target.position.x - activeSoldier.position.x) || -1;
        Matter.Body.applyForce(activeSoldier, activeSoldier.position, {
            x: moveDir * 0.01 * activeSoldier.mass,
            y: -0.008 * activeSoldier.mass
        });

        showGiantAnnouncement("IA ATACANDO!");

        setTimeout(() => {
            if (!isAiTurn() || isGameOver || !activeSoldier || target.hp <= 0) {
                isAiThinking = false;
                endTurnSequence(800);
                return;
            }

            const weaponChoices = ['grenade', 'gun', 'dynamite', 'sheep', 'sock', 'boomerang', 'frisbee'];
            if (meteorUses[currentTurn] > 0 && rand() < 0.25) weaponChoices.push('meteor');
            if (fairyUses[currentTurn] > 0 && rand() < 0.2) weaponChoices.push('fairy');
            if (healthHelmetUses[currentTurn] > 0 && rand() < 0.12) weaponChoices.push('helmet');

            currentWeapon = weaponChoices[Math.floor(rand() * weaponChoices.length)];

            const dx = target.position.x - activeSoldier.position.x;
            const dy = target.position.y - activeSoldier.position.y;
            const forceVector = {
                x: Math.max(-260, Math.min(260, dx * 0.75)),
                y: Math.max(-260, Math.min(120, dy * 0.6 - 170))
            };

            shootWeapon(activeSoldier.position, forceVector, activeSoldier.color);
            isAiThinking = false;
            endTurnSequence(['meteor', 'fairy', 'helmet'].includes(currentWeapon) ? 3000 : 2600);
        }, 900);
    }

    function setupControls() {
        const canvas = render.canvas;

        const handleStart = (x, y) => {
            if (!activeSoldier || isGameOver) return;
            if (!canControlCurrentTurn()) return;
            if (['umbrella', 'saucer', 'lightning', 'helicopter', 'pepper', 'meteor', 'helmet', 'icecube', 'skip', 'fairy', 'moai', 'fan'].includes(currentWeapon)) return;
            isAiming = true;
            dragStart = { x: x, y: y };
        };

        const handleMove = (x, y) => {
            if (isAiming) {
                window.mouseX = x;
                window.mouseY = y;
            }
        };

        const handleEnd = (x, y) => {
            if (!isAiming || !activeSoldier || isGameOver) return;
            isAiming = false;
            
            const dragEnd = { x: x, y: y };
            const forceX = (dragStart.x - dragEnd.x);
            const forceY = (dragStart.y - dragEnd.y);
            publishOnlineAction({ type: 'drag', forceX, forceY, weapon: currentWeapon });
            applyDragAction(forceX, forceY, currentWeapon, true);
        };

        canvas.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
        canvas.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
        canvas.addEventListener('mouseup', (e) => handleEnd(e.clientX, e.clientY));

        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleStart(e.touches[0].clientX, e.touches[0].clientY); });
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); });
        canvas.addEventListener('touchend', (e) => { e.preventDefault(); if(dragStart && window.mouseX) handleEnd(window.mouseX, window.mouseY); });
    }

    function publishOnlineAction(action) {
        if (!config || config.mode !== 'online' || !canControlCurrentTurn() || typeof config.onOnlineAction !== 'function') return;
        config.onOnlineAction({
            ...action,
            player: currentTurn
        });
    }

    function applyInstantWeapon(weapon, publishSnapshot = false) {
        currentWeapon = weapon;
        shootWeapon(activeSoldier ? activeSoldier.position : {x:0, y:0}, {x:0, y:0}, activeSoldier ? activeSoldier.color : '#fff');
        endTurnSequence(weapon === 'helicopter' || weapon === 'pepper' ? 7000 : 3000, publishSnapshot);
    }

    function applyDragAction(forceX, forceY, weapon = currentWeapon, publishSnapshot = false) {
        if (!activeSoldier || isGameOver) return;
        currentWeapon = weapon;

            // Primeiro drag do turno: LANCA o soldado (como bomba, sem explodir), forca proporcional ao vetor de drag
            if (!hasMoved) {
                hasMoved = true;
                const magnitude = Math.sqrt(forceX * forceX + forceY * forceY);
                if (magnitude > 5) {
                    const scale = activeSoldier.isGiant ? 4 : 1;
                    // Lancamento com fisica proporcional (slingshot) como a granada
                    Matter.Body.applyForce(activeSoldier, activeSoldier.position, {
                        x: forceX * 0.025 * scale,
                        y: forceY * 0.025 * scale
                    });
                    // Trilha de lancamento
                    launchTrail = [];
                    const trailInterval = setInterval(() => {
                        if (!activeSoldier || isGameOver) { clearInterval(trailInterval); return; }
                        launchTrail.push({ x: activeSoldier.position.x, y: activeSoldier.position.y, life: 1.0 });
                        if (launchTrail.length > 12) launchTrail.shift();
                    }, 40);
                    setTimeout(() => { clearInterval(trailInterval); launchTrail = []; }, 1500);
                }

                document.getElementById('p1-arsenal-btn').classList.remove('disabled-btn');
                document.getElementById('p2-arsenal-btn').classList.remove('disabled-btn');
                showGiantAnnouncement("ESCOLHA SUA ARMA E ATAQUE!");
                return; // nao termina o turno
            }

            // Drags seguintes: DISPARA arma e termina o turno
            shootWeapon(activeSoldier.position, { x: forceX, y: forceY }, activeSoldier.color);
            endTurnSequence(3000, publishSnapshot);
    }

    function applyOnlineAction(action) {
        if (!action || isGameOver || action.player !== currentTurn) return;
        if (action.type === 'instantWeapon') {
            applyInstantWeapon(action.weapon, false);
            return;
        }
        if (action.type === 'drag') {
            applyDragAction(action.forceX, action.forceY, action.weapon, false);
        }
    }

    function publishOnlineSnapshot() {
        if (!config || config.mode !== 'online' || typeof config.onOnlineSnapshot !== 'function') return;
        config.onOnlineSnapshot(createOnlineSnapshot());
    }

    function createOnlineSnapshot() {
        const allSoldiers = p1Soldiers.concat(p2Soldiers, deadSoldiers);
        return {
            currentTurn,
            currentWeapon,
            hasMoved,
            activeSoldierId: activeSoldier ? activeSoldier.syncId : null,
            meteorUses: { ...meteorUses },
            umbrellaUses: { ...umbrellaUses },
            healthHelmetUses: { ...healthHelmetUses },
            iceCubeUses: { ...iceCubeUses },
            fairyUses: { ...fairyUses },
            moaiUses: { ...moaiUses },
            fanUses: { ...fanUses },
            giantTurns: { ...giantTurns },
            frozenTeams: { ...frozenTeams },
            terrainIds: terrainBlocks.map(block => block.syncId),
            soldiers: allSoldiers.map(soldier => ({
                id: soldier.syncId,
                player: soldier.player,
                alive: soldier.hp > 0 && (p1Soldiers.includes(soldier) || p2Soldiers.includes(soldier)),
                hp: soldier.hp,
                maxHp: soldier.maxHp,
                emoji: soldier.emoji,
                name: soldier.name,
                isGiant: soldier.isGiant,
                x: soldier.position.x,
                y: soldier.position.y,
                vx: soldier.velocity.x,
                vy: soldier.velocity.y,
                angle: soldier.angle,
                angularVelocity: soldier.angularVelocity || 0
            }))
        };
    }

    function applyOnlineSnapshot(snapshot) {
        if (!snapshot || isGameOver) return;

        const terrainSet = new Set(snapshot.terrainIds || []);
        terrainBlocks = terrainBlocks.filter(block => {
            if (!terrainSet.has(block.syncId)) {
                Composite.remove(engine.world, block);
                return false;
            }
            return true;
        });

        const existingTerrainIds = new Set(terrainBlocks.map(block => block.syncId));
        terrainSet.forEach(id => {
            if (existingTerrainIds.has(id)) return;
            const data = terrainCatalog.get(id);
            if (!data) return;

            const block = Bodies.rectangle(data.x, data.y, data.width, data.height, {
                isStatic: true,
                render: { fillStyle: data.fillStyle, strokeStyle: data.strokeStyle, lineWidth: 1 }
            });
            block.isTerrain = true;
            block.syncId = id;
            terrainBlocks.push(block);
            Composite.add(engine.world, block);
        });

        const allSoldiers = p1Soldiers.concat(p2Soldiers, deadSoldiers);
        const soldierById = new Map(allSoldiers.map(soldier => [soldier.syncId, soldier]));

        p1Soldiers = [];
        p2Soldiers = [];
        deadSoldiers = [];

        (snapshot.soldiers || []).forEach(data => {
            const soldier = soldierById.get(data.id);
            if (!soldier) return;

            soldier.hp = data.hp;
            soldier.maxHp = data.maxHp;
            soldier.emoji = data.emoji;
            soldier.name = data.name;
            soldier.isGiant = data.isGiant;
            Matter.Body.setPosition(soldier, { x: data.x, y: data.y });
            Matter.Body.setVelocity(soldier, { x: data.vx, y: data.vy });
            Matter.Body.setAngle(soldier, data.angle || 0);
            Matter.Body.setAngularVelocity(soldier, data.angularVelocity || 0);

            if (data.alive && data.player === 1) {
                p1Soldiers.push(soldier);
            } else if (data.alive && data.player === 2) {
                p2Soldiers.push(soldier);
            } else {
                soldier.hp = 0;
                soldier.emoji = '⚰️';
                deadSoldiers.push(soldier);
            }
        });

        currentTurn = snapshot.currentTurn;
        currentWeapon = snapshot.currentWeapon || 'grenade';
        hasMoved = !!snapshot.hasMoved;
        meteorUses = { ...meteorUses, ...(snapshot.meteorUses || {}) };
        umbrellaUses = { ...umbrellaUses, ...(snapshot.umbrellaUses || {}) };
        healthHelmetUses = { ...healthHelmetUses, ...(snapshot.healthHelmetUses || {}) };
        iceCubeUses = { ...iceCubeUses, ...(snapshot.iceCubeUses || {}) };
        fairyUses = { ...fairyUses, ...(snapshot.fairyUses || {}) };
        moaiUses = { ...moaiUses, ...(snapshot.moaiUses || {}) };
        fanUses = { ...fanUses, ...(snapshot.fanUses || {}) };
        giantTurns = { ...giantTurns, ...(snapshot.giantTurns || {}) };
        frozenTeams = { ...frozenTeams, ...(snapshot.frozenTeams || {}) };
        activeSoldier = soldierById.get(snapshot.activeSoldierId) || null;
        isAiming = false;
        launchTrail = [];

        updateTurnUI();
        checkWinState();
    }
    
    function endTurnSequence(delay = 3000, publishSnapshot = false) {
        isAiming = false;

        setTimeout(() => {
            if(!isGameOver) {
                applyToxicDamage();
                processGiantStatus();
                
                const nightOverlay = document.getElementById('night-overlay');
                if (typeof isNightNextTurn !== 'undefined' && isNightNextTurn) {
                    nightOverlay.classList.add('active');
                    isNightNextTurn = false;
                } else if (nightOverlay) {
                    nightOverlay.classList.remove('active');
                }

                currentTurn = currentTurn === 1 ? 2 : 1;
                updateTurnUI();
                selectNextSoldier();
                
                currentWeapon = 'grenade';
                if (publishSnapshot) {
                    publishOnlineSnapshot();
                }
            }
        }, delay);
    }

    function processGiantStatus() {
        if (giantTurns[currentTurn] > 0) {
            giantTurns[currentTurn]--;
            const soldiers = currentTurn === 1 ? p1Soldiers : p2Soldiers;
            
            if (giantTurns[currentTurn] === 0) {
                // Fim dos 3 turnos exatos, volta ao normal
                soldiers.forEach(s => {
                    if (s.isGiant) {
                        Matter.Body.scale(s, 0.5, 0.5);
                        s.isGiant = false;
                    }
                });
            }
        }
    }

    function applyToxicDamage() {
        const allSoldiers = p1Soldiers.concat(p2Soldiers);
        toxicSocks.forEach(sock => {
            allSoldiers.forEach(soldier => {
                const dist = Vector.magnitude(Vector.sub(soldier.position, sock.position));
                if (dist < 100) {
                    soldier.hp -= 5;
                    if (soldier.hp <= 0) killSoldier(soldier);
                }
            });
        });
    }

    function shootWeapon(startPos, forceVector, color) {
        const mag = Math.sqrt(forceVector.x * forceVector.x + forceVector.y * forceVector.y);
        const offsetVec = mag > 0 ? { x: forceVector.x / mag, y: forceVector.y / mag } : { x: 1, y: 0 };
        const spawnPos = Vector.add(startPos, Vector.mult(offsetVec, activeSoldier && activeSoldier.isGiant ? 60 : 30));

        if (currentWeapon === 'grenade') {
            const projectile = Bodies.circle(spawnPos.x, spawnPos.y, 12, {
                restitution: 0.6, friction: 0.1, density: 0.05, render: { visible: false }
            });
            projectile.isWeapon = true; projectile.emoji = '💣';
            Composite.add(engine.world, projectile);
            Matter.Body.applyForce(projectile, projectile.position, Vector.mult(forceVector, 0.005));
            setTimeout(() => {
                if(!projectile.destroyed) {
                    projectile.destroyed = true;
                    explode(projectile.position, 150, 0.2); 
                    Composite.remove(engine.world, projectile);
                }
            }, 3000);
        } 
        else if (currentWeapon === 'gun') {
            const projectile = Bodies.circle(spawnPos.x, spawnPos.y, 8, {
                restitution: 0.2, friction: 0.1, density: 0.1, 
                ignoreGravity: true, render: { fillStyle: '#ff8c00' }
            });
            projectile.isBullet = true;
            Composite.add(engine.world, projectile);
            Matter.Body.applyForce(projectile, projectile.position, Vector.mult(forceVector, 0.015));
        }
        else if (currentWeapon === 'dynamite') {
            const projectile = Bodies.rectangle(startPos.x + (offsetVec.x * 20), startPos.y + (offsetVec.y * 20), 10, 25, {
                restitution: 0.1, friction: 0.8, density: 0.1, render: { visible: false }
            });
            projectile.isWeapon = true; projectile.emoji = '🧨';
            Composite.add(engine.world, projectile);
            Matter.Body.applyForce(projectile, projectile.position, Vector.mult(forceVector, 0.0025));
            setTimeout(() => {
                if(!projectile.destroyed) {
                    projectile.destroyed = true;
                    explode(projectile.position, 250, 0.4);
                    Composite.remove(engine.world, projectile);
                }
            }, 4000);
        }
        else if (currentWeapon === 'meteor') {
            meteorUses[currentTurn]--;
            const enemyTeam = currentTurn === 1 ? p2Soldiers : p1Soldiers;
            let targetX = window.innerWidth * (currentTurn === 1 ? 0.75 : 0.25);
            if (enemyTeam.length > 0) {
                const targetEnemy = enemyTeam[Math.floor(rand() * enemyTeam.length)];
                targetX = targetEnemy.position.x;
            }
            const startX = window.innerWidth * 0.5; // Centro superior da tela
            const startY = -100;
            const dx = targetX - startX;
            const dy = (window.innerHeight * 0.7) - startY;
            const distance = Math.sqrt(dx*dx + dy*dy) || 1;
            
            const projectile = Bodies.circle(startX, startY, 40, {
                restitution: 0.1, friction: 0.1, density: 0.8,
                render: { visible: false }
            });
            projectile.isWeapon = true; projectile.emoji = '☄️'; projectile.isMeteor = true;
            Composite.add(engine.world, projectile);
            Matter.Body.setVelocity(projectile, { x: (dx / distance) * 16, y: (dy / distance) * 16 });
        }
        else if (currentWeapon === 'sheep') {
            const projectile = Bodies.circle(spawnPos.x, spawnPos.y, 20, {
                restitution: 0.9, friction: 0.1, density: 0.02, render: { visible: false }
            });
            projectile.isWeapon = true; projectile.emoji = '🐑';
            projectile.bounces = 0;
            Composite.add(engine.world, projectile);
            Matter.Body.applyForce(projectile, projectile.position, Vector.mult(forceVector, 0.005));
        }
        else if (currentWeapon === 'sock') {
            const projectile = Bodies.circle(spawnPos.x, spawnPos.y, 15, {
                restitution: 0.1, friction: 0.8, density: 0.05, render: { visible: false }
            });
            projectile.isWeapon = true; projectile.emoji = '🧦';
            projectile.sockPulse = 0;
            Composite.add(engine.world, projectile);
            Matter.Body.applyForce(projectile, projectile.position, Vector.mult(forceVector, 0.005));
            toxicSocks.push(projectile);
        }
        else if (currentWeapon === 'boomerang') {
            const projectile = Bodies.circle(spawnPos.x, spawnPos.y, 15, {
                restitution: 0.5, friction: 0.01, density: 0.05, render: { visible: false }
            });
            projectile.isWeapon = true; projectile.emoji = '🪃';
            projectile.originPos = { x: startPos.x, y: startPos.y };
            projectile.canReturn = false;
            Composite.add(engine.world, projectile);
            Matter.Body.applyForce(projectile, projectile.position, Vector.mult(forceVector, 0.012));
            boomerangs.push(projectile);
            setTimeout(() => { projectile.canReturn = true; }, 800);
            setTimeout(() => {
                if(!projectile.destroyed) {
                    projectile.destroyed = true;
                    boomerangs = boomerangs.filter(b => b !== projectile);
                    explode(projectile.position, 100, 0.1);
                    Composite.remove(engine.world, projectile);
                }
            }, 4000);
        }
        else if (currentWeapon === 'umbrella') {
            umbrellaUses[currentTurn]--;
            document.body.classList.add('dark-sky');
            const enemies = currentTurn === 1 ? p2Soldiers : p1Soldiers;
            const dropsCount = 10;
            for(let i=0; i<dropsCount; i++) {
                setTimeout(() => {
                    let targetX;
                    if (rand() > 0.3 && enemies.length > 0) {
                        const enemy = enemies[Math.floor(rand() * enemies.length)];
                        targetX = enemy.position.x + (rand() * 60 - 30);
                    } else {
                        targetX = 50 + rand() * (window.innerWidth - 100);
                    }
                    const drop = Bodies.circle(targetX, -50, 5, {
                        restitution: 0.1, density: 0.05, render: { visible: false }
                    });
                    drop.isDrop = true;
                    Composite.add(engine.world, drop);
                    Matter.Body.applyForce(drop, drop.position, {x:0, y:0.02});
                }, i * 200);
            }
            setTimeout(() => { document.body.classList.remove('dark-sky'); }, 6000);
        }
        else if (currentWeapon === 'saucer') {
            const enemies = currentTurn === 1 ? p2Soldiers : p1Soldiers;
            const myTeam = currentTurn === 1 ? p1Soldiers : p2Soldiers;
            if (enemies.length > 0) {
                const victim = enemies[Math.floor(rand() * enemies.length)];
                let landX = window.innerWidth * (currentTurn === 1 ? 0.25 : 0.75);
                if (myTeam.length > 0) {
                    landX = myTeam.reduce((sum, s) => sum + s.position.x, 0) / myTeam.length;
                }
                const startSaucerX = currentTurn === 1 ? -100 : window.innerWidth + 100;
                saucerAnim = {
                    x: startSaucerX,
                    y: victim.position.y - 120,
                    targetX: victim.position.x,
                    phase: 'flying',
                    victim: victim,
                    landX: landX,
                    beam: 0,
                    dir: currentTurn === 1 ? 1 : -1
                };
            }
        }
        else if (currentWeapon === 'lightning') {
            const enemyTeamNum = currentTurn === 1 ? 2 : 1;
            giantTurns[enemyTeamNum] = 2; // 1 turno util
            const enemies = currentTurn === 1 ? p2Soldiers : p1Soldiers;
            enemies.forEach(s => {
                if (!s.isGiant) {
                    Matter.Body.scale(s, 2, 2);
                    s.isGiant = true;
                }
            });
        }
        else if (currentWeapon === 'pumpkin') {
            const projectile = Bodies.circle(spawnPos.x, spawnPos.y, 15, {
                restitution: 0.5, friction: 0.3, density: 0.05, render: { visible: false }
            });
            projectile.isWeapon = true; projectile.emoji = '🎃';
            projectile.isPumpkinMine = true;
            projectile.armed = false;
            Composite.add(engine.world, projectile);
            Matter.Body.applyForce(projectile, projectile.position, Vector.mult(forceVector, 0.005));
            setTimeout(() => { projectile.armed = true; }, 1200);
            pumpkinMines.push(projectile);
        }
        else if (currentWeapon === 'pepper') {
            const dirX = currentTurn === 1 ? 1 : -1;
            pepperEffects.push({
                x: activeSoldier ? activeSoldier.position.x : 0,
                y: activeSoldier ? activeSoldier.position.y : 0,
                dirX: dirX,
                range: 280,
                life: 7.0,
                startTime: Date.now(),
                burnedSoldiers: new Map()
            });
        }
        else if (currentWeapon === 'helicopter') {
            const fromLeft = currentTurn === 1;
            const heliY = window.innerHeight * 0.22;
            window._heliState = {
                x: fromLeft ? -80 : window.innerWidth + 80,
                y: heliY,
                speed: fromLeft ? 3 : -3,
                active: true
            };
            const beanInterval = setInterval(() => {
                if (!window._heliState || !window._heliState.active || !engine) { clearInterval(beanInterval); return; }
                const bean = Bodies.circle(window._heliState.x, window._heliState.y + 40, 8, {
                    restitution: 0.3, friction: 0.5, density: 0.1, render: { visible: false }
                });
                bean.isWeapon = true; bean.emoji = '🫘'; bean.isBean = true;
                Composite.add(engine.world, bean);
                heliBeans.push(bean);
                setTimeout(() => {
                    if (!bean.destroyed) {
                        bean.destroyed = true;
                        explode(bean.position, 80, 0.15);
                        Composite.remove(engine.world, bean);
                        heliBeans = heliBeans.filter(b => b !== bean);
                    }
                }, 3000);
            }, 950); // Intervalo maior para soltar menos feijoes
            const moveInterval = setInterval(() => {
                if (!window._heliState) { clearInterval(moveInterval); clearInterval(beanInterval); return; }
                window._heliState.x += window._heliState.speed;
                const done = fromLeft ? window._heliState.x > window.innerWidth + 100 : window._heliState.x < -100;
                if (done) { clearInterval(moveInterval); clearInterval(beanInterval); window._heliState.active = false; }
            }, 16);
        }
        else if (currentWeapon === 'helmet') {
            healthHelmetUses[currentTurn]--;
            const myTeam = currentTurn === 1 ? p1Soldiers : p2Soldiers;
            myTeam.forEach(s => {
                if (s.hp > 0) {
                    s.hp = Math.min(s.maxHp, s.hp + 20);
                    visualEffects.push({ x: s.position.x, y: s.position.y - 40, text: '💖 +20', life: 1.0, isText: true });
                }
            });
        }
        else if (currentWeapon === 'magnet') {
            const projectile = Bodies.circle(spawnPos.x, spawnPos.y, 15, {
                restitution: 0.1, friction: 0.8, density: 0.2, render: { visible: false }
            });
            projectile.isWeapon = true; projectile.emoji = '🧲'; projectile.isMagnet = true;
            Composite.add(engine.world, projectile);
            Matter.Body.applyForce(projectile, projectile.position, Vector.mult(forceVector, 0.003));
            magnets.push(projectile);
        }
        else if (currentWeapon === 'frisbee') {
            const projectile = Bodies.circle(spawnPos.x, spawnPos.y, 15, {
                restitution: 0.9, friction: 0.05, density: 0.05, render: { visible: false }
            });
            projectile.isWeapon = true; projectile.emoji = '🥏'; projectile.isFrisbee = true; projectile.bounces = 0;
            Composite.add(engine.world, projectile);
            Matter.Body.applyForce(projectile, projectile.position, Vector.mult(forceVector, 0.008));
            frisbees.push(projectile);
        }
        else if (currentWeapon === 'icecube') {
            iceCubeUses[currentTurn]--;
            frozenTeams[currentTurn] = 1;
            const myTeam = currentTurn === 1 ? p1Soldiers : p2Soldiers;
            myTeam.forEach(s => {
                visualEffects.push({ x: s.position.x, y: s.position.y - 40, text: '🧊', life: 1.0, isText: true });
            });
            showGiantAnnouncement("EQUIPE CONGELADA!");
        }
        else if (currentWeapon === 'skip') {
            showGiantAnnouncement("TURNO PULADO!");
        }
        else if (currentWeapon === 'fairy') {
            fairyUses[currentTurn]--;
            const fairy = Bodies.circle(spawnPos.x, spawnPos.y - 50, 15, { render: { visible: false }, isSensor: true });
            fairy.isWeapon = true; fairy.emoji = '🧚'; fairy.isFairy = true;
            const enemies = currentTurn === 1 ? p2Soldiers : p1Soldiers;
            const aliveEnemies = enemies.filter(s => s.hp > 0);
            if (aliveEnemies.length > 0) {
                fairy.target = aliveEnemies[Math.floor(rand() * aliveEnemies.length)];
            }
            Composite.add(engine.world, fairy);
            fairies.push(fairy);
        }
        else if (currentWeapon === 'moai') {
            moaiUses[currentTurn]--;
            const enemies = currentTurn === 1 ? p2Soldiers : p1Soldiers;
            const aliveEnemies = enemies.filter(s => s.hp > 0);
            let targetX = window.innerWidth / 2;
            if (aliveEnemies.length > 0) {
                targetX = aliveEnemies[Math.floor(rand() * aliveEnemies.length)].position.x;
            }
            const moai = Bodies.rectangle(targetX, -200, 80, 150, {
                restitution: 0, friction: 0, density: 100, isSensor: true, render: { visible: false }
            });
            Matter.Body.setInertia(moai, Infinity);
            moai.isWeapon = true; moai.emoji = '🗿'; moai.isMoai = true;
            Composite.add(engine.world, moai);
            moais.push(moai);
        }
        else if (currentWeapon === 'fan') {
            fanUses[currentTurn]--;
            const dir = currentTurn === 1 ? 1 : -1;
            const allSoldiers = p1Soldiers.concat(p2Soldiers);
            
            for(let i=0; i<40; i++) {
                visualEffects.push({
                    x: rand() * window.innerWidth,
                    y: rand() * window.innerHeight,
                    text: '🍃', life: 2.0 + rand(), isText: true,
                    vx: dir * (15 + rand() * 15),
                    vy: (rand() - 0.5) * 5
                });
            }

            let fanCount = 0;
            const fanInterval = setInterval(() => {
                if(isGameOver || fanCount > 40) { clearInterval(fanInterval); return; }
                allSoldiers.forEach(s => {
                    if (s.hp > 0) Matter.Body.applyForce(s, s.position, { x: dir * 0.02 * s.mass, y: -0.002 * s.mass });
                });
                fanCount++;
            }, 50);
        }
    }

    function setupCollisions() {
        Events.on(engine, 'collisionStart', function(event) {
            const allSoldiers = p1Soldiers.concat(p2Soldiers);
            event.pairs.forEach(pair => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
                if (bodyA.isFrisbee || bodyB.isFrisbee) {
                    const frisbee = bodyA.isFrisbee ? bodyA : bodyB;
                    const other = bodyA.isFrisbee ? bodyB : bodyA;
                    if (!frisbee.destroyed) {
                        if (other.isTerrain || other.isStatic || (allSoldiers.includes(other) && other.hp > 0)) {
                            if (allSoldiers.includes(other)) {
                                other.hp -= 15;
                                if (other.hp <= 0) killSoldier(other);
                            }
                            frisbee.destroyed = true;
                            frisbees = frisbees.filter(f => f !== frisbee);
                            explode(frisbee.position, 60, 0.15);
                            Composite.remove(engine.world, frisbee);
                        }
                    }
                }
                
                [bodyA, bodyB].forEach(body => {
                    if (body.isMeteor && !body.destroyed) {
                        body.destroyed = true;
                        explode(body.position, 220, 0.5);
                        Composite.remove(engine.world, body);
                    }
                    if (body.isWeapon && body.emoji === '🐑') {
                        body.bounces = (body.bounces || 0) + 1;
                        if (body.bounces >= 7 && !body.destroyed) {
                            body.destroyed = true;
                            explode(body.position, 200, 0.25);
                            Composite.remove(engine.world, body);
                        }
                    }
                    if (body.isBullet) {
                        if (!body.destroyed) {
                            body.destroyed = true;
                            explode(body.position, 40, 0.1); 
                            Composite.remove(engine.world, body);
                        }
                    }
                    if (body.isDrop) {
                        if (!body.destroyed) {
                            body.destroyed = true;
                            explode(body.position, 30, 0.02);
                            Composite.remove(engine.world, body);
                        }
                    }
                    if (body.isWeapon && body.emoji === '🪃') {
                        if (body.canReturn && !body.destroyed) {
                            body.destroyed = true;
                            boomerangs = boomerangs.filter(b => b !== body);
                            explode(body.position, 80, 0.1);
                            Composite.remove(engine.world, body);
                        }
                    }
                });
            });
        });

        Events.on(engine, 'beforeUpdate', function() {
            engine.world.bodies.forEach(body => {
                if (body.ignoreGravity) {
                    body.force.y -= body.mass * engine.gravity.y * engine.gravity.scale;
                }
            });

            boomerangs.forEach(b => {
                if (b.canReturn && !b.destroyed) {
                    const speed = Vector.magnitude(b.velocity);
                    const dirToOrigin = Vector.normalise(Vector.sub(b.originPos, b.position));
                    const newVel = Vector.mult(Vector.normalise(Vector.add(Vector.normalise(b.velocity), Vector.mult(dirToOrigin, 0.3))), speed);
                    Matter.Body.setVelocity(b, newVel);
                }
            });

            const allSoldiers = p1Soldiers.concat(p2Soldiers);

            for(let i=moais.length-1; i>=0; i--) {
                const m = moais[i];
                if (m.position.y > window.innerHeight) { Composite.remove(engine.world, m); moais.splice(i,1); continue; }
                Matter.Body.setVelocity(m, {x:0, y:8});
                
                terrainBlocks = terrainBlocks.filter(b => {
                    if (Matter.Bounds.overlaps(m.bounds, b.bounds)) {
                        Composite.remove(engine.world, b);
                        return false;
                    }
                    return true;
                });
                allSoldiers.forEach(s => {
                    if (s.hp > 0 && Matter.Bounds.overlaps(m.bounds, s.bounds)) {
                        s.hp -= 50; 
                        if (s.hp <= 0) killSoldier(s);
                    }
                });
            }

            for (let i = fairies.length - 1; i >= 0; i--) {
                const f = fairies[i];
                if (f.destroyed) continue;
                if (f.target && f.target.hp > 0) {
                    const dir = Vector.normalise(Vector.sub(f.target.position, f.position));
                    const crazyX = Math.sin(Date.now() / 100) * 4;
                    const crazyY = Math.cos(Date.now() / 100) * 4;
                    Matter.Body.setVelocity(f, { x: dir.x * 7 + crazyX, y: dir.y * 7 + crazyY });
                    
                    const dist = Vector.magnitude(Vector.sub(f.target.position, f.position));
                    if (dist < 30) {
                        f.destroyed = true;
                        explode(f.position, 120, 0.3);
                        Composite.remove(engine.world, f);
                        fairies.splice(i, 1);
                    }
                } else {
                    Matter.Body.setVelocity(f, { x: 0, y: -5 });
                    if(f.position.y < -100) {
                        Composite.remove(engine.world, f);
                        fairies.splice(i, 1);
                    }
                }
            }

            // Ima: atrai qualquer projetil em um raio ampliado (raio 300)
            for (let i = magnets.length - 1; i >= 0; i--) {
                const m = magnets[i];
                if (m.destroyed) continue;
                engine.world.bodies.forEach(b => {
                    if ((b.isWeapon || b.isBullet || b.isFrisbee || b.isBean || b.isMeteor || b.isPumpkinMine || b.isDrop || b.isFairy) && b !== m && !b.destroyed) {
                        const dist = Vector.magnitude(Vector.sub(b.position, m.position));
                        if (dist < 300) {
                            const forceDir = Vector.normalise(Vector.sub(m.position, b.position));
                            Matter.Body.applyForce(b, b.position, Vector.mult(forceDir, 0.005));
                            if (dist < 30) {
                                m.destroyed = true; b.destroyed = true;
                                magnets.splice(i, 1);
                                explode(m.position, 90, 0.2);
                                Composite.remove(engine.world, m); Composite.remove(engine.world, b);
                            }
                        }
                    }
                });
            }

            // Pumpkin mine: detecta inimigos proximos e explode causando 20% de dano
            for (let i = pumpkinMines.length - 1; i >= 0; i--) {
                const mine = pumpkinMines[i];
                if (!mine.armed || mine.destroyed) continue;
                const triggerRadius = 60; // 3x tamanho do soldado (raio 20 * 3)
                for (const s of allSoldiers) {
                    if (s.hp <= 0) continue;
                    const dist = Vector.magnitude(Vector.sub(s.position, mine.position));
                    if (dist < triggerRadius) {
                        mine.destroyed = true;
                        // Dano exato de 20% (20 hp)
                        allSoldiers.forEach(sol => {
                            const d = Vector.magnitude(Vector.sub(sol.position, mine.position));
                            if (d < triggerRadius * 1.5) {
                                sol.hp -= 20;
                                if (sol.hp <= 0) killSoldier(sol);
                            }
                        });
                        // Chama explode com customDamage=0 para criar o efeito visual e knockback sem somar dano extra
                        explode(mine.position, 90, 0.15, 0);
                        Composite.remove(engine.world, mine);
                        pumpkinMines.splice(i, 1);
                        break;
                    }
                }
            }

            // Pepper: dano por queimadura 1%/s por ate 7s
            const now = Date.now();
            for (let i = pepperEffects.length - 1; i >= 0; i--) {
                const fx = pepperEffects[i];
                fx.life = 7.0 - (now - fx.startTime) / 1000;
                if (fx.life <= 0) { pepperEffects.splice(i, 1); continue; }
                allSoldiers.forEach(s => {
                    if (s.hp <= 0) return;
                    const dx = s.position.x - fx.x;
                    if (Math.sign(dx) === fx.dirX && Math.abs(dx) <= fx.range && Math.abs(s.position.y - fx.y) < 60) {
                        const lastBurn = fx.burnedSoldiers.get(s) || 0;
                        if (now - lastBurn >= 1000) {
                            s.hp -= 1;
                            fx.burnedSoldiers.set(s, now);
                            if (s.hp <= 0) killSoldier(s);
                        }
                    }
                });
            }

            // Saucer animation: transporta ate a base inimiga / onde estao os rivais
            if (saucerAnim) {
                const sa = saucerAnim;
                if (sa.phase === 'flying') {
                    const spd = sa.dir * 5;
                    sa.x += spd;
                    if ((sa.dir > 0 && sa.x >= sa.targetX) || (sa.dir < 0 && sa.x <= sa.targetX)) {
                        sa.x = sa.targetX;
                        sa.phase = 'beaming';
                        sa.beamTimer = 0;
                    }
                } else if (sa.phase === 'beaming') {
                    sa.beamTimer = (sa.beamTimer || 0) + 1;
                    sa.beam = Math.sin(sa.beamTimer * 0.2) * 0.5 + 0.5;
                    if (sa.victim && !sa.victim.destroyed && sa.victim.hp > 0) {
                        const targetY = sa.y + 35;
                        const distY = sa.victim.position.y - targetY;
                        if (distY > 5) {
                            Matter.Body.setVelocity(sa.victim, { x: 0, y: -2.5 });
                        } else {
                            Matter.Body.setPosition(sa.victim, { x: sa.x, y: targetY });
                            Matter.Body.setVelocity(sa.victim, { x: 0, y: 0 });
                        }
                    }
                    if (sa.beamTimer > 60) {
                        sa.phase = 'lifting';
                    }
                } else if (sa.phase === 'lifting') {
                    sa.y -= 5;
                    if (sa.victim && !sa.victim.destroyed && sa.victim.hp > 0) {
                        Matter.Body.setPosition(sa.victim, { x: sa.x, y: sa.y + 35 });
                        Matter.Body.setVelocity(sa.victim, { x: 0, y: 0 });
                    }
                    if (sa.y < 100) {
                        sa.phase = 'carrying';
                        sa.carryDirX = Math.sign(sa.landX - sa.x) || (currentTurn === 1 ? -1 : 1);
                    }
                } else if (sa.phase === 'carrying') {
                    const spd = sa.carryDirX * 8;
                    sa.x += spd;
                    if (sa.victim && !sa.victim.destroyed && sa.victim.hp > 0) {
                        Matter.Body.setPosition(sa.victim, { x: sa.x, y: sa.y + 35 });
                        Matter.Body.setVelocity(sa.victim, { x: 0, y: 0 });
                    }
                    if ((sa.carryDirX > 0 && sa.x >= sa.landX) || (sa.carryDirX < 0 && sa.x <= sa.landX)) {
                        sa.x = sa.landX;
                        sa.phase = 'dropping';
                        if (sa.victim && !sa.victim.destroyed && sa.victim.hp > 0) {
                            Matter.Body.setVelocity(sa.victim, { x: 0, y: 5 });
                            sa.victim.hp -= 20;
                            if (sa.victim.hp <= 0) killSoldier(sa.victim);
                        }
                    }
                } else if (sa.phase === 'dropping') {
                    sa.x += sa.carryDirX * 10;
                    if (sa.x < -150 || sa.x > window.innerWidth + 150) {
                        saucerAnim = null;
                    }
                }
            }
        });
    }

    function explode(position, radius, forceMagnitude, customDamage = null) {
        visualEffects.push({
            x: position.x, y: position.y,
            radius: 10, maxRadius: radius, life: 1.0
        });

        const allSoldiers = p1Soldiers.concat(p2Soldiers);
        allSoldiers.forEach(soldier => {
            if(soldier.hp <= 0) return;
            if (frozenTeams[soldier.player] > 0) return; // imune quando congelado
            const dist = Vector.magnitude(Vector.sub(soldier.position, position));
            if (dist < radius) {
                const forceDir = Vector.normalise(Vector.sub(soldier.position, position));
                const falloff = 1 - (dist / radius);
                
                // Forca de repulsao bem maior para jogar o soldado longe
                const appliedForce = Vector.mult(forceDir, forceMagnitude * falloff * 4); // Multiplicador forte
                appliedForce.y -= (forceMagnitude * falloff * 3); // Lanca pra cima fortemente
                
                Matter.Body.applyForce(soldier, soldier.position, appliedForce);
                
                if (customDamage !== null) {
                    soldier.hp -= Math.max(0, customDamage);
                } else {
                    const damage = Math.floor(falloff * forceMagnitude * 300);
                    soldier.hp -= Math.max(0, damage);
                }
                
                if (soldier.hp <= 0) killSoldier(soldier);
            }
        });

        const blocksToRemove = [];
        terrainBlocks.forEach(block => {
            const dist = Vector.magnitude(Vector.sub(block.position, position));
            if (dist < radius) blocksToRemove.push(block);
        });
        
        blocksToRemove.forEach(block => {
            Composite.remove(engine.world, block);
            terrainBlocks = terrainBlocks.filter(b => b !== block);
        });
    }

    function killSoldier(soldier) {
        if (frozenTeams[soldier.player] > 0) return; // imune
        soldier.hp = 0;
        soldier.emoji = '⚰️';
        soldier.animType = 'none';

        if (p1Soldiers.includes(soldier)) {
            p1Soldiers = p1Soldiers.filter(s => s !== soldier);
            deadSoldiers.push(soldier);
        } else if (p2Soldiers.includes(soldier)) {
            p2Soldiers = p2Soldiers.filter(s => s !== soldier);
            deadSoldiers.push(soldier);
        }
        
        if(activeSoldier === soldier) selectNextSoldier();
        checkWinState();
    }

    function setupGameLoop() {
        Events.on(render, 'afterRender', function() {
            const context = render.context;
            const t = Date.now();
            const width = window.innerWidth;
            const height = window.innerHeight;
            const waterH = height - 70; // Nivel da agua

            // --- Render Dynamic Water Waves ---
            context.fillStyle = 'rgba(0, 100, 220, 0.7)';
            context.beginPath();
            context.moveTo(0, height);
            for (let x = 0; x <= width; x += 20) {
                const y = waterH + Math.sin(x * 0.015 + t * 0.002) * 12 + Math.cos(x * 0.008 - t * 0.001) * 6;
                context.lineTo(x, y);
            }
            context.lineTo(width, height);
            context.lineTo(0, height);
            context.closePath();
            context.fill();

            context.fillStyle = 'rgba(0, 150, 255, 0.8)';
            context.beginPath();
            context.moveTo(0, height);
            for (let x = 0; x <= width; x += 20) {
                const y = waterH + 8 + Math.sin(x * 0.02 - t * 0.003) * 10 + Math.cos(x * 0.01 + t * 0.002) * 8;
                context.lineTo(x, y);
            }
            context.lineTo(width, height);
            context.lineTo(0, height);
            context.closePath();
            context.fill();
            
            const allSoldiers = p1Soldiers.concat(p2Soldiers);
            allSoldiers.forEach(soldier => {
                if (soldier.position.y > waterH && soldier.hp > 0) {
                    for (let sp = 0; sp < 6; sp++) {
                        visualEffects.push({
                            x: soldier.position.x + (Math.random() * 30 - 15),
                            y: waterH + (Math.random() * 10 - 5),
                            text: '💧', life: 1.0, isText: true, isDrop: true
                        });
                    }
                    killSoldier(soldier);
                }
            });

            // --- Render Toxic Gas (Meia) ---
            toxicSocks.forEach(sock => {
                const pulse = 80 + Math.sin(t / 300) * 20;
                for (let ring = 0; ring < 3; ring++) {
                    const r = pulse + ring * 18;
                    let grad = context.createRadialGradient(sock.position.x, sock.position.y, 0, sock.position.x, sock.position.y, r);
                    grad.addColorStop(0, `rgba(0,255,80,${0.55 - ring * 0.12})`);
                    grad.addColorStop(0.5, `rgba(50,220,30,${0.3 - ring * 0.08})`);
                    grad.addColorStop(1, 'rgba(0,200,0,0)');
                    context.beginPath();
                    context.arc(sock.position.x, sock.position.y, r, 0, 2 * Math.PI);
                    context.fillStyle = grad;
                    context.fill();
                }
                for (let p = 0; p < 5; p++) {
                    const angle = (t / 600 + p * 1.3) % (2 * Math.PI);
                    const dist = 30 + p * 12;
                    const px = sock.position.x + Math.cos(angle) * dist;
                    const py = sock.position.y + Math.sin(angle) * dist - ((t / 8 + p * 20) % 60);
                    context.font = '14px Arial';
                    context.globalAlpha = 0.7;
                    context.fillText('💨', px, py);
                    context.globalAlpha = 1.0;
                }
            });

            // --- Launch Trail ---
            for (let li = 0; li < launchTrail.length; li++) {
                const tp = launchTrail[li];
                const alpha = (li / launchTrail.length) * 0.6;
                context.beginPath();
                context.arc(tp.x, tp.y, 8 * (li / launchTrail.length), 0, 2 * Math.PI);
                context.fillStyle = `rgba(255,200,50,${alpha})`;
                context.fill();
            }

            // --- Pepper flames ---
            pepperEffects.forEach(fx => {
                const progress = fx.life / 7.0;
                const numFlames = 8;
                for (let f = 0; f < numFlames; f++) {
                    const flameX = fx.x + fx.dirX * (fx.range / numFlames) * (f + 1);
                    const flameY = fx.y + Math.sin(t / 100 + f) * 15;
                    const flameSize = 28 + Math.sin(t / 80 + f * 0.7) * 8;
                    context.globalAlpha = progress * (0.6 + Math.sin(t / 120 + f) * 0.3);
                    context.font = `${flameSize}px Arial`;
                    context.fillText('🔥', flameX, flameY);
                }
                context.globalAlpha = 1.0;
            });

            // --- Saucer animation ---
            if (saucerAnim) {
                const sa = saucerAnim;
                context.font = '50px Arial';
                context.fillText('🛸', sa.x, sa.y);
                if (sa.phase === 'beaming' && sa.victim) {
                    const beamAlpha = sa.beam * 0.7;
                    const grad = context.createLinearGradient(sa.x, sa.y, sa.victim.position.x, sa.victim.position.y);
                    grad.addColorStop(0, `rgba(150,255,150,${beamAlpha})`);
                    grad.addColorStop(1, `rgba(150,255,150,0)`);
                    context.beginPath();
                    context.moveTo(sa.x - 20, sa.y + 20);
                    context.lineTo(sa.victim.position.x - 30, sa.victim.position.y);
                    context.lineTo(sa.victim.position.x + 30, sa.victim.position.y);
                    context.lineTo(sa.x + 20, sa.y + 20);
                    context.closePath();
                    context.fillStyle = grad;
                    context.fill();
                }
            }

            // --- Helicopter ---
            if (window._heliState && window._heliState.active) {
                const hs = window._heliState;
                context.save();
                context.font = '50px Arial';
                if (hs.dir < 0) {
                    context.translate(hs.x, hs.y);
                    context.scale(-1, 1);
                    context.fillText('🚁', 0, 0);
                } else {
                    context.fillText('🚁', hs.x, hs.y);
                }
                context.restore();
            }

            // --- Render Explosions & Floating Text ---
            for(let i = visualEffects.length - 1; i >= 0; i--) {
                let fx = visualEffects[i];
                context.save();
                if (fx.isZ) {
                    context.font = 'bold 18px Inter';
                    context.fillStyle = `rgba(255, 255, 255, ${Math.max(0, fx.life)})`;
                    context.fillText(fx.text, fx.x, fx.y);
                    fx.x += Math.sin(fx.life * 15) * 0.4;
                    fx.y -= 0.6;
                    fx.life -= 0.015;
                } else if (fx.isDrop) {
                    context.font = '16px Arial';
                    context.globalAlpha = Math.max(0, Math.min(1, fx.life));
                    context.fillText(fx.text, fx.x, fx.y);
                    fx.y += 1.5;
                    fx.life -= 0.03;
                } else if (fx.isText) {
                    context.font = 'bold 22px Inter';
                    context.fillStyle = `rgba(34, 197, 94, ${Math.max(0, fx.life)})`;
                    context.fillText(fx.text, fx.x, fx.y);
                    if (fx.vx !== undefined) fx.x += fx.vx;
                    if (fx.vy !== undefined) fx.y += fx.vy;
                    else fx.y -= 1;
                    fx.life -= 0.02;
                } else {
                    context.beginPath();
                    context.arc(fx.x, fx.y, fx.radius, 0, 2 * Math.PI);
                    let gradient = context.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, fx.radius);
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${Math.max(0, fx.life)})`);
                    gradient.addColorStop(0.2, `rgba(255, 200, 0, ${Math.max(0, fx.life)})`);
                    gradient.addColorStop(1, `rgba(255, 50, 0, 0)`);
                    context.fillStyle = gradient;
                    context.fill();
                    fx.radius += (fx.maxRadius - fx.radius) * 0.2;
                    fx.life -= 0.03; 
                }
                context.restore();
                if(fx.life <= 0) visualEffects.splice(i, 1);
            }
            
            context.save();
            context.globalAlpha = 1.0;
            context.shadowBlur = 0;
            context.filter = 'none';
            context.textAlign = "center";
            context.textBaseline = "middle";

            const renderedSoldiers = p1Soldiers.concat(p2Soldiers).concat(deadSoldiers);

            renderedSoldiers.forEach(soldier => {
                const pos = soldier.position;
                
                context.save();
                context.globalAlpha = 1.0;
                context.translate(pos.x, pos.y);
                
                if (soldier === activeSoldier && soldier.hp > 0) {
                    context.beginPath();
                    context.arc(0, 0, soldier.isGiant ? 50 : 25, 0, 2 * Math.PI);
                    context.strokeStyle = soldier.color;
                    context.lineWidth = 3;
                    context.stroke();
                }

                if (frozenTeams[soldier.player] > 0 && soldier.hp > 0) {
                    context.filter = 'hue-rotate(180deg) saturate(200%) brightness(120%)';
                    if (Math.random() < 0.05) {
                        visualEffects.push({ x: pos.x + (Math.random() * 20 - 10), y: pos.y + (Math.random() * 20 - 10), text: '❄️', life: 0.8, isText: true, vy: 1 });
                    }
                } else {
                    // --- Idle Animations Transform ---
                    if (soldier !== activeSoldier && soldier.animType && soldier.animType !== 'none' && soldier.hp > 0) {
                        const time = (t * 0.003) + (soldier.animOffset || 0);
                        if (soldier.animType === 'sleeping') {
                            context.rotate(0.25);
                            if (Math.sin(time * 3) > 0.98 && Math.random() > 0.5) {
                                visualEffects.push({ x: pos.x + 15, y: pos.y - 25, text: 'z', life: 1.0, isText: true, isZ: true });
                            }
                        } else if (soldier.animType === 'dancing') {
                            context.rotate(Math.sin(time * 4) * 0.25);
                        } else if (soldier.animType === 'bouncing') {
                            context.translate(0, -Math.abs(Math.sin(time * 5)) * 6);
                        } else if (soldier.animType === 'nodding') {
                            context.rotate(Math.sin(time * 3) * 0.15);
                        } else if (soldier.animType === 'spinning') {
                            context.rotate(Math.sin(time * 2) * 0.35);
                        } else if (soldier.animType === 'floating') {
                            context.translate(Math.cos(time * 3) * 4, Math.sin(time * 3) * 4);
                        }
                    }
                }

                const fontSize = soldier.isGiant ? 60 : 30;
                context.font = `${fontSize}px Arial`;
                if (soldier.player === 1 && soldier.hp > 0) {
                    context.scale(-1, 1);
                }
                context.fillText(soldier.emoji, 0, 0);
                
                context.restore();

                if (soldier.hp > 0) {
                    context.save();
                    context.translate(pos.x, pos.y);

                    const hpWidth = soldier.isGiant ? 80 : 40;
                    const hpHeight = 5;
                    const hpPct = Math.max(0, soldier.hp / soldier.maxHp);
                    const hpYOffset = soldier.isGiant ? -55 : -35;
                    
                    context.fillStyle = 'rgba(0,0,0,0.5)';
                    context.fillRect(-hpWidth/2, hpYOffset, hpWidth, hpHeight);
                    context.fillStyle = hpPct > 0.5 ? '#22c55e' : (hpPct > 0.2 ? '#eab308' : '#ef4444');
                    context.fillRect(-hpWidth/2, hpYOffset, hpWidth * hpPct, hpHeight);
                    
                    context.font = "10px Inter";
                    context.fillStyle = "white";
                    context.fillText(soldier.name, 0, hpYOffset - 10);
                    
                    context.restore();
                }
            });
            context.restore();

            // Update HUD Team HPs
            const updateTeamHP = (team, elemId) => {
                const totalHp = team.reduce((sum, s) => sum + s.hp, 0);
                const maxHp = team.reduce((sum, s) => sum + s.maxHp, 0);
                if (maxHp === 0) return;
                const pct = Math.max(0, Math.floor((totalHp / maxHp) * 100));
                const bar = document.getElementById(elemId);
                if (bar) {
                    bar.style.width = pct + '%';
                    bar.textContent = pct + '%';
                    bar.style.backgroundColor = pct < 30 ? '#ef4444' : (pct < 60 ? '#eab308' : (elemId.includes('p1') ? 'var(--primary-color)' : 'var(--secondary-color)'));
                }
            };
            updateTeamHP(p1Soldiers, 'p1-team-hp');
            updateTeamHP(p2Soldiers, 'p2-team-hp');

            // Render weapons, temples and drops
            context.save();
            context.globalAlpha = 1.0;
            context.shadowBlur = 0;
            context.filter = 'none';
            const allBodies = Composite.allBodies(engine.world);
            allBodies.forEach(body => {
                if ((body.isWeapon || body.isTemple) && body.emoji) {
                    context.save();
                    context.globalAlpha = 1.0;
                    context.translate(body.position.x, body.position.y);
                    
                    if (body.emoji === '🪃' || body.emoji === '🥏') {
                        context.rotate((Date.now() / 50) % (2*Math.PI));
                    } else if (body.emoji === '🚗' && body.dirX < 0) {
                        context.scale(-1, 1);
                    } else {
                        context.rotate(body.angle);
                    }
                    
                    const emojiSize = body.isTemple ? 100 : (body.emoji === '☄️' ? 60 : 30);
                    context.font = `${emojiSize}px Arial`;
                    context.fillText(body.emoji, 0, 0);
                    context.restore();
                }
                if (body.isDrop) {
                    context.save();
                    context.globalAlpha = 0.8;
                    context.font = "15px Arial";
                    context.fillText('💥', body.position.x, body.position.y);
                    context.restore();
                }
            });
            context.restore();

            // Aiming Line
            let currentMouse = { x: window.mouseX || 0, y: window.mouseY || 0 };
            if (isAiming && activeSoldier && dragStart) {
                context.beginPath();
                context.moveTo(activeSoldier.position.x, activeSoldier.position.y);
                const dx = dragStart.x - currentMouse.x;
                const dy = dragStart.y - currentMouse.y;
                context.lineTo(activeSoldier.position.x + dx, activeSoldier.position.y + dy);
                context.strokeStyle = activeSoldier.color;
                context.lineWidth = 3;
                context.setLineDash([10, 10]);
                context.stroke();
                context.setLineDash([]);
            }
        });
    }

    function showGiantAnnouncement(text) {
        const ann = document.getElementById('giant-announcement');
        if (!ann) return;
        ann.textContent = text;
        ann.classList.remove('hidden');
        ann.style.animation = 'none';
        void ann.offsetWidth; // force reflow
        ann.style.animation = 'popIn 2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
        setTimeout(() => {
            if (ann.textContent === text) {
                ann.classList.add('hidden');
            }
        }, 2000);
    }

    function updateTurnUI() {
        if (isGameOver) return;
        const turnTitle = document.getElementById('current-turn');
        const instructions = document.getElementById('game-instructions');
        const activeName = currentTurn === 1 ? config.player1.name : config.player2.name;
        turnTitle.textContent = `Turno: ${activeName}`;
        turnTitle.style.color = currentTurn === 1 ? config.player1.color : config.player2.color;
        if (isAiTurn()) {
            instructions.textContent = 'IA pensando...';
        } else if (config && config.mode === 'online' && !canControlCurrentTurn()) {
            instructions.textContent = `Aguardando jogada do Player ${currentTurn}...`;
        } else {
            instructions.textContent = 'Arraste para mirar e solte para atirar!';
        }
        
        const btnP1 = document.getElementById('p1-arsenal-btn');
        const btnP2 = document.getElementById('p2-arsenal-btn');

        if (isAiTurn()) {
            btnP1.classList.add('hidden');
            btnP2.classList.add('hidden');
            showGiantAnnouncement("TURNO DA IA!");
            return;
        }

        if (config && config.mode === 'online' && !canControlCurrentTurn()) {
            btnP1.classList.add('hidden');
            btnP2.classList.add('hidden');
            showGiantAnnouncement(`TURNO DO PLAYER ${currentTurn}`);
            return;
        }
        
        if (currentTurn === 1) {
            btnP1.classList.remove('hidden');
            btnP1.classList.add('disabled-btn');
            btnP2.classList.add('hidden');
        } else {
            btnP1.classList.add('hidden');
            btnP2.classList.remove('hidden');
            btnP2.classList.add('disabled-btn');
        }

        showGiantAnnouncement("MOVIMENTE-SE!");
    }

    return {
        init: init,
        applyOnlineAction: applyOnlineAction,
        applyOnlineSnapshot: applyOnlineSnapshot
    };
})();
