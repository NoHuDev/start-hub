#!/bin/bash

# Determine directory script resides in
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$SCRIPT_DIR" || exit 1

clear
echo -e "\033[1;36m===============================================================\033[0m"
echo -e "\033[1;32m      Start Hub Dashboard - Linux Updater\033[0m"
echo -e "\033[1;36m===============================================================\033[0m"
echo ""

# 1. Pull changes
echo -e "\033[1;34m[1/2]\033[0m Lade neueste Version von GitHub herunter..."
if [ -d .git ]; then
    git pull
    echo -e "\033[1;32m[✓] repository erfolgreich aktualisiert.\033[0m"
else
    echo -e "\033[1;33m[INFO] Kein Git-Repository gefunden. Überspringe 'git pull'.\033[0m"
fi
echo ""

# 2. Update dependencies
echo -e "\033[1;34m[2/2]\033[0m Aktualisiere npm-Pakete..."

echo "Aktualisiere Backend..."
cd backend && npm install && cd ..

echo "Aktualisiere Frontend..."
cd frontend && npm install && cd ..

# Ensure files remain executable
chmod +x "$SCRIPT_DIR/start.sh" 2>/dev/null
chmod +x "$SCRIPT_DIR/install.sh" 2>/dev/null
chmod +x "$SCRIPT_DIR/update.sh" 2>/dev/null

echo -e "\033[1;32m[✓] npm-Pakete wurden erfolgreich aktualisiert.\033[0m"
echo ""
echo -e "\033[1;36m---------------------------------------------------------------\033[0m"
echo -e "\033[1;32m Update erfolgreich abgeschlossen!\033[0m"
echo -e "\033[1;36m---------------------------------------------------------------\033[0m"
echo ""
