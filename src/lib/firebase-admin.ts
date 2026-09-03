import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";
import type { App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "evrconstruction-5f7bd";
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "evrconstruction-5f7bd.firebasestorage.app";

const GLOBAL_ADMIN_KEY = "__EVR_ADMIN_APP__";
const globalStore = global as unknown as { [GLOBAL_ADMIN_KEY]?: App };

function getAdminApp(): App {
  if (globalStore[GLOBAL_ADMIN_KEY]) {
    return globalStore[GLOBAL_ADMIN_KEY]!;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    globalStore[GLOBAL_ADMIN_KEY] = existingApps[0]!;
    return existingApps[0]!;
  }

  // Use App Hosting compute service account (firebase-app-hosting-compute) via ADC by default.
  // This account already possesses Cloud Datastore User & Firebase Admin SDK roles.
  let credential = applicationDefault();

  const adminKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;
  if (adminKey) {
    try {
      const parsed = JSON.parse(adminKey);
      if (parsed.client_email && !parsed.client_email.includes("evr-seo-analytics")) {
        credential = cert(parsed);
      }
    } catch (e) {
      console.warn("Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY, using compute ADC:", e);
    }
  }

  const app = initializeApp({
    credential,
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
  });

  globalStore[GLOBAL_ADMIN_KEY] = app;
  return app;
}

const adminApp = getAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);


