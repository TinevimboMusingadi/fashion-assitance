# Dripcheck – Where code runs (backend vs frontend)

## One deployment, two “sides”

You have **one app**, not two separate servers. That one app has two parts:

| Part | Where it runs | What it is |
|------|----------------|------------|
| **Frontend** | User’s **browser** | Pages, React components, Firebase Auth in the client. |
| **Backend** | **Server** (your machine or Vercel) | API routes under `src/app/api/`, Firebase Admin, GCS, Gemini. |

- **Locally:** `npm run dev` starts **one** Next.js process. It serves the frontend and runs the API routes in that same process.
- **On Vercel:** You deploy **one** project. Vercel builds it and runs:
  - Your **pages** (frontend) from their CDN.
  - Your **API routes** as **serverless functions** (the “backend”) when someone calls `/api/...`.

So: **one repo → one deployment → one “instance”** that does both. You don’t get two separate instances; the “backend” is the API routes inside that same deployment.

---

## How a request flows

```
[Browser]                          [Server – Vercel or local Node]
   |                                            |
   |  GET /dashboard                            |
   | ------------------------------------------> |  Sends HTML/JS (frontend)
   |                                            |
   |  POST /api/chat/stream  (with auth token)   |
   | ------------------------------------------> |  verifyAuthToken(), runAgent(), GCS, etc.
   |                                            |  (backend – only here)
   |  SSE stream / JSON                         |
   | <------------------------------------------ |
   |                                            |
   |  GET /api/image?path=...                    |
   | ------------------------------------------> |  downloadFile() from GCS (backend)
   |  image bytes                               |
   | <------------------------------------------ |
```

- The **browser** only talks to your app’s origin (`localhost:3000` or `your-app.vercel.app`). It never sees Firebase Admin keys, GCS keys, or Gemini keys.
- The **server** (API routes) runs `verifyAuthToken`, `getUserWardrobe`, `generateOutfitImage`, `downloadFile`, etc. All of that is backend.

---

## What runs where (and why it’s safe)

### Runs in the browser (frontend)

- `src/app/(app)/**` – dashboard, wardrobe, onboarding pages.
- `src/app/(auth)/**` – login, signup.
- `src/components/**` – Chat, OutfitGallery, SessionList, etc.
- `src/lib/firebase/client.ts` – Firebase Auth (login/signup).

Only env vars that start with **`NEXT_PUBLIC_`** are visible here. So:

- `NEXT_PUBLIC_FIREBASE_*` → safe to expose (they’re meant for the client).

### Runs on the server only (backend)

- **All of** `src/app/api/**` – every route in there runs only on the server:
  - `api/chat/stream` – agent, Gemini, streaming.
  - `api/upload` – GCS upload, Firestore writes.
  - `api/image` – GCS download, image proxy.
  - `api/catalog`, `api/sessions`, `api/wardrobe/[id]`, `api/index`, `api/generated-images`, `api/user/photos`, etc.
- `src/lib/firebase/admin.ts` – Firebase Admin SDK.
- `src/lib/firebase/verify-token.ts` – token verification for API routes.
- `src/lib/storage/gcs-client.ts` – GCS read/write.
- `src/lib/agent/**` – orchestrator, tools, outfit generation.
- `src/lib/indexing/engine.ts` – indexing/Gemini.
- `src/lib/memory/**` – Firestore-backed stores.

These **never** run in the browser. So:

- `FIREBASE_SERVICE_ACCOUNT_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`
- `GEMINI_API_KEY`
- `GCP_PROJECT_ID`, `GCS_BUCKET_*`

are only used on the server and are **not** sent to the client. The “API stuff” is safe: secrets stay in the backend.

---

## Summary

| Question | Answer |
|----------|--------|
| Do I have two instances (frontend + backend)? | No. One deployment. Frontend = pages in the browser; backend = API routes on the server (same deployment). |
| When I run the app locally, where is the “backend”? | In the same `next dev` process; API routes are the backend. |
| When I deploy to Vercel, where is the backend? | In Vercel’s serverless functions that run your `src/app/api/*` routes. |
| Is the API/backend safe? | Yes. API routes and server-only code run only on the server; secrets never go to the browser. |

So: **one codebase, one deployment (local or Vercel). Backend = everything under `src/app/api/` and server-only libs. Frontend = pages and components; it only gets `NEXT_PUBLIC_*` and talks to the backend via `/api/...`.**
