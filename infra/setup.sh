#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

export GCP_PROJECT_ID="${GCP_PROJECT_ID:-sinuous-wording-445121-f8}"
export GCP_REGION="${GCP_REGION:-us-central1}"

echo "========================================"
echo "  Dripcheck GCP Infrastructure Setup"
echo "  Project: $GCP_PROJECT_ID"
echo "  Region:  $GCP_REGION"
echo "========================================"
echo ""

gcloud config set project "$GCP_PROJECT_ID"

echo ""
echo "[1/5] Enabling APIs..."
bash "$SCRIPT_DIR/01-enable-apis.sh"

echo ""
echo "[2/5] Setting up Firestore..."
bash "$SCRIPT_DIR/02-firestore.sh"

echo ""
echo "[3/5] Creating storage buckets..."
bash "$SCRIPT_DIR/03-storage.sh"

echo ""
echo "[4/5] Setting up Firebase Auth..."
bash "$SCRIPT_DIR/04-firebase-auth.sh"

echo ""
echo "[5/5] Creating service account..."
bash "$SCRIPT_DIR/05-service-account.sh"

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Enable Google + Email/Password sign-in in Firebase Console"
echo "  2. Copy Firebase web app config to .env.local"
echo "  3. Set GOOGLE_APPLICATION_CREDENTIALS=infra/dripcheck-sa-key.json in .env.local"
echo "  4. Run 'npm run dev' to start development"
