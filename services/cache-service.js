/**
 * Cache service for storing and retrieving WTA player data
 * Handles both memory and file-based caching
 */

const fs = require('fs').promises;
const path = require('path');
const { normalizeName } = require('../utils/name-utils');

class CacheService {
    constructor() {
        this.memoryCache = new Map();
        this.cacheFile = path.join(__dirname, '../data/wta-players-cache.json');
        this.maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.initialized = false;
    }

    /**
     * Initialize the cache by loading from file
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            await this.loadFromFile();
            this.initialized = true;
            console.log('Cache service initialized successfully');
        } catch (error) {
            console.warn('Could not load cache from file:', error.message);
            // Continue with empty cache
            this.initialized = true;
        }
    }

    /**
     * Load cache data from file
     */
    async loadFromFile() {
        try {
            const data = await fs.readFile(this.cacheFile, 'utf8');
            const parsed = JSON.parse(data);
            
            // Validate cache entries and remove expired ones
            const now = Date.now();
            for (const [key, entry] of Object.entries(parsed)) {
                if (entry.timestamp && (now - entry.timestamp) < this.maxAge) {
                    this.memoryCache.set(key, entry);
                }
            }
            
            console.log(`Loaded ${this.memoryCache.size} entries from cache`);
        } catch (error) {
            // File doesn't exist or is invalid - start fresh
            console.log('Starting with empty cache');
        }
    }

    /**
     * Save cache data to file
     */
    async saveToFile() {
        try {
            const cacheData = {};
            for (const [key, value] of this.memoryCache.entries()) {
                cacheData[key] = value;
            }
            
            await fs.writeFile(this.cacheFile, JSON.stringify(cacheData, null, 2));
            console.log(`Saved ${Object.keys(cacheData).length} entries to cache file`);
        } catch (error) {
            console.error('Error saving cache to file:', error.message);
        }
    }

    /**
     * Get player data from cache
     * @param {string} playerName - Player name to look up
     * @returns {object|null} - Cached player data or null if not found
     */
    async get(playerName) {
        await this.initialize();
        
        const key = normalizeName(playerName);
        const entry = this.memoryCache.get(key);
        
        if (!entry) return null;
        
        // Check if entry is expired
        const now = Date.now();
        if (entry.timestamp && (now - entry.timestamp) > this.maxAge) {
            this.memoryCache.delete(key);
            return null;
        }
        
        return entry.data;
    }

    /**
     * Store player data in cache
     * @param {string} playerName - Player name
     * @param {object} data - Player data to cache
     */
    async set(playerName, data) {
        await this.initialize();
        
        const key = normalizeName(playerName);
        const entry = {
            data: data,
            timestamp: Date.now()
        };
        
        this.memoryCache.set(key, entry);
        
        // Periodically save to file (every 10 new entries)
        if (this.memoryCache.size % 10 === 0) {
            await this.saveToFile();
        }
    }

    /**
     * Check if player is in cache
     * @param {string} playerName - Player name to check
     * @returns {boolean} - Whether player is cached
     */
    async has(playerName) {
        const data = await this.get(playerName);
        return data !== null;
    }

    /**
     * Remove player from cache
     * @param {string} playerName - Player name to remove
     */
    async remove(playerName) {
        await this.initialize();
        
        const key = normalizeName(playerName);
        this.memoryCache.delete(key);
    }

    /**
     * Clear all cache data
     */
    async clear() {
        this.memoryCache.clear();
        await this.saveToFile();
    }

    /**
     * Get cache statistics
     * @returns {object} - Cache stats
     */
    async getStats() {
        await this.initialize();
        
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        
        for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.timestamp && (now - entry.timestamp) > this.maxAge) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        }
        
        return {
            totalEntries: this.memoryCache.size,
            validEntries,
            expiredEntries,
            maxAge: this.maxAge
        };
    }

    /**
     * Clean up expired entries
     */
    async cleanup() {
        await this.initialize();
        
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.timestamp && (now - entry.timestamp) > this.maxAge) {
                this.memoryCache.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            await this.saveToFile();
            console.log(`Cleaned up ${cleanedCount} expired cache entries`);
        }
        
        return cleanedCount;
    }
}

// Export singleton instance
module.exports = new CacheService();