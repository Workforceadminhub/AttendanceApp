/**
 * Vercel serverless function — POST /api/send-bulk-email
 *
 * Sends a bulk email via Resend OR Brevo. Runs server-side on Vercel (same
 * deployment as the React app), so provider API keys never reach the browser.
 *
 * Request body (JSON):
 *   { subject: string, html: string, recipients: string[], provider?: "resend" | "brevo" }
 *
 * Response: { provider: string, sent: number, failed: string[] }
 *
 * Required Vercel environment variables:
 *   EMAIL_FROM       — a verified sender, e.g. "HICC Gbagada <noreply@yourdomain.org>".
 *   BACKEND_API_URL  — AWS API base used to verify the caller's token
 *                      (falls back to REACT_APP_BASE_URL if present).
 *   RESEND_API_KEY   — required to send via Resend.
 *   BREVO_API_KEY    — required to send via Brevo.
 * Optional:
 *   EMAIL_PROVIDER   — default provider when the request omits one ("resend" | "brevo").
 *                      Defaults to "resend".
 *   AUTH_VERIFY_PATH — authenticated GET path used to confirm the caller is an admin.
 *                      Defaults to "/api/super/admin/admins".
 */
import { Resend } from "resend";

const BACKEND_API_URL =
  process.env.BACKEND_API_URL || process.env.REACT_APP_BASE_URL || "";
// Endpoint that proves the caller is a Super Admin (admins-only resource).
const ADMIN_VERIFY_PATH =
  process.env.AUTH_VERIFY_PATH || "/api/super/admin/admins";
// Endpoint any authenticated user can hit — used to confirm an allowlisted
// (non-admin) caller's token is genuine before trusting its decoded claims.
const USER_VERIFY_PATH = process.env.USER_VERIFY_PATH || "/api/departments";

// Extra login codes granted access in addition to admins. Keep in sync with
// src/utils/bulkEmailAccess.js. Override via env (comma-separated).
const ALLOWLIST = (process.env.BULK_EMAIL_ALLOWLIST || "tolutrain,ayo")
  .split(",")
  .map((c) => c.trim().toLowerCase())
  .filter(Boolean);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_BATCH = 100; // Resend batch.send cap
const BREVO_BATCH = 1000; // Brevo messageVersions cap

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Parse "Name <email@x>" into { name, email }; "email@x" → { email }. */
function parseFrom(from) {
  const m = /^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/.exec(from || "");
  if (m) return { name: m[1] || undefined, email: m[2] };
  return { email: (from || "").trim() };
}

/** Replay the caller's token against a backend endpoint; true if it returns 200. */
async function tokenPasses(authHeader, path) {
  if (!authHeader || !/^Bearer\s+.+/i.test(authHeader)) return false;
  if (!BACKEND_API_URL) return false; // can't verify → deny by default
  try {
    const res = await fetch(`${BACKEND_API_URL}${path}`, {
      method: "GET",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/** Best-effort decode of a JWT payload (no signature check — see isAuthorized). */
function decodeJwt(authHeader) {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Pull the login code from JWT claims, trying common field names. */
function codeFromClaims(claims) {
  if (!claims) return "";
  const v =
    claims.code ??
    claims.username ??
    claims.preferred_username ??
    claims.name ??
    claims.sub ??
    "";
  return String(v).trim().toLowerCase();
}

/**
 * Authorize the caller. Two accepted paths:
 *  1. Admin — token is accepted by the Super Admin endpoint.
 *  2. Allowlist — token's login code is in ALLOWLIST AND the token is genuine
 *     (accepted by an endpoint any authenticated user can hit).
 * The allowlist path only trusts the token's decoded code AFTER confirming the
 * token is authentic, so a forged token can't impersonate an allowlisted code.
 */
async function isAuthorized(authHeader) {
  if (await tokenPasses(authHeader, ADMIN_VERIFY_PATH)) return true;

  const code = codeFromClaims(decodeJwt(authHeader));
  if (code && ALLOWLIST.includes(code)) {
    if (await tokenPasses(authHeader, USER_VERIFY_PATH)) return true;
  }
  return false;
}

/** Send via Resend — one message per recipient, batched. */
async function sendViaResend({ from, subject, html, recipients }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  const failed = [];
  for (const group of chunk(recipients, RESEND_BATCH)) {
    const payload = group.map((to) => ({ from, to, subject, html }));
    try {
      const { error } = await resend.batch.send(payload);
      if (error) {
        failed.push(...group);
        console.error("Resend batch error:", error);
      } else {
        sent += group.length;
      }
    } catch (e) {
      failed.push(...group);
      console.error("Resend batch threw:", e?.message || e);
    }
  }
  return { sent, failed };
}

/**
 * Send via Brevo (transactional API). Uses messageVersions so each recipient
 * gets their own message and addresses are never exposed to one another.
 */
async function sendViaBrevo({ from, subject, html, recipients }) {
  const sender = parseFrom(from);
  let sent = 0;
  const failed = [];
  for (const group of chunk(recipients, BREVO_BATCH)) {
    try {
      const apiRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender,
          subject,
          htmlContent: html,
          messageVersions: group.map((to) => ({ to: [{ email: to }] })),
        }),
      });
      if (apiRes.status === 201 || apiRes.status === 200) {
        sent += group.length;
      } else {
        failed.push(...group);
        const errText = await apiRes.text().catch(() => "");
        console.error("Brevo error:", apiRes.status, errText);
      }
    } catch (e) {
      failed.push(...group);
      console.error("Brevo threw:", e?.message || e);
    }
  }
  return { sent, failed };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.EMAIL_FROM) {
    return res.status(500).json({ error: "EMAIL_FROM is not configured." });
  }

  // ── Auth: caller must be a logged-in admin ──
  const authorized = await isAuthorized(req.headers.authorization);
  if (!authorized) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  // ── Parse + validate payload ──
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }
  const { subject, html, recipients } = body || {};

  if (!subject || !String(subject).trim()) {
    return res.status(400).json({ error: "Subject is required." });
  }
  if (!html || !String(html).trim()) {
    return res.status(400).json({ error: "Email body (html) is required." });
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: "recipients[] is required." });
  }

  // ── Resolve + validate provider ──
  const provider = String(
    body.provider || process.env.EMAIL_PROVIDER || "resend"
  ).toLowerCase();
  if (provider !== "resend" && provider !== "brevo") {
    return res.status(400).json({ error: `Unknown provider "${provider}".` });
  }
  if (provider === "resend" && !process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "RESEND_API_KEY is not configured." });
  }
  if (provider === "brevo" && !process.env.BREVO_API_KEY) {
    return res.status(500).json({ error: "BREVO_API_KEY is not configured." });
  }

  // De-dupe and keep only well-formed addresses.
  const clean = [
    ...new Set(recipients.map((r) => String(r).trim().toLowerCase())),
  ].filter((r) => EMAIL_RE.test(r));
  if (clean.length === 0) {
    return res.status(400).json({ error: "No valid recipient addresses." });
  }

  const args = {
    from: process.env.EMAIL_FROM,
    subject,
    html,
    recipients: clean,
  };
  const { sent, failed } =
    provider === "brevo" ? await sendViaBrevo(args) : await sendViaResend(args);

  return res.status(200).json({ provider, sent, failed });
}
