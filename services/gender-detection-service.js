/**
 * Gender detection service using local libraries (no rate limits!)
 * Uses gender-detection-from-name and gender-guess for offline detection
 */

const { getGender } = require('gender-detection-from-name');
const genderGuess = require('gender-guess');
const { extractFirstName, isLikelyFemaleName } = require('../utils/name-utils');
const cacheService = require('./cache-service');

class GenderDetectionService {
    constructor() {
        // No API configuration needed - everything is offline!
        this.detectionMethods = [
            'gender-detection-from-name',
            'gender-guess', 
            'heuristic'
        ];
    }

    /**
     * Detect gender for a first name using multiple local sources
     * @param {string} firstName - First name to analyze
     * @returns {object} - {gender: 'male'|'female'|'unknown', confidence: number, source: string}
     */
    async detectGender(firstName) {
        if (!firstName) {
            return { gender: 'unknown', confidence: 0, source: 'invalid_input' };
        }

        const name = firstName.toLowerCase().trim();
        
        // First check cache
        const cacheKey = `gender_${name}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            return { ...cached, source: 'cache' };
        }

        // Try multiple local detection methods
        let bestResult = { gender: 'unknown', confidence: 0, source: 'none' };

        // Method 1: gender-detection-from-name (supports multiple languages)
        const method1Result = this.tryGenderDetectionFromName(name);
        if (method1Result.confidence > bestResult.confidence) {
            bestResult = method1Result;
        }

        // Method 2: gender-guess (US Social Security data)
        const method2Result = this.tryGenderGuess(name);
        if (method2Result.confidence > bestResult.confidence) {
            bestResult = method2Result;
        }

        // Method 3: Basic heuristics as final fallback
        if (bestResult.confidence < 0.5) {
            const heuristicResult = this.getHeuristicGender(name);
            if (heuristicResult.confidence > bestResult.confidence) {
                bestResult = { ...heuristicResult, source: 'heuristic' };
            }
        }

        // Cache the result
        await cacheService.set(cacheKey, bestResult);
        
        return bestResult;
    }

    /**
     * Try gender-detection-from-name library
     * @param {string} name - First name to check
     * @returns {object} - Detection result
     */
    tryGenderDetectionFromName(name) {
        try {
            // Try with English context first
            const resultEN = getGender(name, 'en');
            
            if (resultEN && resultEN !== 'unknown') {
                return {
                    gender: resultEN,
                    confidence: 0.85, // High confidence for this library
                    source: 'gender_detection_en'
                };
            }

            // Try without language context (all languages)
            const resultAll = getGender(name);
            
            if (resultAll && resultAll !== 'unknown') {
                return {
                    gender: resultAll,
                    confidence: 0.80, // Slightly lower confidence for mixed languages
                    source: 'gender_detection_all'
                };
            }
        } catch (error) {
            console.warn('Gender detection from name error:', error.message);
        }

        return { gender: 'unknown', confidence: 0, source: 'gender_detection_error' };
    }

    /**
     * Try gender-guess library (US data)
     * @param {string} name - First name to check
     * @returns {object} - Detection result
     */
    tryGenderGuess(name) {
        try {
            const result = genderGuess.guess(name);
            
            if (result && result.gender && result.confidence !== null) {
                // Convert M/F to male/female and confidence to 0-1 scale
                const gender = result.gender === 'M' ? 'male' : 
                             result.gender === 'F' ? 'female' : 'unknown';
                
                return {
                    gender: gender,
                    confidence: result.confidence || 0.5,
                    source: 'gender_guess_us'
                };
            }
        } catch (error) {
            console.warn('Gender guess error:', error.message);
        }

        return { gender: 'unknown', confidence: 0, source: 'gender_guess_error' };
    }

    /**
     * Use basic heuristics for gender detection (fallback)
     * @param {string} name - First name to check
     * @returns {object} - Detection result
     */
    getHeuristicGender(name) {
        const heuristic = isLikelyFemaleName(name);
        
        return {
            gender: heuristic.isLikelyFemale ? 'female' : 'male',
            confidence: heuristic.confidence * 0.3, // Lower confidence for heuristics
            source: 'heuristic'
        };
    }

    /**
     * Bulk gender detection for multiple names (much faster now!)
     * @param {string[]} names - Array of first names
     * @returns {object[]} - Array of detection results
     */
    async detectGenderBulk(names) {
        const results = [];
        
        // No need for delays - everything is local!
        for (const name of names) {
            const result = await this.detectGender(name);
            results.push({ name, ...result });
        }
        
        return results;
    }

    /**
     * Get service usage statistics
     * @returns {object} - Usage statistics
     */
    getUsageStats() {
        return {
            detectionMethods: this.detectionMethods,
            rateLimits: 'None - all local processing!',
            libraries: {
                'gender-detection-from-name': 'Multi-language support, 40k+ records',
                'gender-guess': 'US Social Security data 1930-2013',
                'heuristic': 'Basic name pattern analysis'
            },
            advantages: [
                'No rate limits',
                'Offline processing', 
                'Fast bulk operations',
                'No external dependencies',
                'Privacy-friendly'
            ]
        };
    }

    /**
     * Test all detection methods with a sample name
     * @param {string} testName - Name to test with all methods
     * @returns {object} - Comparison of all methods
     */
    async testAllMethods(testName) {
        const name = testName.toLowerCase().trim();
        
        return {
            input: testName,
            method1_gender_detection: this.tryGenderDetectionFromName(name),
            method2_gender_guess: this.tryGenderGuess(name),
            method3_heuristic: this.getHeuristicGender(name),
            final_result: await this.detectGender(name)
        };
    }
}

// Export singleton instance
module.exports = new GenderDetectionService();