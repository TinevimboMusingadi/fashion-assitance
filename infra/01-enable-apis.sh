#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-sinuous-wording-445121-f8}"

echo "==> Enabling required APIs for project: $PROJECT_ID"

gcloud services enable \
  firebase.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  storage-api.googleapis.com \
  identitytoolkit.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com \
  aiplatform.googleapis.com \
  generativelanguage.googleapis.com \
  --project="$PROJECT_ID"

echo "==> APIs enabled successfully."
