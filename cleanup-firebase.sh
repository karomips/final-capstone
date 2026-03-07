#!/bin/bash

# Appwrite Migration Cleanup Script
# This script removes old Firebase files after verifying Appwrite is working

echo "🧹 Appwrite Migration Cleanup"
echo "=============================="
echo ""
echo "⚠️  WARNING: This will remove Firebase files permanently!"
echo "Make sure Appwrite is working correctly before running this."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cleanup cancelled."
  exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Remove Firebase config
if [ -f "frontend/src/firebase/config.js" ]; then
  echo "✓ Removing frontend/src/firebase/config.js"
  rm frontend/src/firebase/config.js
fi

if [ -d "frontend/src/firebase" ]; then
  echo "✓ Removing frontend/src/firebase/ directory"
  rmdir frontend/src/firebase 2>/dev/null || echo "  (directory not empty, skipped)"
fi

# Remove Firebase service account key
if [ -f "backend/config/serviceAccountKey.json" ]; then
  echo "✓ Removing backend/config/serviceAccountKey.json"
  rm backend/config/serviceAccountKey.json
fi

# Uninstall Firebase packages
echo ""
echo "Uninstalling Firebase packages..."
echo ""

echo "✓ Uninstalling firebase from frontend..."
cd frontend
npm uninstall firebase 2>/dev/null
cd ..

echo "✓ Uninstalling firebase-admin from backend..."
cd backend
npm uninstall firebase-admin 2>/dev/null
cd ..

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Firebase files and packages have been removed."
echo "Your application now uses Appwrite exclusively."
