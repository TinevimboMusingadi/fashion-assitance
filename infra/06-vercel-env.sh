#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-sinuous-wording-445121-f8}"

echo "========================================"
echo "  Vercel Environment Variables"
echo "  (copy these to your Vercel dashboard)"
echo "========================================"
echo ""
echo "# Gemini AI"
echo "GEMINI_API_KEY=<your-gemini-api-key>"
echo ""

echo "# Firebase Client SDK (NEXT_PUBLIC_ = exposed to browser)"
echo "# Get values from: firebase apps:sdkconfig WEB --project=$PROJECT_ID"
firebase apps:sdkconfig WEB --project="$PROJECT_ID" 2>/dev/null || true
echo ""
echo "NEXT_PUBLIC_FIREBASE_API_KEY=<from above>"
echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${PROJECT_ID}.firebaseapp.com"
echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=${PROJECT_ID}"
echo "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${PROJECT_ID}.firebasestorage.app"
echo "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=558196648164"
echo "NEXT_PUBLIC_FIREBASE_APP_ID=<from above>"
echo ""

echo "# GCP / Firebase Admin (server-side only)"
echo "# For Vercel, paste the JSON content of your service account key"
echo "# as the GOOGLE_APPLICATION_CREDENTIALS env var, or use:"
echo "# GOOGLE_APPLICATION_CREDENTIALS=<base64-encoded service account JSON>"
echo "GCP_PROJECT_ID=${PROJECT_ID}"
echo ""

echo "# Cloud Storage Buckets"
echo "GCS_BUCKET_WARDROBES=dripcheck-wardrobes"
echo "GCS_BUCKET_GENERATED=dripcheck-generated"
echo "GCS_BUCKET_PROFILES=dripcheck-profiles"
echo ""
echo "========================================"
echo "NOTE: For the service account on Vercel, you have two options:"
echo "  1. Set GOOGLE_APPLICATION_CREDENTIALS to the file path (won't work on Vercel)"
echo "  2. Set FIREBASE_SERVICE_ACCOUNT_KEY as a JSON string with the full key content"
echo "     Then update admin.ts to parse it from the env var."
echo "========================================"
