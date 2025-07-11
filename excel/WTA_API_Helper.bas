' WTA Tennis API - Excel VBA Helper Functions
' This module provides Excel VBA functions to interact with the Tennis API
' for automated WTA player detection and match classification
'
' Usage Examples:
' =CheckWTAPlayer("Serena Williams")
' =ClassifyMatch("Serena Williams", "Maria Sharapova")
' Call ProcessWTADataBulk()

Option Explicit

' Configuration - Update these URLs to match your Tennis API deployment
Private Const API_BASE_URL As String = "http://localhost:3000/api/wta"

' Individual Player Check Function
' Usage: =CheckWTAPlayer("Player Name")
Public Function CheckWTAPlayer(playerName As String) As String
    Dim result As String
    result = MakeAPICall(API_BASE_URL & "/check-player", "{""playerName"":""" & playerName & """}")
    
    If result <> "" Then
        Dim isWTA As Boolean
        isWTA = ExtractBooleanFromJSON(result, "isWTA")
        
        If isWTA Then
            CheckWTAPlayer = "WTA"
        Else
            CheckWTAPlayer = ""
        End If
    Else
        CheckWTAPlayer = "ERROR"
    End If
End Function

' Match Classification Function
' Usage: =ClassifyMatch("Home Player", "Away Player")
Public Function ClassifyMatch(homePlayer As String, awayPlayer As String) As String
    Dim jsonData As String
    jsonData = "{""homePlayer"":""" & homePlayer & """,""awayPlayer"":""" & awayPlayer & """}"
    
    Dim result As String
    result = MakeAPICall(API_BASE_URL & "/classify-match", jsonData)
    
    If result <> "" Then
        Dim isWTA As Boolean
        isWTA = ExtractBooleanFromJSON(result, "isWTA")
        
        If isWTA Then
            ClassifyMatch = "WTA"
        Else
            ClassifyMatch = ""
        End If
    Else
        ClassifyMatch = "ERROR"
    End If
End Function

' Bulk Process WTA Data - Updates the active worksheet
' Call this subroutine to process all data in the current sheet
Public Sub ProcessWTADataBulk()
    Dim ws As Worksheet
    Set ws = ActiveSheet
    
    ' Find the last row with data
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    
    If lastRow < 2 Then
        MsgBox "No data found. Please ensure data starts in row 2."
        Exit Sub
    End If
    
    ' Find column indices (assuming headers in row 1)
    Dim homeCol As Long, awayCol As Long, wtaCol As Long
    homeCol = FindColumn(ws, "homeopponent")
    awayCol = FindColumn(ws, "awayopponent")
    wtaCol = FindColumn(ws, "WTA?")
    
    If homeCol = 0 Or awayCol = 0 Then
        MsgBox "Could not find 'homeopponent' and 'awayopponent' columns."
        Exit Sub
    End If
    
    If wtaCol = 0 Then
        ' Create WTA column if it doesn't exist
        wtaCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column + 1
        ws.Cells(1, wtaCol).Value = "WTA?"
    End If
    
    ' Process in batches of 50
    Dim batchSize As Long
    batchSize = 50
    
    Dim currentRow As Long
    currentRow = 2
    
    Do While currentRow <= lastRow
        Dim batchEnd As Long
        batchEnd = Application.Min(currentRow + batchSize - 1, lastRow)
        
        ' Prepare batch data
        Dim jsonData As String
        jsonData = "{ ""data"": ["
        
        Dim i As Long
        For i = currentRow To batchEnd
            If i > currentRow Then jsonData = jsonData & ","
            
            Dim homePlayer As String, awayPlayer As String
            homePlayer = CleanString(ws.Cells(i, homeCol).Value)
            awayPlayer = CleanString(ws.Cells(i, awayCol).Value)
            
            jsonData = jsonData & "{""homeopponent"":""" & homePlayer & """,""awayopponent"":""" & awayPlayer & """}"
        Next i
        
        jsonData = jsonData & "]}"
        
        ' Make API call
        Dim result As String
        result = MakeAPICall(API_BASE_URL & "/process-excel-data", jsonData)
        
        If result <> "" Then
            ' Parse and update results
            UpdateResultsFromJSON ws, result, currentRow, wtaCol
        Else
            ' Mark as error
            For i = currentRow To batchEnd
                ws.Cells(i, wtaCol).Value = "ERROR"
            Next i
        End If
        
        currentRow = batchEnd + 1
        
        ' Show progress
        Application.StatusBar = "Processing WTA data... " & Format((currentRow - 2) / (lastRow - 1), "0%")
        DoEvents
    Loop
    
    Application.StatusBar = "WTA data processing complete!"
    MsgBox "WTA data processing complete! Processed " & (lastRow - 1) & " rows."
End Sub

' Helper function to make HTTP API calls
Private Function MakeAPICall(url As String, jsonData As String) As String
    On Error GoTo ErrorHandler
    
    Dim http As Object
    Set http = CreateObject("MSXML2.XMLHTTP")
    
    http.Open "POST", url, False
    http.setRequestHeader "Content-Type", "application/json"
    http.send jsonData
    
    If http.status = 200 Then
        MakeAPICall = http.responseText
    Else
        MakeAPICall = ""
    End If
    
    Exit Function
    
ErrorHandler:
    MakeAPICall = ""
End Function

' Helper function to find column by header name
Private Function FindColumn(ws As Worksheet, headerName As String) As Long
    Dim lastCol As Long
    lastCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
    
    Dim i As Long
    For i = 1 To lastCol
        If LCase(Trim(ws.Cells(1, i).Value)) = LCase(headerName) Then
            FindColumn = i
            Exit Function
        End If
    Next i
    
    FindColumn = 0
End Function

' Helper function to clean strings for JSON
Private Function CleanString(inputStr As Variant) As String
    If IsNull(inputStr) Or IsEmpty(inputStr) Then
        CleanString = ""
        Exit Function
    End If
    
    Dim cleanStr As String
    cleanStr = CStr(inputStr)
    
    ' Remove problematic characters for JSON
    cleanStr = Replace(cleanStr, """", "")
    cleanStr = Replace(cleanStr, vbCrLf, " ")
    cleanStr = Replace(cleanStr, vbCr, " ")
    cleanStr = Replace(cleanStr, vbLf, " ")
    cleanStr = Trim(cleanStr)
    
    CleanString = cleanStr
End Function

' Helper function to extract boolean values from JSON response
Private Function ExtractBooleanFromJSON(jsonStr As String, fieldName As String) As Boolean
    Dim searchStr As String
    searchStr = """" & fieldName & """:true"
    
    If InStr(1, jsonStr, searchStr, vbTextCompare) > 0 Then
        ExtractBooleanFromJSON = True
    Else
        ExtractBooleanFromJSON = False
    End If
End Function

' Helper function to update Excel cells from JSON response
Private Sub UpdateResultsFromJSON(ws As Worksheet, jsonResult As String, startRow As Long, wtaCol As Long)
    On Error GoTo ErrorHandler
    
    ' Simple JSON parsing for processedData array
    ' This is a basic implementation - for complex JSON, consider using a JSON library
    
    Dim dataStart As Long, dataEnd As Long
    dataStart = InStr(jsonResult, """processedData"":[")
    
    If dataStart > 0 Then
        dataStart = dataStart + Len("""processedData"":[")
        dataEnd = InStr(dataStart, jsonResult, "]")
        
        If dataEnd > dataStart Then
            Dim dataSection As String
            dataSection = Mid(jsonResult, dataStart, dataEnd - dataStart)
            
            ' Split by objects (simple approach)
            Dim objects() As String
            objects = Split(dataSection, "},{")
            
            Dim i As Long
            For i = 0 To UBound(objects)
                Dim objStr As String
                objStr = objects(i)
                
                ' Extract wtaStatus
                Dim wtaStatus As String
                wtaStatus = ExtractStringFromJSON(objStr, "wtaStatus")
                
                ws.Cells(startRow + i, wtaCol).Value = wtaStatus
            Next i
        End If
    End If
    
    Exit Sub
    
ErrorHandler:
    ' If JSON parsing fails, mark as error
    Dim rowCount As Long
    rowCount = 1 ' Default to 1 row
    
    Dim j As Long
    For j = 0 To rowCount - 1
        ws.Cells(startRow + j, wtaCol).Value = "ERROR"
    Next j
End Sub

' Helper function to extract string values from JSON
Private Function ExtractStringFromJSON(jsonStr As String, fieldName As String) As String
    Dim searchStr As String
    searchStr = """" & fieldName & """:"""
    
    Dim startPos As Long
    startPos = InStr(1, jsonStr, searchStr, vbTextCompare)
    
    If startPos > 0 Then
        startPos = startPos + Len(searchStr)
        Dim endPos As Long
        endPos = InStr(startPos, jsonStr, """")
        
        If endPos > startPos Then
            ExtractStringFromJSON = Mid(jsonStr, startPos, endPos - startPos)
        End If
    End If
End Function

' Test function to verify API connectivity
Public Sub TestAPIConnection()
    Dim testResult As String
    testResult = MakeAPICall(API_BASE_URL & "/check-player", "{""playerName"":""Serena Williams""}")
    
    If testResult <> "" Then
        MsgBox "API connection successful!" & vbCrLf & "Response: " & Left(testResult, 100) & "..."
    Else
        MsgBox "API connection failed. Please check:" & vbCrLf & _
               "1. Tennis API server is running" & vbCrLf & _
               "2. API_BASE_URL is correct: " & API_BASE_URL
    End If
End Sub

' Advanced function to process specific ranges
Public Sub ProcessWTADataRange(Optional targetRange As Range = Nothing)
    If targetRange Is Nothing Then
        Set targetRange = Selection
    End If
    
    ' Implementation for processing specific ranges
    ' This can be extended based on specific needs
    MsgBox "Range processing feature - to be implemented based on specific requirements"
End Sub
