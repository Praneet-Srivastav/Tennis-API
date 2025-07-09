/**
 * WTA Player Service - Main service for determining if players are WTA-eligible
 * Combines official WTA data, gender detection, and caching
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { parsePlayerName, isValidPlayerName } = require('../utils/name-utils');
const genderDetectionService = require('./gender-detection-service');
const cacheService = require('./cache-service');

class WTAPlayerService {
    constructor() {
        this.wtaOfficialPlayers = new Set();
        this.lastOfficialUpdate = null;
        this.officialUpdateInterval = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Check if a player is WTA-eligible
     * @param {string} playerName - Full player name
     * @returns {object} - {isWTA: boolean, confidence: number, reason: string, details: object}
     */
    async checkPlayer(playerName) {
        if (!playerName || !isValidPlayerName(playerName)) {
            return {
                isWTA: false,
                confidence: 0,
                reason: 'Invalid player name',
                details: { input: playerName }
            };
        }

        const normalizedName = playerName.trim();
        
        // Check cache first
        const cacheKey = `wta_${normalizedName.toLowerCase()}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            return { ...cached, reason: 'Cached result' };
        }

        // Parse the name
        const nameParts = parsePlayerName(normalizedName);
        if (!nameParts.firstName) {
            return {
                isWTA: false,
                confidence: 0,
                reason: 'Could not parse player name',
                details: { input: playerName, parsed: nameParts }
            };
        }

        let result = {
            isWTA: false,
            confidence: 0,
            reason: 'Unknown',
            details: {
                input: playerName,
                parsed: nameParts
            }
        };

        // Step 1: Check against official WTA player list
        await this.updateOfficialWTAPlayers();
        if (this.isInOfficialWTAList(normalizedName)) {
            result = {
                isWTA: true,
                confidence: 1.0,
                reason: 'Found in official WTA player list',
                details: { ...result.details, source: 'official_wta' }
            };
        } else {
            // Step 2: Use gender detection
            const genderResult = await genderDetectionService.detectGender(nameParts.firstName);
            
            result = {
                isWTA: genderResult.gender === 'female',
                confidence: genderResult.confidence,
                reason: `Gender detection: ${genderResult.gender} (${genderResult.source})`,
                details: { 
                    ...result.details, 
                    genderDetection: genderResult 
                }
            };
        }

        // Cache the result
        await cacheService.set(cacheKey, result);
        
        return result;
    }

    /**
     * Check if a tennis match involves WTA players
     * @param {string} homePlayer - Home player name
     * @param {string} awayPlayer - Away player name
     * @returns {object} - Match analysis result
     */
    async checkMatch(homePlayer, awayPlayer) {
        const [homeResult, awayResult] = await Promise.all([
            this.checkPlayer(homePlayer),
            this.checkPlayer(awayPlayer)
        ]);

        const bothWTA = homeResult.isWTA && awayResult.isWTA;
        const minConfidence = Math.min(homeResult.confidence, awayResult.confidence);
        
        return {
            isWTAMatch: bothWTA,
            confidence: bothWTA ? minConfidence : 0,
            reason: bothWTA ? 'Both players are WTA-eligible' : 'Not both players are WTA-eligible',
            players: {
                home: homeResult,
                away: awayResult
            }
        };
    }

    /**
     * Bulk check multiple players
     * @param {string[]} playerNames - Array of player names
     * @returns {object[]} - Array of player check results
     */
    async checkPlayersBulk(playerNames) {
        const results = [];
        const batchSize = 5; // Process in small batches to avoid overwhelming APIs
        
        for (let i = 0; i < playerNames.length; i += batchSize) {
            const batch = playerNames.slice(i, i + batchSize);
            const batchPromises = batch.map(name => this.checkPlayer(name));
            const batchResults = await Promise.all(batchPromises);
            
            results.push(...batchResults.map((result, index) => ({
                playerName: batch[index],
                ...result
            })));
            
            // Small delay between batches
            if (i + batchSize < playerNames.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        return results;
    }

    /**
     * Bulk check multiple matches
     * @param {object[]} matches - Array of {homePlayer, awayPlayer} objects
     * @returns {object[]} - Array of match check results
     */
    async checkMatchesBulk(matches) {
        const results = [];
        const batchSize = 3; // Smaller batches for matches (each match = 2 player checks)
        
        for (let i = 0; i < matches.length; i += batchSize) {
            const batch = matches.slice(i, i + batchSize);
            const batchPromises = batch.map(match => 
                this.checkMatch(match.homePlayer, match.awayPlayer)
            );
            const batchResults = await Promise.all(batchPromises);
            
            results.push(...batchResults.map((result, index) => ({
                match: batch[index],
                ...result
            })));
            
            // Small delay between batches
            if (i + batchSize < matches.length) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        return results;
    }

    /**
     * Update the official WTA player list from WTA website
     */
    async updateOfficialWTAPlayers() {
        const now = Date.now();
        
        // Skip if recently updated
        if (this.lastOfficialUpdate && 
            (now - this.lastOfficialUpdate) < this.officialUpdateInterval) {
            return;
        }

        try {
            console.log('Updating official WTA player list...');
            
            // Try to get players from WTA rankings page
            const response = await axios.get('https://www.wtatennis.com/rankings', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const players = new Set();

            // Extract player names from rankings table
            $('table tbody tr').each((i, tr) => {
                let playerInfo = $(tr).find('td:nth-child(2)').text().trim();
                if (playerInfo) {
                    // Clean up the player name (remove ranking info, etc.)
                    let parts = playerInfo.split('  ');
                    let playerName = parts[0].trim();
                    if (playerName && playerName.length > 2) {
                        players.add(playerName.toLowerCase());
                    }
                }
            });

            // Also try the player index page
            try {
                const indexResponse = await axios.get('https://www.wtatennis.com/players', {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                const $index = cheerio.load(indexResponse.data);
                
                $index('tbody tr .views-field-field-lastname').each((i, td) => {
                    const lastFirst = $index(td).text().trim().replace(/\s/g, '');
                    const parts = lastFirst.split(',');
                    if (parts.length >= 2) {
                        const playerName = (parts[1] + ' ' + parts[0]).trim();
                        if (playerName.length > 2) {
                            players.add(playerName.toLowerCase());
                        }
                    }
                });
            } catch (indexError) {
                console.warn('Could not fetch WTA player index:', indexError.message);
            }

            this.wtaOfficialPlayers = players;
            this.lastOfficialUpdate = now;
            
            console.log(`Updated WTA player list with ${players.size} players`);
            
            // Cache the official list
            await cacheService.set('official_wta_players', {
                players: Array.from(players),
                lastUpdate: now
            });
            
        } catch (error) {
            console.error('Error updating official WTA players:', error.message);
            
            // Try to load from cache as fallback
            const cached = await cacheService.get('official_wta_players');
            if (cached && cached.players) {
                this.wtaOfficialPlayers = new Set(cached.players);
                this.lastOfficialUpdate = cached.lastUpdate;
                console.log(`Loaded ${cached.players.length} WTA players from cache`);
            }
        }
    }

    /**
     * Check if a player is in the official WTA list
     * @param {string} playerName - Player name to check
     * @returns {boolean} - Whether player is in official list
     */
    isInOfficialWTAList(playerName) {
        const normalized = playerName.toLowerCase().trim();
        return this.wtaOfficialPlayers.has(normalized);
    }

    /**
     * Get service statistics
     * @returns {object} - Service statistics
     */
    async getStats() {
        const cacheStats = await cacheService.getStats();
        const genderStats = genderDetectionService.getUsageStats();
        
        return {
            officialWTAPlayers: this.wtaOfficialPlayers.size,
            lastOfficialUpdate: this.lastOfficialUpdate,
            cache: cacheStats,
            genderDetection: genderStats
        };
    }

    /**
     * Manual override to mark a player as WTA or non-WTA
     * @param {string} playerName - Player name
     * @param {boolean} isWTA - Whether player is WTA
     * @param {string} reason - Reason for override
     */
    async setPlayerStatus(playerName, isWTA, reason = 'Manual override') {
        const cacheKey = `wta_${playerName.toLowerCase()}`;
        const result = {
            isWTA: isWTA,
            confidence: 1.0,
            reason: reason,
            details: {
                input: playerName,
                manualOverride: true,
                timestamp: new Date().toISOString()
            }
        };
        
        await cacheService.set(cacheKey, result);
        console.log(`Manual override set for ${playerName}: ${isWTA ? 'WTA' : 'Non-WTA'}`);
        
        return result;
    }
}

// Export singleton instance
module.exports = new WTAPlayerService();