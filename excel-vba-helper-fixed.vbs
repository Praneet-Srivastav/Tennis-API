' Excel VBA Helper Functions for WTA Player Detection
' Copy this code into a new VBA module in Excel

' Base API URL - change this if your API runs on a different port
Const API_BASE_URL As String = "http://localhost:7070/api/wta"

' Function to check if a single player is WTA
Function CheckWTAPlayer(playerName As String) As String
    Dim http As Object
    Dim url As String
    Dim jsonBody As String
    Dim response As String
    
    ' Input validation
    If Len(Trim(playerName)) = 0 Then
        CheckWTAPlayer = ""
        Exit Function
    End If
    
    ' Create HTTP object
    Set http = CreateObject("MSXML2.XMLHTTP")
    
    ' Prepare request
    url = API_BASE_URL & "/check-player"
    jsonBody = "{""playerName"": """ & Replace(playerName, """", "\""") & """}"
    
    ' Make HTTP request
    On Error GoTo ErrorHandler
    http.Open "POST", url, False
    http.setRequestHeader "Content-Type", "application/json"
    http.send jsonBody
    
    ' Parse response
    If http.Status = 200 Then
        response = http.responseText
        If InStr(response, """isWTA"":true") > 0 Then
            CheckWTAPlayer = "WTA"
        Else
            CheckWTAPlayer = ""
        End If
    Else
        CheckWTAPlayer = "ERROR"
    End If
    
    Exit Function
    
ErrorHandler:
    CheckWTAPlayer = "ERROR"
End Function

' Function to check if a match involves WTA players (DETAILED VERSION)
Function CheckWTAMatch(homePlayer As Variant, awayPlayer As Variant) As String
    Dim http As Object
    Dim url As String
    Dim jsonBody As String
    Dim response As String
    Dim homePlayerStr As String
    Dim awayPlayerStr As String
    
    ' Convert cell values to strings
    homePlayerStr = CStr(homePlayer)
    awayPlayerStr = CStr(awayPlayer)
    
    ' Input validation
    If Len(Trim(homePlayerStr)) = 0 Or Len(Trim(awayPlayerStr)) = 0 Then
        CheckWTAMatch = "Missing player names"
        Exit Function
    End If
    
    ' Create HTTP object
    Set http = CreateObject("MSXML2.XMLHTTP")
    
    ' Prepare request
    url = API_BASE_URL & "/check-match"
    jsonBody = "{""homePlayer"": """ & Replace(homePlayerStr, """", "\""") & """, ""awayPlayer"": """ & Replace(awayPlayerStr, """", "\""") & """}"
    
    ' Make HTTP request
    On Error GoTo ErrorHandler
    http.Open "POST", url, False
    http.setRequestHeader "Content-Type", "application/json"
    http.send jsonBody
    
    ' Parse response with detailed analysis
    If http.Status = 200 Then
        response = http.responseText
        
        ' Check if both players are WTA
        If InStr(response, """isWTAMatch"":true") > 0 Then
            CheckWTAMatch = "WTA"
        Else
            ' Analyze individual players to give specific feedback
            Dim homeWTA As Boolean
            Dim awayWTA As Boolean
            
            ' Parse home player status
            Dim homeStart As Integer
            Dim homeEnd As Integer
            homeStart = InStr(response, """home"":")
            If homeStart > 0 Then
                homeEnd = InStr(homeStart + 100, response, """away"":")
                If homeEnd = 0 Then homeEnd = Len(response)
                If InStr(Mid(response, homeStart, homeEnd - homeStart), """isWTA"":true") > 0 Then
                    homeWTA = True
                End If
            End If
            
            ' Parse away player status
            Dim awayStart As Integer
            awayStart = InStr(response, """away"":")
            If awayStart > 0 Then
                If InStr(Mid(response, awayStart), """isWTA"":true") > 0 Then
                    awayWTA = True
                End If
            End If
            
            ' Provide specific feedback
            If homeWTA And Not awayWTA Then
                CheckWTAMatch = "Home is WTA, away is not"
            ElseIf Not homeWTA And awayWTA Then
                CheckWTAMatch = "Away is WTA, home is not"
            ElseIf Not homeWTA And Not awayWTA Then
                CheckWTAMatch = "Both are not WTA"
            Else
                CheckWTAMatch = "Unable to determine"
            End If
        End If
    Else
        CheckWTAMatch = "API Error: " & http.Status
    End If
    
    Exit Function
    
ErrorHandler:
    CheckWTAMatch = "Connection Error"
End Function

' Simple function for bulk processing (returns only "WTA" or empty)
Function CheckWTAMatchSimple(homePlayer As Variant, awayPlayer As Variant) As String
    Dim http As Object
    Dim url As String
    Dim jsonBody As String
    Dim response As String
    Dim homePlayerStr As String
    Dim awayPlayerStr As String
    
    ' Convert cell values to strings
    homePlayerStr = CStr(homePlayer)
    awayPlayerStr = CStr(awayPlayer)
    
    ' Input validation
    If Len(Trim(homePlayerStr)) = 0 Or Len(Trim(awayPlayerStr)) = 0 Then
        CheckWTAMatchSimple = ""
        Exit Function
    End If
    
    ' Create HTTP object
    Set http = CreateObject("MSXML2.XMLHTTP")
    
    ' Prepare request
    url = API_BASE_URL & "/check-match"
    jsonBody = "{""homePlayer"": """ & Replace(homePlayerStr, """", "\""") & """, ""awayPlayer"": """ & Replace(awayPlayerStr, """", "\""") & """}"
    
    ' Make HTTP request
    On Error GoTo ErrorHandler
    http.Open "POST", url, False
    http.setRequestHeader "Content-Type", "application/json"
    http.send jsonBody
    
    ' Simple parsing - just return "WTA" or empty
    If http.Status = 200 Then
        response = http.responseText
        If InStr(response, """isWTAMatch"":true") > 0 Then
            CheckWTAMatchSimple = "WTA"
        Else
            CheckWTAMatchSimple = ""
        End If
    Else
        CheckWTAMatchSimple = ""
    End If
    
    Exit Function
    
ErrorHandler:
    CheckWTAMatchSimple = ""
End Function

' Subroutine for bulk processing WTA matches
Sub BulkCheckWTAMatches(homeRange As Range, awayRange As Range, resultRange As Range)
    Dim i As Long
    Dim matches() As String
    Dim batchSize As Integer
    Dim currentBatch As Integer
    Dim response As String
    
    ' Configuration
    batchSize = 25 ' Process 25 matches at a time
    currentBatch = 0
    
    ' Prepare data
    ReDim matches(1 To batchSize)
    
    Application.ScreenUpdating = False
    
    For i = 1 To homeRange.Rows.Count
        currentBatch = currentBatch + 1
        
        ' Build match object
        matches(currentBatch) = "{""homePlayer"": """ & Replace(homeRange.Cells(i, 1).Value, """", "\""") & """, ""awayPlayer"": """ & Replace(awayRange.Cells(i, 1).Value, """", "\""") & """}"
        
        ' Process batch when full or at end
        If currentBatch = batchSize Or i = homeRange.Rows.Count Then
            ' Make bulk API call
            response = BulkAPICall(matches, currentBatch)
            
            ' Parse and update results
            Call ParseBulkResults(response, resultRange, i - currentBatch + 1, currentBatch)
            
            ' Reset batch
            currentBatch = 0
            ReDim matches(1 To batchSize)
        End If
    Next i
    
    Application.ScreenUpdating = True
    
    MsgBox "WTA checking complete!"
End Sub

' Helper function for bulk API calls
Private Function BulkAPICall(matches() As String, count As Integer) As String
    Dim http As Object
    Dim url As String
    Dim jsonBody As String
    Dim i As Integer
    
    ' Create HTTP object
    Set http = CreateObject("MSXML2.XMLHTTP")
    
    ' Build JSON array
    jsonBody = "{""matches"": ["
    For i = 1 To count
        jsonBody = jsonBody & matches(i)
        If i < count Then jsonBody = jsonBody & ","
    Next i
    jsonBody = jsonBody & "]}"
    
    ' Make request
    url = API_BASE_URL & "/bulk-check-matches"
    
    On Error GoTo ErrorHandler
    http.Open "POST", url, False
    http.setRequestHeader "Content-Type", "application/json"
    http.send jsonBody
    
    If http.Status = 200 Then
        BulkAPICall = http.responseText
    Else
        BulkAPICall = "ERROR"
    End If
    
    Exit Function
    
ErrorHandler:
    BulkAPICall = "ERROR"
End Function

' Helper function to parse bulk response (renamed to avoid conflicts)
Private Sub ParseBulkResults(response As String, resultRange As Range, startRow As Long, count As Integer)
    Dim i As Integer
    Dim pos As Long
    Dim isWTAPos As Long
    
    ' Simple parsing - look for isWTAMatch:true patterns
    For i = 1 To count
        pos = InStr((i - 1) * 100 + 1, response, """isWTAMatch"":")
        If pos > 0 Then
            isWTAPos = InStr(pos, response, "true")
            If isWTAPos > 0 And isWTAPos < pos + 20 Then
                resultRange.Cells(startRow + i - 1, 1).Value = "WTA"
            Else
                resultRange.Cells(startRow + i - 1, 1).Value = ""
            End If
        Else
            resultRange.Cells(startRow + i - 1, 1).Value = "ERROR"
        End If
    Next i
End Sub

' Quick test function
Sub TestWTAFunctions()
    Dim result1 As String
    Dim result2 As String
    
    result1 = CheckWTAPlayer("Serena Williams")
    result2 = CheckWTAMatch("Serena Williams", "Venus Williams")
    
    MsgBox "Serena Williams: " & result1 & vbCrLf & "Serena vs Venus: " & result2
End Sub
