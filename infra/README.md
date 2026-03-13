# Dripcheck Infrastructure

Automated GCP infrastructure setup and deployment documentation for the Dripcheck application.

## Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud` CLI)
- [Firebase CLI](https://firebase.google.com/docs/cli) (`firebase` CLI)
- [Node.js](https://nodejs.org/) 18+
- A GCP project (default: `sinuous-wording-445121-f8`)
- Authenticated: `gcloud auth login` and `firebase login`

## GCP Resources Created

| Resource | Purpose |
|----------|---------|
| Firestore (Native mode) | User data, wardrobe catalog, chat sessions, generated image metadata |
| `dripcheck-wardrobes` bucket | User wardrobe clothing images |
| `dripcheck-generated` bucket | AI-generated outfit images |
| `dripcheck-profiles` bucket | User body/profile photos |
| Firebase Auth | Google OAuth + email/password authentication |
| `dripcheck-backend` service account | Server-side access to Firestore + Storage |

## Firestore Collections Schema

```
users/{uid}
  ├── email, displayName, photoURL, createdAt, onboardingComplete
  ├── personPhotos[]
  │
  ├── wardrobe/{itemId}
  │     └── name, category, color, colors, occasion, style, tags, imageUrl, storagePath, createdAt
  │
  ├── sessions/{sessionId}
  │     ├── title, createdAt, updatedAt
  │     └── messages/{msgId}
  │           └── role, content, logs[], images[], createdAt
  │
  ├── generatedImages/{genId}
  │     └── imageUrl, storagePath, outfitItems[], personPhoto, prompt, createdAt
  │
  └── weeklyLog/{weekKey}
        └── weekKey, logs[{ date, outfitIds[] }]
```

## Quick Setup

```bash
# From the repo root:
bash infra/setup.sh
```

Or run individual scripts:

```bash
bash infra/01-enable-apis.sh     # Enable GCP APIs
bash infra/02-firestore.sh       # Create Firestore DB
bash infra/03-storage.sh         # Create Cloud Storage buckets
bash infra/04-firebase-auth.sh   # Set up Firebase Auth
bash infra/05-service-account.sh # Create service account + key
```

After running setup, manually enable auth providers in the
[Firebase Console](https://console.firebase.google.com/project/sinuous-wording-445121-f8/authentication/providers):

1. **Email/Password** -- Enable
2. **Google** -- Enable (set support email to `tine2musi1@gmail.com`)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Where | Description |
|----------|-------|-------------|
| `GEMINI_API_KEY` | Server | Google AI Studio API key |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client | Firebase web app API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client | GCP project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Client | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Client | Firebase sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client | Firebase app ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Server | Path to SA key (local dev) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Server | SA key JSON string (Vercel) |
| `GCP_PROJECT_ID` | Server | GCP project ID |
| `GCS_BUCKET_WARDROBES` | Server | Wardrobe images bucket |
| `GCS_BUCKET_GENERATED` | Server | Generated images bucket |
| `GCS_BUCKET_PROFILES` | Server | Profile photos bucket |

Get the Firebase web app config:

```bash
firebase apps:sdkconfig WEB --project=sinuous-wording-445121-f8
```

## Deployment (Vercel)

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com) and import the GitHub repo
2. Select the `production` branch as the production branch
3. Framework preset: **Next.js** (auto-detected)

### 2. Set Environment Variables

In the Vercel dashboard, go to **Settings > Environment Variables** and add:

- All `NEXT_PUBLIC_*` Firebase config variables
- `GEMINI_API_KEY`
- `GCP_PROJECT_ID`
- `GCS_BUCKET_WARDROBES`, `GCS_BUCKET_GENERATED`, `GCS_BUCKET_PROFILES`
- `FIREBASE_SERVICE_ACCOUNT_KEY` -- paste the full JSON content of `infra/dripcheck-sa-key.json`

To get the reference values:

```bash
bash infra/06-vercel-env.sh
```

### 3. Deploy

Vercel auto-deploys on push to `production` branch. You can also:

```bash
npx vercel --prod
```

### 4. Configure Firebase Auth Redirect

After deploying, add your Vercel domain to Firebase Auth authorized domains:

1. Go to [Firebase Console](https://console.firebase.google.com/project/sinuous-wording-445121-f8/authentication/settings)
2. Under **Authorized domains**, add your Vercel domain (e.g., `dripcheck.vercel.app`)

## Teardown

```bash
bash infra/teardown.sh
```

This deletes buckets, the service account, and the Firestore database.
Firebase Auth configuration and API enablement are not reverted.

## Development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`. For local development, use
`GOOGLE_APPLICATION_CREDENTIALS` pointing to the service account key file.
