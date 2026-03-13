#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-sinuous-wording-445121-f8}"

echo "==> Setting up Firebase for project: $PROJECT_ID"

firebase projects:addfirebase "$PROJECT_ID" 2>/dev/null \
  || echo "    Firebase already enabled for this project."

echo "==> Creating Firebase web app..."
firebase apps:create WEB dripcheck-web --project="$PROJECT_ID" 2>/dev/null \
  || echo "    Web app already exists."

echo ""
echo "==> Retrieving Firebase web app config..."
firebase apps:sdkconfig WEB --project="$PROJECT_ID" 2>/dev/null \
  || echo "    Run 'firebase apps:sdkconfig WEB --project=$PROJECT_ID' manually to get config."

echo ""
echo "==> Enabling auth providers..."
echo "    NOTE: Google sign-in and email/password providers must be enabled"
echo "    manually in the Firebase Console:"
echo "    https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"
echo ""
echo "    1. Go to Authentication > Sign-in method"
echo "    2. Enable 'Email/Password'"
echo "    3. Enable 'Google' (set support email to tine2musi1@gmail.com)"
echo ""
echo "==> Firebase Auth setup complete."
