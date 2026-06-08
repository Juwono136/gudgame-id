import { eq } from "drizzle-orm";
import { createAuthEndpoint } from "@better-auth/core/api";
import { APIError } from "@better-auth/core/error";
import { setSessionCookie } from "better-auth/cookies";
import { parseUserOutput } from "better-auth/db";
import * as z from "zod";
import { getDb } from "@/db/client";
import { user } from "@/db/schema/auth";
import { GOOGLE_PROVIDER_ID } from "@/lib/auth/account-providers";
import { getUserAccountStatusById } from "@/lib/auth/account-status";
import { sendGoogleWelcomeEmail } from "@/lib/auth/google-welcome-email";
import { getProfileCompletionStatus } from "@/lib/auth/profile-completion";
import { verifyFirebaseGoogleIdToken } from "@/lib/firebase/admin";
import { importRemoteProfilePhoto } from "@/lib/storage/import-remote-image";
import { ensureDefaultPlayerRole } from "@/lib/roles/sync";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "auth/firebase-google" });

const bodySchema = z.object({
  idToken: z.string().min(10, "Missing Google sign-in token"),
});

export function firebaseGooglePlugin() {
  return {
    id: "firebase-google",
    endpoints: {
      signInWithGoogle: createAuthEndpoint(
        "/firebase/google",
        {
          method: "POST",
          body: bodySchema,
          metadata: {
            openapi: {
              description: "Sign in or register with Firebase Google ID token",
              responses: { "200": { description: "Session created" } },
            },
          },
        },
        async (ctx) => {
          let googleUser;
          try {
            googleUser = await verifyFirebaseGoogleIdToken(ctx.body.idToken);
          } catch (err) {
            if (err instanceof AppError) {
              throw new APIError("UNAUTHORIZED", { message: err.message });
            }
            throw err;
          }
          const { email, uid, name, picture } = googleUser;

          const displayName = name?.trim() || email.split("@")[0] || "Player";
          const existing = await ctx.context.internalAdapter.findUserByEmail(email);

          if (existing) {
            const accountStatus = await getUserAccountStatusById(existing.user.id);
            if (accountStatus && !accountStatus.isActive) {
              throw new APIError("FORBIDDEN", {
                message: "Account deactivated",
              });
            }

            const linked = await ctx.context.internalAdapter.findAccount(uid);
            if (!linked) {
              const accountLinking = ctx.context.options.account?.accountLinking;
              const canLink =
                accountLinking?.enabled !== false &&
                accountLinking?.disableImplicitLinking !== true &&
                existing.user.emailVerified;

              if (canLink) {
                await ctx.context.internalAdapter.linkAccount({
                  userId: existing.user.id,
                  providerId: GOOGLE_PROVIDER_ID,
                  accountId: uid,
                  scope: "openid,profile,email",
                  idToken: ctx.body.idToken,
                });
              }
            }

            const session = await ctx.context.internalAdapter.createSession(
              existing.user.id,
            );
            await setSessionCookie(ctx, {
              user: existing.user,
              session,
            });

            const [dbUser] = await getDb()
              .select()
              .from(user)
              .where(eq(user.id, existing.user.id))
              .limit(1);

            const profileStatus = dbUser
              ? getProfileCompletionStatus(dbUser)
              : { isComplete: true, missingFields: [], completionPercent: 100 };

            return ctx.json({
              token: session.token,
              user: parseUserOutput(ctx.context.options, existing.user),
              isNewUser: false,
              profileComplete: profileStatus.isComplete,
              missingProfileFields: profileStatus.missingFields,
            });
          }

          const importedPhoto = picture
            ? await importRemoteProfilePhoto(picture, email)
            : null;

          const newUser = await ctx.context.internalAdapter.createOAuthUser(
            {
              email,
              emailVerified: true,
              name: displayName,
              image: importedPhoto?.publicUrl ?? picture ?? undefined,
            },
            {
              providerId: GOOGLE_PROVIDER_ID,
              accountId: uid,
              idToken: ctx.body.idToken,
            },
          );

          if (!newUser) {
            log.error("createOAuthUser returned null", { email });
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Could not create your account. Please try again.",
            });
          }

          await getDb()
            .update(user)
            .set({
              fullNameKtp: displayName,
              image: importedPhoto?.publicUrl ?? picture ?? null,
              imageStorageKey: importedPhoto?.storageKey ?? null,
              updatedAt: new Date(),
            })
            .where(eq(user.id, newUser.user.id));

          await ensureDefaultPlayerRole(newUser.user.id);

          void sendGoogleWelcomeEmail({
            email,
            userName: displayName,
          });

          const session = await ctx.context.internalAdapter.createSession(
            newUser.user.id,
          );
          await setSessionCookie(ctx, {
            user: newUser.user,
            session,
          });

          const profileStatus = getProfileCompletionStatus({
            fullNameKtp: displayName,
            phone: null,
            phoneCountryCode: null,
            image: importedPhoto?.publicUrl ?? picture,
            imageStorageKey: importedPhoto?.storageKey ?? null,
          });

          return ctx.json({
            token: session.token,
            user: parseUserOutput(ctx.context.options, newUser.user),
            isNewUser: true,
            profileComplete: profileStatus.isComplete,
            missingProfileFields: profileStatus.missingFields,
          });
        },
      ),
    },
  };
}
