# Life Admin Launch Checklist

## 1. Push The Repo

This folder is already initialized as a Git repo and committed on `main`.

Push it to a GitHub repository before creating the hosting service.

## 2. Deploy On Render

Use the `render.yaml` blueprint in the repo root.

In Render:

1. Create a new Blueprint from the GitHub repo.
2. Deploy the `life-admin` web service.

Render will run:

- Build command: `npm install && npm run build`
- Start command: `npm start`

## 3. Configure Firebase

Project:

- `gen-lang-client-0870601273`

Firestore database:

- `ai-studio-7921ac10-5416-4a99-b160-80aeb6056cee`

After the Render URL exists:

1. Enable Google sign-in in Firebase Authentication.
2. Add the Render domain to Firebase Auth authorized domains.
3. Leave Apple sign-in disabled unless you have Apple Developer access. If you later configure Sign in with Apple in Firebase and Apple Developer, set `VITE_ENABLE_APPLE_AUTH=true` in the hosting environment and redeploy.
4. Deploy Firestore rules and indexes:

   ```bash
   firebase deploy --only firestore
   ```

## 4. Verify

Open the Render URL and check:

1. Google sign-in works.
2. Apple sign-in is hidden unless the Apple provider is configured and `VITE_ENABLE_APPLE_AUTH=true`.
3. Creating a task works.
4. Editing a task with a reminder works.
5. Completing and deleting a task work.
