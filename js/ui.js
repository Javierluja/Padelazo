/* =====================================================
   UI.JS v4.1 — Correcciones completas
   ===================================================== */
const app = {
    state: null,
    activeMatch: null,
    matchTimer: null,
    matchSeconds: 0,
    rankingMode: 'score',
    globalRankMode: 'cups',
    pastRankMode: 'score',
    pastDetailIndex: null,
    inviteCode: null,

    /* ===================== INIT ===================== */
    init() {
        const urlParams = new URLSearchParams(window.location.search);
        const joinCode = urlParams.get('join');
        if (joinCode) { this.showJoinView(joinCode.toUpperCase()); return; }

        this.state = Storage.load();
        this.updateCourtInputs();

        if (this.state.currentTournament) {
            this.showView('dashboard');
            this.renderDashboard();
        } else {
            this.showView('home');
            this.renderHome();
        }
    },

    /* ===================== NAV ===================== */
    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const el = document.getElementById(`view-${viewId}`);
        if (el) el.classList.remove('hidden');
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        if (viewId === 'home')      document.getElementById('nav-home')?.classList.add('active');
        if (viewId === 'dashboard') document.getElementById('nav-dash')?.classList.add('active');
        if (viewId === 'stats')     document.getElementById('nav-stats')?.classList.add('active');
        if (viewId !== 'score')     this.stopTimer();
        window.scrollTo(0, 0);
    },

    showDashboardIfActive() {
        if (this.state?.currentTournament) this.showView('dashboard');
        else alert('No hay torneo activo. ¡Crea uno!');
    },

    /* ===================== ICONS ===================== */
    /* Dos palas de pádel cruzadas SVG */
    padelSVG(size = 36, color = 'var(--primary)') {
        return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g transform="rotate(-38 40 40)">
                <rect x="27" y="8" width="26" height="32" rx="11" fill="${color}" opacity="0.85"/>
                <line x1="35" y1="14" x2="53" y2="14" stroke="#000" stroke-width="1" opacity="0.15"/>
                <line x1="35" y1="20" x2="53" y2="20" stroke="#000" stroke-width="1" opacity="0.15"/>
                <line x1="35" y1="26" x2="53" y2="26" stroke="#000" stroke-width="1" opacity="0.15"/>
                <line x1="40" y1="10" x2="40" y2="38" stroke="#000" stroke-width="1" opacity="0.15"/>
                <rect x="37" y="40" width="6" height="22" rx="3" fill="${color}" opacity="0.7"/>
            </g>
            <g transform="rotate(38 40 40)">
                <rect x="27" y="8" width="26" height="32" rx="11" fill="${color}"/>
                <line x1="35" y1="14" x2="53" y2="14" stroke="#000" stroke-width="1" opacity="0.15"/>
                <line x1="35" y1="20" x2="53" y2="20" stroke="#000" stroke-width="1" opacity="0.15"/>
                <line x1="35" y1="26" x2="53" y2="26" stroke="#000" stroke-width="1" opacity="0.15"/>
                <line x1="40" y1="10" x2="40" y2="38" stroke="#000" stroke-width="1" opacity="0.15"/>
                <rect x="37" y="40" width="6" height="22" rx="3" fill="${color}" opacity="0.9"/>
            </g>
        </svg>`;
    },

    avatarSVG(color = 'var(--text-dim)') {
        return `<svg viewBox="0 0 40 40" fill="none" style="width:22px;height:22px;opacity:0.5;">
            <circle cx="20" cy="14" r="7" fill="${color}"/>
            <path d="M6 36c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`;
    },

    /* ===================== HOME ===================== */
    renderHome() {
        const ac = document.getElementById('active-tournament-card');
        if (this.state.currentTournament) {
            const t = this.state.currentTournament;
            const pending = (t.matches || []).filter(m => m.score1 === null).length;
            ac.innerHTML = `
                <div class="card card-glow" style="margin-bottom:20px;" onclick="app.showView('dashboard')">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <p class="label-tag" style="margin-bottom:4px;">TORNEO EN CURSO</p>
                            <h3 style="font-size:22px;margin:0;">${t.name}</h3>
                            <p style="font-size:12px;color:var(--text-dim);margin-top:4px;">${pending} partidos pendientes</p>
                        </div>
                        <div>${this.padelSVG(44)}</div>
                    </div>
                </div>`;
        } else { ac.innerHTML = ''; }

        const hc = document.getElementById('history-container');
        if (!this.state.history.length) {
            hc.innerHTML = `<div style="text-align:center;padding:50px 20px;color:var(--text-dim);">No hay historial aún.<br><div style="margin-top:16px;">${this.padelSVG(50, '#333')}</div></div>`;
            return;
        }
        hc.innerHTML = `<h3 class="section-label">HISTORIAL</h3>` +
            this.state.history.map((t, i) => {
                const winner = [...t.players].sort((a, b) => b.score - a.score)[0];
                const mIcon = { americano: '🔄', robin: '🛡️', rey: '👑' }[t.type] || '🎾';
                return `
                <div class="card card-row" onclick="app.viewPastTournament(${i})">
                    <div style="width:50px;height:50px;border-radius:16px;background:var(--secondary);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${mIcon}</div>
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

    /* Actualizar canchas Y ajustar cantidad de jugadores BIDIRECCIONAL */
    updateCourtInputs() {
        const container = document.getElementById('court-names-container');
        if (!container) return;
        const count = parseInt(document.getElementById('input-courts')?.value) || 1;
        const needed = count * 4;

        // Actualizar nombres de canchas
        container.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const div = document.createElement('div');
            div.className = 'input-group';
            div.innerHTML = `<label>Cancha ${i}</label><input type="text" class="court-name-input" value="PISTA ${i}">`;
            container.appendChild(div);
        }

        // Hint
        const hint = document.getElementById('players-needed-hint');
        if (hint) hint.innerText = `Se necesitan mínimo ${needed} jugadores (${count} cancha${count > 1 ? 's' : ''} × 4)`;

        // Guardar datos de jugadores existentes
        const list = document.getElementById('players-list');
        if (!list) return;
        const existing = Array.from(list.querySelectorAll('.player-row-card')).map(row => ({
            name:  row.querySelector('input[type="text"]')?.value || '',
            photo: row.querySelector('.photo-upload-label')?.dataset?.photo || null
        }));

        // Reconstruir exactamente la cantidad necesaria, preservando datos
        list.innerHTML = '';
        for (let i = 0; i < needed; i++) {
            this.addPlayerRow(existing[i] || null);
        }
    },

    addPlayerRow(data = null) {
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
            <input type="text" placeholder="NOMBRE JUGADOR" value="${data?.name || ''}">
            <button onclick="this.parentElement.remove()">×</button>`;
        // Restaurar foto si había
        if (data?.photo) {
            const label = div.querySelector('.photo-upload-label');
            const img = div.querySelector('img');
            img.src = data.photo; img.classList.remove('hidden');
            label.querySelector('.avatar-placeholder').classList.add('hidden');
            label.dataset.photo = data.photo;
        }
        list.appendChild(div);
    },

    handlePhotoUpload(input) {
        if (!input.files?.[0]) return;
        new FileReader().onload = (e) => {
            const label = input.parentElement;
            const img = label.querySelector('img');
            img.src = e.target.result;
            img.classList.remove('hidden');
            label.querySelector('.avatar-placeholder').classList.add('hidden');
            label.dataset.photo = e.target.result;
        };
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
                id: i, name: row.querySelector('input[type="text"]').value.trim(),
                photo: row.querySelector('.photo-upload-label').dataset.photo || null,
                score: 0, wins: 0, matchesPlayed: 0, pointsAgainst: 0,
                totalSecondsOnCourt: 0, currentStreak: 0, bestStreak: 0
            })).filter(p => p.name);
    },

    /* ===================== FIREBASE INVITE ===================== */
    async openInviteRoom() {
        const name = document.getElementById('input-tournament-name').value.trim() || 'Torneo Padelazo';
        const btn = document.getElementById('btn-invite');
        if (btn) btn.innerText = 'Creando sala...';
        try {
            const code = await FirebaseDB.createSession({
                name, type: this.state.mode || 'americano',
                scoreType: document.getElementById('input-score-type').value
            });
            this.inviteCode = code;
            this.renderInviteRoom(code, name);
            this.showView('invite');
            FirebaseDB.watchSession(code, (session) => {
                if (!session) return;
                this.updateInvitePlayerList(session.players ? Object.values(session.players) : []);
            });
        } catch(e) {
            alert('Error Firebase. ¿Está activa la Realtime Database?\n\n' + e.message);
        } finally {
            if (btn) btn.innerText = '🔗 CONVOCAR JUGADORES EN LÍNEA';
        }
    },

    renderInviteRoom(code, name) {
        document.getElementById('invite-code-display').innerText = code;
        document.getElementById('invite-tournament-name').innerText = name;
        const url = `${location.origin}${location.pathname}?join=${code}`;
        document.getElementById('invite-url').innerText = url;
        const qc = document.getElementById('qr-container');
        qc.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            new QRCode(qc, { text: url, width: 200, height: 200, colorDark: '#ffffff', colorLight: '#111312', correctLevel: QRCode.CorrectLevel.H });
        } else {
            qc.innerHTML = `<div style="padding:30px;border:2px solid var(--primary);border-radius:16px;color:var(--text-dim);font-size:12px;">Link:<br><strong style="color:var(--primary);">${url}</strong></div>`;
        }
    },

    updateInvitePlayerList(players) {
        const cnt = document.getElementById('invite-players-count');
        const lst = document.getElementById('invite-players-list');
        const btn = document.getElementById('btn-start-invite');
        if (cnt) cnt.innerText = players.length;
        if (btn) btn.disabled = players.length < 4;
        if (!lst) return;
        lst.innerHTML = players.map(p => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--glass-border);">
                <div style="width:36px;height:36px;border-radius:10px;overflow:hidden;background:var(--secondary);">
                    ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;">${this.avatarSVG()}</div>`}
                </div>
                <div style="font-weight:700;">${p.name}</div>
                <div style="margin-left:auto;color:var(--primary);font-size:11px;font-weight:800;">✓ INSCRITO</div>
            </div>`).join('');
    },

    async startFromInvite() {
        const session = await FirebaseDB.getSession(this.inviteCode);
        if (!session) return alert('Error obteniendo datos.');
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

    async showJoinView(code) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.querySelector('.bottom-nav')?.classList.add('hidden');
        document.getElementById('view-join')?.classList.remove('hidden');
        const session = await FirebaseDB.getSession(code);
        const nameEl = document.getElementById('join-tournament-name');
        if (nameEl) {
            if (!session) { nameEl.innerText = '❌ Código no encontrado'; document.getElementById('join-form')?.classList.add('hidden'); return; }
            nameEl.innerText = session.name;
        }
        const disp = document.getElementById('join-code-display');
        if (disp) disp.innerText = code;
        window._joinCode = code;
    },

    async submitJoin() {
        const name = document.getElementById('join-player-name')?.value?.trim();
        if (!name) return alert('Escribe tu nombre');
        const photo = document.getElementById('join-photo-label')?.dataset.photo || null;
        const btn = document.getElementById('btn-join-submit');
        if (btn) btn.innerText = 'Inscribiendo...';
        const result = await FirebaseDB.joinSession(window._joinCode, { name, photo });
        if (result.success) {
            document.getElementById('join-form')?.classList.add('hidden');
            document.getElementById('join-success')?.classList.remove('hidden');
            const sn = document.getElementById('join-success-name');
            if (sn) sn.innerText = result.sessionName;
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
        const courtNames = Array.from(document.querySelectorAll('.court-name-input')).map((i, idx) => i.value || `PISTA ${idx + 1}`);
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
            document.getElementById(`dashboard-${t}`)?.classList.add('hidden');
            document.getElementById(`tab-${t}`)?.classList.remove('active');
        });
        document.getElementById(`dashboard-${tab}`)?.classList.remove('hidden');
        document.getElementById(`tab-${tab}`)?.classList.add('active');
    },

    setRankingMode(mode) {
        this.rankingMode = mode;
        document.querySelectorAll('#ranking-subtabs .rank-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.mode === mode)
        );
        this.renderRanking();
    },

    renderDashboard() {
        const t = this.state.currentTournament;
        if (!t) return;
        this.renderRanking();

        const mc = document.getElementById('matches-content');

        // Separar partidos: primero los pendientes, luego los terminados
        const pending = t.matches.filter(m => m.score1 === null);
        const done    = t.matches.filter(m => m.score1 !== null);

        if (!pending.length) {
            // Ronda completada
            if (t.allCombinationsDone) {
                mc.innerHTML = `
                    <div class="card" style="text-align:center;padding:40px 20px;border:2px solid var(--primary);background:var(--primary-glow);">
                        <div style="margin-bottom:16px;">${this.padelSVG(55)}</div>
                        <h2 style="color:var(--primary);margin-bottom:8px;">¡FIN DEL TORNEO!</h2>
                        <p style="font-size:13px;color:var(--text-dim);margin-bottom:6px;">Todas las combinaciones únicas del formato fueron jugadas.</p>
                        <p style="font-size:13px;color:var(--text-dim);margin-bottom:28px;">¿Quieres seguir con rondas extra?</p>
                        <button class="btn-primary" onclick="app.continueWithRepeats()">🔁 SEGUIR CON RONDAS EXTRA</button>
                        <button class="btn-outline" style="margin-top:12px;" onclick="app.confirmEndTournament()">🎖️ FINALIZAR Y VER PODIO</button>
                    </div>`;
            } else {
                mc.innerHTML = `
                    <div class="card" style="text-align:center;padding:35px 20px;border:2px dashed var(--primary);">
                        <div style="margin-bottom:12px;">${this.padelSVG(45)}</div>
                        <h3 style="margin-bottom:6px;">¡Ronda Completada!</h3>
                        <p style="font-size:12px;color:var(--text-dim);margin-bottom:24px;">Todos los marcadores ingresados.</p>
                        <button class="btn-primary" onclick="app.nextRound()">SIGUIENTE RONDA</button>
                        <button class="btn-outline" style="margin-top:12px;" onclick="app.confirmEndTournament()">Finalizar Torneo</button>
                    </div>`;
            }
        } else {
            const renderMatch = (m, live) => {
                const liveStyle = live
                    ? `border: 2px solid var(--primary); background: rgba(0,230,118,0.05); cursor:pointer; box-shadow: 0 4px 24px rgba(0,230,118,0.15);`
                    : `border: 1px solid var(--glass-border); opacity:0.4;`;
                return `
                <div class="card" style="padding:18px;${liveStyle}" ${live ? `onclick="app.enterScore(${JSON.stringify(m.id)})"` : ''}>
                    <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:900;margin-bottom:12px;letter-spacing:1px;">
                        <span style="color:var(--text-dim);">${m.court.toUpperCase()}</span>
                        ${live
                            ? `<span style="color:var(--primary);display:flex;align-items:center;gap:5px;"><span class="live-dot"></span>EN VIVO</span>`
                            : `<span style="color:var(--text-dim);">✓ TERMINADO</span>`}
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="flex:1;text-align:right;font-weight:800;font-size:14px;line-height:1.5;">${this.getPairDisplay(t, m.team1)}</div>
                        <div style="min-width:52px;text-align:center;font-size:${!live ? '22px' : '14px'};font-weight:900;color:${live ? 'var(--primary)' : 'var(--text-main)'}; background:${live ? 'transparent' : 'transparent'};">${!live ? `${m.score1}-${m.score2}` : 'VS'}</div>
                        <div style="flex:1;font-weight:800;font-size:14px;line-height:1.5;">${this.getPairDisplay(t, m.team2)}</div>
                    </div>
                </div>`;
            };

            mc.innerHTML =
                pending.map(m => renderMatch(m, true)).join('') +
                (done.length ? `<p class="label-tag" style="margin:20px 0 10px;padding-left:4px;">TERMINADOS</p>` : '') +
                done.map(m => renderMatch(m, false)).join('');
        }
    },

    getPairDisplay(t, ids) {
        return ids.map(id => t.players.find(p => p.id === id)?.name || '?').join('<br>');
    },

    /* ===================== RANKING TORNEO (POR JUGADOR) ===================== */
    renderRanking() {
        const t = this.state.currentTournament;
        if (!t) return;
        this.renderRankingFor(t, document.getElementById('leaderboard-content'), this.rankingMode);
    },

    renderRankingFor(t, container, mode) {
        if (!container) return;
        let sorted = [...t.players];
        if (mode === 'score')  sorted.sort((a, b) => b.score - a.score);
        else if (mode === 'wins')   sorted.sort((a, b) => b.wins - a.wins);
        else if (mode === 'effect') sorted.sort((a, b) => (b.wins/(b.matchesPlayed||1)) - (a.wins/(a.matchesPlayed||1)));
        else if (mode === 'diff')   sorted.sort((a, b) => (b.score-(b.pointsAgainst||0)) - (a.score-(a.pointsAgainst||0)));
        else if (mode === 'avg')    sorted.sort((a, b) => (b.score/(b.matchesPlayed||1)) - (a.score/(a.matchesPlayed||1)));

        const medals = ['🥇', '🥈', '🥉'];
        container.innerHTML = sorted.map((p, i) => {
            const eff  = Math.round((p.wins / (p.matchesPlayed || 1)) * 100);
            const diff = p.score - (p.pointsAgainst || 0);
            const avg  = (p.score / (p.matchesPlayed || 1)).toFixed(1);
            const statMap = {
                score:  { v: p.score, l: 'PTS' },
                wins:   { v: p.wins,  l: 'WINS' },
                effect: { v: `${eff}%`, l: 'EFIC' },
                diff:   { v: (diff > 0 ? '+' : '') + diff, l: 'DIFER' },
                avg:    { v: avg, l: 'AVG' }
            };
            const sv = statMap[mode] || statMap.score;
            return `
                <div class="card" style="display:flex;align-items:center;gap:14px;padding:12px 16px;">
                    <div style="font-size:20px;width:28px;text-align:center;flex-shrink:0;">${medals[i] || `<span style="color:var(--text-dim);font-weight:900;font-size:14px;">${i+1}</span>`}</div>
                    <div style="width:42px;height:42px;border-radius:13px;overflow:hidden;background:var(--secondary);flex-shrink:0;">
                        ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;">${this.avatarSVG()}</div>`}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:800;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</div>
                        <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;">${p.wins}V ${p.matchesPlayed-p.wins}D • ${eff}% • +${p.score}/${p.pointsAgainst||0}</div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-weight:900;font-size:22px;color:var(--primary);">${sv.v}</div>
                        <div style="font-size:9px;color:var(--text-dim);font-weight:800;">${sv.l}</div>
                    </div>
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
            el.style.color = this.matchSeconds >= 900 ? '#ff5252' : this.matchSeconds >= 600 ? '#ffd700' : 'var(--text-dim)';
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

        const renderTeam = (ids, pts, teamNum) => {
            const playerPhoto = () => {
                const p = t.players.find(x => x.id === ids[0]);
                return p?.photo ? `<img src="${p.photo}" style="width:36px;height:36px;border-radius:10px;object-fit:cover;border:2px solid var(--primary);">`
                    : `<div style="width:36px;height:36px;border-radius:10px;background:var(--secondary);display:flex;align-items:center;justify-content:center;">${this.avatarSVG()}</div>`;
            };

            let scoreHTML, progressHTML;
            if (scoreType === 'normal') {
                scoreHTML = `<div class="score-display ${isGold ? 'gold-text' : ''}">${normalLabels[pts] || 'ORO'}</div>`;
                const steps = ['0', '15', '30', '40'];
                progressHTML = `<div class="points-label-track">
                    ${steps.map((l, i) => `<div class="point-label ${pts > i ? 'active' : ''}">${l}</div>`).join('')}
                    <div class="point-label gold-label ${isGold ? 'gold-active' : ''}">ORO</div>
                </div>`;
            } else {
                const limit = scoreType === 'tiebreak' ? 7 : 11;
                scoreHTML = `<div class="score-display">${pts}</div>`;
                progressHTML = `<div class="dots-container">${Array.from({length: limit}, (_, i) => `<div class="dot ${pts > i ? 'active' : ''}"></div>`).join('')}</div>`;
            }

            return `
                <div class="team-panel">
                    <div style="display:flex;align-items:center;gap:8px;justify-content:center;width:100%;">
                        ${playerPhoto()}
                        <div style="font-size:13px;font-weight:800;overflow:hidden;max-width:110px;text-overflow:ellipsis;white-space:nowrap;">${getNames(ids)}</div>
                    </div>
                    ${scoreHTML}
                    ${progressHTML}
                    <div style="display:grid;grid-template-columns:3fr 7fr;gap:8px;width:100%;margin-top:8px;">
                        <button class="score-btn minus-btn" onclick="app.subtractPoint(${teamNum})" title="Corregir -1">−1</button>
                        <button class="score-btn ${isGold ? 'gold-point' : ''}" onclick="app.addPoint(${teamNum})">${isGold ? '⚡ ORO' : '+1'}</button>
                    </div>
                </div>`;
        };

        container.innerHTML = renderTeam(m.team1, m.points.t1, 1) + renderTeam(m.team2, m.points.t2, 2);
    },

    /* Agregar punto con sync inmediato al resultado final */
    addPoint(team) {
        const m = this.activeMatch;
        const t = this.state.currentTournament;
        const scoreType = t.scoreType;
        if (team === 1) m.points.t1++; else m.points.t2++;

        if (scoreType === 'normal') {
            if (m.points.t1 > 3 || m.points.t2 > 3) {
                // Oro o punto decisivo
                const winner = m.points.t1 > m.points.t2 ? 1 : 2;
                const inp = document.getElementById(`manual-score-${winner}`);
                inp.value = (parseInt(inp.value) || 0) + 1;
                m.points.t1 = 0; m.points.t2 = 0;
                this.flashGameWon(winner);
            }
        } else {
            // Tie Break: los inputs muestran el marcador actual en tiempo real
            document.getElementById('manual-score-1').value = m.points.t1;
            document.getElementById('manual-score-2').value = m.points.t2;

            const limit = scoreType === 'tiebreak' ? 7 : 11;
            const diff = Math.abs(m.points.t1 - m.points.t2);
            const leader = Math.max(m.points.t1, m.points.t2);
            if (leader >= limit && diff >= 2) {
                this.flashGameWon(m.points.t1 > m.points.t2 ? 1 : 2);
            }
        }
        this.renderScoreboardPanel();
    },

    /* Restar punto — corrección */
    subtractPoint(team) {
        const m = this.activeMatch;
        const t = this.state.currentTournament;
        if (team === 1 && m.points.t1 > 0) m.points.t1--;
        else if (team === 2 && m.points.t2 > 0) m.points.t2--;

        // Sync tiebreak manual inputs after subtraction
        if (t.scoreType !== 'normal') {
            document.getElementById('manual-score-1').value = m.points.t1;
            document.getElementById('manual-score-2').value = m.points.t2;
        }
        this.renderScoreboardPanel();
    },

    flashGameWon(winner) {
        const ui = document.getElementById('scoreboard-ui');
        if (!ui) return;
        const banner = document.createElement('div');
        banner.className = 'game-won-banner';
        banner.innerText = `¡JUEGO! › EQUIPO ${winner}`;
        ui.prepend(banner);
        setTimeout(() => banner.remove(), 1800);
    },

    submitScore() {
        const s1 = parseInt(document.getElementById('manual-score-1').value) || 0;
        const s2 = parseInt(document.getElementById('manual-score-2').value) || 0;
        const m = this.state.currentTournament.matches.find(x => String(x.id) === String(this.activeMatch.id));
        m.score1 = s1; m.score2 = s2; m.duration = this.matchSeconds;

        const updateP = (ids, won, pFor, pAgainst, secs) => {
            ids.forEach(id => {
                const p = this.state.currentTournament.players.find(x => x.id === id);
                if (!p) return;
                p.score += pFor; p.matchesPlayed++;
                if (won) { p.wins++; p.currentStreak = (p.currentStreak||0)+1; if (p.currentStreak > (p.bestStreak||0)) p.bestStreak = p.currentStreak; }
                else p.currentStreak = 0;
                p.pointsAgainst = (p.pointsAgainst||0) + pAgainst;
                p.totalSecondsOnCourt = (p.totalSecondsOnCourt||0) + secs;
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
        if (!newM.length) { this.renderDashboard(); return; }
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
        if (confirm('¿Cerrar el torneo y guardar en historial?')) {
            Engine.updateGlobalStats(this.state.globalStats, this.state.currentTournament);
            this.state.history.unshift(this.state.currentTournament);
            this.state.currentTournament = null;
            Storage.save(this.state);
            this.showView('home');
            this.renderHome();
        }
    },

    /* ===================== HISTORIAL DETALLE + RANKING POR TORNEO ===================== */
    viewPastTournament(index) {
        this.pastDetailIndex = index;
        this.pastRankMode = 'score';
        const t = this.state.history[index];
        this.renderPastDetail(t);
        this.showView('past-detail');
    },

    setPastRankMode(mode) {
        this.pastRankMode = mode;
        document.querySelectorAll('#past-rank-tabs .rank-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.pmode === mode)
        );
        const t = this.state.history[this.pastDetailIndex];
        this.renderRankingFor(t, document.getElementById('past-ranking-content'), mode);
    },

    renderPastDetail(t) {
        const sorted = [...t.players].sort((a, b) => b.score - a.score);
        const medals = ['🥇', '🥈', '🥉'];
        const modeLabel = { americano: '🔄 Americano', robin: '🛡️ Todos v Todos', rey: '👑 Rey Cancha' }[t.type] || '🎾';

        document.getElementById('past-detail-content').innerHTML = `
            <div style="text-align:center;margin-bottom:28px;">
                <div style="display:flex;justify-content:center;margin-bottom:12px;">${this.padelSVG(55)}</div>
                <h2 style="font-size:22px;margin-bottom:4px;">${t.name}</h2>
                <p style="font-size:11px;font-weight:800;color:var(--text-dim);letter-spacing:1px;">${modeLabel} • ${new Date(t.id).toLocaleDateString()}</p>
            </div>

            <div class="card" style="margin-bottom:16px;">
                <h4 class="label-tag" style="margin-bottom:15px;">PODIO FINAL</h4>
                <div style="display:flex;gap:10px;">
                    ${sorted.slice(0, 3).map((p, i) => `
                        <div style="flex:1;text-align:center;padding:16px 8px;background:var(--secondary);border-radius:20px;border:${i===0?'1px solid var(--primary)':'1px solid var(--glass-border)'};">
                            <div style="font-size:28px;margin-bottom:8px;">${medals[i]}</div>
                            <div style="font-size:12px;font-weight:800;line-height:1.3;overflow:hidden;">${p.name}</div>
                            <div style="font-size:20px;font-weight:900;color:var(--primary);margin-top:8px;">${p.score}</div>
                            <div style="font-size:9px;color:var(--text-dim);">PTS</div>
                        </div>`).join('')}
                </div>
            </div>

            <!-- Ranking del torneo con subtabs — mismo estilo que global -->
            <h3 style="font-size:11px;font-weight:900;color:var(--text-dim);text-transform:uppercase;letter-spacing:2px;margin:24px 0 12px;">ESTADÍSTICAS DEL TORNEO</h3>
            <div class="rank-tabs" id="past-rank-tabs" style="flex-wrap:wrap;margin-bottom:14px;">
                <div class="rank-tab active" data-pmode="score"  onclick="app.setPastRankMode('score')">🏅 PUNTOS</div>
                <div class="rank-tab" data-pmode="wins"   onclick="app.setPastRankMode('wins')">🏆 TRIUNFOS</div>
                <div class="rank-tab" data-pmode="effect" onclick="app.setPastRankMode('effect')">⚡ EFICACIA</div>
                <div class="rank-tab" data-pmode="diff"   onclick="app.setPastRankMode('diff')">💥 DIFER.</div>
                <div class="rank-tab" data-pmode="avg"    onclick="app.setPastRankMode('avg')">📈 PROM.</div>
            </div>
            <div id="past-ranking-content" style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;"></div>

            <!-- Partidos -->
            <div class="card">
                <h4 class="label-tag" style="margin-bottom:16px;">PARTIDOS</h4>
                ${(t.matches||[]).filter(m => m.score1 !== null).map(m => `
                    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--glass-border);">
                        <div style="font-size:10px;color:var(--text-dim);width:55px;font-weight:700;flex-shrink:0;">${m.court}</div>
                        <div style="flex:1;text-align:right;font-size:13px;font-weight:700;">${this.getPairDisplay(t, m.team1)}</div>
                        <div style="min-width:50px;text-align:center;font-weight:900;color:var(--primary);">${m.score1}-${m.score2}</div>
                        <div style="flex:1;font-size:13px;font-weight:700;">${this.getPairDisplay(t, m.team2)}</div>
                    </div>`).join('')}
            </div>`;

        // Renderizar ranking inicial del torneo
        this.renderRankingFor(t, document.getElementById('past-ranking-content'), 'score');
    },

    /* ===================== RANKING GLOBAL ===================== */
    showGlobalStats() { this.showView('stats'); this._renderGlobalStats(); },
    setGlobalRankMode(mode) { this.globalRankMode = mode; this._renderGlobalStats(); },

    _renderGlobalStats() {
        const players = Object.entries(this.state.globalStats.players).map(([name, s]) => ({
            name, ...s,
            rate: Math.round((s.wins/(s.totalMatches||1))*100),
            diff: (s.pointsFor||0)-(s.pointsAgainst||0),
            avg:  ((s.pointsFor||0)/(s.totalMatches||1)).toFixed(1),
            podios: (s.firstPlaces||0)+(s.secondPlaces||0)+(s.thirdPlaces||0),
            timeStr: this.formatSeconds(s.totalSecondsOnCourt||0)
        }));

        const sortFns = {
            cups:   (a,b)=>b.firstPlaces-a.firstPlaces,
            podios: (a,b)=>b.podios-a.podios,
            effect: (a,b)=>b.rate-a.rate,
            streak: (a,b)=>b.bestStreak-a.bestStreak,
            diff:   (a,b)=>b.diff-a.diff,
            time:   (a,b)=>(b.totalSecondsOnCourt||0)-(a.totalSecondsOnCourt||0),
            played: (a,b)=>b.totalMatches-a.totalMatches
        };
        players.sort(sortFns[this.globalRankMode] || sortFns.cups);

        document.querySelectorAll('#view-stats .rank-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.gmode === this.globalRankMode)
        );

        const container = document.getElementById('global-stats-content');
        if (!players.length) {
            container.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-dim);">Sin datos. ¡Finaliza tu primer torneo!</div>`;
            return;
        }
        const medals = ['👑','🥈','🥉'];
        const statMap = {
            cups:   p=>({ v:p.firstPlaces, l:'COPAS' }),
            podios: p=>({ v:p.podios, l:'PODIOS' }),
            effect: p=>({ v:`${p.rate}%`, l:'EFIC.' }),
            streak: p=>({ v:p.bestStreak, l:'RACHA' }),
            diff:   p=>({ v:(p.diff>0?'+':'')+p.diff, l:'DIFER.' }),
            time:   p=>({ v:p.timeStr, l:'TIEMPO' }),
            played: p=>({ v:p.totalMatches, l:'PARTIDOS' })
        };
        container.innerHTML = players.map((p, i) => {
            const sv = (statMap[this.globalRankMode] || statMap.cups)(p);
            return `
            <div class="card" style="display:flex;align-items:center;gap:14px;padding:14px 16px;">
                <div style="font-size:22px;width:30px;text-align:center;flex-shrink:0;">${medals[i]||i+1}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:900;font-size:16px;">${p.name}</div>
                    <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;font-weight:700;">${p.firstPlaces}🏆 ${p.podios}🎖 • ${p.rate}% • ${p.totalMatches} partidos</div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                    <div style="font-weight:900;color:var(--primary);font-size:20px;">${sv.v}</div>
                    <div style="font-size:9px;color:var(--text-dim);font-weight:800;">${sv.l}</div>
                </div>
            </div>`;
        }).join('');
    },

    formatSeconds(secs) {
        if (!secs) return '0m';
        const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
};

window.onload = () => app.init();
