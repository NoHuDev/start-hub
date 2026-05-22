@echo off
title Start Hub Updater
chcp 65001 >nul
cls

echo ===============================================================
echo       Start Hub Dashboard - Windows Updater
echo ===============================================================
echo.

:: 1. Git pull
echo [1/2] Lade neueste Version von GitHub herunter...
if exist .git (
    git pull
    echo [✓] Repository erfolgreich aktualisiert.
) else (
    echo [INFO] Kein Git-Repository gefunden. Überspringe 'git pull'.
)
echo.

:: 2. Update npm packages
echo [2/2] Aktualisiere npm-Pakete...
echo.
echo Aktualisiere Root...
call npm install

echo.
echo Aktualisiere Backend...
cd backend
call npm install
cd ..

echo.
echo Aktualisiere Frontend...
cd frontend
call npm install
cd ..

echo.
echo [✓] Alle npm-Pakete wurden erfolgreich aktualisiert.
echo.
echo ---------------------------------------------------------------
echo  Update erfolgreich abgeschlossen!
echo ---------------------------------------------------------------
echo.
pause
exit /b 0
