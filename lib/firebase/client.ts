"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  type Auth,
} from "firebase/auth";
import { getFirebaseClientConfig, isFirebaseClientConfigured } from "@/lib/firebase/config";

let firebaseApp: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseClientConfigured()) return null;
  if (firebaseApp) return firebaseApp;
  const existing = getApps()[0];
  if (existing) {
    firebaseApp = existing;
    return firebaseApp;
  }
  firebaseApp = initializeApp(getFirebaseClientConfig());
  return firebaseApp;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
}

export async function signInWithGooglePopup(): Promise<string> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error(
      "Google sign-in is not configured. Contact support or use email and password.",
    );
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken(true);

  if (!idToken) {
    throw new Error("Could not obtain a Google sign-in token. Please try again.");
  }

  return idToken;
}
