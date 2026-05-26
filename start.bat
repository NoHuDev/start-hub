@echo off
title Start Hub Dashboard
chcp 65001 >nul
cls

echo   ██████  ████████  █████  ██████  ████████      ██   ██ ██    ██ ██████  
echo  ██          ██    ██   ██ ██   ██    ██         ██   ██ ██    ██ ██   ██ 
echo   █████      ██    ███████ ██████     ██         ███████ ██    ██ ██████  
echo       ██     ██    ██   ██ ██   ██    ██         ██   ██ ██    ██ ██   ██ 
echo  ██████      ██    ██   ██ ██   ██    ██         ██   ██  ██████  ██████  
echo.
echo  ===============================================================
echo   Zentrales Projekt-Dashboard ^& Start-Hub für Windows
echo  ===============================================================
echo.

echo [1/2] Starte lokalen Backend-API-Server (Express)...
start "StartHub-Backend" /min node backend/server.js
timeout /t 2 /nobreak >nul
echo [✓] Backend läuft auf http://localhost:3030

echo [2/2] Starte React-Frontend-Server (Vite)...
start "StartHub-Frontend" /min npm run dev --prefix frontend
timeout /t 2 /nobreak >nul
echo [✓] Frontend läuft auf http://localhost:5173
echo.

echo Starte System-Tray-Icon...
start "StartHub-Tray" /min node backend/tray.js "StartHub-Backend" "StartHub-Frontend"
timeout /t 1 /nobreak >nul

echo Öffne Standardbrowser...
start "" "http://localhost:5173"

echo.
echo ---------------------------------------------------------------
echo  Dashboard erfolgreich gestartet!
echo  Öffne deinen Browser unter: http://localhost:5173
echo ---------------------------------------------------------------
echo.
echo Drücke eine beliebige Taste, um beide Server zu beenden...
pause >nul

echo Fahre Server herunter...
taskkill /fi "windowtitle eq StartHub-Backend*" /t /f >nul 2>&1
taskkill /fi "windowtitle eq StartHub-Frontend*" /t /f >nul 2>&1
taskkill /fi "windowtitle eq StartHub-Tray*" /t /f >nul 2>&1
echo [✓] Server erfolgreich beendet.
exit
