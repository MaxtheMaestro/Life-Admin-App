<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy Life Admin

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7921ac10-5416-4a99-b160-80aeb6056cee

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Public Deployment

This app is set up as a Vite frontend served by a small Node/Express production server.

Use these settings on a Node host such as Render, Railway, Fly.io, or Cloud Run:

- Build command: `npm install && npm run build`
- Start command: `npm start`

For Firebase/Auth:

- Enable Google sign-in in Firebase Authentication.
- Add the deployed domain to Firebase Auth authorized domains.
- Deploy `firestore.rules` to the Firebase project used by `firebase-applet-config.json`.

See [LAUNCH.md](LAUNCH.md) for the full launch checklist.
