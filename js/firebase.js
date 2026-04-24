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
                apiKey: "AIzaSyCkGDE4VJv7MpLOGOlKKmNHAhYUe2obuIE",
                authDomain: "padelazo-app.firebaseapp.com",
                databaseURL: "https://padelazo-app-default-rtdb.firebaseio.com",
                projectId: "padelazo-app",
                storageBucket: "padelazo-app.firebasestorage.app",
                messagingSenderId: "627437540112",
                appId: "1:627437540112:web:41e1d97bdb1f2bb7ffcb95"
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
            createdAt: Date.now(),
            status: 'open',
            players: {}
        });
        return code;
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

            const ref = this.db.ref(`sessions/${code}/players`).push();
            await ref.set({
                name: playerData.name.trim(),
                photo: playerData.photo || null,
                joinedAt: Date.now()
            });
            return { success: true, sessionName: session.name };
        } catch(e) {
            return { success: false, error: 'Error: ' + e.message };
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
