/**
 * Match Classifier Service - Handles WTA classification for different match types
 * Supports Singles, Doubles, and Mixed Doubles according to WTA rules
 * 
 * Rules:
 * - Singles: if one player is WTA → status is WTA
 * - Doubles: if both players are women and one is WTA → status is WTA
 * - Mixed doubles: if both players are WTA → status is WTA
 */

const wtaPlayerService = require('./wta-player-service');
const { parsePlayerName } = require('../utils/name-utils');

class MatchClassifierService {
    constructor() {
        // Track statistics
        this.stats = {
            totalClassified: 0,
            singles: 0,
            doubles: 0,
            mixedDoubles: 0,
            wtaMatches: 0,
            errors: 0
        };
    }

    /**
     * Parse player names from match string
     * Handles formats like "Player1,Player2 vs Player3,Player4"
     * @param {string} matchString - Full match string
     * @returns {object} - Parsed match information
     */
    parseMatchString(matchString) {
        try {
            // Split by "vs" (case insensitive)
            const parts = matchString.split(/\s+vs\s+/i);
            if (parts.length !== 2) {
                throw new Error('Invalid match format - must contain "vs"');
            }

            const [team1Str, team2Str] = parts;
            
            // Split each team by comma to get individual players
            const team1Players = team1Str.split(',').map(p => p.trim()).filter(p => p);
            const team2Players = team2Str.split(',').map(p => p.trim()).filter(p => p);

            // Determine match type
            let matchType;
            if (team1Players.length === 1 && team2Players.length === 1) {
                matchType = 'singles';
            } else if (team1Players.length === 2 && team2Players.length === 2) {
                matchType = 'doubles'; // Could be regular doubles or mixed, we'll determine later
            } else {
                throw new Error('Invalid team sizes - singles must be 1v1, doubles must be 2v2');
            }

            return {
                matchType,
                team1: team1Players,
                team2: team2Players,
                allPlayers: [...team1Players, ...team2Players],
                originalString: matchString
            };
        } catch (error) {
            console.error('Error parsing match string:', error.message);
            return {
                matchType: 'unknown',
                team1: [],
                team2: [],
                allPlayers: [],
                originalString: matchString,
                error: error.message
            };
        }
    }

    /**
     * Classify a match using home/away player format (Excel compatible)
     * @param {string} homePlayer - Home player(s) - could be "Player1" or "Player1,Player2"
     * @param {string} awayPlayer - Away player(s) - could be "Player1" or "Player1,Player2" 
     * @returns {object} - Match classification result
     */
    async classifyMatch(homePlayer, awayPlayer) {
        try {
            this.stats.totalClassified++;

            // Create match string in standard format
            const matchString = `${homePlayer} vs ${awayPlayer}`;
            const parsed = this.parseMatchString(matchString);

            if (parsed.error) {
                this.stats.errors++;
                return {
                    isWTA: false,
                    confidence: 0,
                    reason: `Parse error: ${parsed.error}`,
                    matchType: 'unknown',
                    details: parsed
                };
            }

            // Check all players for WTA status
            const playerChecks = await Promise.all(
                parsed.allPlayers.map(playerName => 
                    wtaPlayerService.checkPlayer(playerName)
                )
            );

            // Combine results with player names
            const playerResults = parsed.allPlayers.map((name, index) => ({
                name,
                ...playerChecks[index]
            }));

            // Count female players
            const femalePlayers = playerResults.filter(p => p.isWTA);
            const femaleCount = femalePlayers.length;

            let classification;

            if (parsed.matchType === 'singles') {
                this.stats.singles++;
                classification = this.classifySinglesMatch(playerResults);
            } else if (parsed.matchType === 'doubles') {
                // Determine if it's mixed doubles or regular doubles
                if (femaleCount === 0 || femaleCount === 4) {
                    // All male or all female - regular doubles
                    this.stats.doubles++;
                    classification = this.classifyDoublesMatch(playerResults);
                } else {
                    // Mixed - some male, some female
                    this.stats.mixedDoubles++;
                    classification = this.classifyMixedDoublesMatch(playerResults);
                }
            } else {
                this.stats.errors++;
                return {
                    isWTA: false,
                    confidence: 0,
                    reason: 'Unknown match type',
                    matchType: 'unknown',
                    details: parsed
                };
            }

            if (classification.isWTA) {
                this.stats.wtaMatches++;
            }

            return {
                ...classification,
                matchType: parsed.matchType,
                playerCount: parsed.allPlayers.length,
                femalePlayerCount: femaleCount,
                players: playerResults,
                teams: {
                    team1: parsed.team1,
                    team2: parsed.team2
                },
                details: parsed
            };

        } catch (error) {
            this.stats.errors++;
            console.error('Error classifying match:', error);
            return {
                isWTA: false,
                confidence: 0,
                reason: `Classification error: ${error.message}`,
                matchType: 'error',
                details: { error: error.message }
            };
        }
    }

    /**
     * Classify singles match: if one player is WTA → status is WTA
     * @param {object[]} playerResults - Array of player check results
     * @returns {object} - Classification result
     */
    classifySinglesMatch(playerResults) {
        const wtaPlayers = playerResults.filter(p => p.isWTA);
        
        if (wtaPlayers.length > 0) {
            // At least one WTA player = WTA match
            const minConfidence = Math.min(...wtaPlayers.map(p => p.confidence));
            return {
                isWTA: true,
                confidence: minConfidence,
                reason: `Singles match with ${wtaPlayers.length} WTA player(s)`
            };
        } else {
            return {
                isWTA: false,
                confidence: 1.0,
                reason: 'Singles match with no WTA players'
            };
        }
    }

    /**
     * Classify doubles match: if both players are women and one is WTA → status is WTA
     * @param {object[]} playerResults - Array of player check results
     * @returns {object} - Classification result
     */
    classifyDoublesMatch(playerResults) {
        const wtaPlayers = playerResults.filter(p => p.isWTA);
        const femaleCount = wtaPlayers.length;

        if (femaleCount === 4) {
            // All female doubles - if any are WTA, it's a WTA match
            const minConfidence = Math.min(...wtaPlayers.map(p => p.confidence));
            return {
                isWTA: true,
                confidence: minConfidence,
                reason: 'All-female doubles match with WTA players'
            };
        } else if (femaleCount === 0) {
            // All male doubles - not WTA
            return {
                isWTA: false,
                confidence: 1.0,
                reason: 'All-male doubles match'
            };
        } else {
            // This shouldn't happen in regular doubles but handle gracefully
            return {
                isWTA: false,
                confidence: 0.5,
                reason: 'Inconsistent gender detection in doubles match'
            };
        }
    }

    /**
     * Classify mixed doubles: if both players are WTA → status is WTA
     * @param {object[]} playerResults - Array of player check results
     * @returns {object} - Classification result
     */
    classifyMixedDoublesMatch(playerResults) {
        const wtaPlayers = playerResults.filter(p => p.isWTA);
        const femaleCount = wtaPlayers.length;

        // In mixed doubles, we expect some males and some females
        // For WTA status, all female players must be WTA
        const expectedFemales = playerResults.filter(p => 
            p.details && p.details.genderDetection && 
            p.details.genderDetection.gender === 'female'
        ).length;

        if (expectedFemales === 0) {
            return {
                isWTA: false,
                confidence: 1.0,
                reason: 'Mixed doubles with no detected female players'
            };
        }

        if (femaleCount === expectedFemales && femaleCount > 0) {
            // All detected female players are WTA
            const minConfidence = Math.min(...wtaPlayers.map(p => p.confidence));
            return {
                isWTA: true,
                confidence: minConfidence,
                reason: `Mixed doubles with all ${femaleCount} female players being WTA`
            };
        } else {
            return {
                isWTA: false,
                confidence: 0.8,
                reason: `Mixed doubles: only ${femaleCount} of ${expectedFemales} female players are WTA`
            };
        }
    }

    /**
     * Bulk classify multiple matches
     * @param {object[]} matches - Array of {homePlayer, awayPlayer} objects
     * @returns {object[]} - Array of classification results
     */
    async classifyMatchesBulk(matches) {
        const results = [];
        const batchSize = 3; // Process in small batches
        
        for (let i = 0; i < matches.length; i += batchSize) {
            const batch = matches.slice(i, i + batchSize);
            const batchPromises = batch.map(match => 
                this.classifyMatch(match.homePlayer, match.awayPlayer)
            );
            const batchResults = await Promise.all(batchPromises);
            
            results.push(...batchResults.map((result, index) => ({
                originalMatch: batch[index],
                ...result
            })));
            
            // Small delay between batches to avoid overwhelming external APIs
            if (i + batchSize < matches.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        return results;
    }

    /**
     * Get service statistics
     * @returns {object} - Service statistics
     */
    getStats() {
        return {
            ...this.stats,
            wtaPercentage: this.stats.totalClassified > 0 
                ? (this.stats.wtaMatches / this.stats.totalClassified * 100).toFixed(1)
                : 0
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalClassified: 0,
            singles: 0,
            doubles: 0,
            mixedDoubles: 0,
            wtaMatches: 0,
            errors: 0
        };
    }
}

// Export singleton instance
module.exports = new MatchClassifierService();
