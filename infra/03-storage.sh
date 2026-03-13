#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-sinuous-wording-445121-f8}"
REGION="${GCP_REGION:-us-central1}"

BUCKETS=(
  "dripcheck-wardrobes"
  "dripcheck-generated"
  "dripcheck-profiles"
)

for BUCKET in "${BUCKETS[@]}"; do
  FULL_NAME="gs://${BUCKET}"
  echo "==> Creating bucket: $FULL_NAME"

  if gsutil ls "$FULL_NAME" &>/dev/null; then
    echo "    Bucket $FULL_NAME already exists, skipping."
  else
    gsutil mb -p "$PROJECT_ID" -l "$REGION" -b on "$FULL_NAME"
    echo "    Created $FULL_NAME"
  fi

  echo "    Setting lifecycle (auto-delete tmp objects after 30 days)..."
  cat <<'LIFECYCLE' | gsutil lifecycle set /dev/stdin "$FULL_NAME"
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": {
        "age": 30,
        "matchesPrefix": ["tmp/"]
      }
    }
  ]
}
LIFECYCLE

  echo "    Setting CORS for browser uploads..."
  cat <<'CORS' | gsutil cors set /dev/stdin "$FULL_NAME"
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT", "POST"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
CORS
done

echo ""
echo "==> Storage buckets ready."
echo "  dripcheck-wardrobes  -- user wardrobe images (users/{uid}/wardrobe/)"
echo "  dripcheck-generated  -- generated outfit images (users/{uid}/generated/)"
echo "  dripcheck-profiles   -- user body/profile photos (users/{uid}/photos/)"
