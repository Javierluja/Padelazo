const Storage = {
    KEY:          'padelazo_v4_state',
    IDENTITY_KEY: 'padelazo_identity',
    TIMER_KEY:    'padelazo_timer',
    DEVICE_KEY:   'padelazo_device_id',

    /* -------- TOURNAMENT STATE -------- */
    save(state) {
        try { localStorage.setItem(this.KEY, JSON.stringify(state)); }
        catch(e) { console.error('Error guardando estado:', e); }
    },

    load() {
        try {
            const data = localStorage.getItem(this.KEY);
            if (data) return this.migrate(JSON.parse(data));
        } catch(e) { console.error('Error cargando estado:', e); }
        return this.init();
    },

    migrate(state) {
        if (!state.globalStats) state.globalStats = { players: {} };
        if (!state.history)     state.history = [];
        Object.values(state.globalStats.players).forEach(gs => {
            gs.pointsAgainst      = gs.pointsAgainst      || 0;
            gs.secondPlaces       = gs.secondPlaces        || 0;
            gs.thirdPlaces        = gs.thirdPlaces         || 0;
            gs.tournamentsPlayed  = gs.tournamentsPlayed   || 0;
            gs.bestStreak         = gs.bestStreak          || 0;
            gs.currentStreak      = gs.currentStreak       || 0;
            gs.totalSecondsOnCourt= gs.totalSecondsOnCourt || 0;
        });
        return state;
    },

    init() {
        return {
            currentTournament: null,
            history: [],
            globalStats: { players: {} }
        };
    },

    clear() { localStorage.removeItem(this.KEY); },

    /* -------- PLAYER IDENTITY -------- */
    saveIdentity(identity) {
        try { localStorage.setItem(this.IDENTITY_KEY, JSON.stringify(identity)); }
        catch(e) {}
    },

    loadIdentity() {
        try {
            const d = localStorage.getItem(this.IDENTITY_KEY);
            return d ? JSON.parse(d) : null;
        } catch(e) { return null; }
    },

    clearIdentity() { localStorage.removeItem(this.IDENTITY_KEY); },

    /* -------- DEVICE ID -------- */
    getDeviceId() {
        let id = localStorage.getItem(this.DEVICE_KEY);
        if (!id) {
            id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(this.DEVICE_KEY, id);
        }
        return id;
    },

    /* -------- MATCH TIMER PERSISTENCE -------- */
    saveTimer(state) {
        try { localStorage.setItem(this.TIMER_KEY, JSON.stringify(state)); }
        catch(e) {}
    },

    loadTimer() {
        try {
            const d = localStorage.getItem(this.TIMER_KEY);
            return d ? JSON.parse(d) : null;
        } catch(e) { return null; }
    },

    clearTimer() { localStorage.removeItem(this.TIMER_KEY); },

    /* -------- JOINED TOURNAMENTS -------- */
    JOINED_KEY: 'padelazo_joined_tournaments',

    saveJoinedTournaments(list) {
        try { localStorage.setItem(this.JOINED_KEY, JSON.stringify(list)); } catch(e) {}
    },

    loadJoinedTournaments() {
        try {
            const d = localStorage.getItem(this.JOINED_KEY);
            return d ? JSON.parse(d) : [];
        } catch(e) { return []; }
    }
};
