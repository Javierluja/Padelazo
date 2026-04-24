const Engine = {
    generateAmericano(players, courtCount, courtNames, options) {
        const { americanoType, scoreType } = options;
        
        let allPossiblePairs = [];
        if (americanoType === 'individual') {
            for (let i = 0; i < players.length; i++) {
                for (let j = i + 1; j < players.length; j++) {
                    allPossiblePairs.push([players[i].id, players[j].id]);
                }
            }
        } else {
            // By Pairs: players come already grouped in pairs list
            for (let i = 0; i < players.length; i += 2) {
                if (i + 1 < players.length) {
                    allPossiblePairs.push([players[i].id, players[i+1].id]);
                }
            }
        }

        this.shuffleArray(allPossiblePairs);

        return {
            id: Date.now(),
            name: `Torneo ${new Date().toLocaleDateString()}`,
            type: 'americano',
            americanoType,
            scoreType,
            players: players.map(p => ({ ...p, score: 0, wins: 0, matchesPlayed: 0 })),
            courtCount: parseInt(courtCount),
            courtNames: courtNames,
            matches: [],
            allPossibleMatches: this.generateMatchesFromPairs(allPossiblePairs, americanoType),
            currentMatchIndex: 0
        };
    },

    generateMatchesFromPairs(pairs, type) {
        const matches = [];
        if (type === 'individual') {
            return pairs; 
        } else {
            for (let i = 0; i < pairs.length; i++) {
                for (let j = i + 1; j < pairs.length; j++) {
                    matches.push({ team1: pairs[i], team2: pairs[j] });
                }
            }
            this.shuffleArray(matches);
            return matches;
        }
    },

    generateAmericanoNextRound(state) {
        const matches = [];
        const playersThisRound = new Set();
        const maxMatches = state.courtCount;

        if (state.americanoType === 'individual') {
            let pair1Idx = 0;
            while (matches.length < maxMatches && pair1Idx < state.allPossibleMatches.length) {
                const pair1 = state.allPossibleMatches[pair1Idx];
                if (!playersThisRound.has(pair1[0]) && !playersThisRound.has(pair1[1])) {
                    let pair2Idx = pair1Idx + 1;
                    while (pair2Idx < state.allPossibleMatches.length) {
                        const pair2 = state.allPossibleMatches[pair2Idx];
                        if (!playersThisRound.has(pair2[0]) && !playersThisRound.has(pair2[1])) {
                            matches.push(this.createMatchObj(state, pair1, pair2, matches.length));
                            playersThisRound.add(pair1[0]); playersThisRound.add(pair1[1]);
                            playersThisRound.add(pair2[0]); playersThisRound.add(pair2[1]);
                            state.allPossibleMatches.splice(pair2Idx, 1);
                            state.allPossibleMatches.splice(pair1Idx, 1);
                            state.allPossibleMatches.push(pair1, pair2);
                            pair1Idx--;
                            break;
                        }
                        pair2Idx++;
                    }
                }
                pair1Idx++;
            }
        } else {
            let idx = state.currentMatchIndex;
            while (matches.length < maxMatches && idx < state.allPossibleMatches.length) {
                const m = state.allPossibleMatches[idx];
                if (!playersThisRound.has(m.team1[0]) && !playersThisRound.has(m.team2[0])) {
                    matches.push(this.createMatchObj(state, m.team1, m.team2, matches.length));
                    playersThisRound.add(m.team1[0]); playersThisRound.add(m.team2[0]);
                }
                idx++;
            }
            state.currentMatchIndex = idx;
        }
        return matches;
    },

    createMatchObj(state, t1, t2, index) {
        return {
            id: Date.now() + index,
            team1: t1,
            team2: t2,
            score1: null,
            score2: null,
            points: { t1: 0, t2: 0, history: [] },
            court: state.courtNames[index] || `Cancha ${index + 1}`
        };
    },

    generateRobin(players, courtCount, courtNames, options) {
        const teams = [];
        for (let i = 0; i < players.length; i += 2) {
            if (i + 1 < players.length) teams.push([players[i].id, players[i+1].id]);
        }
        const matches = [];
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                matches.push({ team1: teams[i], team2: teams[j] });
            }
        }
        this.shuffleArray(matches);
        return {
            id: Date.now(),
            name: `Torneo Todos vs Todos ${new Date().toLocaleDateString()}`,
            type: 'robin',
            scoreType: options.scoreType,
            players: players.map(p => ({ ...p, score: 0, wins: 0, matchesPlayed: 0 })),
            courtCount: parseInt(courtCount),
            courtNames: courtNames,
            matches: [],
            allPossibleMatches: matches,
            currentMatchIndex: 0
        };
    },

    generateRobinNextRound(state) {
        const matches = [];
        const teamsThisRound = new Set();
        let idx = state.currentMatchIndex;
        while (matches.length < state.courtCount && idx < state.allPossibleMatches.length) {
            const m = state.allPossibleMatches[idx];
            if (!teamsThisRound.has(m.team1.toString()) && !teamsThisRound.has(m.team2.toString())) {
                matches.push(this.createMatchObj(state, m.team1, m.team2, matches.length));
                teamsThisRound.add(m.team1.toString());
                teamsThisRound.add(m.team2.toString());
            }
            idx++;
        }
        state.currentMatchIndex = idx;
        return matches;
    },

    generateRey(players, courtCount, courtNames, options) {
        return {
            id: Date.now(),
            name: `Torneo Rey de Cancha ${new Date().toLocaleDateString()}`,
            type: 'rey',
            scoreType: options.scoreType,
            players: players.map(p => ({ ...p, score: 0, wins: 0, matchesPlayed: 0 })),
            courtCount: parseInt(courtCount),
            courtNames,
            matches: []
        };
    },

    generateReyNextRound(state) {
        let newMatches = [];
        const sorted = [...state.players].sort((a, b) => b.score - a.score);
        for (let i = 0; i < state.courtCount; i++) {
            const pIdx = i * 4;
            if (pIdx + 3 < sorted.length) {
                newMatches.push(this.createMatchObj(state, [sorted[pIdx].id, sorted[pIdx+1].id], [sorted[pIdx+2].id, sorted[pIdx+3].id], i));
            }
        }
        return newMatches;
    },

    getPointLabels(type) {
        if (type === 'normal') return ['0', '15', '30', '40', 'AD'];
        return null; // Tiebreak types don't need fixed labels
    },

    updateGlobalStats(globalStats, tournament) {
        tournament.players.forEach(p => {
            if (!globalStats.players[p.name]) {
                globalStats.players[p.name] = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, firstPlaces: 0, totalMatches: 0 };
            }
            const gs = globalStats.players[p.name];
            gs.wins += p.wins;
            gs.losses += (p.matchesPlayed - p.wins);
            gs.pointsFor += p.score;
            gs.totalMatches += p.matchesPlayed;
        });
        const sorted = [...tournament.players].sort((a,b) => b.score - a.score);
        if (sorted.length > 0) {
            const winner = sorted[0];
            globalStats.players[winner.name].firstPlaces += 1;
        }
    },

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
};
