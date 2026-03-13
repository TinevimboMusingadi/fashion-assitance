/**
 * Firebase Admin SDK initialization.
 * Used server-side only (API routes, middleware).
 *
 * Supports three credential strategies:
 *  1. GOOGLE_APPLICATION_CREDENTIALS env var pointing to a key file (local dev)
 *  2. FIREBASE_SERVICE_ACCOUNT_KEY env var containing JSON string (Vercel)
 *  3. Application Default Credentials (GCP-hosted environments)
 */

import {
  initializeApp,
  getApps,
  cert,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const jsonKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (jsonKey) {
    try {
      const serviceAccount = JSON.parse(jsonKey) as ServiceAccount;
      return initializeApp({ credential: cert(serviceAccount) });
    } catch {
      // fall through
    }
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    const absPath = resolve(credPath);
    const raw = readFileSync(absPath, "utf-8");
    const serviceAccount = JSON.parse(raw) as ServiceAccount;
    return initializeApp({ credential: cert(serviceAccount) });
  }

  const projectId =
    process.env.GCP_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (projectId) {
    return initializeApp({ projectId });
  }

  return initializeApp();
}

const adminApp = getAdminApp();
const adminAuth = getAuth(adminApp);
const db = getFirestore(adminApp);

export { adminApp, adminAuth, db };
