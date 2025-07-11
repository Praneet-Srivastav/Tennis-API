/**
 * Simple WTA Classifier - Determines WTA status based on player names and rules
 * 
 * Rules:
 * - Singles: if one player is WTA → status is WTA
 * - Doubles: if both are women players and one is WTA → status is WTA  
 * - Mixed doubles: if both female players are WTA → status is WTA
 */

const wtaPlayerService = require('./wta-player-service');

class SimpleWTAClassifier {
    
    /**
     * Main function to determine WTA status
     * @param {string} homePlayer - Home player(s) name
     * @param {string} awayPlayer - Away player(s) name  
     * @returns {Promise<string>} - Returns "WTA" or "" (empty)
     */
    async getWTAStatus(homePlayer, awayPlayer) {
        try {
            // Parse players from both sides
            const homePlayers = this.parsePlayerNames(homePlayer);
            const awayPlayers = this.parsePlayerNames(awayPlayer);
            
            // Check all players for WTA status
            const allPlayers = [...homePlayers, ...awayPlayers];
            const playerResults = await Promise.all(
                allPlayers.map(name => wtaPlayerService.checkPlayer(name))
            );
            
            // Count WTA players
            const wtaPlayers = playerResults.filter(result => result.isWTA);
            const wtaCount = wtaPlayers.length;
            
            // Determine match type
            const totalPlayers = allPlayers.length;
            
            if (totalPlayers === 2) {
                // Singles match
                return this.applySinglesRule(wtaCount);
            } else if (totalPlayers === 4) {
                // Doubles or Mixed doubles
                return this.applyDoublesRule(playerResults, allPlayers);
            } else {
                // Invalid format
                return "";
            }
            
        } catch (error) {
            console.error('Error in WTA classification:', error);
            return "";
        }
    }
    
    /**
     * Parse player names - handles single names and comma-separated names
     * @param {string} playerString - Player name(s)
     * @returns {string[]} - Array of individual player names
     */
    parsePlayerNames(playerString) {
        if (!playerString) return [];
        
        // Split by comma and clean up
        return playerString.split(',')
            .map(name => name.trim())
            .filter(name => name.length > 0);
    }
    
    /**
     * Apply singles rule: if one player is WTA → status is WTA
     * @param {number} wtaCount - Number of WTA players
     * @returns {string} - "WTA" or ""
     */
    applySinglesRule(wtaCount) {
        return wtaCount >= 1 ? "WTA" : "";
    }
    
    /**
     * Apply doubles rules based on gender composition
     * @param {object[]} playerResults - Results from WTA player checks
     * @param {string[]} playerNames - Player names for reference
     * @returns {string} - "WTA" or ""
     */
    applyDoublesRule(playerResults, playerNames) {
        // Count female players (WTA players are by definition female)
        const femalePlayers = playerResults.filter(result => result.isWTA);
        const femaleCount = femalePlayers.length;
        
        if (femaleCount === 0) {
            // All male players - not WTA
            return "";
        } else if (femaleCount === 4) {
            // All female doubles - if any is WTA, then WTA
            return "WTA";
        } else {
            // Mixed doubles (1-3 females) - both females must be WTA
            // Since WTA detection means female, if we have detected females, they're all WTA
            // For mixed doubles, we need exactly 2 females (one per team) and both must be WTA
            if (femaleCount === 2) {
                // Mixed doubles with 2 females - both are WTA (since they were detected as WTA)
                return "WTA";
            } else if (femaleCount === 1) {
                // Mixed doubles with only 1 female WTA - not enough
                return "";
            } else {
                // 3 females - unusual case, treat as WTA if any detected
                return "WTA";
            }
        }
    }
    
    /**
     * Bulk process multiple matches
     * @param {object[]} matches - Array of {homePlayer, awayPlayer} objects
     * @returns {Promise<object[]>} - Array of results with WTA status
     */
    async processBulk(matches) {
        const results = [];
        
        // Process in batches to avoid overwhelming the system
        const batchSize = 10;
        for (let i = 0; i < matches.length; i += batchSize) {
            const batch = matches.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (match) => {
                const wtaStatus = await this.getWTAStatus(match.homePlayer, match.awayPlayer);
                return {
                    homePlayer: match.homePlayer,
                    awayPlayer: match.awayPlayer,
                    wtaStatus: wtaStatus,
                    ...match // Include any additional fields
                };
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Small delay between batches
            if (i + batchSize < matches.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }
    
    /**
     * Process Excel-format data
     * @param {object[]} excelData - Array of Excel row objects
     * @returns {Promise<object[]>} - Processed data with WTA status
     */
    async processExcelData(excelData) {
        const matches = excelData.map(row => ({
            homePlayer: row.homeopponent || '',
            awayPlayer: row.awayopponent || '',
            originalRow: row
        }));
        
        const results = await this.processBulk(matches);
        
        // Merge results back with original data
        return results.map(result => ({
            ...result.originalRow,
            'WTA?': result.wtaStatus
        }));
    }
}

// Export singleton instance
module.exports = new SimpleWTAClassifier();
