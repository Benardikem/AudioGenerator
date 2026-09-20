import type { Express, Request, Response } from "express";
import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * Video clips used as scene backgrounds (Luma and the like).
 *
 * Unlike scene photos and voiceovers, clips are kept as files on disk rather than rows in
 * PostgreSQL. A clip is tens of megabytes; in the database every one of them would land in the
 * nightly pg_dump, and the backup keeps ten dumps, so a handful of ads would multiply into
 * gigabytes going to Backblaze every three days. On disk they are backed up once each instead.
 *
 * Served with byte ranges, which browsers require to seek and, in Safari, to play at all.
 *
 * These routes sit behind the login in auth.ts (installAuth runs first in server.ts).
 */

const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
const MAX_MUSIC_BYTES = 20 * 1024 * 1024;
/** <32 hex of the file's own contents>__<the name it was uploaded under>.<ext> */
const NAME = /^[a-f0-9]{32}(__[A-Za-z0-9._-]{1,48})?\.(mp4|webm|mp3|m4a|wav|ogg)$/;
const MUSIC_EXT = ["mp3", "m4a", "wav", "ogg"];
const TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
};
const extOf = (name: string) => name.split(".").pop()!.toLowerCase();
export const isMusic = (name: string) => MUSIC_EXT.includes(extOf(name));

/** Keeps the uploaded file name recognisable in the picker without letting it name a path. */
function safeLabel(raw: unknown) {
  const base = String(raw ?? "").split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/\.[A-Za-z0-9]+$/, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 48);
}

/**
 * The name as the person typed it, read back out of the stored file name. Clips uploaded before
 * names were kept fall back to a short piece of their checksum, so they can still be told apart.
 */
function labelOf(name: string) {
  const m = /^[a-f0-9]{32}__(.+)\.(mp4|webm|mp3|m4a|wav|ogg)$/.exec(name);
  if (m) return m[1];
  return `${isMusic(name) ? "Track" : "Clip"} ${name.slice(0, 6)}`;
}

/** Accepted uploads, by what the file actually starts with — not by the name or the stated type. */
function sniff(bytes: Buffer): "mp4" | "webm" | null {
  if (bytes.length > 12 && bytes.toString("latin1", 4, 8) === "ftyp") {
    // QuickTime .mov also says ftyp, and its brand is "qt  ". Chrome and Firefox won't play it.
    return bytes.toString("latin1", 8, 10) === "qt" ? null : "mp4";
  }
  if (bytes.length > 4 && bytes.readUInt32BE(0) === 0x1a45dfa3) return "webm";
  return null;
}

/** The same, for music tracks laid under an advert. */
function sniffMusic(bytes: Buffer): "mp3" | "m4a" | "wav" | "ogg" | null {
  if (bytes.length < 12) return null;
  const head = bytes.toString("latin1", 0, 4);
  if (head === "ID3") return "mp3";
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "mp3"; // a bare MPEG frame
  if (head === "RIFF" && bytes.toString("latin1", 8, 12) === "WAVE") return "wav";
  if (head === "OggS") return "ogg";
  if (bytes.toString("latin1", 4, 8) === "ftyp") return "m4a"; // M4A/AAC shares the MP4 container
  return null;
}

/** Set when the routes are installed, so the media screen can list and delete clips too. */
let mediaDir = "";

export interface StoredClip {
  url: string;
  label: string;
  bytes: number;
  uploadedAt: string;
}

export function listClips(): StoredClip[] {
  if (!mediaDir) return [];
  let names: string[];
  try {
    names = fs.readdirSync(mediaDir).filter((f) => NAME.test(f));
  } catch {
    return [];
  }
  return names
    .map((name) => {
      const stat = fs.statSync(path.join(mediaDir, name));
      return {
        url: `/api/scene-videos/${name}`,
        label: labelOf(name),
        bytes: stat.size,
        uploadedAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/** Deletes one clip. Whether anything still uses it is decided by the caller. */
export function removeClip(name: string): boolean {
  if (!mediaDir || !NAME.test(name)) return false;
  try {
    fs.unlinkSync(path.join(mediaDir, name));
    return true;
  } catch {
    return false;
  }
}

export function installSceneVideosApi(app: Express) {
  const dir =
    process.env.MEDIA_DIR ||
    (process.env.NODE_ENV === "production" ? "/data/media" : path.join(os.tmpdir(), "legitafrica-studio-media"));
  fs.mkdirSync(dir, { recursive: true });
  mediaDir = dir;
  console.log(`[clips] scene videos stored in ${dir}`);

  app.post(
    "/api/scene-videos",
    express.raw({ type: () => true, limit: MAX_VIDEO_BYTES }),
    (req: Request, res: Response) => {
      const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (bytes.length === 0) return res.status(400).json({ error: "The clip is empty." });

      const kind = sniff(bytes);
      if (!kind) {
        return res.status(400).json({ error: "Upload an MP4 or WebM clip. QuickTime .mov files will not play in every browser." });
      }

      // Named after its own contents, so uploading the same clip again — to a second scene, or
      // after switching a scene back to a photo — reuses the one file instead of storing it twice.
      const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 32);
      let name = "";
      try {
        const existing = fs.readdirSync(dir).find((f) => f.startsWith(hash) && NAME.test(f));
        if (existing) {
          name = existing;
        } else {
          const label = safeLabel(req.headers["x-clip-name"]);
          name = `${hash}${label ? `__${label}` : ""}.${kind}`;
          fs.writeFileSync(path.join(dir, name), bytes);
        }
      } catch (err) {
        console.error("[clips] could not save", err);
        return res.status(500).json({ error: "The clip could not be saved on the server." });
      }
      res.json({ url: `/api/scene-videos/${name}`, label: labelOf(name) });
    }
  );

  // Every clip uploaded so far, so a scene can go back to one instead of uploading it again.
  app.get("/api/scene-videos", (_req: Request, res: Response) => {
    res.json({ clips: listClips().filter((c) => !isMusic(c.url)).slice(0, 200) });
  });

  // Music laid under an advert, kept here too so a track can be reused on the next one.
  app.post("/api/music", express.raw({ type: () => true, limit: MAX_MUSIC_BYTES }), (req: Request, res: Response) => {
    const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (bytes.length === 0) return res.status(400).json({ error: "The track is empty." });

    const kind = sniffMusic(bytes);
    if (!kind) return res.status(400).json({ error: "Upload an MP3, M4A, WAV or OGG track." });

    const hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 32);
    let name = "";
    try {
      const existing = fs.readdirSync(dir).find((f) => f.startsWith(hash) && NAME.test(f));
      if (existing) {
        name = existing;
      } else {
        const label = safeLabel(req.headers["x-clip-name"]);
        name = `${hash}${label ? `__${label}` : ""}.${kind}`;
        fs.writeFileSync(path.join(dir, name), bytes);
      }
    } catch (err) {
      console.error("[music] could not save", err);
      return res.status(500).json({ error: "The track could not be saved on the server." });
    }
    res.json({ url: `/api/scene-videos/${name}`, label: labelOf(name) });
  });

  app.get("/api/music", (_req: Request, res: Response) => {
    res.json({ tracks: listClips().filter((c) => isMusic(c.url)).slice(0, 200) });
  });

  app.get("/api/scene-videos/:name", (req: Request, res: Response) => {
    const name = req.params.name;
    // The name is generated here and checked against that exact shape, so no path can escape dir.
    if (!NAME.test(name)) return res.status(404).json({ error: "Clip not found." });

    const file = path.join(dir, name);
    let total: number;
    try {
      total = fs.statSync(file).size;
    } catch {
      return res.status(404).json({ error: "Clip not found." });
    }

    res.setHeader("Content-Type", TYPES[extOf(name)] || "application/octet-stream");
    res.setHeader("Accept-Ranges", "bytes");
    // The name is the clip's own checksum, so these bytes never change: cache it for good.
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");

    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
    if (!range || (range[1] === "" && range[2] === "")) {
      res.setHeader("Content-Length", total);
      return fs.createReadStream(file).pipe(res);
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
    fs.createReadStream(file, { start, end }).pipe(res);
  });
}
