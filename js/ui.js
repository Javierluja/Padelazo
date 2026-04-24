const app = {
    state: null,
    activeMatch: null,
    matchTimer: null,
    matchSeconds: 0,
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
        // Stop timer when leaving score view
        if (viewId !== 'score') this.stopTimer();
        window.scrollTo(0, 0);
    },

    showDashboardIfActive() {
        if (this.state.currentTournament) this.showView('dashboard');
        else alert('No hay un torneo activo.');
    },

    /* ===================== HOME ===================== */
    renderHome() {
        const activeContainer = document.getElementById('active-tournament-card');
        if (this.state.currentTournament) {
            const t = this.state.currentTournament;
            activeContainer.innerHTML = `
                <div class="card" style="border: 1px solid var(--primary); background: var(--primary-glow); margin: 20px 0;" onclick="app.showView('dashboard')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="font-size:10px; font-weight:900; color:var(--primary); margin:0; letter-spacing:1px;">TORNEO EN JUEGO</p>
                            <h3 style="margin:6px 0 0; font-size:22px;">${t.name}</h3>
                        </div>
                        <div style="font-size:28px;">🎾</div>
                    </div>
                </div>
            `;
        } else { activeContainer.innerHTML = ''; }

        const container = document.getElementById('history-container');
        if (this.state.history.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 50px 20px; color: var(--text-dim);">No hay historial aún...<br><span style="font-size:30px; margin-top:10px; display:block;">🎾</span></div>`;
            return;
        }

        container.innerHTML = `<h3 style="margin: 35px 0 15px; font-size: 11px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 2px;">TORNEOS FINALIZADOS</h3>` +
            this.state.history.map((t, index) => {
                const sorted = [...t.players].sort((a, b) => b.score - a.score);
                const winner = sorted[0];
                const modeLabel = t.type === 'americano' ? '🔄 Americano' : t.type === 'robin' ? '🛡️ Todos v Todos' : '👑 Rey Cancha';
                return `
                <div class="card" style="padding: 18px; margin-bottom: 12px; cursor: pointer;" onclick="app.viewPastTournament(${index})">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 52px; height: 52px; border-radius: 16px; background: var(--secondary); display:flex; align-items:center; justify-content:center; font-size:24px; border: 1px solid var(--glass-border); flex-shrink:0;">🏆</div>
                        <div style="flex:1; min-width:0;">
                            <h4 style="margin:0 0 4px; font-size:17px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.name}</h4>
                            <p style="margin:0; font-size:11px; color:var(--text-dim);">${modeLabel} • ${new Date(t.id).toLocaleDateString()}</p>
                            <p style="margin:3px 0 0; font-size:12px; color:var(--primary); font-weight:700;">🥇 ${winner.name}</p>
                        </div>
                        <div style="font-size:22px; color:var(--text-dim); flex-shrink:0;">›</div>
                    </div>
                </div>
            `}).join('');
    },

    showSetup(mode) {
        this.state.mode = mode;
        this.showView('setup');
        const titles = { americano: '🔄 Americano', rey: '👑 Rey de Cancha', robin: '🛡️ Todos vs Todos' };
        document.getElementById('setup-title').innerText = titles[mode] || 'Configuración';
        const amGroup = document.getElementById('setup-group-mode');
        if (mode === 'americano') amGroup.classList.remove('hidden');
        else amGroup.classList.add('hidden');
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
        div.className = 'player-row-card';
        div.innerHTML = `
            <label class="photo-upload-label">
                <div class="avatar-placeholder">
                    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:28px; height:28px;">
                        <circle cx="20" cy="14" r="7" fill="var(--text-dim)" opacity="0.5"/>
                        <path d="M6 36c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="var(--text-dim)" stroke-width="2.5" stroke-linecap="round" opacity="0.5"/>
                    </svg>
                </div>
                <img class="player-photo-thumb hidden">
                <input type="file" accept="image/*" class="hidden" onchange="app.handlePhotoUpload(this)">
            </label>
            <input type="text" placeholder="NOMBRE JUGADOR">
            <button onclick="this.parentElement.remove()">×</button>
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
                label.querySelector('.avatar-placeholder').classList.add('hidden');
                label.dataset.photo = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    startTournament() {
        const name = document.getElementById('input-tournament-name').value.trim() || 'Torneo Padelazo';
        const courts = parseInt(document.getElementById('input-courts').value) || 1;
        const courtNames = Array.from(document.querySelectorAll('.court-name-input')).map(i => i.value || `PISTA ${i}`);
        const players = Array.from(document.querySelectorAll('.player-row-card')).map((row, i) => ({
            id: i,
            name: row.querySelector('input[type="text"]').value.trim(),
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
        if (initialMatches.length === 0) return alert('Error generando encuentros. Verifica la configuración.');
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

    /* ===================== DASHBOARD ===================== */
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
                <div class="card" style="text-align: center; padding: 40px 20px; border: 2px dashed var(--primary);">
                    <div style="font-size: 48px; margin-bottom:16px;">🏁</div>
                    <h3 style="margin-bottom:8px;">¡Ronda a la Bolsa!</h3>
                    <p style="font-size: 13px; color: var(--text-dim); margin-bottom: 28px;">Todos los partidos están listos.</p>
                    <button class="btn-primary" onclick="app.nextRound()">SIGUIENTE RONDA 🎾</button>
                    <button class="btn-outline" style="margin-top:12px;" onclick="app.confirmEndTournament()">FINALIZAR TORNEO</button>
                </div>
            `;
        } else {
            mc.innerHTML = t.matches.map(m => `
                <div class="card" style="padding: 18px; border-left: 5px solid ${m.score1 === null ? 'var(--primary)' : 'transparent'}; ${m.score1 === null ? 'cursor:pointer;' : 'opacity:0.55;'}" ${m.score1 === null ? `onclick="app.enterScore(${m.id})"` : ''}>
                    <div style="display:flex; justify-content:space-between; font-size:10px; font-weight:900; margin-bottom:12px; letter-spacing:1px;">
                        <span style="color:var(--text-dim);">${m.court.toUpperCase()}</span>
                        <span style="color:${m.score1 === null ? 'var(--primary)' : 'var(--text-dim)'};">${m.score1 === null ? '● VIVO' : '✓ TERMINADO'}</span>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                        <div style="text-align:right; flex:1; font-weight:800; font-size:14px; line-height:1.4;">${this.getPairDisplay(t, m.team1)}</div>
                        <div style="min-width:55px; text-align:center; font-size:${m.score1 !== null ? '22px' : '13px'}; font-weight:900; color:var(--primary);">${m.score1 !== null ? `${m.score1}-${m.score2}` : 'VS'}</div>
                        <div style="text-align:left; flex:1; font-weight:800; font-size:14px; line-height:1.4;">${this.getPairDisplay(t, m.team2)}</div>
                    </div>
                </div>
            `).join('');
        }
    },

    getPairDisplay(t, ids) {
        return ids.map(id => t.players.find(p => p.id === id)?.name || '?').join('<br>');
    },

    renderRanking() {
        const t = this.state.currentTournament;
        if (!t) return;
        const lb = document.getElementById('leaderboard-content');
        let sorted = [...t.players];
        if (this.rankingMode === 'score') sorted.sort((a, b) => b.score - a.score);
        else if (this.rankingMode === 'wins') sorted.sort((a, b) => b.wins - a.wins);
        else if (this.rankingMode === 'effect') sorted.sort((a, b) => (b.wins / (b.matchesPlayed || 1)) - (a.wins / (a.matchesPlayed || 1)));

        const medals = ['🥇', '🥈', '🥉'];
        lb.innerHTML = sorted.map((p, i) => `
            <div class="card" style="display:flex; align-items:center; gap:14px; padding:14px 18px;">
                <div style="font-size:22px; width:30px; text-align:center; flex-shrink:0;">${medals[i] || `<span style="color:var(--text-dim);font-weight:900;">${i+1}</span>`}</div>
                <div style="width:44px; height:44px; border-radius:14px; overflow:hidden; background:var(--secondary); border: 1px solid var(--glass-border); flex-shrink:0;">
                    ${p.photo ? `<img src="${p.photo}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="display:flex; align-items:center; justify-content:center; height:100%;"><svg viewBox="0 0 40 40" fill="none" style="width:22px;height:22px;"><circle cx="20" cy="14" r="7" fill="var(--text-dim)" opacity="0.4"/><path d="M6 36c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="var(--text-dim)" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/></svg></div>`}
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:800; font-size:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name}</div>
                    <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase; font-weight:700;">${p.wins}V - ${p.matchesPlayed - p.wins}D • ${Math.round((p.wins/(p.matchesPlayed||1))*100)}%</div>
                </div>
                <div style="text-align:right; flex-shrink:0;">
                    <div style="font-weight:900; font-size:22px; color:var(--primary); line-height:1;">${p.score}</div>
                    <div style="font-size:9px; font-weight:800; color:var(--text-dim);">PTS</div>
                </div>
            </div>
        `).join('');
    },

    /* ===================== SCOREBOARD ===================== */
    enterScore(matchId) {
        const m = this.state.currentTournament.matches.find(x => x.id === matchId);
        this.activeMatch = m;
        if (!m.points) m.points = { t1: 0, t2: 0 };
        document.getElementById('score-court-label').innerText = m.court.toUpperCase();
        document.getElementById('manual-score-1').value = m.score1 !== null ? m.score1 : '';
        document.getElementById('manual-score-2').value = m.score2 !== null ? m.score2 : '';
        this.startTimer();
        this.renderScoreboardPanel();
        this.showView('score');
    },

    /* -------- TIMER -------- */
    startTimer() {
        this.stopTimer();
        this.matchSeconds = 0;
        this.matchTimer = setInterval(() => {
            this.matchSeconds++;
            const el = document.getElementById('match-timer');
            if (el) {
                const mins = String(Math.floor(this.matchSeconds / 60)).padStart(2, '0');
                const secs = String(this.matchSeconds % 60).padStart(2, '0');
                el.innerText = `${mins}:${secs}`;
                // Highlight timer after 15 mins
                if (this.matchSeconds >= 900) el.style.color = '#ff5252';
                else if (this.matchSeconds >= 600) el.style.color = '#ffd700';
                else el.style.color = 'var(--text-dim)';
            }
        }, 1000);
    },

    stopTimer() {
        if (this.matchTimer) { clearInterval(this.matchTimer); this.matchTimer = null; }
    },

    renderScoreboardPanel() {
        const m = this.activeMatch;
        const t = this.state.currentTournament;
        const container = document.getElementById('scoreboard-ui');
        const scoreType = t.scoreType;
        const getNames = (ids) => ids.map(id => t.players.find(p => p.id === id)?.name || '?').join(' & ');

        // Labels for different score types
        const normalLabels = ['0', '15', '30', '40', 'ORO'];

        // Gold point only in normal mode at 3-3
        const isGold = scoreType === 'normal' && m.points.t1 === 3 && m.points.t2 === 3;

        const renderTeamPanel = (team, teamNum) => {
            const pts = m.points[`t${teamNum}`];
            const photo = (ids) => {
                const p = t.players.find(x => x.id === ids[0]);
                return p && p.photo ? `<img src="${p.photo}" style="width:36px;height:36px;border-radius:10px;object-fit:cover;border:2px solid var(--primary);">` 
                    : `<div style="width:36px;height:36px;border-radius:10px;background:var(--secondary);border:1px solid var(--glass-border);display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 40 40" fill="none" style="width:20px;height:20px;"><circle cx="20" cy="14" r="7" fill="var(--text-dim)" opacity="0.5"/><path d="M6 36c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="var(--text-dim)" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/></svg></div>`;
            };

            // Score display: label for normal mode, number for tiebreaks
            let scoreHTML = '';
            if (scoreType === 'normal') {
                scoreHTML = `<div class="score-display ${isGold ? 'gold-text' : ''}">${normalLabels[pts] || 'ORO'}</div>`;
            } else {
                scoreHTML = `<div class="score-display">${pts}</div>`;
            }

            // Progress indicators: labels for normal, dots for tiebreak
            let progressHTML = '';
            if (scoreType === 'normal') {
                const labels = ['0', '15', '30', '40'];
                progressHTML = `
                    <div class="points-label-track">
                        ${labels.map((l, i) => `<div class="point-label ${pts > i ? 'active' : ''}">${l}</div>`).join('')}
                        <div class="point-label gold-label ${isGold ? 'gold-active' : ''}">ORO</div>
                    </div>`;
            } else {
                const limit = scoreType === 'tiebreak' ? 7 : 11;
                progressHTML = `
                    <div class="dots-container" style="flex-wrap:wrap; max-width:120px;">
                        ${Array.from({length: limit}, (_, i) => `<div class="dot ${pts > i ? 'active' : ''}"></div>`).join('')}
                    </div>`;
            }

            return `
                <div class="team-panel">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px;">
                        ${photo(team)}
                        <div style="font-size:13px; font-weight:800; flex:1; overflow:hidden;">${getNames(team)}</div>
                    </div>
                    ${scoreHTML}
                    ${progressHTML}
                    <button class="score-btn ${isGold ? 'gold-point' : ''}" onclick="app.addPoint(${teamNum})">${isGold ? '⚡ ORO' : '+1'}</button>
                </div>
            `;
        };

        container.innerHTML = renderTeamPanel(m.team1, 1) + renderTeamPanel(m.team2, 2);
    },

    addPoint(team) {
        const m = this.activeMatch;
        const t = this.state.currentTournament;
        const scoreType = t.scoreType;

        if (team === 1) m.points.t1++; else m.points.t2++;

        if (scoreType === 'normal') {
            const isGoldPoint = m.points.t1 === 4 || m.points.t2 === 4;
            if (isGoldPoint) {
                // Gold point: winner of this point wins the game
                const winner = m.points.t1 > m.points.t2 ? 1 : 2;
                const inp = document.getElementById(`manual-score-${winner}`);
                inp.value = (parseInt(inp.value) || 0) + 1;
                m.points.t1 = 0; m.points.t2 = 0;
                // No alert - only flash indicator
                this.flashGameWon(winner);
            }
        } else {
            // Tiebreak / Super Tiebreak: raw points
            const limit = scoreType === 'tiebreak' ? 7 : 11;
            const t1 = m.points.t1, t2 = m.points.t2;
            const diff = Math.abs(t1 - t2);
            const leader = Math.max(t1, t2);
            if (leader >= limit && diff >= 2) {
                // Game over for tiebreak
                const winner = t1 > t2 ? 1 : 2;
                document.getElementById('manual-score-1').value = t1;
                document.getElementById('manual-score-2').value = t2;
                this.flashGameWon(winner);
                // Reset for potential next game (if using tiebreak for individual games)
            }
        }
        this.renderScoreboardPanel();
    },

    flashGameWon(winner) {
        // Visual flash: show ¡JUEGO! banner momentarily
        const ui = document.getElementById('scoreboard-ui');
        const banner = document.createElement('div');
        banner.className = 'game-won-banner';
        banner.innerText = `¡JUEGO! EQUIPO ${winner} 🎾`;
        ui.prepend(banner);
        setTimeout(() => banner.remove(), 1800);
    },

    submitScore() {
        const s1 = parseInt(document.getElementById('manual-score-1').value) || 0;
        const s2 = parseInt(document.getElementById('manual-score-2').value) || 0;
        if (s1 === 0 && s2 === 0 && !confirm('¿Confirmar marcador 0-0?')) return;

        const m = this.state.currentTournament.matches.find(x => x.id === this.activeMatch.id);
        m.score1 = s1; m.score2 = s2;

        const updateP = (ids, won, pts) => {
            ids.forEach(id => {
                const p = this.state.currentTournament.players.find(x => x.id === id);
                if (!p) return;
                p.score += pts; p.matchesPlayed++; if (won) p.wins++;
            });
        };
        updateP(m.team1, s1 > s2, s1);
        updateP(m.team2, s2 > s1, s2);

        this.stopTimer();
        Storage.save(this.state);
        this.renderDashboard();
        this.showView('dashboard');
    },

    nextRound() {
        const newMatches = this.generateMatches();
        if (newMatches.length === 0) {
            // Show visible modal instead of alert
            this.showEndOfRoundsModal();
            return;
        }
        this.state.currentTournament.matches.push(...newMatches);
        Storage.save(this.state);
        this.renderDashboard();
    },

    showEndOfRoundsModal() {
        const mc = document.getElementById('matches-content');
        mc.innerHTML = `
            <div class="card" style="text-align:center; padding:40px 20px; border: 2px solid var(--primary); background: var(--primary-glow);">
                <div style="font-size:50px; margin-bottom:16px;">🏆</div>
                <h2 style="color:var(--primary); margin-bottom:8px;">¡FIN DEL TORNEO!</h2>
                <p style="font-size:13px; color:var(--text-dim); margin-bottom:24px;">
                    Todas las combinaciones de parejas posibles ya fueron jugadas.<br>
                    No hay más cruces disponibles.
                </p>
                <button class="btn-primary" onclick="app.confirmEndTournament()">VER PODIO Y CERRAR 🎖️</button>
            </div>
        `;
    },

    confirmEndTournament() {
        if (confirm('¿Cerrar torneo y guardar en el historial?')) {
            Engine.updateGlobalStats(this.state.globalStats, this.state.currentTournament);
            this.state.history.unshift(this.state.currentTournament);
            this.state.currentTournament = null;
            Storage.save(this.state);
            this.showView('home');
            this.renderHome();
        }
    },

    /* ===================== PAST TOURNAMENT DETAIL ===================== */
    viewPastTournament(index) {
        const t = this.state.history[index];
        this.renderPastDetail(t);
        this.showView('past-detail');
    },

    renderPastDetail(t) {
        const sorted = [...t.players].sort((a, b) => b.score - a.score);
        const modeLabel = t.type === 'americano' ? '🔄 Americano' : t.type === 'robin' ? '🛡️ Todos v Todos' : '👑 Rey Cancha';
        const medals = ['🥇', '🥈', '🥉'];
        const container = document.getElementById('past-detail-content');

        container.innerHTML = `
            <!-- header -->
            <div style="text-align:center; margin-bottom:30px;">
                <div style="font-size:50px; margin-bottom:10px;">🏆</div>
                <h2 style="font-size:24px; margin-bottom:5px;">${t.name}</h2>
                <p style="font-size:11px; font-weight:800; color:var(--text-dim); letter-spacing:1px;">${modeLabel} • ${new Date(t.id).toLocaleDateString()}</p>
            </div>

            <!-- Podio -->
            <div class="card" style="margin-bottom:20px;">
                <h4 style="font-size:11px; font-weight:900; color:var(--text-dim); letter-spacing:2px; text-transform:uppercase; margin-bottom:15px;">PODIO FINAL</h4>
                <div style="display:flex; gap:10px;">
                    ${sorted.slice(0, 3).map((p, i) => `
                        <div style="flex:1; text-align:center; padding:15px 10px; background:var(--secondary); border-radius:20px; border:${i === 0 ? '1px solid var(--primary)' : '1px solid var(--glass-border)'};">
                            <div style="font-size:28px; margin-bottom:8px;">${medals[i]}</div>
                            <div style="font-size:12px; font-weight:800; line-height:1.2;">${p.name}</div>
                            <div style="font-size:18px; font-weight:900; color:var(--primary); margin-top:5px;">${p.score}</div>
                            <div style="font-size:9px; color:var(--text-dim);">PTS</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Tabla completa -->
            <div class="card" style="margin-bottom:20px;">
                <h4 style="font-size:11px; font-weight:900; color:var(--text-dim); letter-spacing:2px; text-transform:uppercase; margin-bottom:15px;">TABLA COMPLETA</h4>
                ${sorted.map((p, i) => `
                    <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--glass-border);">
                        <div style="font-size:16px; width:28px; text-align:center;">${medals[i] || `<span style="color:var(--text-dim);font-weight:800;">${i+1}</span>`}</div>
                        <div style="width:38px; height:38px; border-radius:12px; overflow:hidden; background:var(--secondary); flex-shrink:0;">
                            ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;"><svg viewBox="0 0 40 40" fill="none" style="width:20px;height:20px;"><circle cx="20" cy="14" r="7" fill="var(--text-dim)" opacity="0.4"/><path d="M6 36c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="var(--text-dim)" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/></svg></div>`}
                        </div>
                        <div style="flex:1;"><div style="font-weight:700;">${p.name}</div><div style="font-size:10px;color:var(--text-dim);">${p.wins}V - ${p.matchesPlayed-p.wins}D</div></div>
                        <div style="font-weight:900; color:var(--primary);">${p.score} pts</div>
                    </div>
                `).join('')}
            </div>

            <!-- Todos los partidos disputados -->
            <div class="card">
                <h4 style="font-size:11px; font-weight:900; color:var(--text-dim); letter-spacing:2px; text-transform:uppercase; margin-bottom:15px;">PARTIDOS</h4>
                ${t.matches.filter(m => m.score1 !== null).map(m => `
                    <div style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--glass-border);">
                        <div style="font-size:10px; color:var(--text-dim); width:55px; font-weight:700;">${m.court}</div>
                        <div style="flex:1; text-align:right; font-size:13px; font-weight:700;">${this.getPairDisplay(t, m.team1)}</div>
                        <div style="min-width:50px; text-align:center; font-weight:900; color:var(--primary);">${m.score1}-${m.score2}</div>
                        <div style="flex:1; font-size:13px; font-weight:700;">${this.getPairDisplay(t, m.team2)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /* ===================== GLOBAL STATS ===================== */
    showGlobalStats() {
        this.showView('stats');
        this._renderGlobalStats();
    },

    setGlobalRankMode(mode) {
        this.globalRankMode = mode;
        this._renderGlobalStats();
    },

    _renderGlobalStats() {
        const container = document.getElementById('global-stats-content');
        const players = Object.entries(this.state.globalStats.players).map(([name, s]) => ({
            name, ...s, rate: Math.round((s.wins / (s.totalMatches || 1)) * 100)
        }));

        if (this.globalRankMode === 'cups') players.sort((a, b) => b.firstPlaces - a.firstPlaces);
        else if (this.globalRankMode === 'effect') players.sort((a, b) => b.rate - a.rate);
        else players.sort((a, b) => b.wins - a.wins);

        document.querySelectorAll('#view-stats .rank-tab').forEach(t => {
            t.classList.remove('active');
            if (t.dataset.gmode === this.globalRankMode) t.classList.add('active');
        });

        if (players.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:60px 20px; color:var(--text-dim);">Sin datos globales aún. ¡Finaliza tu primer torneo!</div>`;
            return;
        }

        const medals = ['👑', '🥈', '🥉'];
        container.innerHTML = players.map((p, i) => `
            <div class="card" style="display:flex; align-items:center; gap:14px; padding:14px 18px;">
                <div style="font-size:24px; width:32px; text-align:center; flex-shrink:0;">${medals[i] || i + 1}</div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:900; font-size:16px;">${p.name}</div>
                    <div style="font-size:10px; color:var(--text-dim); text-transform:uppercase; font-weight:700;">${p.firstPlaces} COPAS • ${p.rate}% EFIC. • ${p.totalMatches} PARTIDOS</div>
                </div>
                <div style="text-align:right; flex-shrink:0;">
                    <div style="font-weight:900; color:var(--primary); font-size:20px;">${p.wins}W</div>
                    <div style="font-size:9px; color:var(--text-dim); font-weight:800;">${p.losses}L</div>
                </div>
            </div>
        `).join('');
    }
};

window.onload = () => app.init();
