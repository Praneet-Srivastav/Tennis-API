# 🎾 Simple WTA Status Checker

## What This Does

This solution populates your Excel "WTA?" column with either "WTA" or empty string based on your exact rules:

### Rules Applied:
- **Singles** (Player vs Player): If one player is WTA → status is "WTA"
- **Doubles** (Female,Female vs Female,Female): If both are women and one is WTA → status is "WTA"  
- **Mixed Doubles** (Male,Female vs Male,Female): If both female players are WTA → status is "WTA"

## Quick Setup

### 1. Start Your Tennis API
```bash
cd C:\ws\work\Tennis-API
npm start
```

### 2. Test the API
```bash
# Test a simple WTA check
curl -X POST http://localhost:3000/api/wta/check-wta-status \
  -H "Content-Type: application/json" \
  -d "{\"homePlayer\":\"Serena Williams\",\"awayPlayer\":\"Maria Sharapova\"}"
```

Expected response:
```json
{"wtaStatus":"WTA"}
```

### 3. Excel Integration

1. **Import VBA Module**: Open Excel → Developer tab → Import → Select `excel/Simple_WTA_Helper.bas`

2. **Update API URL** (if needed): Edit the `API_BASE_URL` in the VBA code

3. **Process Your Data**:
   - Open your Excel file with tennis match data
   - Make sure you have columns: `homeopponent`, `awayopponent`
   - Run: `Alt+F11` → Run → `ProcessAllWTAData`

## Your Data Examples

| homeopponent | awayopponent | WTA? |
|--------------|--------------|------|
| Rafael Nadal | Novak Djokovic | (empty) |
| Serena Williams | Maria Sharapova | WTA |
| Serena Williams,Venus Williams | Maria Sharapova,Caroline Wozniacki | WTA |
| Rafael Nadal,Serena Williams | Novak Djokovic,Maria Sharapova | WTA |

## API Endpoints

### Simple WTA Check
```
POST /api/wta/check-wta-status
{
  "homePlayer": "Serena Williams",
  "awayPlayer": "Maria Sharapova"  
}
```
Returns: `{"wtaStatus": "WTA"}` or `{"wtaStatus": ""}`

### Excel Batch Processing
```
POST /api/wta/process-excel-simple
{
  "data": [
    {"homeopponent": "Serena Williams", "awayopponent": "Maria Sharapova"},
    {"homeopponent": "Rafael Nadal", "awayopponent": "Novak Djokovic"}
  ]
}
```

## Testing Your Setup

### Test the Classification Logic
```bash
cd C:\ws\work\Tennis-API
node tests/simple-wta-tests.js
```

### Test Excel VBA Connection
In Excel VBA Editor:
```vba
Call TestConnection()
```

## Files You Need

- `services/simple-wta-classifier.js` - Core logic
- `excel/Simple_WTA_Helper.bas` - Excel VBA functions
- API endpoints added to `routes/WTA.js`

## Troubleshooting

### API Not Working?
1. Check if Tennis API is running: `http://localhost:3000`
2. Verify VBA `API_BASE_URL` setting
3. Test connection with `TestConnection()` in VBA

### Wrong Results?
1. Check player name spelling
2. Verify comma separation for doubles: `"Player1,Player2"`
3. Make sure column names are exact: `homeopponent`, `awayopponent`

### Excel Issues?
1. Enable macros in Excel
2. Import the VBA module correctly
3. Check column headers match exactly

## Expected Results Based on Your Rules

- `"Male vs Male"` → `""` (empty)
- `"Female vs Female"` → `"WTA"`
- `"Male,Female vs Male,Female"` → `"WTA"` (if both females are WTA)
- `"Female,Female vs Female,Female"` → `"WTA"` (if any female is WTA)

That's it! Your Excel file will now automatically populate the WTA? column based on the player names and the rules you specified.
