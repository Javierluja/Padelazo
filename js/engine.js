const Engine = {
    generateAmericano(players, courtCount, courtNames) {
        // Generate list of all possible pairs
        const pairs = [];
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                pairs.push([players[i].id, players[j].id]);
            }
        }

        // Shuffle pairs
        this.shuffleArray(pairs);

        return {
            type: 'americano',
            players: players.map(p => ({ ...p, score: 0 })),
            courtCount: parseInt(courtCount),
            courtNames: courtNames,
            matches: [],
            allPossiblePairs: pairs,
            usedPairIndices: new Set()
        };
    },

    generateRobin(players, courtCount, courtNames) {
        // Fixed teams logic (Round Robin by teams)
        const teams = [];
        for (let i = 0; i < players.length; i += 2) {
            if (i + 1 < players.length) {
                teams.push([players[i].id, players[i+1].id]);
            }
        }

        const teamMatches = [];
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                teamMatches.push({
                    t1: teams[i],
                    t2: teams[j]
                });
            }
        }
        this.shuffleArray(teamMatches);

        return {
            type: 'robin',
            players: players.map(p => ({ ...p, score: 0 })),
            courtCount: parseInt(courtCount),
            courtNames: courtNames,
            matches: [],
            allPossibleMatches: teamMatches,
            currentMatchIndex: 0
        };
    },

    generateRey(players, courtCount, courtNames) {
        return {
            type: 'rey',
            players: players.map(p => ({ ...p, score: 0 })),
            courtCount: parseInt(courtCount),
            courtNames: courtNames,
            matches: []
        };
    },

    // Helper to generate the matches for a new round in Americano
    generateAmericanoNextRound(state) {
        const matches = [];
        const playersThisRound = new Set();
        const maxMatches = state.courtCount;

        // Reset search if needed or keep trying to find unused pairs
        let attempts = 0;
        while (matches.length < maxMatches && attempts < 100) {
            attempts++;
            // Find a pair that hasn't played together yet (and players are free)
            let pair1Idx = -1;
            for (let i = 0; i < state.allPossiblePairs.length; i++) {
                if (!state.usedPairIndices.has(i)) {
                    const p = state.allPossiblePairs[i];
                    if (!playersThisRound.has(p[0]) && !playersThisRound.has(p[1])) {
                        pair1Idx = i;
                        break;
                    }
                }
            }

            if (pair1Idx === -1) break; // No more pairs available for this round

            const pair1 = state.allPossiblePairs[pair1Idx];
            
            // Find an opponent pair
            let pair2Idx = -1;
            for (let i = 0; i < state.allPossiblePairs.length; i++) {
                if (i === pair1Idx) continue;
                // Important: for Americano "everyone against everyone", 
                // we should ideally pick a pair that hasn't played together either,
                // but sometimes we might need to reuse a pair if we want to finish rounds.
                // However, the rule "Everyone plays with everyone" refers to PARTNERS.
                const p = state.allPossiblePairs[i];
                if (!playersThisRound.has(p[0]) && !playersThisRound.has(p[1])) {
                    // Check if they have played against each other? (Lower priority)
                    pair2Idx = i;
                    break;
                }
            }

            if (pair2Idx !== -1) {
                const pair2 = state.allPossiblePairs[pair2Idx];
                matches.push({
                    id: Date.now() + matches.length,
                    team1: pair1,
                    team2: pair2,
                    score1: null,
                    score2: null,
                    court: state.courtNames[matches.length] || `Cancha ${matches.length + 1}`
                });
                playersThisRound.add(pair1[0]); playersThisRound.add(pair1[1]);
                playersThisRound.add(pair2[0]); playersThisRound.add(pair2[1]);
                state.usedPairIndices.add(pair1Idx);
                // Note: pair2 might be used as a pair again later if they haven't "officially" been marked as a starting pair?
                // In Americano, each unique pair should ideally play together once.
                state.usedPairIndices.add(pair2Idx);
            } else {
                // Could not find opponent pair for this pair1 in this round
                // We'll skip pair1 for this round and try another
                playersThisRound.delete(pair1[0]); playersThisRound.delete(pair1[1]); 
                // Don't mark as used yet
            }
        }
        
        return matches;
    },

    generateReyNextRound(state) {
        let newMatches = [];
        const sorted = [...state.players].sort((a, b) => b.score - a.score);
        
        for (let i = 0; i < state.courtCount; i++) {
            const pIdx = i * 4;
            if (pIdx + 3 < sorted.length) {
                newMatches.push({
                    id: Date.now() + i,
                    team1: [sorted[pIdx].id, sorted[pIdx+1].id],
                    team2: [sorted[pIdx+2].id, sorted[pIdx+3].id],
                    score1: null,
                    score2: null,
                    court: state.courtNames[i] || `Cancha ${i + 1}`
                });
            }
        }
        return newMatches;
    },

    generateRobinNextRound(state) {
        const matches = [];
        const teamsThisRound = new Set();
        let idx = state.currentMatchIndex;

        while (matches.length < state.courtCount && idx < state.allPossibleMatches.length) {
            const m = state.allPossibleMatches[idx];
            // Check if any team member is already playing (though Robin is usually by team)
            if (!teamsThisRound.has(m.t1.toString()) && !teamsThisRound.has(m.t2.toString())) {
                matches.push({
                    id: Date.now() + matches.length,
                    team1: m.t1,
                    team2: m.t2,
                    score1: null,
                    score2: null,
                    court: state.courtNames[matches.length] || `Cancha ${matches.length + 1}`
                });
                teamsThisRound.add(m.t1.toString());
                teamsThisRound.add(m.t2.toString());
            }
            idx++;
        }
        state.currentMatchIndex = idx;
        return matches;
    },

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
};
