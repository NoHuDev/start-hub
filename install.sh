#!/bin/bash

# Determine directory script resides in
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$SCRIPT_DIR" || exit 1

clear
echo -e "\033[1;36m===============================================================\033[0m"
echo -e "\033[1;32m      Start Hub Dashboard - Linux Installer\033[0m"
echo -e "\033[1;36m===============================================================\033[0m"
echo ""

# 1. Environment Verification
echo -e "\033[1;34m[1/3]\033[0m Überprüfe Systemumgebung..."
if ! command -v node &> /dev/null; then
    echo -e "\033[1;31m[FEHLER] Node.js ist nicht installiert! Bitte installiere Node.js zuerst.\033[0m"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "\033[1;31m[FEHLER] npm ist nicht installiert! Bitte installiere npm zuerst.\033[0m"
    exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo -e "\033[1;32m[✓] Node.js gefunden: $NODE_VERSION\033[0m"
echo -e "\033[1;32m[✓] npm gefunden: $NPM_VERSION\033[0m"
echo ""

# 2. Dependency Installation
echo -e "\033[1;34m[2/3]\033[0m Installiere Abhängigkeiten..."

echo "Installiere Backend-Pakete..."
cd backend && npm install && cd ..

echo "Installiere Frontend-Pakete..."
cd frontend && npm install && cd ..

echo -e "\033[1;32m[✓] Alle npm-Pakete wurden erfolgreich installiert.\033[0m"
echo ""

# 3. Create Desktop Launcher Entry
echo -e "\033[1;34m[3/3]\033[0m Registriere Desktop-Launcher..."

DESKTOP_DIR="$HOME/.local/share/applications"
mkdir -p "$DESKTOP_DIR"

LAUNCHER_PATH="$DESKTOP_DIR/start-hub.desktop"
cat > "$LAUNCHER_PATH" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Start Hub
Comment=Zentrales Command Hub Dashboard für Projekte und Tools
Exec=bash "$SCRIPT_DIR/start.sh"
Icon=utilities-terminal
Path=$SCRIPT_DIR
Terminal=true
Categories=Development;Utility;
StartupNotify=true
EOF

# Ensure start.sh and install.sh are executable
chmod +x "$SCRIPT_DIR/start.sh" 2>/dev/null
chmod +x "$SCRIPT_DIR/install.sh" 2>/dev/null

echo -e "\033[1;32m[✓] Desktop-Eintrag wurde unter $LAUNCHER_PATH erstellt.\033[0m"
echo -e "\033[1;32m    Du kannst 'Start Hub' nun direkt über dein Anwendungsmenü starten!\033[0m"
echo ""

echo -e "\033[1;36m---------------------------------------------------------------\033[0m"
echo -e "\033[1;32m Installation erfolgreich abgeschlossen!\033[0m"
echo -e "\033[1;36m Du kannst das Dashboard nun mit folgendem Befehl starten:\033[0m"
echo -e "\033[1;33m   ./start.sh\033[0m"
echo -e "\033[1;36m---------------------------------------------------------------\033[0m"
echo ""
