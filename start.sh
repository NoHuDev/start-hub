#!/bin/bash

# Clean up background processes on exit (Ctrl+C)
cleanup() {
    echo -e "\n\033[1;31m[Start Hub] Fahre Server herunter...\033[0m"
    kill "$BACKEND_PID" 2>/dev/null
    kill "$FRONTEND_PID" 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Determine absolute script path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$SCRIPT_DIR" || exit 1

clear
echo -e "\033[1;36m"
echo "  ██████  ████████  █████  ██████  ████████      ██   ██ ██    ██ ██████  "
echo " ██          ██    ██   ██ ██   ██    ██         ██   ██ ██    ██ ██   ██ "
echo "  █████      ██    ███████ ██████     ██         ███████ ██    ██ ██████  "
echo "      ██     ██    ██   ██ ██   ██    ██         ██   ██ ██    ██ ██   ██ "
echo " ██████      ██    ██   ██ ██   ██    ██         ██   ██  ██████  ██████  "
echo -e "\033[0m"
echo -e "\033[1;35m  ===============================================================\033[0m"
echo -e "\033[1;32m   Zentrales Projekt-Dashboard & Start-Hub für CachyOS\033[0m"
echo -e "\033[1;35m  ===============================================================\033[0m"
echo ""

# Start backend
echo -e "\033[1;34m[1/2]\033[0m Starte lokalen Backend-API-Server (Express)..."
node backend/server.js > backend.log 2>&1 &
BACKEND_PID=$!

# Wait briefly for backend to check port binding
sleep 1
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "\033[1;31m[FEHLER] Backend-Server konnte nicht gestartet werden. Siehe backend.log für Details.\033[0m"
    exit 1
fi
echo -e "\033[1;32m[✓] Backend läuft auf http://localhost:3030\033[0m"

# Start frontend
echo -e "\033[1;34m[2/2]\033[0m Starte React-Frontend-Server (Vite)..."
npm run dev --prefix frontend > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait briefly for frontend
sleep 1.5
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "\033[1;31m[FEHLER] Frontend-Server konnte nicht gestartet werden. Siehe frontend.log für Details.\033[0m"
    kill "$BACKEND_PID" 2>/dev/null
    exit 1
fi
echo -e "\033[1;32m[✓] Frontend läuft auf http://localhost:5173\033[0m"

echo ""
echo -e "\033[1;36m  ---------------------------------------------------------------\033[0m"
echo -e "\033[1;32m   Dashboard erfolgreich gestartet!\033[0m"
echo -e "\033[1;36m   Öffne deinen Browser unter:\033[0m \033[1;33mhttp://localhost:5173\033[0m"
echo -e "\033[1;36m  ---------------------------------------------------------------\033[0m"
echo -e "\033[90m   Drücke [Ctrl+C] um beide Server zu beenden.\033[0m"
echo ""

# Keep shell open and wait for background processes
wait "$BACKEND_PID" "$FRONTEND_PID"
