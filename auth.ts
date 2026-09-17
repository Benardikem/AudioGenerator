import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * Password login for the studio.
 *
 * The API routes spend money: every call to /api/generate-commercial-audio or /api/polish-script
 * is billed to the Gemini key on the server. Without this, anyone who found the address could
 * generate on that bill. So nothing is served — not the app, not the API — until you sign in.
 *
 * Enabled whenever STUDIO_PASSWORD is set. In production it is mandatory: the server refuses
 * to start without it rather than quietly running open. Local and AI Studio previews (no
 * password set, not production) run as before.
 */

const COOKIE = "studio_session";
const SESSION_DAYS = 7;
const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 15;

// Public without signing in: the login page itself, a health probe, and the logo it shows.
const PUBLIC_PATHS = new Set(["/login", "/logout", "/api/health", "/brand/logo-clean.png"]);

export function installAuth(app: Express) {
  const username = process.env.STUDIO_USERNAME ?? "";
  const password = process.env.STUDIO_PASSWORD ?? "";
  const secret = process.env.SESSION_SECRET ?? "";
  const production = process.env.NODE_ENV === "production";

  if (!password) {
    if (production) {
      throw new Error("STUDIO_PASSWORD is not set. Refusing to start the studio without a login in production.");
    }
    console.warn("[auth] STUDIO_PASSWORD not set — login disabled (development only).");
    return;
  }
  if (!username || secret.length < 32) {
    throw new Error("STUDIO_USERNAME and SESSION_SECRET (32+ chars) must be set alongside STUDIO_PASSWORD.");
  }

  // Behind Caddy: trust the one proxy hop so req.ip is the visitor, not Caddy.
  app.set("trust proxy", 1);

  const failures = new Map<string, { count: number; lockedUntil: number }>();

  function sign(payload: string) {
    return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  }

  function issue(res: Response) {
    const exp = Date.now() + SESSION_DAYS * 86_400_000;
    const payload = Buffer.from(JSON.stringify({ u: username, exp })).toString("base64url");
    res.cookie(COOKIE, `${payload}.${sign(payload)}`, {
      httpOnly: true,
      secure: production,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 86_400_000,
    });
  }

  function valid(req: Request) {
    const raw = readCookie(req, COOKIE);
    if (!raw) return false;
    const [payload, mac] = raw.split(".");
    if (!payload || !mac || !safeEqual(mac, sign(payload))) return false;
    try {
      const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
      // Changing the username (or the secret) signs everyone out.
      return u === username && typeof exp === "number" && exp > Date.now();
    } catch {
      return false;
    }
  }

  app.get("/login", (req, res) => {
    if (valid(req)) return res.redirect(safeNext(req.query.next));
    res.type("html").send(loginPage({ next: safeNext(req.query.next) }));
  });

  app.post("/login", express.urlencoded({ extended: false, limit: "10kb" }), (req, res) => {
    const ip = req.ip ?? "unknown";
    const now = Date.now();
    const entry = failures.get(ip);
    const next = safeNext(req.body?.next);

    if (entry && entry.lockedUntil > now) {
      const mins = Math.ceil((entry.lockedUntil - now) / 60_000);
      return res.status(429).type("html").send(loginPage({ next, error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` }));
    }

    // Compare both fields every time, so a wrong username and a wrong password take equally long.
    const okUser = safeEqual(String(req.body?.username ?? ""), username);
    const okPass = safeEqual(String(req.body?.password ?? ""), password);

    if (okUser && okPass) {
      failures.delete(ip);
      issue(res);
      return res.redirect(next);
    }

    const count = (entry && entry.lockedUntil <= now && entry.count >= MAX_FAILURES ? 0 : entry?.count ?? 0) + 1;
    failures.set(ip, { count, lockedUntil: count >= MAX_FAILURES ? now + LOCKOUT_MINUTES * 60_000 : 0 });
    console.warn(`[auth] failed login from ${ip} (${count}/${MAX_FAILURES})`);
    res.status(401).type("html").send(loginPage({ next, error: "Wrong username or password." }));
  });

  const logout = (_req: Request, res: Response) => {
    res.clearCookie(COOKIE, { path: "/" });
    res.redirect("/login");
  };
  app.post("/logout", logout);
  app.get("/logout", logout);

  // The gate. Registered before every other route, so nothing below it is reachable signed out.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (PUBLIC_PATHS.has(req.path) || valid(req)) return next();
    if (req.path.startsWith("/api/")) {
      return res.status(401).json({ error: "Signed out. Refresh the page and sign in again." });
    }
    res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  });

  // Add a sign-out button to the app page without touching the React code.
  if (production) {
    const indexPath = path.join(process.cwd(), "dist", "index.html");
    app.get(["/", "/index.html"], (_req, res, next) => {
      fs.readFile(indexPath, "utf8", (err, html) => {
        if (err) return next();
        res.type("html").send(html.replace("</body>", `${SIGN_OUT_BUTTON}</body>`));
      });
    });
  }
}

function readCookie(req: Request, name: string) {
  const header = req.headers.cookie ?? "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/** Constant-time string compare. Hashing first makes the lengths equal, as timingSafeEqual requires. */
function safeEqual(a: string, b: string) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Only same-site paths — never "//evil.com" or "https://…" — so the login can't be used as an open redirect. */
function safeNext(value: unknown) {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/";
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const SIGN_OUT_BUTTON = `<form method="post" action="/logout" style="position:fixed;right:14px;bottom:14px;z-index:2147483647;margin:0">
<button type="submit" style="font:600 13px system-ui,sans-serif;padding:8px 14px;border-radius:999px;border:1px solid #eae3d4;background:#fff;color:#181614;box-shadow:0 2px 8px rgba(0,0,0,.08);cursor:pointer">Sign out</button></form>`;

function loginPage({ next, error }: { next: string; error?: string }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Sign in · LegitAfrica Studio</title>
<style>
  :root { --cream:#fbf8f1; --card:#fff; --ink:#181614; --soft:#6b6256; --line:#eae3d4; --brand:#e8a317; --brand-dark:#c6860c; --err:#b42318; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px 16px;
         background:var(--cream); color:var(--ink); font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; }
  .card { width:100%; max-width:380px; background:var(--card); border:1px solid var(--line); border-radius:18px;
          padding:32px 28px; box-shadow:0 8px 30px rgba(24,22,20,.06); }
  .logo { display:block; height:34px; margin:0 auto 6px; }
  h1 { font-size:20px; margin:14px 0 4px; text-align:center; }
  p.sub { margin:0 0 22px; text-align:center; color:var(--soft); font-size:14px; }
  label { display:block; font-size:13px; font-weight:600; margin:14px 0 6px; }
  input { width:100%; padding:11px 12px; font:inherit; color:var(--ink); background:#fff;
          border:1px solid var(--line); border-radius:10px; outline:none; }
  input:focus { border-color:var(--brand); box-shadow:0 0 0 3px rgba(232,163,23,.2); }
  button { width:100%; margin-top:22px; padding:12px; font:600 15px system-ui,sans-serif; color:var(--ink);
           background:var(--brand); border:0; border-radius:10px; cursor:pointer; }
  button:hover { background:var(--brand-dark); color:#fff; }
  .error { margin:0 0 4px; padding:10px 12px; border-radius:10px; background:#fdecea; color:var(--err); font-size:14px; }
</style>
</head>
<body>
  <main class="card">
    <img class="logo" src="/brand/logo-clean.png" alt="LegitAfrica">
    <h1>Studio</h1>
    <p class="sub">Sign in to create commercials</p>
    ${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ""}
    <form method="post" action="/login">
      <input type="hidden" name="next" value="${escapeHtml(next)}">
      <label for="username">Username</label>
      <input id="username" name="username" autocomplete="username" required autofocus>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Sign in</button>
    </form>
  </main>
</body>
</html>`;
}
