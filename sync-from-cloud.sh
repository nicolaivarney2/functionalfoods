#!/bin/bash

# Script til at hente filer fra cloud storage
# Kør dette når du starter på en ny computer

CLOUD_SYNC_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/functionalfoods-sync"  # iCloud Drive

# Tjek om cloud mappe eksisterer
if [ ! -d "$CLOUD_SYNC_DIR" ]; then
    echo "❌ Cloud sync directory not found: $CLOUD_SYNC_DIR"
    echo "Please run sync-to-cloud.sh first on your other computer"
    exit 1
fi

echo "Syncing files from cloud..."

# Kopier filer fra cloud
if [ -f "$CLOUD_SYNC_DIR/.env" ]; then
    cp "$CLOUD_SYNC_DIR/.env" .
    echo "✅ Copied .env"
else
    echo "⚠️  No .env file found in cloud sync"
fi

if [ -f "$CLOUD_SYNC_DIR/.gitignore" ]; then
    cp "$CLOUD_SYNC_DIR/.gitignore" .
    echo "✅ Copied .gitignore"
else
    echo "⚠️  No .gitignore file found in cloud sync"
fi

# Kopier Cursor user settings hvis de eksisterer
if [ -d "$CLOUD_SYNC_DIR/cursor-user-settings" ]; then
    echo "Restoring Cursor user settings..."
    mkdir -p "$HOME/Library/Application Support/Cursor/User"
    
    # Restore kun de vigtige filer
    cp "$CLOUD_SYNC_DIR/cursor-user-settings/settings.json" "$HOME/Library/Application Support/Cursor/User/" 2>/dev/null || echo "No settings.json to restore"
    cp "$CLOUD_SYNC_DIR/cursor-user-settings/keybindings.json" "$HOME/Library/Application Support/Cursor/User/" 2>/dev/null || echo "No keybindings.json to restore"
    
    # Restore snippets hvis de eksisterer
    if [ -d "$CLOUD_SYNC_DIR/cursor-user-settings/snippets" ]; then
        cp -r "$CLOUD_SYNC_DIR/cursor-user-settings/snippets" "$HOME/Library/Application Support/Cursor/User/" 2>/dev/null || echo "Could not restore snippets"
    fi
    
    echo "✅ Cursor user settings restored (install extensions manually)"
fi

echo "🎉 Sync complete!"
echo "📁 Available files:"
ls -la "$CLOUD_SYNC_DIR"
