# Tennis API - WTA Player Detection Project

## Project Overview
This project extends the existing Tennis API to automatically detect and classify WTA (Women's Tennis Association) players in tennis match data. The system will analyze player names to determine if they are female tennis players and should be marked as WTA participants.

## Architecture & Goals

### Current Structure
- **Express.js API** with existing ATP and WTA routes
- **Web scraping** capabilities using Cheerio and Axios
- **Swagger documentation** for API endpoints
- **Excel integration** for WTA match analysis

### New Features to Implement
1. **WTA Player Detection API Endpoint**
   - `/api/wta/check-player` - Check if a player is WTA-eligible
   - `/api/wta/check-match` - Check if a match involves WTA players
   - `/api/wta/bulk-check` - Bulk check multiple players/matches

2. **Gender Detection Service**
   - Online gender detection using multiple APIs/sources
   - Caching mechanism for known players
   - Fallback strategies for unknown players

3. **Excel Integration Helper**
   - VBA/Excel-compatible endpoints
   - Simple HTTP calls for Excel automation

## Technical Approach

### Player Detection Strategy
1. **Primary**: Check against official WTA player database/rankings
2. **Secondary**: Use name-based gender detection APIs
3. **Tertiary**: Manual verification and caching

### Data Sources
- WTA official website player lists
- Gender detection APIs (Gender-API, Genderize.io, etc.)
- Local cache of verified players

### File Structure
```
Tennis-API/
├── routes/
│   ├── WTA.js (existing - to be extended)
│   └── gender-detection.js (new)
├── services/
│   ├── wta-player-service.js
│   ├── gender-detection-service.js
│   └── cache-service.js
├── data/
│   └── wta-players-cache.json
├── utils/
│   └── name-utils.js
└── tests/
    └── wta-detection.test.js
```

## Style Guidelines
- Use ES6+ syntax where possible
- Consistent error handling with try-catch blocks
- RESTful API design principles
- Comprehensive logging for debugging
- Rate limiting for external API calls

## Constraints
- Must not break existing functionality
- Should handle rate limits gracefully
- Must cache results to minimize API calls
- Excel integration should be simple HTTP calls
- Error responses should be informative but not expose internal details

## Integration Points
- Existing WTA routes in `/routes/WTA.js`
- Swagger documentation updates
- Excel VBA compatibility for HTTP requests