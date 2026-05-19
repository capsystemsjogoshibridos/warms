document.addEventListener('DOMContentLoaded', () => {
    // Sliders and Name Inputs
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
        updateInputs(); // Init
    };

    setupSoldierNames('p1-count', 'p1-count-val', 'p1-names-container', 'p1');
    setupSoldierNames('p2-count', 'p2-count-val', 'p2-names-container', 'p2');

    // Emoji Selectors
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

    // Start Game
    const startBtn = document.getElementById('start-btn');
    startBtn.addEventListener('click', () => {
        const getSelectedEmoji = (containerId) => {
            return document.querySelector(`#${containerId} .emoji-btn.selected`).getAttribute('data-emoji');
        };

        const getNames = (prefix, count) => {
            const names = [];
            for(let i = 1; i <= count; i++) {
                names.push(document.getElementById(`${prefix}-name-${i}`).value || `Soldado ${i}`);
            }
            return names;
        };

        const p1Count = parseInt(document.getElementById('p1-count').value);
        const p2Count = parseInt(document.getElementById('p2-count').value);

        const config = {
            player1: {
                name: document.getElementById('p1-name').value || 'Exército Alpha',
                flag: document.getElementById('p1-flag').value,
                emoji: getSelectedEmoji('p1-emoji-selector'),
                count: p1Count,
                soldierNames: getNames('p1', p1Count),
                color: '#ff3366'
            },
            player2: {
                name: document.getElementById('p2-name').value || 'Tropa Ômega',
                flag: document.getElementById('p2-flag').value,
                emoji: getSelectedEmoji('p2-emoji-selector'),
                count: p2Count,
                soldierNames: getNames('p2', p2Count),
                color: '#00f0ff'
            }
        };

        // Transition UI
        document.getElementById('ui-container').classList.add('hidden');
        document.getElementById('game-hud').classList.remove('hidden');

        // Update HUD
        document.getElementById('hud-p1-flag').textContent = config.player1.flag;
        document.getElementById('hud-p1-name').textContent = config.player1.name;
        document.getElementById('hud-p2-flag').textContent = config.player2.flag;
        document.getElementById('hud-p2-name').textContent = config.player2.name;

        // Initialize Game
        if (window.EmojiWarsGame) {
            window.EmojiWarsGame.init(config);
        }
    });
});
