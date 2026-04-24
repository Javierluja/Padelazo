const app = {
    state: null,
    activeMatch: null,

    init() {
        this.state = Storage.load();
        
        this.updateCourtInputs();
        for (let i = 0; i < 4; i++) this.addPlayerRow();

        if (this.state.currentTournament) {
            this.showView('dashboard');
            this.renderDashboard();
        } else {
            this.showView('home');
            this.renderHome();
        }
    },

    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        
        // Update Bottom Nav UI
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        if (viewId === 'home') document.getElementById('nav-home').classList.add('active');
        if (viewId === 'dashboard') document.getElementById('nav-dash').classList.add('active');
        if (viewId === 'stats') document.getElementById('nav-stats').classList.add('active');

        window.scrollTo(0, 0);
    },

    showDashboardIfActive() {
        if (this.state.currentTournament) this.showView('dashboard');
        else alert('No hay un torneo activo. Crea uno en Inicio.');
    },

    renderHome() {
        // Active Tournament Shortcut
        const activeContainer = document.getElementById('active-tournament-card');
        if (this.state.currentTournament) {
            const t = this.state.currentTournament;
            activeContainer.innerHTML = `
                <div class="card" style="background: var(--glass); border: 2px solid var(--primary); margin-bottom: 24px;" onclick="app.showView('dashboard')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-size: 10px; font-weight: 800; color: var(--primary);">TORNEO EN CURSO</span>
                            <h3 style="margin-top: 4px;">${t.name}</h3>
                        </div>
                        <div style="font-size: 24px;">🎾</div>
                    </div>
                </div>
            `;
        } else {
            activeContainer.innerHTML = '';
        }

        const container = document.getElementById('history-container');
        if (this.state.history.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 40px 20px;">No hay historial aún. ¡Empieza tu primer Padelazo!</div>`;
            return;
        }

        container.innerHTML = `<h3 style="margin: 32px 0 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim);">HISTORIAL</h3>` + 
            this.state.history.map((t, i) => `
                <div class="card" style="margin-bottom: 12px; padding: 16px;" onclick="app.viewPastTournament(${i})">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <div style="width: 40px; height: 40px; background: var(--secondary); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🏆</div>
                            <div>
                                <div style="font-weight: 700; font-size: 16px;">${t.name}</div>
                                <div style="font-size: 11px; color: var(--text-dim);">${new Date(t.id).toLocaleDateString()} • ${t.players.length} Jugadores</div>
                            </div>
                        </div>
                        <div style="color: var(--text-dim); font-size: 20px;">›</div>
                    </div>
                </div>
            `).join('');
    },

    showSetup(mode) {
        this.state.mode = mode;
        const title = mode === 'americano' ? 'Configurar Americano' : mode === 'rey' ? 'Configurar Rey' : 'Todos vs Todos';
        document.getElementById('setup-title').innerText = title;
        document.getElementById('input-tournament-name').value = mode === 'americano' ? 'Padel & Birras' : 'Torneo Padelazo';
        
        const amGroup = document.getElementById('setup-group-mode');
        if (mode === 'americano') amGroup.classList.remove('hidden');
        else amGroup.classList.add('hidden');

        this.showView('setup');
    },

    updateCourtInputs() {
        const container = document.getElementById('court-names-container');
        const count = parseInt(document.getElementById('input-courts').value) || 1;
        container.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const div = document.createElement('div');
            div.className = 'input-group';
            div.innerHTML = `
                <label style="font-size: 10px; font-weight: 800;">PISTA ${i}</label>
                <input type="text" class="court-name-input" placeholder="Nombre" value="PISTA ${i}" style="padding: 12px; border-radius: 12px;">
            `;
            container.appendChild(div);
        }
    },

    addPlayerRow() {
        const list = document.getElementById('players-list');
        const div = document.createElement('div');
        div.className = 'card animate-fade-in';
        div.style = "padding: 10px; display: flex; gap: 12px; align-items: center; background: var(--secondary); margin-bottom: 0;";
        div.innerHTML = `
            <label class="photo-upload-label">
                <span class="photo-placeholder">👤</span>
                <img class="player-photo hidden" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
                <input type="file" accept="image/*" class="hidden" onchange="app.handlePhotoUpload(this)">
            </label>
            <input type="text" placeholder="Nombre Participante" style="flex: 1; padding: 10px; background: transparent; border: none;">
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: var(--danger); font-size: 24px; padding: 0 10px;">&times;</button>
        `;
        list.appendChild(div);
    },

    handlePhotoUpload(input) {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const label = input.parentElement;
                const img = label.querySelector('img');
                const span = label.querySelector('.photo-placeholder');
                img.src = e.target.result;
                img.classList.remove('hidden');
                span.classList.add('hidden');
                label.dataset.photo = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    },

    startTournament() {
        const name = document.getElementById('input-tournament-name').value || 'Mi Torneo';
        const courtCount = parseInt(document.getElementById('input-courts').value);
        const courtNames = Array.from(document.querySelectorAll('.court-name-input')).map(i => i.value);
        const playerRows = document.querySelectorAll('#players-list > div');
        const players = [];

        playerRows.forEach((row, i) => {
            const playerName = row.querySelector('input[type="text"]').value.trim();
            const photo = row.querySelector('.photo-upload-label').dataset.photo || null;
            if (playerName) {
                players.push({
                    id: i,
                    name: playerName,
                    photo: photo,
                    score: 0, wins: 0, matchesPlayed: 0
                });
            }
        });

        if (players.length < 4) return alert('Mínimo 4 integrantes');

        const options = {
            americanoType: document.getElementById('input-americano-type').value,
            scoreType: document.getElementById('input-score-type').value
        };

        let t;
        if (this.state.mode === 'americano') t = Engine.generateAmericano(players, courtCount, courtNames, options);
        else if (this.state.mode === 'robin') t = Engine.generateRobin(players, courtCount, courtNames, options);
        else if (this.state.mode === 'rey') t = Engine.generateRey(players, courtCount, courtNames, options);

        t.name = name;
        this.state.currentTournament = t;
        this.state.currentTournament.matches = this.generateMatches();
        Storage.save(this.state);
        this.renderDashboard();
        this.showView('dashboard');
    },

    generateMatches() {
        const t = this.state.currentTournament;
        if (t.type === 'americano') return Engine.generateAmericanoNextRound(t);
        if (t.type === 'robin') return Engine.generateRobinNextRound(t);
        if (t.type === 'rey') return Engine.generateReyNextRound(t);
        return [];
    },

    setDashboardTab(tab) {
        document.getElementById('dashboard-matches').classList.add('hidden');
        document.getElementById('dashboard-ranking').classList.add('hidden');
        document.getElementById('tab-matches').classList.remove('active');
        document.getElementById('tab-ranking').classList.remove('active');
        document.getElementById(`dashboard-${tab}`).classList.remove('hidden');
        document.getElementById(`tab-${tab}`).classList.add('active');
    },

    renderDashboard() {
        const t = this.state.currentTournament;
        if (!t) return;

        // Leaderboard
        const lb = document.getElementById('leaderboard-content');
        const sorted = [...t.players].sort((a,b) => b.score - a.score);
        lb.innerHTML = sorted.map((p, i) => `
            <div class="card" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; margin-bottom: 0;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <div style="font-weight: 900; color: ${i < 3 ? 'var(--primary)' : 'var(--text-dim)'}; width: 20px; font-size: 16px;">${i+1}</div>
                    <div class="player-photo-container" style="border: ${i === 0 ? '2px solid var(--primary)' : '1px solid var(--glass-border)'}">
                        ${p.photo ? `<img src="${p.photo}" class="player-photo">` : `<span style="font-size: 20px;">👤</span>`}
                    </div>
                    <div>
                        <div style="font-weight: 700; font-size: 15px;">${p.name}</div>
                        <div style="font-size: 10px; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">${p.wins} VICTORIAS</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 900; color: var(--primary); font-size: 18px;">${p.score}</div>
                    <div style="font-size: 9px; color: var(--text-dim); font-weight: 800;">PUNTOS</div>
                </div>
            </div>
        `).join('');

        // Matches
        const mc = document.getElementById('matches-content');
        const activeMatches = t.matches.filter(m => m.score1 === null);
        if (activeMatches.length === 0) {
            mc.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px 20px; background: var(--secondary);">
                    <div style="font-size: 40px; margin-bottom: 16px;">🏁</div>
                    <h3 style="margin-bottom: 8px;">Ronda Completada</h3>
                    <p style="font-size: 12px; color: var(--text-dim); margin-bottom: 24px;">Todos los marcadores han sido ingresados.</p>
                    <button class="btn btn-primary" onclick="app.nextRound()" style="width: 100%;">GENERAR SIGUIENTE RONDA</button>
                    <button class="btn btn-secondary" onclick="app.confirmEndTournament()" style="width: 100%; margin-top: 12px;">FINALIZAR TORNEO</button>
                </div>
            `;
        } else {
            mc.innerHTML = t.matches.map(m => {
                const isFin = m.score1 !== null;
                return `
                    <div class="card" style="padding: 16px; margin-bottom: 12px; border: ${isFin ? '1px solid var(--glass-border)' : '1px solid var(--primary)'}; opacity: ${isFin ? '0.5' : '1'}" ${isFin ? '' : `onclick="app.enterScore(${m.id})"`}>
                         <div style="display: flex; justify-content: space-between; font-size: 9px; font-weight: 900; margin-bottom: 12px; letter-spacing: 1px;">
                            <span style="color: ${isFin ? 'var(--text-dim)' : 'var(--primary)'};">${m.court.toUpperCase()}</span>
                            <span>${isFin ? 'FINALIZADO' : 'EN JUEGO'}</span>
                         </div>
                         <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="flex: 1; text-align: right;">${this.getPairDisplayLarge(t, m.team1)}</div>
                            <div style="width: 60px; text-align: center; font-weight: 900; font-size: ${isFin ? '22px' : '12px'}; color: var(--primary);">
                                ${isFin ? `${m.score1}-${m.score2}` : 'VS'}
                            </div>
                            <div style="flex: 1;">${this.getPairDisplayLarge(t, m.team2)}</div>
                         </div>
                    </div>
                `;
            }).join('');
        }
    },

    getPairDisplayLarge(t, ids) {
        return ids.map(id => {
            const p = t.players.find(x => x.id === id);
            return `<div style="font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>`;
        }).join('');
    },

    enterScore(matchId) {
        const t = this.state.currentTournament;
        const m = t.matches.find(x => x.id === matchId);
        this.activeMatch = m;
        document.getElementById('score-court-label').innerText = m.court.toUpperCase();
        document.getElementById('manual-score-1').value = m.score1 || '';
        document.getElementById('manual-score-2').value = m.score2 || '';
        this.renderPointTracker();
        this.showView('score');
    },

    renderPointTracker() {
        const m = this.activeMatch;
        const t = this.state.currentTournament;
        const labels = Engine.getPointLabels(t.scoreType);
        
        const container = document.getElementById('point-tracker-ui');
        const getNames = (ids) => ids.map(id => t.players.find(p => p.id === id).name).join(' & ');
        
        const isGold = t.scoreType === 'normal' && m.points.t1 === 3 && m.points.t2 === 3;

        container.innerHTML = `
            <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                <div class="point-panel" style="background: var(--secondary); border: 1px solid var(--glass-border);">
                    <div style="font-size: 10px; font-weight: 800; color: var(--text-dim); margin-bottom: 8px;">EQUIPO 1</div>
                    <div style="font-size: 44px; font-weight: 900; color: var(--primary);">${labels ? labels[m.points.t1] || '40' : m.points.t1}</div>
                    <div style="margin: 12px 0; font-weight: 700; font-size: 12px; text-align: center;">${getNames(m.team1)}</div>
                    <button class="point-btn ${isGold ? 'gold-point' : ''}" onclick="app.addPoint(1)">${isGold ? 'ORO' : '+1'}</button>
                </div>
                <div class="point-panel" style="background: var(--secondary); border: 1px solid var(--glass-border);">
                    <div style="font-size: 10px; font-weight: 800; color: var(--text-dim); margin-bottom: 8px;">EQUIPO 2</div>
                    <div style="font-size: 44px; font-weight: 900; color: var(--primary);">${labels ? labels[m.points.t2] || '40' : m.points.t2}</div>
                    <div style="margin: 12px 0; font-weight: 700; font-size: 12px; text-align: center;">${getNames(m.team2)}</div>
                    <button class="point-btn ${isGold ? 'gold-point' : ''}" onclick="app.addPoint(2)">${isGold ? 'ORO' : '+1'}</button>
                </div>
            </div>
            ${isGold ? `<div style="text-align: center; color: #ffd700; font-weight: 900; font-size: 14px; margin-bottom: 16px; letter-spacing: 2px;">⚡ ¡PUNTO DE ORO! ⚡</div>` : ''}
            <button class="btn btn-secondary" style="width: 100%; border-style: dashed; font-size: 12px;" onclick="app.resetPoints()">Reiniciar Puntos</button>
        `;
    },

    addPoint(team) {
        const m = this.activeMatch;
        const t = this.state.currentTournament;
        const isGold = t.scoreType === 'normal' && m.points.t1 === 3 && m.points.t2 === 3;

        if (team === 1) m.points.t1++; else m.points.t2++;
        
        if (t.scoreType === 'normal') {
            if (m.points.t1 > 3 || m.points.t2 > 3 || (isGold)) { // Game ends
                if (m.points.t1 > m.points.t2) document.getElementById('manual-score-1').value = (parseInt(document.getElementById('manual-score-1').value) || 0) + 1;
                else document.getElementById('manual-score-2').value = (parseInt(document.getElementById('manual-score-2').value) || 0) + 1;
                this.resetPoints();
                return;
            }
        } else {
            const limit = t.scoreType === 'tiebreak' ? 7 : 11;
            if (m.points.t1 >= limit || m.points.t2 >= limit) {
                document.getElementById('manual-score-1').value = m.points.t1;
                document.getElementById('manual-score-2').value = m.points.t2;
            }
        }
        this.renderPointTracker();
    },

    resetPoints() {
        this.activeMatch.points.t1 = 0;
        this.activeMatch.points.t2 = 0;
        this.renderPointTracker();
    },

    submitScore() {
        const s1 = parseInt(document.getElementById('manual-score-1').value);
        const s2 = parseInt(document.getElementById('manual-score-2').value);
        if (isNaN(s1) || isNaN(s2)) return alert('Ingresar marcador');

        const m = this.state.currentTournament.matches.find(x => x.id === this.activeMatch.id);
        m.score1 = s1; m.score2 = s2;

        const players = this.state.currentTournament.players;
        const updateP = (ids, won, points) => {
            ids.forEach(id => {
                const p = players.find(x => x.id === id);
                p.score += points;
                p.matchesPlayed += 1;
                if (won) p.wins += 1;
            });
        };
        updateP(m.team1, s1 > s2, s1);
        updateP(m.team2, s2 > s1, s2);

        Storage.save(this.state);
        this.renderDashboard();
        this.showView('dashboard');
    },

    nextRound() {
        const newMatches = this.generateMatches();
        if (newMatches.length === 0) return alert('Torneo finalizado con éxito.');
        this.state.currentTournament.matches.push(...newMatches);
        Storage.save(this.state);
        this.renderDashboard();
    },

    confirmEndTournament() {
        if (confirm('¿Cerrar torneo y guardar resultados?')) {
            Engine.updateGlobalStats(this.state.globalStats, this.state.currentTournament);
            this.state.history.unshift(this.state.currentTournament);
            this.state.currentTournament = null;
            Storage.save(this.state);
            this.showView('home');
            this.renderHome();
        }
    },

    showGlobalStats() {
        this.showView('stats');
        const container = document.getElementById('global-stats-content');
        const pData = Object.entries(this.state.globalStats.players)
            .map(([name, stats]) => ({ 
                name, ...stats, 
                rate: stats.totalMatches ? ((stats.wins / stats.totalMatches) * 100).toFixed(1) : 0 
            }))
            .sort((a,b) => b.firstPlaces - a.firstPlaces || b.wins - a.wins);

        container.innerHTML = pData.map((p, i) => `
            <div class="card" style="display: flex; justify-content: space-between; align-items: center; padding: 16px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="font-weight: 900; font-size: 20px; color: ${i === 0 ? '#ffd700' : 'var(--text-dim)'}; width: 25px;">${i+1}</div>
                    <div>
                        <div style="font-weight: 700; font-size: 16px;">${p.name}</div>
                        <div style="font-size: 10px; color: var(--text-dim); text-transform: uppercase; font-weight: 800;">${p.firstPlaces} OROS • ${p.rate}% EFECT.</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 800; color: var(--primary);">${p.wins}W - ${p.losses}L</div>
                    <div style="font-size: 9px; color: var(--text-dim); font-weight: 800;">TOTAL W/L</div>
                </div>
            </div>
        `).join('');
    },

    viewPastTournament(index) {
        const t = this.state.history[index];
        alert(`Resumen ${t.name}: Ganador fue ${[...t.players].sort((a,b)=>b.score-a.score)[0].name}`);
    }
};

window.onload = () => app.init();
