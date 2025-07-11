' Simple WTA Status VBA Helper
' Populates the WTA? column based on player names
' Returns "WTA" or empty string based on the rules

Option Explicit

Private Const API_BASE_URL As String = "http://localhost:3000/api/wta"

' Simple function to check WTA status for a match
' Usage: =GetWTAStatus("Player1", "Player2") 
' Returns: "WTA" or ""
Public Function GetWTAStatus(homePlayer As String, awayPlayer As String) As String
    Dim jsonData As String
    jsonData = "{""homePlayer"":""" & CleanString(homePlayer) & """,""awayPlayer"":""" & CleanString(awayPlayer) & """}"
    
    Dim result As String
    result = MakeAPICall(API_BASE_URL & "/check-wta-status", jsonData)
    
    If result <> "" Then
        ' Extract wtaStatus from JSON response
        Dim wtaStatus As String
        wtaStatus = ExtractStringFromJSON(result, "wtaStatus")
        GetWTAStatus = wtaStatus
    Else
        GetWTAStatus = "ERROR"
    End If
End Function

' Process all WTA data in the current worksheet
Public Sub ProcessAllWTAData()
    Dim ws As Worksheet
    Set ws = ActiveSheet
    
    ' Find the last row with data
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    
    If lastRow < 2 Then
        MsgBox "No data found. Please ensure data starts in row 2."
        Exit Sub
    End If
    
    ' Find required columns
    Dim homeCol As Long, awayCol As Long, wtaCol As Long
    homeCol = FindColumn(ws, "homeopponent")
    awayCol = FindColumn(ws, "awayopponent") 
    wtaCol = FindColumn(ws, "WTA?")
    
    If homeCol = 0 Or awayCol = 0 Then
        MsgBox "Could not find 'homeopponent' and 'awayopponent' columns."
        Exit Sub
    End If
    
    If wtaCol = 0 Then
        ' Create WTA? column if it doesn't exist
        wtaCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column + 1
        ws.Cells(1, wtaCol).Value = "WTA?"
    End If
    
    ' Ask user for confirmation
    Dim response As VbMsgBoxResult
    response = MsgBox("Process " & (lastRow - 1) & " rows for WTA status?", vbYesNo + vbQuestion, "Confirm Processing")
    
    If response = vbNo Then Exit Sub
    
    ' Process in batches
    Dim batchSize As Long
    batchSize = 50
    
    Dim currentRow As Long
    currentRow = 2
    
    Do While currentRow <= lastRow
        Dim batchEnd As Long
        batchEnd = Application.Min(currentRow + batchSize - 1, lastRow)
        
        ' Prepare batch data for API call
        Dim jsonData As String
        jsonData = "{""data"":["
        
        Dim i As Long
        For i = currentRow To batchEnd
            If i > currentRow Then jsonData = jsonData & ","
            
            Dim homePlayer As String, awayPlayer As String
            homePlayer = CleanString(ws.Cells(i, homeCol).Value)
            awayPlayer = CleanString(ws.Cells(i, awayCol).Value)
            
            ' Include all original data
            jsonData = jsonData & "{""homeopponent"":""" & homePlayer & """,""awayopponent"":""" & awayPlayer & """"
            
            ' Add other columns if they exist
            Dim j As Long
            For j = 1 To ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
                If j <> homeCol And j <> awayCol And j <> wtaCol Then
                    Dim headerName As String
                    headerName = CleanString(ws.Cells(1, j).Value)
                    If headerName <> "" Then
                        Dim cellValue As String
                        cellValue = CleanString(ws.Cells(i, j).Value)
                        jsonData = jsonData & ",""" & headerName & """:""" & cellValue & """"
                    End If
                End If
            Next j
            
            jsonData = jsonData & "}"
        Next i
        
        jsonData = jsonData & "]}"
        
        ' Make API call
        Dim result As String
        result = MakeAPICall(API_BASE_URL & "/process-excel-simple", jsonData)
        
        If result <> "" Then
            ' Parse result and update WTA? column
            UpdateWTAColumn ws, result, currentRow, wtaCol, batchEnd - currentRow + 1
        Else
            ' Mark as error if API call failed
            For i = currentRow To batchEnd
                ws.Cells(i, wtaCol).Value = "ERROR"
            Next i
        End If
        
        currentRow = batchEnd + 1
        
        ' Show progress
        Application.StatusBar = "Processing WTA data... " & Format((currentRow - 2) / (lastRow - 1), "0%")
        DoEvents
    Loop
    
    Application.StatusBar = "WTA processing complete!"
    MsgBox "WTA processing complete! Processed " & (lastRow - 1) & " rows."
End Sub

' Update the WTA? column from API response
Private Sub UpdateWTAColumn(ws As Worksheet, jsonResult As String, startRow As Long, wtaCol As Long, rowCount As Long)
    On Error GoTo ErrorHandler
    
    ' Simple parsing - look for "WTA?" field values
    Dim dataStart As Long
    dataStart = InStr(jsonResult, """data"":[")
    
    If dataStart > 0 Then
        ' Extract the data array section
        dataStart = dataStart + Len("""data"":[")
        Dim dataEnd As Long
        dataEnd = InStr(dataStart, jsonResult, "]")
        
        If dataEnd > dataStart Then
            Dim dataSection As String
            dataSection = Mid(jsonResult, dataStart, dataEnd - dataStart)
            
            ' Split by objects and extract WTA? values
            Dim objects() As String
            objects = Split(dataSection, "},{")
            
            Dim i As Long
            For i = 0 To UBound(objects)
                If i < rowCount Then
                    Dim objStr As String
                    objStr = objects(i)
                    
                    ' Extract WTA? value
                    Dim wtaValue As String
                    wtaValue = ExtractStringFromJSON(objStr, "WTA?")
                    
                    ws.Cells(startRow + i, wtaCol).Value = wtaValue
                End If
            Next i
        End If
    End If
    
    Exit Sub
    
ErrorHandler:
    ' If parsing fails, mark rows as ERROR
    For i = 0 To rowCount - 1
        ws.Cells(startRow + i, wtaCol).Value = "ERROR"
    Next i
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

' Test API connection
Public Sub TestConnection()
    Dim testResult As String
    testResult = MakeAPICall(API_BASE_URL & "/check-wta-status", "{""homePlayer"":""Serena Williams"",""awayPlayer"":""Maria Sharapova""}")
    
    If testResult <> "" Then
        MsgBox "API connection successful!" & vbCrLf & "Test result: " & testResult
    Else
        MsgBox "API connection failed. Please check:" & vbCrLf & _
               "1. Tennis API server is running" & vbCrLf & _
               "2. API_BASE_URL is correct: " & API_BASE_URL
    End If
End Sub
