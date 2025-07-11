# WTA Match Classification API - Enhanced Documentation

## Overview

The Tennis API now includes advanced WTA (Women's Tennis Association) match classification capabilities that can automatically determine if tennis matches should be marked as WTA based on player gender detection and specific match type rules.

## Classification Rules

### Singles Matches
- **Rule**: If one player is WTA → status is WTA
- **Examples**:
  - `Male vs Male` → Non-WTA
  - `Female vs Female` → WTA
  - `Male vs Female` → WTA (if female is detected as WTA-eligible)

### Doubles Matches
- **Rule**: If both players are women and one is WTA → status is WTA
- **Examples**:
  - `Male,Male vs Male,Male` → Non-WTA
  - `Female,Female vs Female,Female` → WTA (if any female is WTA-eligible)

### Mixed Doubles
- **Rule**: If both female players are WTA → status is WTA
- **Examples**:
  - `Male,Female vs Male,Female` → WTA (if both females are WTA-eligible)
  - `Female,Male vs Male,Female` → WTA (if both females are WTA-eligible)

## API Endpoints

### 1. Classify Single Match

**Endpoint**: `POST /api/wta/classify-match`

**Request Body**:
```json
{
  "homePlayer": "Serena Williams",
  "awayPlayer": "Maria Sharapova"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "isWTA": true,
    "confidence": 0.95,
    "reason": "Singles match with 2 WTA player(s)",
    "matchType": "singles",
    "playerCount": 2,
    "femalePlayerCount": 2,
    "players": [
      {
        "name": "Serena Williams",
        "isWTA": true,
        "confidence": 0.99,
        "reason": "Found in official WTA player list"
      },
      {
        "name": "Maria Sharapova",
        "isWTA": true,
        "confidence": 0.98,
        "reason": "Gender detection: female (official_wta)"
      }
    ]
  }
}
```

### 2. Bulk Classify Matches

**Endpoint**: `POST /api/wta/classify-matches-bulk`

**Request Body**:
```json
{
  "matches": [
    {
      "homePlayer": "Serena Williams",
      "awayPlayer": "Maria Sharapova"
    },
    {
      "homePlayer": "Rafael Nadal,Roger Federer",
      "awayPlayer": "Novak Djokovic,Andy Murray"
    }
  ]
}
```

### 3. Process Excel Data

**Endpoint**: `POST /api/wta/process-excel-data`

This endpoint is specifically designed for Excel VBA integration and processes data in the format exported from Excel.

**Request Body**:
```json
{
  "data": [
    {
      "homeopponent": "Yuriko Miyazaki",
      "awayopponent": "Celine Naef",
      "myevent": "Yuriko Miyazaki vs Celine Naef",
      "tournament": "Birmingham"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "processedData": [
      {
        "homeopponent": "Yuriko Miyazaki",
        "awayopponent": "Celine Naef",
        "myevent": "Yuriko Miyazaki vs Celine Naef",
        "tournament": "Birmingham",
        "wtaStatus": "WTA",
        "wtaConfidence": 0.89,
        "wtaReason": "Singles match with 2 WTA player(s)",
        "matchType": "singles",
        "femalePlayerCount": 2
      }
    ],
    "summary": {
      "totalProcessed": 1,
      "wtaMatches": 1,
      "nonWtaMatches": 0,
      "singles": 1,
      "doubles": 0,
      "mixedDoubles": 0,
      "errors": 0
    }
  }
}
```

## Excel VBA Integration

### Setup

1. Import the VBA module `excel/WTA_API_Helper.bas` into your Excel workbook
2. Update the `API_BASE_URL` constant to match your Tennis API server URL
3. Ensure your Excel data has columns named `homeopponent` and `awayopponent`

### Usage

#### Individual Functions
```vba
' Check single player
=CheckWTAPlayer("Serena Williams")

' Classify single match
=ClassifyMatch("Serena Williams", "Maria Sharapova")
```

#### Bulk Processing
```vba
' Process all data in the current worksheet
Call ProcessWTADataBulk()

' Test API connection
Call TestAPIConnection()
```

### Data Format Requirements

Your Excel worksheet should have the following columns:
- `homeopponent`: Home player or team (use comma separation for doubles)
- `awayopponent`: Away player or team (use comma separation for doubles)
- `WTA?`: Target column for WTA status (will be created if it doesn't exist)

### Example Data

| homeopponent | awayopponent | myevent | tournament | WTA? |
|--------------|--------------|---------|------------|------|
| Yuriko Miyazaki | Celine Naef | Yuriko Miyazaki vs Celine Naef | Birmingham | WTA |
| Rafael Nadal | Novak Djokovic | Rafael Nadal vs Novak Djokovic | French Open | |
| Serena Williams,Venus Williams | Maria Sharapova,Caroline Wozniacki | Doubles Match | Wimbledon | WTA |

## Player Name Formats

The API supports various player name formats for doubles and mixed doubles:

### Singles
- `"Player Name"`
- Example: `"Serena Williams"`

### Doubles
- `"Player1,Player2"`
- Example: `"Serena Williams,Venus Williams"`

### Mixed Doubles
- `"MalePlayer,FemalePlayer"` or `"FemalePlayer,MalePlayer"`
- Example: `"Rafael Nadal,Serena Williams"`

## Gender Detection

The system uses multiple methods for gender detection:

1. **Official WTA Player List**: Primary source from WTA website
2. **Gender Detection APIs**: Secondary source using external services
3. **Local Name Database**: Offline gender detection for common names
4. **Manual Overrides**: Admin-configurable player status

## Performance & Caching

### Caching Strategy
- Player results are cached for 24 hours
- Official WTA player list is updated daily
- Cache keys are normalized (lowercase, trimmed)

### Rate Limiting
- Bulk operations are processed in batches to avoid overwhelming external APIs
- Built-in delays between API calls to respect rate limits
- Fallback mechanisms for API failures

### Performance Benchmarks
- Single player check: ~100-500ms (depending on cache hit)
- Bulk processing: ~200ms per match (average)
- Excel data processing: Handles 100+ records efficiently

## Error Handling

### Common Error Responses

```json
{
  "success": false,
  "error": "Both homePlayer and awayPlayer are required"
}
```

### Error Codes in Excel VBA
- `"WTA"`: Player/match is WTA-eligible
- `""` (empty): Player/match is not WTA-eligible
- `"ERROR"`: API call failed or parsing error

### Troubleshooting

1. **API Connection Issues**
   - Verify Tennis API server is running
   - Check `API_BASE_URL` in VBA code
   - Test with `TestAPIConnection()` function

2. **Player Detection Issues**
   - Check player name spelling
   - Verify column names in Excel (`homeopponent`, `awayopponent`)
   - Review gender detection confidence scores

3. **Performance Issues**
   - Use bulk processing for large datasets
   - Check internet connection for external API calls
   - Monitor cache statistics

## Testing

### Run Automated Tests
```bash
# Navigate to Tennis API directory
cd C:\ws\work\Tennis-API

# Run classification tests
node tests/wta-classification-tests.js
```

### Test Cases Covered
- Men's singles (should be Non-WTA)
- Women's singles (should be WTA)
- Men's doubles (should be Non-WTA)
- Women's doubles (should be WTA)
- Mixed doubles with all females WTA (should be WTA)
- Mixed doubles with partial WTA (should be Non-WTA)

## API Statistics

### Get Service Statistics
**Endpoint**: `GET /api/wta/classifier-stats`

**Response**:
```json
{
  "success": true,
  "data": {
    "totalClassified": 150,
    "singles": 100,
    "doubles": 30,
    "mixedDoubles": 20,
    "wtaMatches": 75,
    "errors": 0,
    "wtaPercentage": "50.0"
  }
}
```

## Configuration

### Environment Variables
```env
# API Configuration
PORT=3000
NODE_ENV=production

# Gender Detection APIs (optional)
GENDER_API_KEY=your_gender_api_key
GENDERIZE_API_KEY=your_genderize_key
```

### Manual Overrides
Use the override endpoint to manually set player status:

**Endpoint**: `POST /api/wta/override-player`

```json
{
  "playerName": "Custom Player",
  "isWTA": true,
  "reason": "Manual verification"
}
```

## Best Practices

### For Excel Users
1. Always test with small data sets first
2. Keep player names consistent and properly spelled
3. Use the bulk processing function for large datasets
4. Backup your Excel file before running bulk operations

### For API Users
1. Use bulk endpoints for multiple matches
2. Implement proper error handling
3. Cache results when possible
4. Monitor API rate limits

### Data Quality
1. Ensure consistent player name formatting
2. Handle special characters in names properly
3. Verify data before bulk processing
4. Regular validation of WTA classifications

## Deployment

### Local Development
```bash
# Install dependencies
npm install

# Start the server
npm start

# Server will run on http://localhost:3000
```

### Production Deployment
1. Configure environment variables
2. Set up proper logging and monitoring
3. Implement rate limiting
4. Configure HTTPS
5. Set up automated backups for cache data

## Support & Maintenance

### Regular Maintenance Tasks
1. Update official WTA player list (automatic daily)
2. Review and update gender detection accuracy
3. Monitor API performance and error rates
4. Backup cache and override data

### Monitoring
- Check API response times
- Monitor external API usage
- Track classification accuracy
- Review error logs

## Changelog

### Version 2.0 (Current)
- Added advanced match classification with Singles/Doubles/Mixed rules
- Enhanced Excel VBA integration
- Improved bulk processing performance
- Added comprehensive test suite
- Better error handling and statistics

### Version 1.0
- Basic WTA player detection
- Simple gender detection
- Cache implementation
- Initial Excel integration

## Contact & Support

For technical support or feature requests, please refer to the project documentation or contact the development team.

---

*This documentation covers the enhanced WTA Match Classification API. For basic Tennis API functionality, refer to the main API documentation.*
