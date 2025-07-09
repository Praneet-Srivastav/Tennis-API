# Tennis API
An API that scrapes the ATP and WTA websites to generate statistics for the respective tennis association. Written with
Node.js and uses express, axios, and cheerio.js.

## Current Routes
ATP Rankings:
- /atp/rankings/singles (Singles rankings for ATP players)
- /atp/rankings/race-to-london (Rankings race for ATP Finals in London)
- /atp/rankings/race-to-milan (Rankings race for Next Generation ATP Finals in London)
-/atp/rankings/doubles (Doubles rankings for ATP players)

WTA Rankings:

WTA Players
- /wta/players/index (WTA player index)### **NEW: WTA Player Detection:**
- `POST /api/wta/check-player` - Check if a single player is WTA-eligible
- `POST /api/wta/check-match` - Check if a match involves WTA players
- `POST /api/wta/bulk-check-players` - Bulk check multiple players (up to 50)
- `POST /api/wta/bulk-check-matches` - Bulk check multiple matches (up to 25)
- `GET /api/wta/stats` - Get detection service statistics
- `POST /api/wta/cache/clear` - Clear the player cache
- `POST /api/wta/override-player` - Manual override for player status

## Excel Integration

### For Excel Users:
The API includes special Excel integration features to automatically mark WTA players in your spreadsheets:

1. **VBA Functions**: Copy the provided VBA code to use Excel functions like `=CheckWTAPlayer("Player Name")`
2. **Bulk Processing**: Process entire columns of match data automatically
3. **Simple Setup**: Just ensure the API is running and use the provided functions

See `EXCEL_INTEGRATION.md` for detailed setup instructions.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
node app.js
```
The API will be available at `http://localhost:8000`

### 3. View API Documentation
Open `http://localhost:8000/api-docs` to see the Swagger documentation

### 4. Test WTA Detection
```bash
# Check a single player
curl -X POST http://localhost:8000/api/wta/check-player \
  -H "Content-Type: application/json" \
  -d '{"playerName": "Serena Williams"}'

# Check a match
curl -X POST http://localhost:8000/api/wta/check-match \
  -H "Content-Type: application/json" \
  -d '{"homePlayer": "Serena Williams", "awayPlayer": "Venus Williams"}'
```

## API Response Examples

### Single Player Check:
```json
{
  "success": true,
  "data": {
    "isWTA": true,
    "confidence": 0.95,
    "reason": "Found in official WTA player list",
    "details": {
      "input": "Serena Williams",
      "parsed": {
        "firstName": "serena",
        "lastName": "williams",
        "fullName": "serena williams"
      },
      "source": "official_wta"
    }
  }
}
```

### Match Check:
```json
{
  "success": true,
  "data": {
    "isWTAMatch": true,
    "confidence": 0.92,
    "reason": "Both players are WTA-eligible",
    "players": {
      "home": {
        "isWTA": true,
        "confidence": 0.95,
        "reason": "Found in official WTA player list"
      },
      "away": {
        "isWTA": true,
        "confidence": 0.89,
        "reason": "Gender detection: female (genderize)"
      }
    }
  }
}
```

## Configuration

### Environment Variables:
- `GENDER_API_KEY` - Optional API key for Gender-API.com (improves accuracy)
- `PORT` - Server port (default: 8000)

### Rate Limits:
- Genderize.io: 1000 requests/day (free tier)
- Gender-API.com: 500 requests/month (free tier)
- Results are cached to minimize API usage

## Architecture

```
Tennis-API/
├── services/
│   ├── wta-player-service.js    # Main WTA detection logic
│   ├── gender-detection-service.js # Gender detection APIs
│   └── cache-service.js         # Caching system
├── utils/
│   └── name-utils.js           # Name processing utilities
├── data/
│   └── wta-players-cache.json  # Cached player data
├── routes/
│   ├── WTA.js                  # WTA endpoints (extended)
│   └── ATP.js                  # ATP endpoints
└── excel-vba-helper.vbs        # Excel VBA integration
```

## Performance Features

- **Intelligent Caching**: Results cached for 24 hours
- **Rate Limit Management**: Automatic fallbacks when API limits reached
- **Batch Processing**: Efficient bulk operations for large datasets
- **Multiple Detection Sources**: Fallback hierarchy for maximum accuracy

## Excel Workflow Example

1. **Prepare your Excel file** with player names in columns F and G
2. **Install the VBA helper** (copy code from `excel-vba-helper.vbs`)
3. **Run bulk processing**:
   ```vba
   Sub ProcessMyData()
       Call BulkCheckWTAPlayers(Range("F2:F1000"), Range("G2:G1000"), Range("M2:M1000"))
   End Sub
   ```
4. **Column M will be populated** with "WTA" for valid WTA matches

## Troubleshooting

### Common Issues:
- **API not responding**: Ensure server is running on port 8000
- **Low confidence scores**: Some players may not be in official databases
- **Rate limit errors**: Use bulk endpoints for large datasets
- **Excel VBA errors**: Enable "Trust access to VBA project model" in Excel settings

### Getting Help:
- Check the Swagger docs at `/api-docs`
- Review the Excel integration guide
- Examine the service statistics at `/api/wta/stats`

## Future Enhancements

- Additional gender detection services
- Machine learning model for tennis player classification
- Real-time WTA ranking updates
- Enhanced Excel add-in with GUI
- Support for other tennis organizations (ITF, etc.)
