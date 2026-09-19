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


If a change seems to require touching any of the above, stop and ask the user first.

## Why the app may seem to work without a password in preview

In AI Studio preview and local development, `STUDIO_PASSWORD` is not set, so the login is
switched off. That is intentional. It does **not** mean the login is unused or safe to remove:
in production the server refuses to start without it.

## Layout decisions — do not undo

- The app opens on the list of saved ads. Opening or creating an ad shows its name, save status
  and Save button, then three steps: Script & Voiceover, Storyboard, Preview & Download.
- **Never generate a voiceover automatically** (for example on page load). Every generation is
  billed to the Gemini key. Only generate when the user presses the button.
- The "Push to GitHub" button and modal, the Google Tasks panel, the Campaigns drawer and the
  top-level Storyboard tab were removed on purpose. Do not add them back.

## Scenes belong to the ad being made

- An ad has **any number of scenes**, up to 24, and each scene lasts as long as its own spoken
  line. Do not reintroduce a fixed count of eight or equal-length scenes. The timing rules live in
  `src/utils/sceneTimeline.ts` and are used by the storyboard, the preview and the export.
- A scene is drawn from its `type`, never from its position: `photo`, `text` (a fly-in headline
  card with eyebrow, `*gold*` words, cream or photo background), and the LegitAfrica screens
  `logo`, `ui_search`, `ui_review`, `end_card`.
- Ads saved before this change have no `layoutVersion` and were drawn by position. `normalizeScenes`
  converts them on opening so they still look the same. Do not remove it.
## Scene video clips

- A scene can carry a video clip (`videoSrc`) that plays as its background instead of the photo.
  Clips are uploaded to **`sceneVideos.ts`**, which stores them as files on disk under `MEDIA_DIR`
  (a Docker volume at `/data/media` in production) and serves them with byte ranges.
- Do **not** move clips into PostgreSQL. Every clip would then land in each nightly `pg_dump`, and
  the backup keeps ten dumps per database, so a few adverts would cost gigabytes of storage every
  three days. The files are mirrored to Backblaze separately.
- In `server.ts`, keep `import { installSceneVideosApi } from "./sceneVideos";` and the call
  `installSceneVideosApi(app)` after `installAuth(app);`.
- **`mediaApi.ts`** is the Media screen (`src/components/MediaLibraryView.tsx`, reached from the
  header on the saved-ads page). It lists every uploaded photo and clip with the adverts using
  each one, and deletes the unused. Deleting a file a saved advert still points at is refused by
  the server, not just hidden in the UI — keep it that way, so tidying up can never break an advert.
- Clips are always muted and get no slow zoom — the footage already moves. The voiceover is the
  only sound in an advert.
- A clip shorter than its spoken line is filled by the scene's `clipFit`: `slow` (the default —
  played in slow motion so nothing repeats), `loop` or `hold` (freeze on the last frame). The rule
  lives in `clipFrameAt` in `src/utils/sceneTimeline.ts`; keep it there rather than inlining timing
  maths in the canvas drawing.
- A scene can hold for a set number of seconds (`lengthSeconds`) instead of taking a share of the
  voiceover by word count. Word counts only guess where words fall in the audio — a line said with
  pauses runs far longer — so this override must stay available; the rest of the voiceover is
  shared out between the scenes that have no set length.

- The `ui_search` screen's words come from the scene's `screenText` (search box, business found,
  review quote). It used to name a tailor's shop from the first campaign on every advert. The
  `ui_review` screen already takes its headline from the scene's own `voiceLine`.
- Never put a named business next to a bad review in an advert, in defaults, examples or generated
  scripts: an invented name may belong to a real business, and the claim is then defamatory. Good
  reviews may name a business; bad ones must not.
- A scene can carry an `overlay` card drawn over its picture — currently `debit_alert`, whose
  title, amount and two lines are typed by the user in the scene editor. This is how a campaign
  gets a graphic like a bank alert: as this scene's own words, editable, never hard-coded.
- Photo scenes draw only the scene's own photo. They used to draw fixed graphics from the first
  campaign (a ₦45,000 debit alert, a named tailor shop, a vendor call card, a WhatsApp chat) on top
  of every ad's photos. Do not add campaign-specific graphics back into the scene drawing; put them
  in a photo or a Text scene instead.
