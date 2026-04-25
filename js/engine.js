/* =====================================================
   ENGINE v4.0 — Motor de Torneos
   - Todas las combinaciones pre-generadas
   - Detección de fin de rondas
   - Estadísticas globales extendidas
   ===================================================== */
const Engine = {

    /* -------- AMERICANO -------- */
    generateAmericano(players, courtCount, courtNames, options) {
        const { americanoType, scoreType } = options;
        const ids = players.map(p => p.id);
        let allPossibleMatches = [];

        if (americanoType === 'individual') {
            // Generar todos los pares posibles
            const pairs = [];
            for (let i = 0; i < ids.length; i++)
                for (let j = i + 1; j < ids.length; j++)
                    pairs.push([ids[i], ids[j]]);
            // Generar todos los cruces únicos (par vs par sin jugadores comunes)
            for (let i = 0; i < pairs.length; i++)
                for (let j = i + 1; j < pairs.length; j++)
                    if (!pairs[i].some(id => pairs[j].includes(id)))
                        allPossibleMatches.push({ team1: pairs[i], team2: pairs[j] });
        } else {
            // Parejas fijas: players[0]+players[1] vs players[2]+players[3], etc.
            const prePairs = [];
            for (let i = 0; i < ids.length - 1; i += 2)
                prePairs.push([ids[i], ids[i + 1]]);
            for (let i = 0; i < prePairs.length; i++)
                for (let j = i + 1; j < prePairs.length; j++)
                    allPossibleMatches.push({ team1: prePairs[i], team2: prePairs[j] });
        }

        this.shuffleArray(allPossibleMatches);

        return {
            id: Date.now(),
            name: 'Torneo Americano',
            type: 'americano',
            americanoType,
            scoreType,
            players: players.map(p => this.initPlayer(p)),
            courtCount: parseInt(courtCount),
            courtNames,
            matches: [],
            allPossibleMatches,
            currentMatchIndex: 0,
            allCombinationsDone: false
        };
    },

    generateAmericanoNextRound(state) {
        if (state.currentMatchIndex >= state.allPossibleMatches.length) {
            state.allCombinationsDone = true;
            return [];
        }

        const matches = [];
        const playersThisRound = new Set();
        let idx = state.currentMatchIndex;

        while (matches.length < state.courtCount && idx < state.allPossibleMatches.length) {
            const m = state.allPossibleMatches[idx];
            const allFree = [...m.team1, ...m.team2].every(id => !playersThisRound.has(id));
            if (allFree) {
                matches.push(this.createMatchObj(state, m.team1, m.team2, matches.length));
                [...m.team1, ...m.team2].forEach(id => playersThisRound.add(id));
            }
            idx++;
        }

        state.currentMatchIndex = idx;
        if (idx >= state.allPossibleMatches.length) {
            state.allCombinationsDone = true;
        }
        return matches;
    },

    /* -------- TODOS vs TODOS -------- */
    generateRobin(players, courtCount, courtNames, options) {
        const ids = players.map(p => p.id);
        const teams = [];
        for (let i = 0; i < ids.length - 1; i += 2)
            teams.push([ids[i], ids[i + 1]]);

        const allPossibleMatches = [];
        for (let i = 0; i < teams.length; i++)
            for (let j = i + 1; j < teams.length; j++)
                allPossibleMatches.push({ team1: teams[i], team2: teams[j] });

        this.shuffleArray(allPossibleMatches);

        return {
            id: Date.now(),
            name: 'Todos vs Todos',
            type: 'robin',
            scoreType: options.scoreType,
            players: players.map(p => this.initPlayer(p)),
            courtCount: parseInt(courtCount),
            courtNames,
            matches: [],
            allPossibleMatches,
            currentMatchIndex: 0,
            allCombinationsDone: false
        };
    },

    generateRobinNextRound(state) {
        if (state.currentMatchIndex >= state.allPossibleMatches.length) {
            state.allCombinationsDone = true;
            return [];
        }

        const matches = [];
        const teamsThisRound = new Set();
        let idx = state.currentMatchIndex;

        while (matches.length < state.courtCount && idx < state.allPossibleMatches.length) {
            const m = state.allPossibleMatches[idx];
            // Usar copias para el sort y no mutar el array original
            const k1 = [...m.team1].sort().join(','), k2 = [...m.team2].sort().join(',');
            if (!teamsThisRound.has(k1) && !teamsThisRound.has(k2)) {
                matches.push(this.createMatchObj(state, m.team1, m.team2, matches.length));
                teamsThisRound.add(k1); teamsThisRound.add(k2);
            }
            idx++;
        }

        state.currentMatchIndex = idx;
        if (idx >= state.allPossibleMatches.length) state.allCombinationsDone = true;
        return matches;
    },

    /* -------- REY CANCHA -------- */
    generateRey(players, courtCount, courtNames, options) {
        return {
            id: Date.now(),
            name: 'Rey de Cancha',
            type: 'rey',
            scoreType: options.scoreType,
            players: players.map(p => this.initPlayer(p)),
            courtCount: parseInt(courtCount),
            courtNames,
            matches: [],
            allPossibleMatches: [],
            allCombinationsDone: false
        };
    },

    generateReyNextRound(state) {
        const sorted = [...state.players].sort((a, b) => b.score - a.score);
        const matches = [];
        for (let i = 0; i < state.courtCount; i++) {
            const pIdx = i * 4;
            if (pIdx + 3 < sorted.length) {
                matches.push(this.createMatchObj(
                    state,
                    [sorted[pIdx].id, sorted[pIdx + 1].id],
                    [sorted[pIdx + 2].id, sorted[pIdx + 3].id],
                    i
                ));
            }
        }
        return matches;
    },

    /* -------- RESET COMBINACIONES -------- */
    resetAllCombinations(state) {
        state.currentMatchIndex = 0;
        state.allCombinationsDone = false;
        this.shuffleArray(state.allPossibleMatches);
    },

    /* -------- HELPERS -------- */
    initPlayer(p) {
        return {
            ...p,
            score: 0,
            wins: 0,
            matchesPlayed: 0,
            pointsAgainst: 0,
            totalSecondsOnCourt: 0,
            currentStreak: 0,
            bestStreak: 0
        };
    },

    createMatchObj(state, t1, t2, index) {
        return {
            id: Date.now() + index + Math.random(),
            team1: t1,
            team2: t2,
            score1: null,
            score2: null,
            points: { t1: 0, t2: 0 },
            duration: 0,
            court: state.courtNames[index] || `Cancha ${index + 1}`
        };
    },

    /* -------- ESTADÍSTICAS GLOBALES -------- */
    updateGlobalStats(globalStats, tournament) {
        const sorted = [...tournament.players].sort((a, b) => b.score - a.score);

        tournament.players.forEach(p => {
            if (!globalStats.players[p.name]) {
                globalStats.players[p.name] = {
                    wins: 0, losses: 0,
                    pointsFor: 0, pointsAgainst: 0,
                    firstPlaces: 0, secondPlaces: 0, thirdPlaces: 0,
                    totalMatches: 0, tournamentsPlayed: 0,
                    bestStreak: 0, currentStreak: 0,
                    totalSecondsOnCourt: 0
                };
            }
            const gs = globalStats.players[p.name];
            gs.wins  += p.wins;
            gs.losses += (p.matchesPlayed - p.wins);
            gs.pointsFor += p.score;
            gs.pointsAgainst += (p.pointsAgainst || 0);
            gs.totalMatches += p.matchesPlayed;
            gs.tournamentsPlayed += 1;
            gs.totalSecondsOnCourt += (p.totalSecondsOnCourt || 0);

            // Racha: actualizar basado en desempeño en el torneo
            if (p.bestStreak > gs.bestStreak) gs.bestStreak = p.bestStreak;
            gs.currentStreak = p.currentStreak || 0;
        });

        // Podios
        const addPodium = (pos, field) => {
            if (sorted[pos]) {
                const gs = globalStats.players[sorted[pos].name];
                if (gs) gs[field] = (gs[field] || 0) + 1;
            }
        };
        addPodium(0, 'firstPlaces');
        addPodium(1, 'secondPlaces');
        addPodium(2, 'thirdPlaces');
    },

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
};
