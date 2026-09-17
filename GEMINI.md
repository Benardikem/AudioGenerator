# Instructions for AI agents editing this app

## Do not remove the login

This app is hosted publicly at https://studio.legitafrica.com. Every call to
`/api/generate-commercial-audio` and `/api/polish-script` is billed to a real Gemini API key,
so the whole app sits behind a password login.

When making any change, you must keep all of the following exactly as they are:

- **`auth.ts`** — the login. Do not delete, rename, rewrite or "simplify" this file.
- In **`server.ts`**, the line `import { installAuth } from "./auth";`
- In **`server.ts`**, the call `installAuth(app);`, which must stay **before** every other
  `app.use(...)`, `app.get(...)` and `app.post(...)`. Routes registered above it are public.
- **`Dockerfile`** and **`.dockerignore`** — used to deploy the app.

Do not add API routes that bypass the login, and do not add a login of your own alongside it.

## Do not move saving back to Firestore

Saved commercials are stored in the studio's own PostgreSQL database, not Firestore. Keep:

- **`commercialsStore.ts`** — the `/api/commercials` routes and the database.
- In **`server.ts`**, `import { installCommercialsApi } from "./commercialsStore";` and the call
  `installCommercialsApi(app);`, which must stay **after** `installAuth(app);`.
- **`src/lib/commercialsDb.ts`** — calls those routes. Do not rewrite it to use Firestore.

Firestore does not work for this app in production: the database AI Studio provisions refuses
requests from studio.legitafrica.com, and a Firestore document is capped at 1 MB while a
30-second voiceover is about 1.8 MB. In preview, saving uses a temporary in-memory store that is
cleared when the server restarts. That is expected, not a bug to fix by returning to Firestore.

Firebase itself is still used for Google sign-in in the Google Tasks panel. Leave that alone.

If a change seems to require touching any of the above, stop and ask the user first.

## Why the app may seem to work without a password in preview

In AI Studio preview and local development, `STUDIO_PASSWORD` is not set, so the login is
switched off. That is intentional. It does **not** mean the login is unused or safe to remove:
in production the server refuses to start without it.
