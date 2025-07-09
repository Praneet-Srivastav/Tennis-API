# Excel Integration Guide for WTA Player Detection

## Overview
This guide shows how to integrate the Tennis API's WTA player detection with Microsoft Excel to automatically identify WTA players in your tennis match data.

## Prerequisites
- Tennis API running on `http://localhost:8000`
- Excel with VBA support
- Internet connection for API calls

## Method 1: Simple HTTP Calls in Excel

### Step 1: Enable Developer Tab
1. Go to File → Options → Customize Ribbon
2. Check "Developer" in the right panel
3. Click OK

### Step 2: Add VBA Module
1. Press `Alt + F11` to open VBA Editor
2. Insert → Module
3. Copy and paste the VBA code from `excel-vba-helper.vbs`

### Step 3: Use the Functions
In your Excel sheet, you can now use these functions:

```excel
=CheckWTAPlayer("Serena Williams")
=CheckWTAMatch("Serena Williams", "Venus Williams")
```

## Method 2: Bulk Processing

### For Large Datasets:
1. Prepare your data with player names in columns F and G
2. Use the bulk processing VBA macro
3. Results will be written to column M

## API Endpoints

### Single Player Check
- **URL**: `POST /api/wta/check-player`
- **Body**: `{"playerName": "Player Name"}`
- **Response**: `{"success": true, "data": {"isWTA": true, "confidence": 0.95}}`

### Match Check
- **URL**: `POST /api/wta/check-match`
- **Body**: `{"homePlayer": "Player 1", "awayPlayer": "Player 2"}`

### Bulk Player Check
- **URL**: `POST /api/wta/bulk-check-players`
- **Body**: `{"players": ["Player 1", "Player 2", ...]}`

## Error Handling
- If API is unavailable, functions return "ERROR"
- Check the Tennis API is running on port 8000
- Verify your internet connection

## Troubleshooting

### Common Issues:
1. **"Object required" error**: Enable Trust access to VBA project model
2. **HTTP request fails**: Check if API server is running
3. **Slow performance**: Use bulk functions for large datasets

### Performance Tips:
- Use bulk endpoints for processing more than 10 players
- Cache results to avoid repeated API calls
- Process in batches of 25-50 records at a time

## Excel Formula Examples

```excel
' Check if a player is WTA
=IF(CheckWTAPlayer(F2)="WTA", "WTA", "")

' Check both players in a match
=IF(CheckWTAMatch(F2,G2)="WTA", "WTA", "")

' Bulk process a range (use VBA macro)
Sub ProcessWTAColumn()
    Call BulkCheckWTAPlayers(Range("F2:F1000"), Range("G2:G1000"), Range("M2:M1000"))
End Sub
```