#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-sinuous-wording-445121-f8}"
REGION="${GCP_REGION:-us-central1}"

echo "==> Creating Firestore database in Native mode (region: $REGION)"

gcloud firestore databases create \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  --type=firestore-native \
  2>/dev/null || echo "    Firestore database already exists, skipping."

echo "==> Firestore setup complete."
echo ""
echo "Collections will be created on first write:"
echo "  users/{uid}"
echo "  users/{uid}/wardrobe/{itemId}"
echo "  users/{uid}/sessions/{sessionId}"
echo "  users/{uid}/sessions/{sessionId}/messages/{msgId}"
echo "  users/{uid}/generatedImages/{genId}"
echo "  users/{uid}/weeklyLog/{weekKey}"
