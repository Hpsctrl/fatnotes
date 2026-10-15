On Error Resume Next
Set fso = CreateObject("Scripting.FileSystemObject")
Set logFile = fso.CreateTextFile("vbs_log.txt", True)
logFile.WriteLine "ScriptFullName: " & WScript.ScriptFullName
Set shell = CreateObject("WScript.Shell")
scriptPath = Replace(WScript.ScriptFullName, "Launch-App.vbs", "Launch-App.ps1")
logFile.WriteLine "PS1 Path: " & scriptPath
errCode = shell.Run("powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & scriptPath & """", 0, False)
logFile.WriteLine "Run Error Code: " & errCode
logFile.Close

