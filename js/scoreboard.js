/* =====================================================
   SCOREBOARD.JS v4.1 — Utilidades de Marcador
   Helpers puros para lógica de puntuación, separados
   de la lógica de UI para facilitar mantenimiento.
   ===================================================== */

const Scoreboard = {

    /**
     * Etiquetas para el modo de puntuación tennis (normal).
     * Índice = cantidad de puntos ganados en el juego actual.
     */
    TENNIS_LABELS: ['0', '15', '30', '40', 'ORO'],

    /**
     * Límites de puntos por modo de puntuación.
     */
    SCORE_LIMITS: {
        tiebreak:  7,
        supertieb: 11
    },

    /**
     * Determina si un partido está en "Punto de Oro" (deuce en modo normal).
     * @param {object} points - { t1: number, t2: number }
     * @param {string} scoreType - 'normal' | 'tiebreak' | 'supertieb'
     * @returns {boolean}
     */
    isGoldPoint(points, scoreType) {
        return scoreType === 'normal' && points.t1 === 3 && points.t2 === 3;
    },

    /**
     * Añade un punto a un equipo y devuelve el nuevo estado de puntos.
     * Si hay un ganador del juego (modo normal), resetea los puntos y
     * devuelve qué equipo ganó el punto de juego.
     *
     * @param {object} points   - Estado actual { t1, t2 }
     * @param {number} team     - 1 o 2
     * @param {string} scoreType
     * @returns {{ points: object, gameWinner: number|null }}
     *   gameWinner es 1 o 2 si se cerró un juego (modo tennis), null si no.
     */
    addPoint(points, team, scoreType) {
        const next = { t1: points.t1, t2: points.t2 };
        if (team === 1) next.t1++; else next.t2++;

        if (scoreType === 'normal') {
            // Modo tennis: al superar 3 puntos (deuce o ventaja ganada)
            if (next.t1 > 3 || next.t2 > 3) {
                const winner = next.t1 > next.t2 ? 1 : 2;
                return { points: { t1: 0, t2: 0 }, gameWinner: winner };
            }
            // Deuce (punto de oro): ambos tienen 3
            return { points: next, gameWinner: null };
        }

        // Modo tiebreak / supertieb
        const limit = Scoreboard.SCORE_LIMITS[scoreType] ?? 7;
        const diff  = Math.abs(next.t1 - next.t2);
        const leader = Math.max(next.t1, next.t2);
        const winner = (leader >= limit && diff >= 2) ? (next.t1 > next.t2 ? 1 : 2) : null;
        return { points: next, gameWinner: winner };
    },

    /**
     * Resta un punto (corrección de error) respetando mínimo 0.
     * @param {object} points - { t1, t2 }
     * @param {number} team   - 1 o 2
     * @returns {object}      - Nuevo estado de puntos
     */
    subtractPoint(points, team) {
        const next = { t1: points.t1, t2: points.t2 };
        if (team === 1 && next.t1 > 0) next.t1--;
        else if (team === 2 && next.t2 > 0) next.t2--;
        return next;
    },

    /**
     * Calcula el resultado final del partido y las estadísticas por jugador.
     * @param {object} match        - Partido con { team1, team2, score1, score2, duration }
     * @param {Array}  players      - Array de objetos jugador del torneo
     * @returns {Array}             - Array de jugadores con estadísticas actualizadas
     */
    applyMatchResult(match, players) {
        const { score1: s1, score2: s2, team1, team2, duration } = match;
        const isDraw = s1 === s2;

        const updatedPlayers = players.map(p => ({ ...p }));

        const updateTeam = (ids, pFor, pAgainst, won) => {
            ids.forEach(id => {
                const p = updatedPlayers.find(x => x.id === id);
                if (!p) return;
                p.score            += pFor;
                p.matchesPlayed    += 1;
                p.pointsAgainst     = (p.pointsAgainst || 0) + pAgainst;
                p.totalSecondsOnCourt = (p.totalSecondsOnCourt || 0) + duration;
                if (won) {
                    p.wins++;
                    p.currentStreak = (p.currentStreak || 0) + 1;
                    if (p.currentStreak > (p.bestStreak || 0)) p.bestStreak = p.currentStreak;
                } else if (!isDraw) {
                    // Solo cortar racha en derrota real, no en empate
                    p.currentStreak = 0;
                }
            });
        };

        updateTeam(team1, s1, s2, !isDraw && s1 > s2);
        updateTeam(team2, s2, s1, !isDraw && s2 > s1);

        return updatedPlayers;
    },

    /**
     * Formatea segundos como cadena legible (ej: "1h 23m").
     * @param {number} secs
     * @returns {string}
     */
    formatTime(secs) {
        if (!secs || secs <= 0) return '0m';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    },

    /**
     * Calcula el eficacia (%) de un jugador.
     * @param {object} player
     * @returns {number} 0-100
     */
    efficiency(player) {
        if (!player.matchesPlayed) return 0;
        return Math.round((player.wins / player.matchesPlayed) * 100);
    },

    /**
     * Calcula el diferencial de puntos de un jugador.
     * @param {object} player
     * @returns {number}
     */
    pointDiff(player) {
        return (player.score || 0) - (player.pointsAgainst || 0);
    }
};
