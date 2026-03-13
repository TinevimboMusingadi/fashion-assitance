#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-sinuous-wording-445121-f8}"
SA_NAME="dripcheck-backend"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "========================================"
echo "  Dripcheck Teardown"
echo "  Project: $PROJECT_ID"
echo "========================================"
echo ""
echo "WARNING: This will delete GCP resources."
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "==> Deleting storage buckets..."
for BUCKET in dripcheck-wardrobes dripcheck-generated dripcheck-profiles; do
  echo "    Deleting gs://$BUCKET ..."
  gsutil -m rm -r "gs://$BUCKET" 2>/dev/null || echo "    Bucket not found or already deleted."
done

echo "==> Deleting service account: $SA_EMAIL"
gcloud iam service-accounts delete "$SA_EMAIL" \
  --project="$PROJECT_ID" --quiet 2>/dev/null \
  || echo "    Service account not found."

echo "==> Deleting Firestore database..."
gcloud firestore databases delete --project="$PROJECT_ID" --quiet 2>/dev/null \
  || echo "    Firestore database not found or cannot be deleted."

echo ""
echo "==> Teardown complete."
echo "    Note: Firebase Auth and API enablement are NOT reverted."
