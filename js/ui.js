const app = {
    state: {
        mode: null,
        players: [],
        currentTournament: null,
        activeMatch: null
    },

    init() {
        // Header
        const header = document.querySelector('header');
        header.innerHTML += `<button id="reset-btn" class="btn btn-secondary hidden" style="position: absolute; top: 20px; right: 20px; padding: 10px;" onclick="app.resetTournament()">Reiniciar</button>`;
        
        // Load state from storage
        const saved = Storage.load();
        if (saved) {
            this.state.currentTournament = saved;
            this.showView('dashboard');
            this.renderDashboard();
        }

        // Initialize with default court inputs
        this.updateCourtInputs();

        // Initialize with 4 player rows for setup
        for (let i = 0; i < 4; i++) {
            this.addPlayerRow();
        }
    },

    updateCourtInputs() {
        const container = document.getElementById('court-names-container');
        const count = parseInt(document.getElementById('input-courts').value) || 1;
        container.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const div = document.createElement('div');
            div.className = 'input-group';
            div.innerHTML = `
                <label style="font-size: 12px; opacity: 0.7;">Nombre Cancha ${i}</label>
                <input type="text" class="court-name-input" placeholder="Cancha ${i}" value="Cancha ${i}" style="padding: 10px;">
            `;
            container.appendChild(div);
        }
    },

    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        
        const resetBtn = document.getElementById('reset-btn');
        if (viewId === 'dashboard') resetBtn.classList.remove('hidden');
        else resetBtn.classList.add('hidden');

        window.scrollTo(0, 0);
    },

    resetTournament() {
        if (confirm('¿Estás seguro de que quieres borrar el torneo actual?')) {
            Storage.clear();
            location.reload();
        }
    },

    showSetup(mode) {
        this.state.mode = mode;
        const title = mode === 'americano' ? 'Configurar Americano' : 
                      mode === 'rey' ? 'Configurar Rey de la Cancha' : 'Configurar Round Robin';
        document.getElementById('setup-title').innerText = title;
        this.showView('setup');
    },

    addPlayerRow() {
        const list = document.getElementById('players-list');
        const count = list.children.length + 1;
        const div = document.createElement('div');
        div.className = 'player-tag animate-fade-in';
        div.innerHTML = `
            <div style="display: flex; gap: 10px; flex: 1; align-items: center;">
                <span style="color: var(--text-dim); font-size: 12px; width: 20px;">${count}</span>
                <input type="text" placeholder="Nombre jugador" style="flex: 1; padding: 8px 12px;">
                <select class="side-pref" style="padding: 8px; width: 60px;">
                    <option value="A">?</option>
                    <option value="D">D</option>
                    <option value="R">R</option>
                </select>
            </div>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: var(--danger); font-size: 20px; padding: 0 10px; cursor: pointer;">&times;</button>
        `;
        list.appendChild(div);
    },

    startTournament() {
        const courtCount = parseInt(document.getElementById('input-courts').value);
        const courtNames = Array.from(document.querySelectorAll('.court-name-input')).map((inp, i) => inp.value || `Cancha ${i+1}`);
        const playerInputs = document.querySelectorAll('#players-list > div');
        const players = [];

        playerInputs.forEach((row, i) => {
            const name = row.querySelector('input').value.trim();
            const side = row.querySelector('select').value;
            if (name) {
                players.push({
                    id: i,
                    name: name,
                    side: side,
                    score: 0,
                    matchesPlayed: 0
                });
            }
        });

        if (players.length < 4) {
            alert('Se necesitan al menos 4 jugadores');
            return;
        }

        if (this.state.mode === 'americano') {
            this.state.currentTournament = Engine.generateAmericano(players, courtCount, courtNames);
        } else if (this.state.mode === 'rey') {
            this.state.currentTournament = Engine.generateRey(players, courtCount, courtNames);
        } else if (this.state.mode === 'robin') {
            this.state.currentTournament = Engine.generateRobin(players, courtCount, courtNames);
        }

        // Generate first round
        this.state.currentTournament.matches = this.generateMatches();
        
        Storage.save(this.state.currentTournament);
        this.renderDashboard();
        this.showView('dashboard');
    },

    generateMatches() {
        const t = this.state.currentTournament;
        if (t.type === 'americano') return Engine.generateAmericanoNextRound(t);
        if (t.type === 'rey') return Engine.generateReyNextRound(t);
        if (t.type === 'robin') return Engine.generateRobinNextRound(t);
        return [];
    },

    renderDashboard() {
        const t = this.state.currentTournament;
        if (!t) return;

        // Leaderboard
        const lb = document.getElementById('leaderboard-content');
        const sorted = [...t.players].sort((a, b) => b.score - a.score);
        
        lb.innerHTML = sorted.map((p, i) => `
            <div class="player-tag">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-weight: 800; color: ${i < 3 ? 'var(--primary)' : 'var(--text-dim)'};">#${i+1}</span>
                    <span>${p.name}</span>
                    <span class="side-indicator ${p.side === 'D' ? 'side-drive' : p.side === 'R' ? 'side-reves' : ''}">${p.side === 'A' ? '' : p.side}</span>
                </div>
                <div style="font-weight: 700; color: var(--primary);">${p.score} pts</div>
            </div>
        `).join('');

        // Matches
        const mc = document.getElementById('matches-content');
        if (t.matches.length === 0 || t.matches.every(m => m.score1 !== null)) {
            // All matches in current round done?
            mc.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p style="color: var(--text-dim); margin-bottom: 16px;">Ronda finalizada</p>
                    <button class="btn btn-primary" onclick="app.nextRound()" style="width: 100%;">Generar Siguiente Ronda</button>
                </div>
            `;
        } else {
            mc.innerHTML = t.matches.map(m => {
                const isFinished = m.score1 !== null;
                const activeClass = isFinished ? '' : 'active-match-border';
                const statusLabel = isFinished ? 'Finalizado' : 'Jugándose';
                
                return `
                    <div class="card match-card ${activeClass}" style="padding: 16px; margin-bottom: 12px; cursor: ${isFinished ? 'default' : 'pointer'};" 
                         ${isFinished ? '' : `onclick="app.enterScore(${m.id})"`}>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <span style="font-size: 11px; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 1px;">${m.court}</span>
                            <span style="font-size: 11px; font-weight: 600; color: ${isFinished ? 'var(--text-dim)' : 'var(--success)'};">${statusLabel}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="flex: 1; text-align: right; overflow: hidden;">
                                ${this.getPairNamesSimple(t, m.team1)}
                            </div>
                            <div style="width: 60px; text-align: center; font-weight: 900; font-size: ${isFinished ? '20px' : '14px'}; color: ${isFinished ? 'var(--primary)' : 'var(--text-dim)'};">
                                ${isFinished ? `${m.score1} - ${m.score2}` : 'VS'}
                            </div>
                            <div style="flex: 1; text-align: left; overflow: hidden;">
                                ${this.getPairNamesSimple(t, m.team2)}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    },

    getPairNamesSimple(t, ids) {
        const p1 = t.players.find(p => p.id === ids[0]);
        const p2 = t.players.find(p => p.id === ids[1]);
        return `
            <div style="line-height: 1.2;">
                <div style="font-weight: 600; font-size: 14px; white-space: nowrap; text-overflow: ellipsis;">${p1.name}</div>
                <div style="font-weight: 400; font-size: 12px; opacity: 0.7; white-space: nowrap; text-overflow: ellipsis;">${p2.name}</div>
            </div>
        `;
    },

    getPairNames(t, ids) {
        const p1 = t.players.find(p => p.id === ids[0]);
        const p2 = t.players.find(p => p.id === ids[1]);
        return `<span style="display: block;">${p1.name}</span><span style="font-size: 12px; opacity: 0.8;">${p2.name}</span>`;
    },

    nextRound() {
        const t = this.state.currentTournament;
        let newMatches = [];
        
        if (t.type === 'americano') newMatches = Engine.generateAmericanoNextRound(t);
        else if (t.type === 'rey') newMatches = Engine.generateReyNextRound(t);
        else if (t.type === 'robin') newMatches = Engine.generateRobinNextRound(t);

        if (newMatches.length === 0) {
            alert('¡Torneo finalizado! Se han agotado todas las combinaciones posibles o necesitas completar los partidos actuales.');
            return;
        }
        t.matches = [...t.matches.filter(m => m.score1 !== null), ...newMatches];
        Storage.save(t);
        this.renderDashboard();
    },

    enterScore(matchId) {
        const t = this.state.currentTournament;
        const match = t.matches.find(m => m.id === matchId);
        this.state.activeMatch = match;

        document.getElementById('label-team-1').innerText = 'Pareja 1';
        document.getElementById('label-team-2').innerText = 'Pareja 2';
        document.getElementById('score-team-1').value = '';
        document.getElementById('score-team-2').value = '';
        
        const p1a = t.players.find(p => p.id === match.team1[0]);
        const p1b = t.players.find(p => p.id === match.team1[1]);
        const p2a = t.players.find(p => p.id === match.team2[0]);
        const p2b = t.players.find(p => p.id === match.team2[1]);

        document.getElementById('score-entry-match').innerHTML = `
            <div style="display: flex; justify-content: space-around; font-weight: 600;">
                <div style="text-align: center;">${p1a.name}<br>${p1b.name}</div>
                <div style="color: var(--primary);">VS</div>
                <div style="text-align: center;">${p2a.name}<br>${p2b.name}</div>
            </div>
        `;

        this.showView('score');
    },

    submitScore() {
        const s1 = parseInt(document.getElementById('score-team-1').value);
        const s2 = parseInt(document.getElementById('score-team-2').value);

        if (isNaN(s1) || isNaN(s2)) {
            alert('Por favor ingresa un marcador válido');
            return;
        }

        const t = this.state.currentTournament;
        const match = t.matches.find(m => m.id === this.state.activeMatch.id);
        
        match.score1 = s1;
        match.score2 = s2;

        // Update individual player scores
        // In Americano, you get as many points as shots won in your match
        [match.team1[0], match.team1[1]].forEach(id => {
            const p = t.players.find(x => x.id === id);
            p.score += s1;
        });
        [match.team2[0], match.team2[1]].forEach(id => {
            const p = t.players.find(x => x.id === id);
            p.score += s2;
        });

        Storage.save(t);
        this.renderDashboard();
        this.showView('dashboard');
    }
};

// Start app
window.onload = () => app.init();
