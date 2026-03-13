#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-sinuous-wording-445121-f8}"
SA_NAME="dripcheck-backend"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="infra/dripcheck-sa-key.json"

echo "==> Creating service account: $SA_NAME"

gcloud iam service-accounts create "$SA_NAME" \
  --display-name="Dripcheck Backend" \
  --project="$PROJECT_ID" \
  2>/dev/null || echo "    Service account already exists."

echo "==> Granting roles..."

ROLES=(
  "roles/datastore.user"
  "roles/storage.objectAdmin"
  "roles/firebase.sdkAdminServiceAgent"
)

for ROLE in "${ROLES[@]}"; do
  echo "    Granting $ROLE..."
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$ROLE" \
    --condition=None \
    --quiet
done

echo "==> Generating key file: $KEY_FILE"

if [ -f "$KEY_FILE" ]; then
  echo "    Key file already exists. Delete it first to regenerate."
else
  gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account="$SA_EMAIL" \
    --project="$PROJECT_ID"
  echo "    Key saved to $KEY_FILE"
  echo "    WARNING: Do NOT commit this file. It is in .gitignore."
fi

echo ""
echo "==> Service account setup complete."
echo "    Set GOOGLE_APPLICATION_CREDENTIALS=$KEY_FILE in your .env.local"
