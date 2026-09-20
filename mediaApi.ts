import type { Express, Request, Response } from "express";
import { listClips, removeClip, isMusic } from "./sceneVideos";
import { listStoredImages, mediaUsage, removeStoredImage } from "./commercialsStore";

/**
 * The Media screen: everything uploaded for adverts — photos and video clips — with the adverts
 * that use each one, so unwanted files can be cleared out without guesswork.
 *
 * Deleting is refused while a saved advert still points at the file. Nothing here can break an
 * advert, which is the point: tidying up should not be a thing to be careful about.
 *
 * These routes sit behind the login in auth.ts (installAuth runs first in server.ts).
 */

const IMAGE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const CLIP_NAME = /^[a-f0-9]{32}(__[A-Za-z0-9._-]{1,48})?\.(mp4|webm|mp3|m4a|wav|ogg)$/;

export function installMediaApi(app: Express) {
  const usageFor = async () => {
    const uses = await mediaUsage();
    return new Map(uses.map((u) => [u.url, u.titles]));
  };

  app.get("/api/media", async (_req: Request, res: Response) => {
    try {
      const used = await usageFor();
      const clips = listClips().map((clip) => ({
        ...clip,
        kind: isMusic(clip.url) ? ("music" as const) : ("clip" as const),
        usedBy: used.get(clip.url) ?? [],
      }));
      const photos = (await listStoredImages()).map((image) => {
        const url = `/api/scene-images/${image.id}`;
        return {
          url,
          kind: "photo" as const,
          label: image.mime.replace("image/", "").toUpperCase(),
          bytes: image.bytes,
          uploadedAt: new Date(image.createdAt).toISOString(),
          usedBy: used.get(url) ?? [],
        };
      });
      const items = [...clips, ...photos].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      res.json({
        items,
        totalBytes: items.reduce((sum, i) => sum + i.bytes, 0),
        unusedBytes: items.filter((i) => i.usedBy.length === 0).reduce((sum, i) => sum + i.bytes, 0),
      });
    } catch (err) {
      console.error("[media]", err);
      res.status(500).json({ error: "The media library could not be read." });
    }
  });

  app.delete("/api/media", async (req: Request, res: Response) => {
    const url = String(req.query.url ?? "");
    try {
      const used = await usageFor();
      const titles = used.get(url) ?? [];
      if (titles.length > 0) {
        const list = titles.slice(0, 3).join(", ") + (titles.length > 3 ? ` and ${titles.length - 3} more` : "");
        return res.status(409).json({
          error: `Still used by ${list}. Remove it from those adverts first.`,
          usedBy: titles,
        });
      }

      const clip = /^\/api\/scene-videos\/(.+)$/.exec(url);
      if (clip && CLIP_NAME.test(clip[1])) {
        if (!removeClip(clip[1])) return res.status(404).json({ error: "That clip is no longer there." });
        return res.json({ deleted: url });
      }

      const photo = /^\/api\/scene-images\/(.+)$/.exec(url);
      if (photo && IMAGE_ID.test(photo[1])) {
        await removeStoredImage(photo[1]);
        return res.json({ deleted: url });
      }

      res.status(400).json({ error: "That is not a media file this studio stores." });
    } catch (err) {
      console.error("[media]", err);
      res.status(500).json({ error: "The file could not be deleted." });
    }
  });
}
