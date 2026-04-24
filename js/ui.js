const app = {
    state: null,
    activeMatch: null,
    rankingMode: 'score',
    globalRankMode: 'cups',

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
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        if (viewId === 'home') document.getElementById('nav-home').classList.add('active');
        if (viewId === 'dashboard') document.getElementById('nav-dash').classList.add('active');
        if (viewId === 'stats') document.getElementById('nav-stats').classList.add('active');
        window.scrollTo(0, 0);
    },

    showDashboardIfActive() {
        if (this.state.currentTournament) this.showView('dashboard');
        else alert('No hay un torneo activo. ¡Crea uno nuevo!');
    },

    renderHome() {
        const activeContainer = document.getElementById('active-tournament-card');
        if (this.state.currentTournament) {
            const t = this.state.currentTournament;
            activeContainer.innerHTML = `
                <div class="card" style="border: 1px solid var(--primary); background: var(--primary-glow); margin-top: 20px;" onclick="app.showView('dashboard')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="font-size:10px; font-weight:900; color:var(--primary); margin:0;">TORNEO EN JUEGO</p>
                            <h3 style="margin:5px 0 0; font-size:20px;">${t.name}</h3>
                        </div>
                        <div style="font-size:24px;">🎾</div>
                    </div>
                </div>
            `;
        } else { activeContainer.innerHTML = ''; }

        const container = document.getElementById('history-container');
        if (this.state.history.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-dim); font-size: 13px;">No hay historial aún...</div>`;
            return;
        }

        container.innerHTML = `<h3 style="margin: 35px 0 15px; font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 2px;">HISTORIAL DE TORNEOS</h3>` + 
            this.state.history.map((t, index) => {
                const winner = [...t.players].sort((a,b) => b.score - a.score)[0];
                return `
                <div class="card" style="padding: 20px; display: flex; align-items: center; gap: 15px;" onclick="app.viewPastTournament(${index})">
                    <div style="width: 50px; height: 50px; border-radius: 16px; background: var(--secondary); display:flex; align-items:center; justify-content:center; font-size:22px; border: 1px solid var(--glass-border);">🏆</div>
                    <div style="flex:1;">
                        <h4 style="margin:0; font-size:16px;">${t.name}</h4>
                        <p style="margin:0; font-size:11px; color:var(--text-dim);">${new Date(t.id).toLocaleDateString()} • Ganador: ${winner.name}</p>
                    </div>
                    <div style="font-size:20px; color:var(--text-dim);">›</div>
                </div>
            `}).join('');
    },

    showSetup(mode) {
        this.state.mode = mode;
        this.showView('setup');
        const title = mode === 'americano' ? 'Americano' : mode === 'rey' ? 'Rey de Cancha' : 'Todos vs Todos';
        document.getElementById('setup-title').innerText = title;
        this.updateCourtInputs();
    },

    updateCourtInputs() {
        const container = document.getElementById('court-names-container');
        if (!container) return;
        const count = parseInt(document.getElementById('input-courts').value) || 1;
        container.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const div = document.createElement('div');
            div.className = 'input-group';
            div.innerHTML = `<label>Cancha ${i}</label><input type="text" class="court-name-input" value="PISTA ${i}">`;
            container.appendChild(div);
        }
    },

    addPlayerRow() {
        const list = document.getElementById('players-list');
        const div = document.createElement('div');
        div.className = 'card';
        div.style = "padding: 12px; display: flex; gap: 16px; align-items: center; background: var(--secondary); margin-bottom: 0;";
        div.innerHTML = `
            <label class="photo-upload-label" style="width: 42px; height: 42px;">
                <span class="photo-placeholder">👤</span>
                <img class="player-photo hidden" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">
                <input type="file" accept="image/*" class="hidden" onchange="app.handlePhotoUpload(this)">
            </label>
            <input type="text" placeholder="NOMBRE JUGADOR" style="flex: 1; background: transparent !important; border: none !important; font-weight: 800; padding: 0 !important;">
            <button onclick="this.parentElement.remove()" style="color: var(--danger); background: none; border: none; font-size: 24px;">&times;</button>
        `;
        list.appendChild(div);
    },

    handlePhotoUpload(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const label = input.parentElement;
                const img = label.querySelector('img');
                img.src = e.target.result;
                img.classList.remove('hidden');
                label.querySelector('.photo-placeholder').classList.add('hidden');
                label.dataset.photo = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    startTournament() {
        const name = document.getElementById('input-tournament-name').value || 'Torneo Padelazo';
        const courts = parseInt(document.getElementById('input-courts').value);
        const courtNames = Array.from(document.querySelectorAll('.court-name-input')).map(i => i.value);
        const players = Array.from(document.querySelectorAll('#players-list > div')).map((row, i) => ({
            id: i, name: row.querySelector('input[type="text"]').value.trim(),
            photo: row.querySelector('.photo-upload-label').dataset.photo || null,
            score: 0, wins: 0, matchesPlayed: 0
        })).filter(p => p.name);

        if (players.length < 4) return alert('¡Mínimo 4 jugadores!');

        const options = { 
            americanoType: document.getElementById('input-americano-type').value, 
            scoreType: document.getElementById('input-score-type').value 
        };

        let t;
        if (this.state.mode === 'americano') t = Engine.generateAmericano(players, courts, courtNames, options);
        else if (this.state.mode === 'robin') t = Engine.generateRobin(players, courts, courtNames, options);
        else if (this.state.mode === 'rey') t = Engine.generateRey(players, courts, courtNames, options);

        t.name = name;
        this.state.currentTournament = t;
        const initialMatches = this.generateMatches();
        if (initialMatches.length === 0) return alert('Error al generar encuentros. Revisa los jugadores.');
        this.state.currentTournament.matches = initialMatches;
        
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

    setRankingMode(mode) {
        this.rankingMode = mode;
        document.querySelectorAll('#ranking-subtabs .rank-tab').forEach(t => {
            t.classList.remove('active');
            if (t.dataset.mode === mode) t.classList.add('active');
        });
        this.renderRanking();
    },

    renderDashboard() {
        const t = this.state.currentTournament;
        if (!t) return;
        this.renderRanking();
        
        const mc = document.getElementById('matches-content');
        const pending = t.matches.filter(m => m.score1 === null);
        
        if (pending.length === 0) {
            mc.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px; background: var(--secondary); border: 2px dashed var(--primary);">
                    <div style="font-size: 40px; margin-bottom: 15px;">🏁</div>
                    <h3 style="margin-bottom: 5px;">Ronda a la Bolsa</h3>
                    <p style="font-size: 12px; color: var(--text-dim); margin-bottom: 25px;">Todos los marcadores están listos.</p>
                    <button class="btn-primary" onclick="app.nextRound()">GENERAR SIGUIENTE RONDA</button>
                    <button class="btn-primary" style="margin-top:15px; background:transparent; border: 1px solid var(--glass-border); color:var(--text-main);" onclick="app.confirmEndTournament()">FINALIZAR TORNEO</button>
                </div>
            `;
        } else {
            mc.innerHTML = t.matches.map(m => `
                <div class="card" style="padding: 18px; border-left: 5px solid ${m.score1 === null ? 'var(--primary)' : 'var(--text-dim)'};" ${m.score1 === null ? `onclick="app.enterScore(${m.id})"` : ''}>
                    <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:900; margin-bottom:12px; letter-spacing:1px; color:var(--text-dim);">
                        <span>${m.court.toUpperCase()}</span>
                        <span style="color:${m.score1 === null ? 'var(--primary)' : 'var(--text-dim)'};">${m.score1 === null ? 'VIVO' : 'TERMINADO'}</span>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div style="text-align:right; flex:1; font-weight:800; font-size:15px;">${this.getPairDisplay(t, m.team1)}</div>
                        <div style="width:60px; text-align:center; font-size:24px; font-weight:900; color:var(--primary);">${m.score1 !== null ? `${m.score1}-${m.score2}` : 'VS'}</div>
                        <div style="text-align:left; flex:1; font-weight:800; font-size:15px;">${this.getPairDisplay(t, m.team2)}</div>
                    </div>
                </div>
            `).join('');
        }
    },

    getPairDisplay(t, ids) {
        return ids.map(id => t.players.find(p => p.id === id).name).join('<br>');
    },

    renderRanking() {
        const t = this.state.currentTournament;
        const lb = document.getElementById('leaderboard-content');
        let sorted = [...t.players];
        if (this.rankingMode === 'score') sorted.sort((a,b) => b.score - a.score);
        else if (this.rankingMode === 'wins') sorted.sort((a,b) => b.wins - a.wins);
        else if (this.rankingMode === 'effect') sorted.sort((a,b) => (b.wins/b.matchesPlayed || 0) - (a.wins/a.matchesPlayed || 0));

        lb.innerHTML = sorted.map((p, i) => `
            <div class="card" style="display:flex; align-items:center; gap:15px; padding: 12px 18px;">
                <div style="font-weight:900; color:${i < 3 ? 'var(--primary)' : 'var(--text-dim)'}; font-size:18px; width:25px;">#${i+1}</div>
                <div style="width:45px; height:45px; border-radius:14px; overflow:hidden; background:var(--secondary); border: 1px solid var(--glass-border);">
                    ${p.photo ? `<img src="${p.photo}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:20px;">👤</div>`}
                </div>
                <div style="flex:1;">
                    <div style="font-weight:800; font-size:16px;">${p.name}</div>
                    <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase;">${p.wins}W - ${p.matchesPlayed - p.wins}L • ${((p.wins/p.matchesPlayed || 0)*100).toFixed(0)}% Efic.</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:900; font-size:20px; color:var(--primary);">${p.score}</div>
                    <div style="font-size:9px; font-weight:800; color:var(--text-dim);">PUNTOS</div>
                </div>
            </div>
        `).join('');
    },

    enterScore(matchId) {
        const m = this.state.currentTournament.matches.find(x => x.id === matchId);
        this.activeMatch = m;
        document.getElementById('score-court-label').innerText = m.court.toUpperCase();
        document.getElementById('manual-score-1').value = m.score1 || '';
        document.getElementById('manual-score-2').value = m.score2 || '';
        this.renderScoreboardPanel();
        this.showView('score');
    },

    renderScoreboardPanel() {
        const m = this.activeMatch;
        const t = this.state.currentTournament;
        const container = document.getElementById('scoreboard-ui');
        const labels = ['0', '15', '30', '40', 'ORO'];

        const getTeamNames = (ids) => ids.map(id => t.players.find(p => p.id === id).name).join(' & ');
        const isGold = t.scoreType === 'normal' && m.points.t1 === 3 && m.points.t2 === 3;

        container.innerHTML = `
            <div class="team-panel">
                <p style="font-size:10px; font-weight:800; color:var(--text-dim); margin-bottom:5px;">EQUIPO 1</p>
                <div style="font-size: 13px; font-weight: 700; text-align: center; height: 32px; overflow: hidden;">${getTeamNames(m.team1)}</div>
                <div class="score-display">${labels[m.points.t1] || '40'}</div>
                <div class="dots-container">
                    ${[0,1,2,3].map(i => `<div class="dot ${m.points.t1 > i ? 'active' : ''}"></div>`).join('')}
                </div>
                <button class="score-btn ${isGold ? 'gold-point' : ''}" style="margin-top:20px;" onclick="app.addPoint(1)">${isGold ? 'ORO' : '+1'}</button>
            </div>
            <div class="team-panel">
                <p style="font-size:10px; font-weight:800; color:var(--text-dim); margin-bottom:5px;">EQUIPO 2</p>
                <div style="font-size: 13px; font-weight: 700; text-align: center; height: 32px; overflow: hidden;">${getTeamNames(m.team2)}</div>
                <div class="score-display">${labels[m.points.t2] || '40'}</div>
                <div class="dots-container">
                    ${[0,1,2,3].map(i => `<div class="dot ${m.points.t2 > i ? 'active' : ''}"></div>`).join('')}
                </div>
                <button class="score-btn ${isGold ? 'gold-point' : ''}" style="margin-top:20px;" onclick="app.addPoint(2)">${isGold ? 'ORO' : '+1'}</button>
            </div>
        `;
    },

    addPoint(team) {
        const m = this.activeMatch;
        const t = this.state.currentTournament;
        if (team === 1) m.points.t1++; else m.points.t2++;
        
        // Logical detection for game over
        if (t.scoreType === 'normal') {
             if (m.points.t1 > 3 || m.points.t2 > 3) {
                 const setInp = document.getElementById(`manual-score-${team}`);
                 setInp.value = (parseInt(setInp.value) || 0) + 1;
                 m.points.t1 = 0; m.points.t2 = 0;
                 alert('¡JUEGO FINALIZADO! 🎾');
             }
        } else {
            const limit = t.scoreType === 'tiebreak' ? 7 : 11;
            if (m.points.t1 >= limit || m.points.t2 >= limit) {
                document.getElementById(`manual-score-1`).value = m.points.t1;
                document.getElementById(`manual-score-2`).value = m.points.t2;
            }
        }
        this.renderScoreboardPanel();
    },

    submitScore() {
        const s1 = parseInt(document.getElementById('manual-score-1').value) || 0;
        const s2 = parseInt(document.getElementById('manual-score-2').value) || 0;
        const m = this.state.currentTournament.matches.find(x => x.id === this.activeMatch.id);
        m.score1 = s1; m.score2 = s2;

        const updateP = (ids, won, pts) => {
            ids.forEach(id => {
                const p = this.state.currentTournament.players.find(x => x.id === id);
                p.score += pts; p.matchesPlayed++; if (won) p.wins++;
            });
        };
        updateP(m.team1, s1 > s2, s1); updateP(m.team2, s2 > s1, s2);
        
        Storage.save(this.state);
        this.renderDashboard();
        this.showView('dashboard');
    },

    nextRound() {
        const newMatches = this.generateMatches();
        if (newMatches.length === 0) return alert('¡SIN MÁS COMBINACIONES! No hay más parejas o cruces posibles en este formato.');
        this.state.currentTournament.matches.push(...newMatches);
        Storage.save(this.state);
        this.renderDashboard();
    },

    confirmEndTournament() {
        if (confirm('¿Deseas cerrar el torneo y guardar en historial?')) {
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
        const players = Object.entries(this.state.globalStats.players).map(([name, s]) => ({ name, ...s, rate: (s.wins/s.totalMatches*100 || 0).toFixed(0) }));
        
        if (this.globalRankMode === 'cups') players.sort((a,b) => b.firstPlaces - a.firstPlaces);
        else if (this.globalRankMode === 'effect') players.sort((a,b) => b.rate - a.rate);
        else players.sort((a,b) => b.wins - a.wins);

        document.querySelectorAll('#view-stats .rank-tab').forEach(t => {
            t.classList.remove('active');
            if (t.dataset.gmode === this.globalRankMode) t.classList.add('active');
        });

        container.innerHTML = players.map((p, i) => `
            <div class="card" style="display:flex; align-items:center; gap:15px; padding:15px;">
                <div style="font-size:20px; width:30px; font-weight:900; color:var(--primary);">${i+1}</div>
                <div style="flex:1;">
                    <div style="font-weight:900; font-size:16px;">${p.name}</div>
                    <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase; font-weight:800;">${p.firstPlaces} COPAS • ${p.rate}% EFIC.</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:900; color:var(--primary); font-size:18px;">${p.wins}W</div>
                </div>
            </div>
        `).join('');
    },

    setGlobalRankMode(mode) {
        this.globalRankMode = mode;
        this.showGlobalStats();
    },

    viewPastTournament(index) {
        const t = this.state.history[index];
        const sorted = [...t.players].sort((a,b) => b.score - a.score);
        const winner = sorted[0];
        
        alert(`RESUMEN TORNEO: ${t.name}\n🏆 Ganador: ${winner.name} (${winner.score} pts)\n🥈 Segundo: ${sorted[1]?.name || '-'}\n🥉 Tercero: ${sorted[2]?.name || '-'}\n\nDetalle completo en desarrollo.`);
    }
};

window.onload = () => app.init();
