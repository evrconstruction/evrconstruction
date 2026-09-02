import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "evrconstruction-5f7bd.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "evrconstruction-5f7bd",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "evrconstruction-5f7bd.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "573736586147",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:573736586147:web:f2ece9a7f6a910e72c6816",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-19DRNQBM8T",
};

// Initialize Firebase App (client-side only)
const app = typeof window !== "undefined"
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : ({} as FirebaseApp);

if (typeof window !== "undefined") {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6LfA8aUtAAAAAK9RJDiKsWe1qg9t-ZuqsP4tjdMz"),
    isTokenAutoRefreshEnabled: true
  });
}

const auth = typeof window !== "undefined" ? getAuth(app) : ({} as Auth);
const db = typeof window !== "undefined" ? getFirestore(app) : ({} as Firestore);
const storage = typeof window !== "undefined" ? getStorage(app) : ({} as FirebaseStorage);

export { app, auth, db, storage };
