#!/bin/bash

# Script til at synce lokale filer til cloud storage
# Kør dette når du forlader computeren

CLOUD_SYNC_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/functionalfoods-sync"  # iCloud Drive

# Opret sync mappe hvis den ikke eksisterer
mkdir -p "$CLOUD_SYNC_DIR"

# Kopier filer til cloud
echo "Syncing files to cloud..."
cp .env "$CLOUD_SYNC_DIR/" 2>/dev/null || echo "No .env file found"
cp .gitignore "$CLOUD_SYNC_DIR/" 2>/dev/null || echo "No .gitignore file found"

# Kopier kun vigtige Cursor settings (ikke extensions og cache)
if [ -d "$HOME/Library/Application Support/Cursor/User" ]; then
    echo "Syncing Cursor user settings (excluding extensions)..."
    mkdir -p "$CLOUD_SYNC_DIR/cursor-user-settings"
    
    # Sync kun de vigtige filer, ikke extensions eller cache
    cp "$HOME/Library/Application Support/Cursor/User/settings.json" "$CLOUD_SYNC_DIR/cursor-user-settings/" 2>/dev/null || echo "No settings.json"
    cp "$HOME/Library/Application Support/Cursor/User/keybindings.json" "$CLOUD_SYNC_DIR/cursor-user-settings/" 2>/dev/null || echo "No keybindings.json"
    
    # Sync snippets hvis de eksisterer
    if [ -d "$HOME/Library/Application Support/Cursor/User/snippets" ]; then
        cp -r "$HOME/Library/Application Support/Cursor/User/snippets" "$CLOUD_SYNC_DIR/cursor-user-settings/" 2>/dev/null || echo "Could not sync snippets"
    fi
    
    echo "✅ Cursor settings synced (extensions excluded - install manually)"
fi

echo "✅ Files synced to $CLOUD_SYNC_DIR"
echo "📁 Synced files:"
ls -la "$CLOUD_SYNC_DIR"
