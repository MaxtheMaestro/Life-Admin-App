# LifeAdmin Security Notes

## Current Protections

- User data is stored in Firestore and protected by `firestore.rules`.
- Task reads/writes are scoped to the signed-in user's `uid`.
- The app no longer includes Gemini or any private AI API key.
- The production server sends basic hardening headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` denying camera, microphone, geolocation, and payment APIs.
- Production requests are limited to whitelisted hosts/origins, and the app does not send CORS headers in production.
- Sign-in attempts are gated through `/api/auth/attempt` and rate-limited to 5 attempts per IP per window before Firebase Auth starts.
- Task inputs are sanitized and bounded before Firestore writes, with Firestore rules rejecting unexpected task fields.

## Firebase Web API Key

The Firebase web `apiKey` in `firebase-applet-config.json` is a public Firebase client identifier, not an admin secret. Firebase authorization is enforced by Firebase Auth and Firestore Security Rules, not by hiding this key.

Recommended console hardening:

1. In Google Cloud Console, restrict the Firebase browser API key to:
   - `https://life-admin-2wtl.onrender.com/*`
   - `https://gen-lang-client-0870601273.firebaseapp.com/*`
   - `http://localhost:*` only if local development is needed.
2. Restrict the key to only Firebase/Auth/Firestore APIs the app uses.
3. Keep Firestore rules deployed after every rules change.
4. Consider Firebase App Check if the app grows beyond personal/small-team use.

## Apple Sign-In

The code supports Apple sign-in through Firebase Auth, but Apple sign-in must also be enabled and configured in the Firebase Console and Apple Developer account before it can work in production.
The Apple button is hidden unless the production build is created with `VITE_ENABLE_APPLE_AUTH=true`.
