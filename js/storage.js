const Storage = {
    KEY: 'padelazo_v2_state',

    save(state) {
        localStorage.setItem(this.KEY, JSON.stringify(state));
    },

    load() {
        const data = localStorage.getItem(this.KEY);
        if (!data) return this.init();
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('Error loading state:', e);
            return this.init();
        }
    },

    init() {
        return {
            currentTournament: null,
            history: [],
            globalStats: {
                players: {} // Keyed by player name
            }
        };
    },

    clear() {
        localStorage.removeItem(this.KEY);
    }
};
