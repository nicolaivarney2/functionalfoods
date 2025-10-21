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

# Kopier også Cursor settings hvis de eksisterer
if [ -d "$HOME/Library/Application Support/Cursor" ]; then
    echo "Syncing Cursor settings..."
    cp -r "$HOME/Library/Application Support/Cursor" "$CLOUD_SYNC_DIR/cursor-settings" 2>/dev/null || echo "Could not sync Cursor settings"
fi

echo "✅ Files synced to $CLOUD_SYNC_DIR"
echo "📁 Synced files:"
ls -la "$CLOUD_SYNC_DIR"
