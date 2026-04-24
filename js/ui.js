const app = {
    state: null,
    activeMatch: null,
    rankingMode: 'score', // current tournament filter
    globalRankMode: 'cups', // global stats filter

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
        else alert('No hay un torneo activo.');
    },

    renderHome() {
        // Current Tournament UI
        const activeContainer = document.getElementById('active-tournament-card');
        if (this.state.currentTournament) {
            const t = this.state.currentTournament;
            activeContainer.innerHTML = `
                <div class="card" style="border: 2px solid var(--primary); background: var(--primary-glow);" onclick="app.showView('dashboard')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="font-size:9px; font-weight:800; color:var(--primary); margin-bottom:5px;">EN CURSO</p>
                            <h2 style="font-size:24px;">${t.name}</h2>
                        </div>
                        <div style="font-size:30px;">🎾</div>
                    </div>
                </div>
            `;
        } else { activeContainer.innerHTML = ''; }

        // History UI (Mockup style)
        const container = document.getElementById('history-container');
        if (this.state.history.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 50px; color: var(--text-dim);">No hay torneos realizados</div>`;
            return;
        }

        container.innerHTML = `<h3 style="margin: 30px 0 15px; font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 2px;">TORNEOS FINALIZADOS</h3>` + 
            this.state.history.map((t, index) => {
                const winner = [...t.players].sort((a,b) => b.score - a.score)[0];
                return `
                <div class="card" style="background: var(--bg-card); padding: 15px;" onclick="app.viewPastTournament(${index})">
                    <div style="display: flex; gap: 15px; align-items: center;">
                        <div style="width: 50px; height: 50px; border-radius: 15px; background: var(--secondary); display:flex; align-items:center; justify-content:center; font-size:22px;">🏆</div>
                        <div style="flex: 1;">
                            <h4 style="font-size: 16px;">${t.name}</h4>
                            <p style="font-size: 11px; color: var(--text-dim);">${new Date(t.id).toLocaleDateString()} • Winner: ${winner.name}</p>
                        </div>
                    </div>
                </div>
            `}).join('');
    },

    showSetup(mode) {
        this.state.mode = mode;
        this.showView('setup');
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
        div.style = "padding: 12px; display: flex; gap: 15px; align-items: center; background: var(--secondary); margin-bottom: 0;";
        div.innerHTML = `
            <label class="photo-upload-label" style="width: 40px; height: 40px; font-size: 14px;">
                <span class="photo-placeholder">📷</span>
                <img class="player-photo hidden" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;">
                <input type="file" accept="image/*" class="hidden" onchange="app.handlePhotoUpload(this)">
            </label>
            <input type="text" placeholder="NOMBRE" style="flex: 1; padding: 0; background: transparent; border: none; font-weight: 800; font-size: 14px;">
            <button onclick="this.parentElement.remove()" style="color: var(--danger); background: none; border: none; font-size: 20px;">×</button>
        `;
        list.appendChild(div);
    },

    handlePhotoUpload(input) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const label = input.parentElement;
            const img = label.querySelector('img');
            img.src = e.target.result;
            img.classList.remove('hidden');
            label.querySelector('.photo-placeholder').classList.add('hidden');
            label.dataset.photo = e.target.result;
        };
        if (input.files[0]) reader.readAsDataURL(input.files[0]);
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

        if (players.length < 4) return alert('Mínimo 4 integrantes');

        const options = { americanoType: document.getElementById('input-americano-type').value, scoreType: 'normal' };
        let t;
        if (this.state.mode === 'americano') t = Engine.generateAmericano(players, courts, courtNames, options);
        else if (this.state.mode === 'robin') t = Engine.generateRobin(players, courts, courtNames, options);
        else if (this.state.mode === 'rey') t = Engine.generateRey(players, courts, courtNames, options);

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

    setRankingMode(mode) {
        this.rankingMode = mode;
        document.querySelectorAll('#dashboard-ranking .rank-tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        this.renderRanking();
    },

    renderDashboard() {
        const t = this.state.currentTournament;
        this.renderRanking();
        
        const mc = document.getElementById('matches-content');
        const pending = t.matches.filter(m => m.score1 === null);
        
        if (pending.length === 0) {
            mc.innerHTML = `
                <div class="match-end-notice">
                    🏁 RONDA FINALIZADA<br>
                    <span style="font-size:11px; font-weight:400; opacity:0.8;">Todos los partidos están listos.</span>
                </div>
                <button class="btn-primary" onclick="app.nextRound()">SIGUIENTE RONDA 🎾</button>
                <button class="btn-primary" style="margin-top:15px; background:var(--secondary); color:white; box-shadow:none;" onclick="app.confirmEndTournament()">CERRAR TORNEO</button>
            `;
        } else {
            mc.innerHTML = t.matches.map(m => `
                <div class="card" style="padding: 18px; border-left: 4px solid ${m.score1 === null ? 'var(--primary)' : 'var(--text-dim)'};" ${m.score1 === null ? `onclick="app.enterScore(${m.id})"` : ''}>
                    <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:900; margin-bottom:12px;">
                        <span>${m.court}</span>
                        <span style="color:${m.score1 === null ? 'var(--primary)' : 'var(--text-dim)'};">${m.score1 === null ? 'JUGÁNDOSE' : 'FINALIZADO'}</span>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <div style="text-align:right; flex:1; font-weight:800;">${this.getPairDisplay(t, m.team1)}</div>
                        <div style="width:60px; text-align:center; font-size:20px; font-weight:900; color:var(--primary);">${m.score1 !== null ? `${m.score1}-${m.score2}` : 'VS'}</div>
                        <div style="text-align:left; flex:1; font-weight:800;">${this.getPairDisplay(t, m.team2)}</div>
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
                <div style="font-weight:900; color:var(--primary); font-size:18px; width:25px;">#${i+1}</div>
                <div style="width:45px; height:45px; border-radius:12px; overflow:hidden; background:var(--secondary);">
                    ${p.photo ? `<img src="${p.photo}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="display:flex; align-items:center; justify-content:center; height:100%; font-size:20px;">👤</div>`}
                </div>
                <div style="flex:1;">
                    <div style="font-weight:800; font-size:15px;">${p.name}</div>
                    <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase;">${p.wins}W / ${p.matchesPlayed}J • ${((p.wins/p.matchesPlayed || 0)*100).toFixed(0)}% Efectivo</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:900; font-size:18px; color:var(--primary);">${p.score}</div>
                    <div style="font-size:9px; font-weight:800; color:var(--text-dim);">PTS</div>
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
        this.renderSetTracker();
        this.showView('score');
    },

    renderSetTracker() {
        const m = this.activeMatch;
        const t = this.state.currentTournament;
        const container = document.getElementById('set-tracker-ui');
        const p1 = t.players.find(p => p.id === m.team1[0]);
        const p2 = t.players.find(p => p.id === m.team2[0]);
        const labels = ['0', '15', '30', '40', 'ORO'];

        container.innerHTML = `
            <div class="set-container">
                <div class="set-row" style="border-left: 5px solid var(--primary);">
                    <div style="flex:1;">
                        <p style="font-size:11px; font-weight:800; color:var(--text-dim);">EQUIPO 1</p>
                        <h3 style="font-size:18px;">${this.getPairDisplayShort(t, m.team1)}</h3>
                    </div>
                    <div style="display:flex; gap:15px; align-items:center;">
                        <div class="game-score-box" onclick="app.addGamePoint(1)">${labels[m.points.t1] || '40'}</div>
                        <div class="set-score-box" id="set-score-1">${document.getElementById('manual-score-1').value || 0}</div>
                    </div>
                </div>
                <div class="set-row">
                    <div style="flex:1;">
                        <p style="font-size:11px; font-weight:800; color:var(--text-dim);">EQUIPO 2</p>
                        <h3 style="font-size:18px;">${this.getPairDisplayShort(t, m.team2)}</h3>
                    </div>
                    <div style="display:flex; gap:15px; align-items:center;">
                        <div class="game-score-box" onclick="app.addGamePoint(2)">${labels[m.points.t2] || '40'}</div>
                        <div class="set-score-box" id="set-score-2">${document.getElementById('manual-score-2').value || 0}</div>
                    </div>
                </div>
            </div>
        `;
    },

    getPairDisplayShort(t, ids) {
        return ids.map(id => t.players.find(p => p.id === id).name).join(' & ');
    },

    addGamePoint(team) {
        const m = this.activeMatch;
        if (team === 1) m.points.t1++; else m.points.t2++;
        
        // Padel Gold Point logic
        if (m.points.t1 > 3 || m.points.t2 > 3) {
            const setInp = document.getElementById(`manual-score-${team}`);
            setInp.value = (parseInt(setInp.value) || 0) + 1;
            m.points.t1 = 0; m.points.t2 = 0;
            alert('¡JUEGO FINALIZADO! 🎾');
        }
        this.renderSetTracker();
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
        if (newMatches.length === 0) return alert('¡SIN MÁS COMBINACIONES! No hay más parejas o cruces disponibles.');
        this.state.currentTournament.matches.push(...newMatches);
        Storage.save(this.state);
        this.renderDashboard();
    },

    confirmEndTournament() {
        if (confirm('¿Cerrar y guardar torneo?')) {
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

        container.innerHTML = players.map((p, i) => `
            <div class="card" style="display:flex; align-items:center; gap:15px; padding:15px;">
                <div style="font-size:24px; width:30px;">${i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👏'}</div>
                <div style="flex:1;">
                    <div style="font-weight:900;">${p.name}</div>
                    <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase;">${p.firstPlaces} Copas • ${p.rate}% Eficacia</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:900; color:var(--primary);">${p.wins} Victorias</div>
                </div>
            </div>
        `).join('');
    },

    setGlobalRankMode(mode) {
        this.globalRankMode = mode;
        this.showGlobalStats();
    }
};

window.onload = () => app.init();
