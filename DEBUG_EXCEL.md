# Debugging CheckWTAMatch Function

## Issue Analysis
The `=CheckWTAMatch(F44, G44)` is returning empty. This could be due to:

1. **API returning non-WTA match** (correct behavior)
2. **VBA parsing error** 
3. **API connection issue**
4. **Invalid player names in F44/G44**

## Quick Debug Steps

### Step 1: Test the API Directly
Run this in your Git Bash to test the API with sample data:

```bash
# Test a WTA match (should return "WTA")
curl -X POST http://localhost:7070/api/wta/check-match \
  -H "Content-Type: application/json" \
  -d '{"homePlayer": "Serena Williams", "awayPlayer": "Venus Williams"}'

# Test a non-WTA match (should return non-WTA)
curl -X POST http://localhost:7070/api/wta/check-match \
  -H "Content-Type: application/json" \
  -d '{"homePlayer": "Rafael Nadal", "awayPlayer": "Novak Djokovic"}'

# Test a mixed match (should return non-WTA)
curl -X POST http://localhost:7070/api/wta/check-match \
  -H "Content-Type: application/json" \
  -d '{"homePlayer": "Serena Williams", "awayPlayer": "Rafael Nadal"}'
```

### Step 2: Check Your Excel Data
What are the actual values in cells F44 and G44? The VBA function needs:
- Valid player names (not empty)
- Proper formatting (First Last name format)

### Step 3: Enhanced VBA Debug Function
Add this debug function to your VBA module:

```vba
Function CheckWTAMatchDebug(homePlayer As String, awayPlayer As String) As String
    Dim http As Object
    Dim url As String
    Dim jsonBody As String
    Dim response As String
    
    ' Input validation
    If Len(Trim(homePlayer)) = 0 Or Len(Trim(awayPlayer)) = 0 Then
        CheckWTAMatchDebug = "EMPTY_INPUT"
        Exit Function
    End If
    
    ' Create HTTP object
    Set http = CreateObject("MSXML2.XMLHTTP")
    
    ' Prepare request
    url = "http://localhost:7070/api/wta/check-match"
    jsonBody = "{""homePlayer"": """ & Replace(homePlayer, """", "\""") & """, ""awayPlayer"": """ & Replace(awayPlayer, """", "\""") & """}"
    
    ' Make HTTP request
    On Error GoTo ErrorHandler
    http.Open "POST", url, False
    http.setRequestHeader "Content-Type", "application/json"
    http.send jsonBody
    
    ' Debug: Return the full response for analysis
    If http.Status = 200 Then
        CheckWTAMatchDebug = "STATUS_200: " & Left(http.responseText, 200)
    Else
        CheckWTAMatchDebug = "HTTP_ERROR: " & http.Status
    End If
    
    Exit Function
    
ErrorHandler:
    CheckWTAMatchDebug = "VBA_ERROR: " & Err.Description
End Function
```

### Step 4: Test in Excel
Try this in a cell: `=CheckWTAMatchDebug(F44, G44)`

This will show you exactly what's happening.

## Expected Behaviors

### For WTA Match (both female players):
- API Response: `{"success":true,"data":{"isWTAMatch":true,...}}`
- Excel Result: "WTA"

### For Non-WTA Match (male players or mixed):
- API Response: `{"success":true,"data":{"isWTAMatch":false,...}}`
- Excel Result: "" (empty - this is correct!)

### For Error:
- Excel Result: "ERROR"

## Most Likely Cause
If F44 and G44 contain male player names (like "Rafael Nadal" vs "Novak Djokovic"), then an empty result is **CORRECT** because it's not a WTA match.

**The function is working as designed** - it only returns "WTA" for matches between two female players.
