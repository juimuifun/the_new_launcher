#!/bin/bash

# Navigate to the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_NAME="Minecrad.app"

echo "================================================="
echo "   Fixing macOS Security / Gatekeeper Warning   "
echo "================================================="
echo ""

# Search for the app in current folder or /Applications
if [ -d "$DIR/$APP_NAME" ]; then
    echo "Found $APP_NAME in current directory..."
    xattr -cr "$DIR/$APP_NAME"
    echo "Successfully removed security restriction!"
elif [ -d "/Applications/$APP_NAME" ]; then
    echo "Found $APP_NAME in /Applications..."
    xattr -cr "/Applications/$APP_NAME"
    echo "Successfully removed security restriction!"
else
    echo "Notice: Could not find '$APP_NAME' in current directory or /Applications."
    echo "Please drag '$APP_NAME' into your Applications folder first, then double click this script."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo ""
echo "Done! You can now launch '$APP_NAME' normally."
echo ""
read -p "Press Enter to exit..."
