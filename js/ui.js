/* =====================================================
   UI.JS v4.0 — Lógica de Interfaz Completa
   - Firebase invite/join flow
   - Rankings individuales con 5 subtabs
   - 7 indicadores globales
   - Fix de combinaciones con modal de continuar
   - Timer guardado por partido
   ===================================================== */
const app = {
    state: null,
    activeMatch: null,
    matchTimer: null,
    matchSeconds: 0,
    rankingMode: 'score',
    globalRankMode: 'cups',
    inviteCode: null,
    inviteUnsubscribe: null,

    /* ===================== INIT ===================== */
    init() {
        // Detectar si venimos de un link de inscripción
        const urlParams = new URLSearchParams(window.location.search);
        const joinCode = urlParams.get('join');
        if (joinCode) {
            this.showJoinView(joinCode.toUpperCase());
            return;
        }

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

    /* ===================== NAVIGATION ===================== */
    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const el = document.getElementById(`view-${viewId}`);
        if (el) el.classList.remove('hidden');
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        if (viewId === 'home') document.getElementById('nav-home')?.classList.add('active');
        if (viewId === 'dashboard') document.getElementById('nav-dash')?.classList.add('active');
        if (viewId === 'stats') document.getElementById('nav-stats')?.classList.add('active');
        if (viewId !== 'score') this.stopTimer();
        window.scrollTo(0, 0);
    },

    showDashboardIfActive() {
        if (this.state?.currentTournament) this.showView('dashboard');
        else alert('No hay un torneo activo. ¡Crea uno nuevo!');
    },

    /* ===================== HOME ===================== */
    renderHome() {
        const ac = document.getElementById('active-tournament-card');
        if (this.state.currentTournament) {
            const t = this.state.currentTournament;
            const pending = (t.matches || []).filter(m => m.score1 === null).length;
            ac.innerHTML = `
                <div class="card card-glow" onclick="app.showView('dashboard')">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <p class="label-tag">TORNEO EN CURSO</p>
                            <h3 style="font-size:22px;margin-top:5px;">${t.name}</h3>
                            <p style="font-size:12px;color:var(--text-dim);margin-top:4px;">${pending} partidos pendientes</p>
                        </div>
                        <div style="font-size:32px;">🎾</div>
                    </div>
                </div>`;
        } else { ac.innerHTML = ''; }

        const hc = document.getElementById('history-container');
        if (!this.state.history.length) {
            hc.innerHTML = `<div style="text-align:center;padding:50px 20px;color:var(--text-dim);">No hay historial aún.<br><span style="font-size:36px;display:block;margin-top:12px;">🎾</span></div>`;
            return;
        }
        hc.innerHTML = `<h3 class="section-label">HISTORIAL</h3>` +
            this.state.history.map((t, i) => {
                const winner = [...t.players].sort((a, b) => b.score - a.score)[0];
                const mIcon = { americano: '🔄', robin: '🛡️', rey: '👑' }[t.type] || '🎾';
                return `
                <div class="card card-row" onclick="app.viewPastTournament(${i})">
                    <div style="width:50px;height:50px;border-radius:16px;background:var(--secondary);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${mIcon}</div>
                    <div style="flex:1;min-width:0;">
                        <h4 style="font-size:16px;margin:0 0 3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.name}</h4>
                        <p style="font-size:11px;color:var(--text-dim);margin:0;">🥇 ${winner?.name || '–'} • ${new Date(t.id).toLocaleDateString()}</p>
                    </div>
                    <div style="font-size:20px;color:var(--text-dim);">›</div>
                </div>`;
            }).join('');
    },

    /* ===================== SETUP ===================== */
    showSetup(mode) {
        this.state.mode = mode;
        this.showView('setup');
        const titles = { americano: '🔄 Americano', rey: '👑 Rey de Cancha', robin: '🛡️ Todos vs Todos' };
        document.getElementById('setup-title').innerText = titles[mode] || 'Configuración';
        const amGroup = document.getElementById('setup-group-mode');
        if (mode === 'americano') amGroup?.classList.remove('hidden');
        else amGroup?.classList.add('hidden');
        this.updateCourtInputs();
    },

    updateCourtInputs() {
        const container = document.getElementById('court-names-container');
        if (!container) return;
        const count = parseInt(document.getElementById('input-courts')?.value) || 1;
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
        if (!list) return;
        const div = document.createElement('div');
        div.className = 'player-row-card';
        div.innerHTML = `
            <label class="photo-upload-label">
                <div class="avatar-placeholder">${this.avatarSVG()}</div>
                <img class="player-photo-thumb hidden">
                <input type="file" accept="image/*" class="hidden" onchange="app.handlePhotoUpload(this)">
            </label>
            <input type="text" placeholder="NOMBRE JUGADOR">
            <button onclick="this.parentElement.remove()">×</button>
        `;
        list.appendChild(div);
    },

    avatarSVG(color = 'var(--text-dim)') {
        return `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;opacity:0.5;">
            <circle cx="20" cy="14" r="7" fill="${color}"/>
            <path d="M6 36c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`;
    },

    handlePhotoUpload(input) {
        if (!input.files?.[0]) return;
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
    },

    collectPlayersFromForm() {
        return Array.from(document.querySelectorAll('.player-row-card'))
            .map((row, i) => ({
                id: i,
                name: row.querySelector('input[type="text"]').value.trim(),
                photo: row.querySelector('.photo-upload-label').dataset.photo || null,
                score: 0, wins: 0, matchesPlayed: 0,
                pointsAgainst: 0, totalSecondsOnCourt: 0,
                currentStreak: 0, bestStreak: 0
            }))
            .filter(p => p.name);
    },

    /* ===================== FIREBASE INVITE ===================== */
    async openInviteRoom() {
        const name = document.getElementById('input-tournament-name').value.trim() || 'Torneo Padelazo';
        const type = this.state.mode || 'americano';
        const scoreType = document.getElementById('input-score-type').value;

        // Mostrar loading
        const btn = document.getElementById('btn-invite');
        if (btn) btn.innerText = 'Creando sala...';

        try {
            const code = await FirebaseDB.createSession({ name, type, scoreType });
            this.inviteCode = code;
            this.renderInviteRoom(code, name);
            this.showView('invite');

            // Escuchar en tiempo real
            FirebaseDB.watchSession(code, (session) => {
                if (!session) return;
                const players = session.players ? Object.values(session.players) : [];
                this.updateInvitePlayerList(players);
            });

        } catch(e) {
            alert('Error conectando con Firebase. Verifica que Realtime Database esté activado.\n\n' + e.message);
        } finally {
            if (btn) btn.innerText = 'CONVOCAR JUGADORES (EN LÍNEA)';
        }
    },

    renderInviteRoom(code, tournamentName) {
        document.getElementById('invite-code-display').innerText = code;
        document.getElementById('invite-tournament-name').innerText = tournamentName;
        const inviteURL = `${window.location.origin}${window.location.pathname}?join=${code}`;
        document.getElementById('invite-url').innerText = inviteURL;

        // Generar QR
        const qrContainer = document.getElementById('qr-container');
        qrContainer.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: inviteURL,
                width: 200,
                height: 200,
                colorDark: '#ffffff',
                colorLight: '#111312',
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            qrContainer.innerHTML = `<div style="width:200px;height:200px;border:2px solid var(--primary);border-radius:16px;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;font-size:12px;color:var(--text-dim);">QR no disponible.<br>Comparte el código:<br><strong style="color:var(--primary);font-size:18px;">${code}</strong></div>`;
        }
    },

    updateInvitePlayerList(players) {
        const cnt = document.getElementById('invite-players-count');
        const lst = document.getElementById('invite-players-list');
        if (cnt) cnt.innerText = players.length;
        if (lst) {
            lst.innerHTML = players.map(p => `
                <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--glass-border);">
                    <div style="width:36px;height:36px;border-radius:10px;overflow:hidden;background:var(--secondary);">
                        ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;">${this.avatarSVG()}</div>`}
                    </div>
                    <div style="font-weight:700;">${p.name}</div>
                    <div style="margin-left:auto;color:var(--primary);font-size:11px;font-weight:800;">✓ INSCRITO</div>
                </div>
            `).join('');
        }
        // Habilitar botón de inicio si hay >= 4
        const startBtn = document.getElementById('btn-start-invite');
        if (startBtn) startBtn.disabled = players.length < 4;
    },

    async startFromInvite() {
        const session = await FirebaseDB.getSession(this.inviteCode);
        if (!session) return alert('Error obteniendo datos de la sesión.');

        const firebasePlayers = session.players ? Object.values(session.players) : [];
        const localPlayers = this.collectPlayersFromForm();
        const allPlayers = [...localPlayers, ...firebasePlayers].map((p, i) => ({
            ...p, id: i, score: 0, wins: 0, matchesPlayed: 0,
            pointsAgainst: 0, totalSecondsOnCourt: 0, currentStreak: 0, bestStreak: 0
        }));

        if (allPlayers.length < 4) return alert('¡Mínimo 4 jugadores!');

        await FirebaseDB.closeSession(this.inviteCode);
        FirebaseDB.stopWatching(this.inviteCode);

        this.launchTournament(allPlayers, session.name || 'Torneo Padelazo');
    },

    // Vista del JUGADOR: unirse desde link
    async showJoinView(code) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.querySelector('.bottom-nav')?.classList.add('hidden');
        const view = document.getElementById('view-join');
        if (view) view.classList.remove('hidden');

        const session = await FirebaseDB.getSession(code);
        const nameEl = document.getElementById('join-tournament-name');
        if (nameEl) {
            if (!session) {
                nameEl.innerText = '❌ Código no encontrado';
                document.getElementById('join-form').classList.add('hidden');
                return;
            }
            nameEl.innerText = session.name;
        }
        document.getElementById('join-code-display').innerText = code;
        window._joinCode = code;
    },

    async submitJoin() {
        const name = document.getElementById('join-player-name')?.value?.trim();
        if (!name) return alert('Escribe tu nombre');

        const photoLabel = document.querySelector('#join-photo-label');
        const photo = photoLabel?.dataset.photo || null;

        const btn = document.getElementById('btn-join-submit');
        if (btn) btn.innerText = 'Inscribiendo...';

        const result = await FirebaseDB.joinSession(window._joinCode, { name, photo });

        if (result.success) {
            document.getElementById('join-form').classList.add('hidden');
            document.getElementById('join-success').classList.remove('hidden');
            document.getElementById('join-success-name').innerText = result.sessionName;
        } else {
            alert(result.error);
            if (btn) btn.innerText = 'INSCRIBIRME';
        }
    },

    /* ===================== START TOURNAMENT ===================== */
    startTournament() {
        const name = document.getElementById('input-tournament-name').value.trim() || 'Torneo Padelazo';
        const players = this.collectPlayersFromForm();
        if (players.length < 4) return alert('¡Mínimo 4 jugadores!');
        this.launchTournament(players, name);
    },

    launchTournament(players, name) {
        const courts = parseInt(document.getElementById('input-courts')?.value) || 1;
        const courtNames = Array.from(document.querySelectorAll('.court-name-input')).map(i => i.value || `PISTA`);
        const options = {
            americanoType: document.getElementById('input-americano-type')?.value || 'individual',
            scoreType: document.getElementById('input-score-type')?.value || 'normal'
        };

        let t;
        const mode = this.state.mode;
        if (mode === 'americano') t = Engine.generateAmericano(players, courts, courtNames, options);
        else if (mode === 'robin') t = Engine.generateRobin(players, courts, courtNames, options);
        else t = Engine.generateRey(players, courts, courtNames, options);

        t.name = name;
        this.state.currentTournament = t;
        const initialMatches = this.generateMatches();
        if (!initialMatches.length) return alert('Error generando encuentros. Verifica la configuración.');
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
        ['matches', 'ranking'].forEach(t => {
            document.getElementById(`dashboard-${t}`).classList.add('hidden');
            document.getElementById(`tab-${t}`).classList.remove('active');
        });
        document.getElementById(`dashboard-${tab}`).classList.remove('hidden');
        document.getElementById(`tab-${tab}`).classList.add('active');
    },

    setRankingMode(mode) {
        this.rankingMode = mode;
        document.querySelectorAll('#ranking-subtabs .rank-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.mode === mode);
        });
        this.renderRanking();
    },

    renderDashboard() {
        const t = this.state.currentTournament;
        if (!t) return;
        this.renderRanking();

        const mc = document.getElementById('matches-content');
        const pending = t.matches.filter(m => m.score1 === null);

        if (!pending.length) {
            // All done this round
            if (t.allCombinationsDone) {
                mc.innerHTML = `
                    <div class="card" style="text-align:center;padding:40px 20px;border:2px solid var(--primary);background:var(--primary-glow);">
                        <div style="font-size:50px;margin-bottom:16px;">🏆</div>
                        <h2 style="color:var(--primary);margin-bottom:8px;">¡FIN DEL TORNEO!</h2>
                        <p style="font-size:13px;color:var(--text-dim);margin-bottom:6px;">Todas las combinaciones únicas del formato fueron jugadas.</p>
                        <p style="font-size:13px;color:var(--text-dim);margin-bottom:28px;">¿Quieres seguir con rondas extra (pueden repetirse parejas)?</p>
                        <button class="btn-primary" onclick="app.continueWithRepeats()">🔁 SEGUIR CON RONDAS EXTRA</button>
                        <button class="btn-outline" style="margin-top:12px;" onclick="app.confirmEndTournament()">🎖️ FINALIZAR Y VER PODIO</button>
                    </div>`;
            } else {
                mc.innerHTML = `
                    <div class="card" style="text-align:center;padding:35px 20px;border:2px dashed var(--primary);">
                        <div style="font-size:40px;margin-bottom:12px;">🏁</div>
                        <h3 style="margin-bottom:6px;">¡Ronda Completada!</h3>
                        <p style="font-size:12px;color:var(--text-dim);margin-bottom:24px;">Todos los marcadores ingresados.</p>
                        <button class="btn-primary" onclick="app.nextRound()">SIGUIENTE RONDA 🎾</button>
                        <button class="btn-outline" style="margin-top:12px;" onclick="app.confirmEndTournament()">Finalizar Torneo</button>
                    </div>`;
            }
        } else {
            mc.innerHTML = t.matches.map(m => `
                <div class="card${m.score1 === null ? ' card-live' : ''}" style="padding:18px;${m.score1 !== null ? 'opacity:0.5;' : 'cursor:pointer;'}" ${m.score1 === null ? `onclick="app.enterScore(${m.id})"` : ''}>
                    <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:900;margin-bottom:12px;letter-spacing:1px;">
                        <span style="color:var(--text-dim);">${m.court.toUpperCase()}</span>
                        <span style="color:${m.score1 === null ? 'var(--primary)' : 'var(--text-dim)'};">${m.score1 === null ? '● EN VIVO' : '✓ TERMINADO'}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="flex:1;text-align:right;font-weight:800;font-size:14px;line-height:1.5;">${this.getPairDisplay(t, m.team1)}</div>
                        <div style="min-width:52px;text-align:center;font-size:${m.score1 !== null ? '22px' : '13px'};font-weight:900;color:var(--primary);">${m.score1 !== null ? `${m.score1}-${m.score2}` : 'VS'}</div>
                        <div style="flex:1;font-weight:800;font-size:14px;line-height:1.5;">${this.getPairDisplay(t, m.team2)}</div>
                    </div>
                </div>
            `).join('');
        }
    },

    getPairDisplay(t, ids) {
        return ids.map(id => t.players.find(p => p.id === id)?.name || '?').join('<br>');
    },

    /* ===================== RANKING (INDIVIDUAL) ===================== */
    renderRanking() {
        const t = this.state.currentTournament;
        if (!t) return;
        const lb = document.getElementById('leaderboard-content');
        let sorted = [...t.players];
        const mode = this.rankingMode;

        if (mode === 'score') sorted.sort((a, b) => b.score - a.score);
        else if (mode === 'wins') sorted.sort((a, b) => b.wins - a.wins);
        else if (mode === 'effect') sorted.sort((a, b) => (b.wins / (b.matchesPlayed || 1)) - (a.wins / (a.matchesPlayed || 1)));
        else if (mode === 'diff') sorted.sort((a, b) => (b.score - (b.pointsAgainst || 0)) - (a.score - (a.pointsAgainst || 0)));
        else if (mode === 'avg') sorted.sort((a, b) => (b.score / (b.matchesPlayed || 1)) - (a.score / (a.matchesPlayed || 1)));

        const medals = ['🥇', '🥈', '🥉'];
        lb.innerHTML = sorted.map((p, i) => {
            const eff = Math.round((p.wins / (p.matchesPlayed || 1)) * 100);
            const diff = p.score - (p.pointsAgainst || 0);
            const avg = (p.score / (p.matchesPlayed || 1)).toFixed(1);
            let statVal = '';
            if (mode === 'score') statVal = `<b style="color:var(--primary);font-size:22px;">${p.score}</b><span style="font-size:9px;color:var(--text-dim);display:block;">PTS</span>`;
            else if (mode === 'wins') statVal = `<b style="color:var(--primary);font-size:22px;">${p.wins}</b><span style="font-size:9px;color:var(--text-dim);display:block;">WINS</span>`;
            else if (mode === 'effect') statVal = `<b style="color:var(--primary);font-size:22px;">${eff}%</b><span style="font-size:9px;color:var(--text-dim);display:block;">EFIC</span>`;
            else if (mode === 'diff') statVal = `<b style="color:${diff >= 0 ? 'var(--primary)' : 'var(--danger)'};font-size:22px;">${diff > 0 ? '+' : ''}${diff}</b><span style="font-size:9px;color:var(--text-dim);display:block;">DIFER</span>`;
            else if (mode === 'avg') statVal = `<b style="color:var(--primary);font-size:22px;">${avg}</b><span style="font-size:9px;color:var(--text-dim);display:block;">AVG</span>`;

            return `
                <div class="card" style="display:flex;align-items:center;gap:14px;padding:12px 16px;">
                    <div style="font-size:20px;width:28px;text-align:center;flex-shrink:0;">${medals[i] || `<span style="color:var(--text-dim);font-weight:900;font-size:14px;">${i+1}</span>`}</div>
                    <div style="width:42px;height:42px;border-radius:13px;overflow:hidden;background:var(--secondary);flex-shrink:0;">
                        ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;">${this.avatarSVG()}</div>`}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:800;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</div>
                        <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;font-weight:700;">${p.wins}V ${p.matchesPlayed - p.wins}D • ${eff}% • +${p.score}/${p.pointsAgainst || 0}</div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">${statVal}</div>
                </div>`;
        }).join('');
    },

    /* ===================== SCOREBOARD ===================== */
    enterScore(matchId) {
        const m = this.state.currentTournament.matches.find(x => String(x.id) === String(matchId));
        if (!m) return;
        this.activeMatch = m;
        if (!m.points) m.points = { t1: 0, t2: 0 };
        document.getElementById('score-court-label').innerText = m.court.toUpperCase();
        document.getElementById('manual-score-1').value = m.score1 !== null ? m.score1 : '';
        document.getElementById('manual-score-2').value = m.score2 !== null ? m.score2 : '';
        this.startTimer();
        this.renderScoreboardPanel();
        this.showView('score');
    },

    startTimer() {
        this.stopTimer();
        this.matchSeconds = 0;
        this.matchTimer = setInterval(() => {
            this.matchSeconds++;
            const el = document.getElementById('match-timer');
            if (!el) return;
            const m = String(Math.floor(this.matchSeconds / 60)).padStart(2, '0');
            const s = String(this.matchSeconds % 60).padStart(2, '0');
            el.innerText = `${m}:${s}`;
            if (this.matchSeconds >= 900) el.style.color = '#ff5252';
            else if (this.matchSeconds >= 600) el.style.color = '#ffd700';
            else el.style.color = 'var(--text-dim)';
        }, 1000);
    },

    stopTimer() {
        if (this.matchTimer) { clearInterval(this.matchTimer); this.matchTimer = null; }
    },

    renderScoreboardPanel() {
        const m = this.activeMatch;
        const t = this.state.currentTournament;
        const scoreType = t.scoreType;
        const container = document.getElementById('scoreboard-ui');
        const getNames = (ids) => ids.map(id => t.players.find(p => p.id === id)?.name || '?').join(' & ');
        const normalLabels = ['0', '15', '30', '40', 'ORO'];
        const isGold = scoreType === 'normal' && m.points.t1 === 3 && m.points.t2 === 3;

        const playerAvatar = (ids) => {
            const p = t.players.find(x => x.id === ids[0]);
            return p?.photo
                ? `<img src="${p.photo}" style="width:36px;height:36px;border-radius:10px;object-fit:cover;border:2px solid var(--primary);">`
                : `<div style="width:36px;height:36px;border-radius:10px;background:var(--secondary);display:flex;align-items:center;justify-content:center;">${this.avatarSVG('var(--text-dim)')}</div>`;
        };

        const renderTeam = (ids, pts, teamNum) => {
            let scoreHTML, progressHTML;
            if (scoreType === 'normal') {
                scoreHTML = `<div class="score-display ${isGold ? 'gold-text' : ''}">${normalLabels[pts] || 'ORO'}</div>`;
                const steps = ['0', '15', '30', '40'];
                progressHTML = `
                    <div class="points-label-track">
                        ${steps.map((l, i) => `<div class="point-label ${pts > i ? 'active' : ''}">${l}</div>`).join('')}
                        <div class="point-label gold-label ${isGold ? 'gold-active' : ''}">ORO</div>
                    </div>`;
            } else {
                const limit = scoreType === 'tiebreak' ? 7 : 11;
                scoreHTML = `<div class="score-display">${pts}</div>`;
                progressHTML = `
                    <div class="dots-container">
                        ${Array.from({length: limit}, (_, i) => `<div class="dot ${pts > i ? 'active' : ''}"></div>`).join('')}
                    </div>`;
            }
            return `
                <div class="team-panel">
                    <div style="display:flex;align-items:center;gap:8px;width:100%;justify-content:center;">
                        ${playerAvatar(ids)}
                        <div style="font-size:13px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;">${getNames(ids)}</div>
                    </div>
                    ${scoreHTML}
                    ${progressHTML}
                    <button class="score-btn ${isGold ? 'gold-point' : ''}" onclick="app.addPoint(${teamNum})">${isGold ? '⚡ PUNTO DE ORO' : '+1'}</button>
                </div>`;
        };

        container.innerHTML = renderTeam(m.team1, m.points.t1, 1) + renderTeam(m.team2, m.points.t2, 2);
    },

    addPoint(team) {
        const m = this.activeMatch;
        const t = this.state.currentTournament;
        if (team === 1) m.points.t1++; else m.points.t2++;

        if (t.scoreType === 'normal') {
            // Game over when a team passes index 3 (after gold point) or at gold point (3-3) one team goes to 4
            if (m.points.t1 > 3 || m.points.t2 > 3) {
                const winner = m.points.t1 > m.points.t2 ? 1 : 2;
                const inp = document.getElementById(`manual-score-${winner}`);
                inp.value = (parseInt(inp.value) || 0) + 1;
                m.points.t1 = 0; m.points.t2 = 0;
                this.flashGameWon(winner);
            }
        } else {
            const limit = t.scoreType === 'tiebreak' ? 7 : 11;
            const diff = Math.abs(m.points.t1 - m.points.t2);
            const leader = Math.max(m.points.t1, m.points.t2);
            if (leader >= limit && diff >= 2) {
                document.getElementById('manual-score-1').value = m.points.t1;
                document.getElementById('manual-score-2').value = m.points.t2;
                this.flashGameWon(m.points.t1 > m.points.t2 ? 1 : 2);
            }
        }
        this.renderScoreboardPanel();
    },

    flashGameWon(winner) {
        const ui = document.getElementById('scoreboard-ui');
        if (!ui) return;
        const banner = document.createElement('div');
        banner.className = 'game-won-banner';
        banner.innerText = `¡JUEGO! › EQUIPO ${winner} 🎾`;
        ui.prepend(banner);
        setTimeout(() => banner.remove(), 1800);
    },

    submitScore() {
        const s1 = parseInt(document.getElementById('manual-score-1').value) || 0;
        const s2 = parseInt(document.getElementById('manual-score-2').value) || 0;

        const m = this.state.currentTournament.matches.find(x => String(x.id) === String(this.activeMatch.id));
        m.score1 = s1; m.score2 = s2;
        m.duration = this.matchSeconds;

        const updateP = (ids, won, ptsFor, ptsAgainst, secs) => {
            ids.forEach(id => {
                const p = this.state.currentTournament.players.find(x => x.id === id);
                if (!p) return;
                p.score += ptsFor;
                p.matchesPlayed++;
                if (won) { p.wins++; p.currentStreak = (p.currentStreak || 0) + 1; if (p.currentStreak > (p.bestStreak || 0)) p.bestStreak = p.currentStreak; }
                else p.currentStreak = 0;
                p.pointsAgainst = (p.pointsAgainst || 0) + ptsAgainst;
                p.totalSecondsOnCourt = (p.totalSecondsOnCourt || 0) + secs;
            });
        };

        updateP(m.team1, s1 > s2, s1, s2, this.matchSeconds);
        updateP(m.team2, s2 > s1, s2, s1, this.matchSeconds);

        this.stopTimer();
        Storage.save(this.state);
        this.renderDashboard();
        this.showView('dashboard');
    },

    nextRound() {
        const newM = this.generateMatches();
        if (!newM.length) {
            this.renderDashboard();
            return;
        }
        this.state.currentTournament.matches.push(...newM);
        Storage.save(this.state);
        this.renderDashboard();
    },

    continueWithRepeats() {
        Engine.resetAllCombinations(this.state.currentTournament);
        this.state.currentTournament.allCombinationsDone = false;
        const newM = this.generateMatches();
        if (newM.length) {
            this.state.currentTournament.matches.push(...newM);
            Storage.save(this.state);
            this.renderDashboard();
        }
    },

    confirmEndTournament() {
        if (confirm('¿Deseas cerrar el torneo y guardar en el historial?')) {
            Engine.updateGlobalStats(this.state.globalStats, this.state.currentTournament);
            this.state.history.unshift(this.state.currentTournament);
            this.state.currentTournament = null;
            Storage.save(this.state);
            this.showView('home');
            this.renderHome();
        }
    },

    /* ===================== HISTORIAL DETALLE ===================== */
    viewPastTournament(index) {
        const t = this.state.history[index];
        this.renderPastDetail(t, index);
        this.showView('past-detail');
    },

    renderPastDetail(t, index) {
        const sorted = [...t.players].sort((a, b) => b.score - a.score);
        const medals = ['🥇', '🥈', '🥉'];
        const modeLabel = { americano: '🔄 Americano', robin: '🛡️ Todos v Todos', rey: '👑 Rey Cancha' }[t.type] || '🎾';

        document.getElementById('past-detail-content').innerHTML = `
            <div style="text-align:center;margin-bottom:28px;">
                <div style="font-size:50px;margin-bottom:10px;">🏆</div>
                <h2 style="font-size:22px;margin-bottom:4px;">${t.name}</h2>
                <p style="font-size:11px;font-weight:800;color:var(--text-dim);letter-spacing:1px;">${modeLabel} • ${new Date(t.id).toLocaleDateString()}</p>
            </div>

            <div class="card" style="margin-bottom:16px;">
                <h4 class="label-tag" style="margin-bottom:15px;">PODIO FINAL</h4>
                <div style="display:flex;gap:10px;">
                    ${sorted.slice(0, 3).map((p, i) => `
                        <div style="flex:1;text-align:center;padding:16px 8px;background:var(--secondary);border-radius:20px;border:${i === 0 ? '1px solid var(--primary)' : '1px solid var(--glass-border)'};">
                            <div style="font-size:28px;margin-bottom:8px;">${medals[i]}</div>
                            <div style="font-size:12px;font-weight:800;line-height:1.3;overflow:hidden;">${p.name}</div>
                            <div style="font-size:20px;font-weight:900;color:var(--primary);margin-top:8px;">${p.score}</div>
                            <div style="font-size:9px;color:var(--text-dim);">PTS</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="card" style="margin-bottom:16px;">
                <h4 class="label-tag" style="margin-bottom:15px;">CLASIFICACIÓN COMPLETA</h4>
                ${sorted.map((p, i) => `
                    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--glass-border);">
                        <div style="font-size:16px;width:26px;text-align:center;">${medals[i] || `<span style="color:var(--text-dim);font-weight:900;">${i+1}</span>`}</div>
                        <div style="width:36px;height:36px;border-radius:12px;overflow:hidden;background:var(--secondary);flex-shrink:0;">
                            ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;">${this.avatarSVG()}</div>`}
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</div>
                            <div style="font-size:10px;color:var(--text-dim);">${p.wins}V ${p.matchesPlayed - p.wins}D • ${Math.round((p.wins/(p.matchesPlayed||1))*100)}% efic.</div>
                        </div>
                        <div style="font-weight:900;color:var(--primary);">${p.score} pts</div>
                    </div>
                `).join('')}
            </div>

            <div class="card">
                <h4 class="label-tag" style="margin-bottom:15px;">PARTIDOS</h4>
                ${(t.matches || []).filter(m => m.score1 !== null).map(m => `
                    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--glass-border);">
                        <div style="font-size:10px;color:var(--text-dim);width:55px;font-weight:700;flex-shrink:0;">${m.court}</div>
                        <div style="flex:1;text-align:right;font-size:13px;font-weight:700;">${this.getPairDisplay(t, m.team1)}</div>
                        <div style="min-width:50px;text-align:center;font-weight:900;color:var(--primary);">${m.score1}-${m.score2}</div>
                        <div style="flex:1;font-size:13px;font-weight:700;">${this.getPairDisplay(t, m.team2)}</div>
                    </div>
                `).join('')}
            </div>`;
    },

    /* ===================== RANKING GLOBAL ===================== */
    showGlobalStats() {
        this.showView('stats');
        this._renderGlobalStats();
    },

    setGlobalRankMode(mode) {
        this.globalRankMode = mode;
        this._renderGlobalStats();
    },

    _renderGlobalStats() {
        const players = Object.entries(this.state.globalStats.players).map(([name, s]) => ({
            name, ...s,
            rate: Math.round((s.wins / (s.totalMatches || 1)) * 100),
            diff: (s.pointsFor || 0) - (s.pointsAgainst || 0),
            avg: ((s.pointsFor || 0) / (s.totalMatches || 1)).toFixed(1),
            podios: (s.firstPlaces || 0) + (s.secondPlaces || 0) + (s.thirdPlaces || 0),
            timeStr: this.formatSeconds(s.totalSecondsOnCourt || 0)
        }));

        const sorts = {
            cups: (a, b) => b.firstPlaces - a.firstPlaces,
            podios: (a, b) => b.podios - a.podios,
            effect: (a, b) => b.rate - a.rate,
            streak: (a, b) => b.bestStreak - a.bestStreak,
            diff: (a, b) => b.diff - a.diff,
            time: (a, b) => (b.totalSecondsOnCourt || 0) - (a.totalSecondsOnCourt || 0),
            played: (a, b) => b.totalMatches - a.totalMatches
        };
        players.sort(sorts[this.globalRankMode] || sorts.cups);

        document.querySelectorAll('#view-stats .rank-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.gmode === this.globalRankMode);
        });

        const container = document.getElementById('global-stats-content');
        if (!players.length) {
            container.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-dim);">Sin datos globales. ¡Finaliza tu primer torneo!</div>`;
            return;
        }

        const medals = ['👑', '🥈', '🥉'];
        const getStatValue = (p) => {
            const m = this.globalRankMode;
            if (m === 'cups') return { val: p.firstPlaces, lbl: 'COPAS' };
            if (m === 'podios') return { val: p.podios, lbl: 'PODIOS' };
            if (m === 'effect') return { val: `${p.rate}%`, lbl: 'EFIC.' };
            if (m === 'streak') return { val: p.bestStreak, lbl: 'RACHA' };
            if (m === 'diff') return { val: (p.diff > 0 ? '+' : '') + p.diff, lbl: 'DIFER.' };
            if (m === 'time') return { val: p.timeStr, lbl: 'TIEMPO' };
            if (m === 'played') return { val: p.totalMatches, lbl: 'PARTIDOS' };
            return { val: p.wins, lbl: 'WINS' };
        };

        container.innerHTML = players.map((p, i) => {
            const sv = getStatValue(p);
            return `
            <div class="card" style="display:flex;align-items:center;gap:14px;padding:14px 16px;">
                <div style="font-size:22px;width:30px;text-align:center;flex-shrink:0;">${medals[i] || i + 1}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:900;font-size:16px;">${p.name}</div>
                    <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;font-weight:700;">${p.firstPlaces}🏆 ${p.podios}🎖 • ${p.rate}% • ${p.totalMatches} partidos</div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                    <div style="font-weight:900;color:var(--primary);font-size:20px;">${sv.val}</div>
                    <div style="font-size:9px;color:var(--text-dim);font-weight:800;">${sv.lbl}</div>
                </div>
            </div>`;
        }).join('');
    },

    formatSeconds(secs) {
        if (!secs) return '0m';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
};

window.onload = () => app.init();
