/**
 * Name utility functions for tennis player processing
 * Handles name normalization, parsing, and standardization
 */

/**
 * Normalize a player name for consistent comparison
 * @param {string} name - Raw player name
 * @returns {string} - Normalized name
 */
function normalizeName(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }
    
    return name
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-']/g, '') // Remove special chars except hyphens and apostrophes
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

/**
 * Extract first name from full name
 * @param {string} fullName - Full player name
 * @returns {string} - First name
 */
function extractFirstName(fullName) {
    if (!fullName) return '';
    
    const normalized = normalizeName(fullName);
    const parts = normalized.split(' ');
    return parts[0] || '';
}

/**
 * Parse player name into components
 * @param {string} fullName - Full player name
 * @returns {object} - {firstName, lastName, fullName}
 */
function parsePlayerName(fullName) {
    if (!fullName) {
        return { firstName: '', lastName: '', fullName: '' };
    }
    
    const normalized = normalizeName(fullName);
    const parts = normalized.split(' ').filter(part => part.length > 0);
    
    if (parts.length === 0) {
        return { firstName: '', lastName: '', fullName: normalized };
    }
    
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    
    return {
        firstName,
        lastName,
        fullName: normalized
    };
}

/**
 * Check if name appears to be typically female
 * Basic heuristic check before using external APIs
 * @param {string} firstName - First name to check
 * @returns {object} - {isLikelyFemale: boolean, confidence: number}
 */
function isLikelyFemaleName(firstName) {
    if (!firstName) {
        return { isLikelyFemale: false, confidence: 0 };
    }
    
    const name = firstName.toLowerCase();
    
    // Common female endings
    const femaleEndings = ['a', 'ia', 'ina', 'etta', 'elle', 'ine', 'ique'];
    const maleEndings = ['o', 'us', 'er', 'on'];
    
    // Check endings
    let confidence = 0;
    
    for (const ending of femaleEndings) {
        if (name.endsWith(ending)) {
            confidence += 0.3;
            break;
        }
    }
    
    for (const ending of maleEndings) {
        if (name.endsWith(ending)) {
            confidence -= 0.3;
            break;
        }
    }
    
    // Length-based heuristics (very weak)
    if (name.length >= 5) {
        confidence += 0.1;
    }
    
    return {
        isLikelyFemale: confidence > 0,
        confidence: Math.max(0, Math.min(1, Math.abs(confidence)))
    };
}

/**
 * Validate player name format
 * @param {string} name - Player name to validate
 * @returns {boolean} - Whether name is valid
 */
function isValidPlayerName(name) {
    if (!name || typeof name !== 'string') {
        return false;
    }
    
    const trimmed = name.trim();
    
    // Must have at least one character
    if (trimmed.length === 0) {
        return false;
    }
    
    // Must have at least one space (first and last name)
    if (!trimmed.includes(' ')) {
        return false;
    }
    
    // Should not be too long (reasonable limit)
    if (trimmed.length > 100) {
        return false;
    }
    
    // Should contain mostly letters
    const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
    return letterCount >= trimmed.length * 0.7;
}

module.exports = {
    normalizeName,
    extractFirstName,
    parsePlayerName,
    isLikelyFemaleName,
    isValidPlayerName
};