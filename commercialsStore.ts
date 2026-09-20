import type { Express, Request, Response } from "express";
import pg from "pg";
import crypto from "crypto";

const randomId = () => crypto.randomBytes(16).toString("hex");

/**
 * DO NOT REMOVE OR SWITCH BACK TO FIRESTORE. See GEMINI.md.
 *
 * Saved commercials, kept in the studio's own PostgreSQL database on the server.
 *
 * Firestore couldn't do this job: the database AI Studio provisions refuses requests from
 * studio.legitafrica.com, and a Firestore document is capped at 1 MB while a 30-second
 * voiceover is about 1.8 MB as a data URL. Here the audio is stored as bytes in its own column
 * and served from /api/commercials/:id/audio, so listing commercials stays light and a saved
 * take plays like any other audio file.
 *
 * Every route here sits behind the login in auth.ts (installAuth runs first in server.ts).
 * Without DATABASE_URL — local and AI Studio previews — it falls back to an in-memory store
 * that forgets everything on restart. In production DATABASE_URL is required.
 */

type Timbre = "standard" | "baritone" | "bass";

interface RecordBody {
  title: string;
  script: string;
  voice: string;
  voiceName?: string;
  timbre?: Timbre;
  style: string;
  duration?: number;
  scenes?: string;
  aspectRatio?: string;
  /** The music track laid under this advert, as a /api/scene-videos/... url. */
  bgm?: string;
}

interface Audio {
  bytes: Buffer;
  mime: string;
}

interface Row {
  id: string;
  title: string;
  record: RecordBody;
  hasAudio: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** undefined = leave the stored audio as it is; null = remove it. */
type AudioChange = Audio | null | undefined;

interface StoredImage {
  id: string;
  mime: string;
  bytes: number;
  createdAt: Date;
}

interface Store {
  putImage(image: Audio): Promise<string>;
  getImage(id: string): Promise<Audio | null>;
  listImages(): Promise<StoredImage[]>;
  removeImage(id: string): Promise<void>;
  list(): Promise<Row[]>;
  get(id: string): Promise<Row | null>;
  upsert(id: string, record: RecordBody, audio: AudioChange, createdAt: Date): Promise<Row>;
  remove(id: string): Promise<void>;
  audio(id: string): Promise<Audio | null>;
}

const ID = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Set when the routes are installed, so the media screen can read and tidy the same store. */
let activeStore: Store | null = null;

export interface MediaUse {
  /** The media URL a saved advert points at. */
  url: string;
  /** Where it is used, e.g. "Lagos landlord Palava · scene 9". */
  titles: string[];
}

/**
 * Which saved adverts use which photo or clip. The media screen needs this to say what a file is
 * for, and to refuse to delete something an advert still depends on.
 */
export async function mediaUsage(): Promise<MediaUse[]> {
  if (!activeStore) return [];
  // url -> advert title -> the scene numbers in that advert, so the media screen can say exactly
  // where a file is used rather than only which advert holds it.
  const uses = new Map<string, Map<string, Set<number>>>();
  for (const row of await activeStore.list()) {
    let scenes: any[] = [];
    try {
      scenes = row.record.scenes ? JSON.parse(row.record.scenes) : [];
    } catch {
      continue; // unreadable scenes shouldn't make a file look unused and get deleted
    }
    if (!Array.isArray(scenes)) continue;
    if (typeof row.record.bgm === "string" && row.record.bgm.startsWith("/api/")) {
      if (!uses.has(row.record.bgm)) uses.set(row.record.bgm, new Map());
      const byAdvert = uses.get(row.record.bgm)!;
      if (!byAdvert.has(row.title)) byAdvert.set(row.title, new Set());
      byAdvert.get(row.title)!.add(0); // 0 = the advert itself, not a scene
    }
    scenes.forEach((scene, index) => {
      for (const url of [scene?.imageSrc, scene?.videoSrc]) {
        if (typeof url !== "string" || !url.startsWith("/api/")) continue;
        if (!uses.has(url)) uses.set(url, new Map());
        const byAdvert = uses.get(url)!;
        if (!byAdvert.has(row.title)) byAdvert.set(row.title, new Set());
        byAdvert.get(row.title)!.add(index + 1);
      }
    });
  }
  return [...uses].map(([url, byAdvert]) => ({
    url,
    titles: [...byAdvert].map(([title, scenes]) => {
      const numbers = [...scenes].sort((a, b) => a - b).filter((n) => n > 0);
      if (numbers.length === 0) return `${title} · music`;
      return `${title} · scene${numbers.length > 1 ? "s" : ""} ${numbers.join(", ")}`;
    }),
  }));
}

/** Saves an image into the same store scene photos use, and gives back its URL. */
export async function storeImage(bytes: Buffer, mime: string): Promise<string> {
  if (!activeStore) throw new Error("The studio store is not running.");
  const id = await activeStore.putImage({ bytes, mime });
  return `/api/scene-images/${id}`;
}

export async function listStoredImages(): Promise<StoredImage[]> {
  return activeStore ? activeStore.listImages() : [];
}

export async function removeStoredImage(id: string): Promise<void> {
  if (activeStore) await activeStore.removeImage(id);
}

export function installCommercialsApi(app: Express) {
  const store = createStore();
  activeStore = store;

  // Scene photos. Stored on their own and referenced by URL: embedded as data URLs they made the
  // saved scenes JSON megabytes long, and a single phone photo was enough to make Save fail.
  app.post("/api/scene-images", route(async (req, res) => {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/is.exec(String(req.body?.dataUrl ?? ""));
    if (!m) return res.status(400).json({ error: "Upload a JPG, PNG or WebP photo." });
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length === 0) return res.status(400).json({ error: "The photo is empty." });
    if (bytes.length > MAX_IMAGE_BYTES) return res.status(400).json({ error: "That photo is too large (8 MB max)." });
    const id = await store.putImage({ bytes, mime: m[1].toLowerCase() });
    res.json({ url: `/api/scene-images/${id}` });
  }));

  app.get("/api/scene-images", route(async (_req, res) => {
    const photos = (await store.listImages()).map((image) => ({
      url: `/api/scene-images/${image.id}`,
      bytes: image.bytes,
      uploadedAt: new Date(image.createdAt).toISOString(),
    }));
    res.json({ photos: photos.slice(0, 200) });
  }));

  app.get("/api/scene-images/:id", route(async (req, res) => {
    const image = ID.test(req.params.id) ? await store.getImage(req.params.id) : null;
    if (!image) return res.status(404).json({ error: "Photo not found." });
    res.setHeader("Content-Type", image.mime);
    // Content-addressed by a random id that never changes, so it can be cached for good.
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.end(image.bytes);
  }));

  app.get("/api/commercials", route(async (_req, res) => {
    res.json((await store.list()).map(toClient));
  }));

  app.get("/api/commercials/:id", route(async (req, res) => {
    const row = ID.test(req.params.id) ? await store.get(req.params.id) : null;
    if (!row) return res.status(404).json({ error: "Commercial not found." });
    res.json(toClient(row));
  }));

  app.put("/api/commercials/:id", route(async (req, res) => {
    const id = req.params.id;
    if (!ID.test(id)) return res.status(400).json({ error: "Invalid commercial id." });

    const parsed = parseRecord(req.body);
    if (typeof parsed === "string") return res.status(400).json({ error: parsed });

    const audio = await resolveAudio(store, id, req.body?.audioUrl);
    if (typeof audio === "string") return res.status(400).json({ error: audio });

    const created = new Date(req.body?.createdAt);
    const row = await store.upsert(id, parsed, audio, isNaN(created.getTime()) ? new Date() : created);
    res.json(toClient(row));
  }));

  app.delete("/api/commercials/:id", route(async (req, res) => {
    if (ID.test(req.params.id)) await store.remove(req.params.id);
    res.status(204).end();
  }));

  app.get("/api/commercials/:id/audio", route(async (req, res) => {
    const audio = ID.test(req.params.id) ? await store.audio(req.params.id) : null;
    if (!audio) return res.status(404).json({ error: "No audio saved for this commercial." });
    sendAudio(req, res, audio);
  }));
}

function toClient(row: Row) {
  return {
    ...row.record,
    id: row.id,
    title: row.title,
    // A real URL rather than a data URL: <audio> and fetch() both accept it, and the
    // version stamp stops a browser replaying a cached take after it's been replaced.
    audioUrl: row.hasAudio ? `/api/commercials/${row.id}/audio?v=${row.updatedAt.getTime()}` : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Same limits the Firestore rules enforced, so nothing that saved before is rejected now. */
function parseRecord(b: any): RecordBody | string {
  const str = (v: unknown, max: number, min = 0) => typeof v === "string" && v.length >= min && v.length <= max;
  if (!str(b?.title, 200, 1)) return "Title is required (up to 200 characters).";
  if (!str(b?.script, 10_000, 1)) return "Script is required (up to 10,000 characters).";
  if (!str(b?.voice, 100)) return "Invalid voice.";
  if (!str(b?.style, 100)) return "Invalid style.";
  if (b.voiceName !== undefined && !str(b.voiceName, 100)) return "Invalid voice name.";
  if (b.timbre !== undefined && !["standard", "baritone", "bass"].includes(b.timbre)) return "Invalid timbre.";
  if (b.duration !== undefined && typeof b.duration !== "number") return "Invalid duration.";
  if (b.scenes !== undefined && !str(b.scenes, 500_000)) return "Scenes are too large.";
  if (b.aspectRatio !== undefined && !str(b.aspectRatio, 10)) return "Invalid aspect ratio.";
  if (b.bgm !== undefined && b.bgm !== "" && !str(b.bgm, 300)) return "Invalid music track.";

  return {
    title: b.title,
    script: b.script,
    voice: b.voice,
    style: b.style,
    ...(b.voiceName !== undefined && { voiceName: b.voiceName }),
    ...(b.timbre !== undefined && { timbre: b.timbre }),
    ...(b.duration !== undefined && { duration: b.duration }),
    ...(b.scenes !== undefined && { scenes: b.scenes }),
    ...(b.aspectRatio !== undefined && { aspectRatio: b.aspectRatio }),
    ...(b.bgm !== undefined && { bgm: b.bgm }),
  };
}

/**
 * The app sends whatever audioUrl it's holding:
 * - a data URL, straight from generation → store those bytes
 * - our own /api/commercials/<id>/audio URL, from a loaded commercial → keep it, or copy it
 *   across when duplicating into a new id
 * - nothing → the take was cleared, so remove it
 */
async function resolveAudio(store: Store, id: string, url: unknown): Promise<AudioChange | string> {
  if (url === undefined || url === null || url === "") return null;
  if (typeof url !== "string") return "Invalid audio.";

  const data = /^data:(audio\/[a-z0-9.+-]+);base64,(.+)$/is.exec(url);
  if (data) {
    const bytes = Buffer.from(data[2], "base64");
    if (bytes.length === 0) return "Audio is empty.";
    if (bytes.length > MAX_AUDIO_BYTES) return "Audio is too large to save.";
    return { bytes, mime: data[1].toLowerCase() };
  }

  const ours = /^\/api\/commercials\/([A-Za-z0-9_-]{1,128})\/audio(?:\?.*)?$/.exec(url);
  if (ours) {
    if (ours[1] === id) return undefined;
    return (await store.audio(ours[1])) ?? null;
  }

  return "Audio must come from the voiceover generator.";
}

/** Serves byte ranges, so the audio player can seek without downloading the whole take again. */
function sendAudio(req: Request, res: Response, audio: Audio) {
  const total = audio.bytes.length;
  res.setHeader("Content-Type", audio.mime);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, max-age=31536000, immutable");

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (!range || (range[1] === "" && range[2] === "")) {
    res.setHeader("Content-Length", total);
    return res.end(audio.bytes);
  }

  let start = range[1] === "" ? total - Number(range[2]) : Number(range[1]);
  let end = range[1] === "" || range[2] === "" ? total - 1 : Number(range[2]);
  start = Math.max(0, start);
  end = Math.min(end, total - 1);
  if (start > end) {
    res.setHeader("Content-Range", `bytes */${total}`);
    return res.status(416).end();
  }
  res.status(206);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
  res.setHeader("Content-Length", end - start + 1);
  res.end(audio.bytes.subarray(start, end + 1));
}

function route(handler: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response) => {
    handler(req, res).catch((err) => {
      console.error("[commercials]", err);
      if (!res.headersSent) res.status(500).json({ error: "Could not reach the studio database." });
    });
  };
}

function createStore(): Store {
  const url = process.env.DATABASE_URL;
  if (url) return postgresStore(url);
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not set. Refusing to start the studio without somewhere to save commercials.");
  }
  console.warn("[commercials] DATABASE_URL not set — using an in-memory store that is lost on restart.");
  return memoryStore();
}

function postgresStore(connectionString: string): Store {
  const pool = new pg.Pool({ connectionString, max: 5 });

  let ready: Promise<unknown> | null = null;
  const init = () =>
    (ready ??= pool
      .query(`
        CREATE TABLE IF NOT EXISTS commercials (
          id          text PRIMARY KEY,
          title       text NOT NULL,
          record      jsonb NOT NULL,
          audio       bytea,
          audio_mime  text,
          created_at  timestamptz NOT NULL DEFAULT now(),
          updated_at  timestamptz NOT NULL DEFAULT now()
        )`)
      .catch((err) => {
        ready = null; // retry on the next request rather than staying broken
        throw err;
      }));

  let imagesReady: Promise<unknown> | null = null;
  const initImages = () =>
    (imagesReady ??= pool
      .query(`
        CREATE TABLE IF NOT EXISTS scene_images (
          id          text PRIMARY KEY,
          mime        text NOT NULL,
          bytes       bytea NOT NULL,
          created_at  timestamptz NOT NULL DEFAULT now()
        )`)
      .catch((err) => {
        imagesReady = null;
        throw err;
      }));

  const COLUMNS = "id, title, record, audio IS NOT NULL AS has_audio, created_at, updated_at";
  const toRow = (r: any): Row => ({
    id: r.id,
    title: r.title,
    record: r.record,
    hasAudio: r.has_audio,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });

  return {
    async putImage(image) {
      await initImages();
      // Named after the picture's own bytes, so uploading the same photo twice stores it once.
      const id = crypto.createHash("sha256").update(image.bytes).digest("hex").slice(0, 32);
      await pool.query(
        "INSERT INTO scene_images (id, mime, bytes) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
        [id, image.mime, image.bytes]
      );
      return id;
    },
    async getImage(id) {
      await initImages();
      const { rows } = await pool.query("SELECT mime, bytes FROM scene_images WHERE id = $1", [id]);
      return rows[0] ? { mime: rows[0].mime, bytes: rows[0].bytes } : null;
    },
    async listImages() {
      await initImages();
      // octet_length, not the bytes themselves: the media screen needs sizes, not the photos.
      const { rows } = await pool.query(
        "SELECT id, mime, octet_length(bytes) AS bytes, created_at FROM scene_images ORDER BY created_at DESC"
      );
      return rows.map((r: any) => ({ id: r.id, mime: r.mime, bytes: Number(r.bytes), createdAt: r.created_at }));
    },
    async removeImage(id) {
      await initImages();
      await pool.query("DELETE FROM scene_images WHERE id = $1", [id]);
    },
    async list() {
      await init();
      const { rows } = await pool.query(`SELECT ${COLUMNS} FROM commercials ORDER BY updated_at DESC`);
      return rows.map(toRow);
    },
    async get(id) {
      await init();
      const { rows } = await pool.query(`SELECT ${COLUMNS} FROM commercials WHERE id = $1`, [id]);
      return rows[0] ? toRow(rows[0]) : null;
    },
    async upsert(id, record, audio, createdAt) {
      await init();
      const keep = audio === undefined;
      const { rows } = await pool.query(
        `INSERT INTO commercials (id, title, record, audio, audio_mime, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (id) DO UPDATE SET
           title      = EXCLUDED.title,
           record     = EXCLUDED.record,
           audio      = CASE WHEN $7 THEN commercials.audio      ELSE EXCLUDED.audio      END,
           audio_mime = CASE WHEN $7 THEN commercials.audio_mime ELSE EXCLUDED.audio_mime END,
           updated_at = now()
         RETURNING ${COLUMNS}`,
        [id, record.title, record, audio?.bytes ?? null, audio?.mime ?? null, createdAt, keep],
      );
      return toRow(rows[0]);
    },
    async remove(id) {
      await init();
      await pool.query("DELETE FROM commercials WHERE id = $1", [id]);
    },
    async audio(id) {
      await init();
      const { rows } = await pool.query(
        "SELECT audio, audio_mime FROM commercials WHERE id = $1 AND audio IS NOT NULL",
        [id],
      );
      return rows[0] ? { bytes: rows[0].audio, mime: rows[0].audio_mime } : null;
    },
  };
}

function memoryStore(): Store {
  const rows = new Map<string, Row & { audio: Audio | null }>();
  const strip = ({ audio: _audio, ...row }: Row & { audio: Audio | null }): Row => row;
  const images = new Map<string, Audio>();

  return {
    async putImage(image) {
      const id = crypto.createHash("sha256").update(image.bytes).digest("hex").slice(0, 32);
      if (!images.has(id)) images.set(id, image);
      return id;
    },
    async getImage(id) {
      return images.get(id) ?? null;
    },
    async listImages() {
      return [...images].map(([id, image]) => ({
        id,
        mime: image.mime,
        bytes: image.bytes.length,
        createdAt: new Date(),
      }));
    },
    async removeImage(id) {
      images.delete(id);
    },
    async list() {
      return [...rows.values()].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).map(strip);
    },
    async get(id) {
      const r = rows.get(id);
      return r ? strip(r) : null;
    },
    async upsert(id, record, audio, createdAt) {
      const prev = rows.get(id);
      const next = {
        id,
        title: record.title,
        record,
        audio: audio === undefined ? prev?.audio ?? null : audio,
        hasAudio: false,
        createdAt: prev?.createdAt ?? createdAt,
        updatedAt: new Date(),
      };
      next.hasAudio = next.audio !== null;
      rows.set(id, next);
      return strip(next);
    },
    async remove(id) {
      rows.delete(id);
    },
    async audio(id) {
      return rows.get(id)?.audio ?? null;
    },
  };
}
