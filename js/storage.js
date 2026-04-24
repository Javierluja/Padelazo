const Storage = {
    KEY: 'padelazo_state',

    save(state) {
        localStorage.setItem(this.KEY, JSON.stringify(state));
    },

    load() {
        const data = localStorage.getItem(this.KEY);
        try {
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error loading state:', e);
            return null;
        }
    },

    clear() {
        localStorage.removeItem(this.KEY);
    }
};
