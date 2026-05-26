@echo off
title Start Hub Installer
chcp 65001 >nul
cls

echo ===============================================================
echo       Start Hub Dashboard - Windows Installer
echo ===============================================================
echo.

:: 1. Environment Verification
echo [1/3] Überprüfe Systemumgebung...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [FEHLER] Node.js ist nicht installiert! Bitte installiere Node.js zuerst.
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [FEHLER] npm ist nicht installiert! Bitte installiere npm zuerst.
    pause
    exit /b 1
)

echo [✓] Node.js und npm wurden im Pfad gefunden.
echo.

:: 2. Dependency Installation
echo [2/3] Installiere Abhängigkeiten...
echo.

echo Installiere Backend-Pakete...
cd backend
call npm install
cd ..

echo.
echo Installiere Frontend-Pakete...
cd frontend
call npm install
cd ..

echo.
echo [✓] Alle npm-Pakete wurden erfolgreich installiert.
echo.

:: 3. Create Windows Desktop Shortcut via VBScript
echo [3/3] Erstelle Desktop-Verknüpfung...

set SCRIPT_DIR=%~dp0
set SHORTCUT_SCRIPT="%TEMP%\CreateStartHubShortcut.vbs"

echo Set oWS = WScript.CreateObject("WScript.Shell") > %SHORTCUT_SCRIPT%
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Start Hub.lnk" >> %SHORTCUT_SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SHORTCUT_SCRIPT%
echo oLink.TargetPath = "%SCRIPT_DIR%start.bat" >> %SHORTCUT_SCRIPT%
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> %SHORTCUT_SCRIPT%
echo oLink.Description = "Start Hub Dashboard" >> %SHORTCUT_SCRIPT%
echo oLink.IconLocation = "shell32.dll,220" >> %SHORTCUT_SCRIPT%
echo oLink.Save >> %SHORTCUT_SCRIPT%

cscript //nologo %SHORTCUT_SCRIPT%
del /f /q %SHORTCUT_SCRIPT% >nul 2>&1

echo [✓] Eine Verknüpfung namens "Start Hub" wurde auf deinem Desktop erstellt!
echo.
echo ---------------------------------------------------------------
echo  Installation erfolgreich abgeschlossen!
echo  Du kannst das Dashboard nun per Doppelklick auf die Verknüpfung 
echo  "Start Hub" auf deinem Desktop starten.
echo ---------------------------------------------------------------
echo.
pause
exit /b 0
