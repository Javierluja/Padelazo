/* =====================================================
   FIREBASE WRAPPER — PADELAZO v4.0
   Realtime Database para inscripciones en vivo
   ===================================================== */
const FirebaseDB = {
    db: null,
    initialized: false,

    init() {
        if (this.initialized) return true;
        try {
            const config = {
                apiKey: "AIzaSyDyya4wfg9Js7VmuD-mz3dIYMAhE3_d1rM",
                authDomain: "padelazo-959f9.firebaseapp.com",
                databaseURL: "https://padelazo-959f9-default-rtdb.firebaseio.com",
                projectId: "padelazo-959f9",
                storageBucket: "padelazo-959f9.firebasestorage.app",
                messagingSenderId: "511065915043",
                appId: "1:511065915043:web:ad96210cee538520308916",
                measurementId: "G-X6D2JM70NV"
            };
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(config);
            }
            this.db = firebase.database();
            this.initialized = true;
            return true;
        } catch(e) {
            console.error('Firebase init failed:', e);
            return false;
        }
    },

    generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    },

    // Organizador: crear sala de inscripción
    async createSession(tournamentConfig) {
        if (!this.init()) throw new Error('Firebase no disponible');
        const code = this.generateCode();
        await this.db.ref(`sessions/${code}`).set({
            name: tournamentConfig.name || 'Torneo Padelazo',
            type: tournamentConfig.type || 'americano',
            scoreType: tournamentConfig.scoreType || 'normal',
            location: tournamentConfig.location || '',
            datetime: tournamentConfig.datetime || '',
            rules: tournamentConfig.rules || '',
            matchTime: tournamentConfig.matchTime || 15,
            localPlayers: tournamentConfig.localPlayers || [],
            createdAt: Date.now(),
            status: 'open',
            players: {}
        });
        return code;
    },

    // Organizador: actualizar sala
    async updateSession(code, tournamentConfig) {
        if (!this.init()) throw new Error('Firebase no disponible');
        await this.db.ref(`sessions/${code}`).update({
            name: tournamentConfig.name || 'Torneo Padelazo',
            type: tournamentConfig.type || 'americano',
            scoreType: tournamentConfig.scoreType || 'normal',
            location: tournamentConfig.location || '',
            datetime: tournamentConfig.datetime || '',
            rules: tournamentConfig.rules || '',
            matchTime: tournamentConfig.matchTime || 15,
            localPlayers: tournamentConfig.localPlayers || []
        });
    },

    // Organizador: escuchar cambios en tiempo real
    watchSession(code, callback) {
        if (!this.init()) return;
        this.db.ref(`sessions/${code}`).on('value', snap => {
            callback(snap.val());
        });
    },

    stopWatching(code) {
        if (this.db && code) this.db.ref(`sessions/${code}`).off();
    },

    // Jugador: inscribirse en una sesión
    async joinSession(code, playerData) {
        if (!this.init()) return { success: false, error: 'Sin conexión a internet' };
        try {
            const snap = await this.db.ref(`sessions/${code}`).once('value');
            const session = snap.val();
            if (!session) return { success: false, error: '❌ Código no encontrado' };
            if (session.status !== 'open') return { success: false, error: '🔒 Ya no se aceptan inscripciones' };

            // Evitar inscripciones múltiples por el mismo dispositivo
            if (session.players && playerData.deviceId) {
                const existing = Object.values(session.players).find(p => p.deviceId === playerData.deviceId);
                if (existing) return { success: false, error: '📱 Ya estás inscrito en este torneo con este dispositivo' };
            }

            const ref = this.db.ref(`sessions/${code}/players`).push();
            await ref.set({
                name: playerData.name.trim(),
                photo: playerData.photo || null,
                deviceId: playerData.deviceId || null,
                playerId: playerData.playerId || null,
                joinedAt: Date.now()
            });
            return { success: true, sessionName: session.name };
        } catch(e) {
            return { success: false, error: 'Error: ' + e.message };
        }
    },

    // Perfil en la Nube
    async createPlayerProfile(profileData) {
        if (!this.init()) return null;
        // Generar un ID corto único (ej: P-A7B2)
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let id = 'P-';
        for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
        
        await this.db.ref(`users/${id}`).set({
            name: profileData.name,
            photo: profileData.photo || null,
            createdAt: Date.now(),
            globalStats: {
                wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0,
                firstPlaces: 0, secondPlaces: 0, thirdPlaces: 0,
                totalMatches: 0, tournamentsPlayed: 0, bestStreak: 0
            }
        });
        return id;
    },

    async getPlayerProfile(playerId) {
        if (!this.init()) return null;
        try {
            const snap = await this.db.ref(`users/${playerId}`).once('value');
            return snap.val();
        } catch(e) { return null; }
    },

    // Espectador en vivo: Sincronizar partidos y tabla
    async syncTournamentState(code, data) {
        if (!this.init() || !code) return;
        await this.db.ref(`sessions/${code}/live`).set({
            activeMatches: data.activeMatches || [],
            leaderboard: data.leaderboard || [],
            updatedAt: Date.now()
        });
    },

    // Al finalizar torneo: Enviar estadísticas a los perfiles
    async syncPlayerStats(playersStats) {
        if (!this.init()) return;
        // playersStats debe ser un array con { playerId, statsToSum }
        const updates = {};
        for (const p of playersStats) {
            if (!p.playerId) continue;
            // Para simplicidad en este MVP, usamos transacciones por jugador, 
            // ya que Firebase Realtime Database no suma fácilmente múltiples valores en un .update()
            const ref = this.db.ref(`users/${p.playerId}/globalStats`);
            ref.transaction((currentStats) => {
                if (!currentStats) return currentStats;
                currentStats.wins = (currentStats.wins || 0) + p.wins;
                currentStats.losses = (currentStats.losses || 0) + p.losses;
                currentStats.pointsFor = (currentStats.pointsFor || 0) + p.pointsFor;
                currentStats.pointsAgainst = (currentStats.pointsAgainst || 0) + p.pointsAgainst;
                currentStats.firstPlaces = (currentStats.firstPlaces || 0) + p.firstPlaces;
                currentStats.secondPlaces = (currentStats.secondPlaces || 0) + p.secondPlaces;
                currentStats.thirdPlaces = (currentStats.thirdPlaces || 0) + p.thirdPlaces;
                currentStats.totalMatches = (currentStats.totalMatches || 0) + p.totalMatches;
                currentStats.tournamentsPlayed = (currentStats.tournamentsPlayed || 0) + 1;
                if (p.bestStreak > (currentStats.bestStreak || 0)) {
                    currentStats.bestStreak = p.bestStreak;
                }
                return currentStats;
            });
        }
    },

    // Obtener sesión una vez
    async getSession(code) {
        if (!this.init()) return null;
        try {
            const snap = await this.db.ref(`sessions/${code}`).once('value');
            return snap.val();
        } catch(e) {
            return null;
        }
    },

    // Organizador: cerrar inscripciones
    async closeSession(code) {
        if (!this.init()) return;
        await this.db.ref(`sessions/${code}/status`).set('closed');
    },

    // Organizador: eliminar sesión
    async deleteSession(code) {
        if (!this.init()) return;
        await this.db.ref(`sessions/${code}`).remove();
    }
};
