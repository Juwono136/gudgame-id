import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";
import { AppError } from "@/lib/errors";

let adminApp: App | null = null;

function getFirebaseAdminApp(): App {
  if (!isFirebaseAdminConfigured()) {
    throw new AppError("Firebase Admin is not configured on the server", {
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  }

  if (adminApp) return adminApp;

  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return adminApp;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: privateKey!,
    }),
  });

  return adminApp;
}

export type VerifiedFirebaseGoogleUser = {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

export async function verifyFirebaseGoogleIdToken(
  idToken: string,
): Promise<VerifiedFirebaseGoogleUser> {
  const app = getFirebaseAdminApp();
  let decoded: DecodedIdToken;

  try {
    decoded = await getAuth(app).verifyIdToken(idToken, true);
  } catch {
    throw new AppError("Invalid or expired Google sign-in token. Please try again.", {
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  }

  const email = decoded.email?.trim().toLowerCase();
  if (!email) {
    throw new AppError(
      "Your Google account does not expose an email address. Use a different Google account or sign up with email.",
      { code: "VALIDATION_ERROR", statusCode: 400 },
    );
  }

  if (!decoded.email_verified) {
    throw new AppError(
      "Please verify your Google email address before signing in.",
      { code: "FORBIDDEN", statusCode: 403 },
    );
  }

  return {
    uid: decoded.uid,
    email,
    emailVerified: true,
    name: decoded.name ?? null,
    picture: decoded.picture ?? null,
  };
}
