const Storage = {
    KEY: 'padelazo_v4_state',

    save(state) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(state));
        } catch(e) {
            console.error('Error guardando estado:', e);
        }
    },

    load() {
        try {
            const data = localStorage.getItem(this.KEY);
            if (data) return this.migrate(JSON.parse(data));
        } catch(e) {
            console.error('Error cargando estado:', e);
        }
        return this.init();
    },

    // Migrar estados viejos al nuevo formato
    migrate(state) {
        if (!state.globalStats) state.globalStats = { players: {} };
        if (!state.history) state.history = [];
        // Asegurar campos nuevos en globalStats.players
        Object.values(state.globalStats.players).forEach(gs => {
            gs.pointsAgainst   = gs.pointsAgainst   || 0;
            gs.secondPlaces    = gs.secondPlaces     || 0;
            gs.thirdPlaces     = gs.thirdPlaces      || 0;
            gs.tournamentsPlayed = gs.tournamentsPlayed || 0;
            gs.bestStreak      = gs.bestStreak       || 0;
            gs.currentStreak   = gs.currentStreak    || 0;
            gs.totalSecondsOnCourt = gs.totalSecondsOnCourt || 0;
        });
        return state;
    },

    init() {
        return {
            currentTournament: null,
            history: [],
            globalStats: {
                players: {}
                // Estructura por jugador:
                // { wins, losses, pointsFor, pointsAgainst,
                //   firstPlaces, secondPlaces, thirdPlaces,
                //   totalMatches, tournamentsPlayed,
                //   bestStreak, currentStreak, totalSecondsOnCourt }
            }
        };
    },

    clear() {
        localStorage.removeItem(this.KEY);
    }
};
