/**
 * Vercel serverless function — POST /api/email-webhook
 *
 * Receives email event callbacks from Brevo (and Resend) and logs ALL of them
 * to the Supabase `email_events` table, linked to the originating send via the
 * campaign id (the provider tag set in api/send-bulk-email.js).
 *
 * Security:
 *   - Resend signs every delivery (Svix). With RESEND_WEBHOOK_SECRET set, a
 *     Resend event is only accepted with a valid signature and a timestamp
 *     inside the replay window.
 *   - Brevo transactional webhooks aren't signed, so Brevo must call the URL
 *     with the shared secret, either as a `?token=...` query param or an
 *     `x-webhook-secret` header, matching EMAIL_WEBHOOK_SECRET.
 *
 * Env: EMAIL_WEBHOOK_SECRET, RESEND_WEBHOOK_SECRET, SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { insertRowsIdempotent, supabaseConfigured } from "./_lib/supabase.js";
import { safeCompareSecrets } from "./_lib/auth.js";

const MAX_EVENTS = 100;
const MAX_BODY_BYTES = 1024 * 1024;
const SVIX_TOLERANCE_SECONDS = 5 * 60;

/**
 * The request body exactly as sent. Signatures cover the raw bytes, so a
 * re-serialised parsed body cannot be used to check them.
 */
async function readRawBody(req) {
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  if (req.body !== undefined && req.body !== null) return null; // already parsed
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("Body too large."), { status: 413 });
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Verifies a Svix signature (the scheme Resend webhooks use). */
export function verifySvixSignature({ secret, id, timestamp, signature, rawBody, now = Date.now() }) {
  if (!secret || !id || !timestamp || !signature || typeof rawBody !== "string") return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > SVIX_TOLERANCE_SECONDS) return false;
  const key = Buffer.from(String(secret).replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  return String(signature)
    .split(" ")
    .some((part) => {
      const [version, value] = part.split(",");
      if (version !== "v1" || !value) return false;
      const given = Buffer.from(value, "base64");
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
}

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return undefined;
}

/** First tag value from common Brevo/Resend shapes (that's our campaign id). */
function campaignFrom(payload, data) {
  const t = pick(payload, "tag", "tags") ?? pick(data || {}, "tags", "tag");
  if (Array.isArray(t)) {
    const first = t[0];
    return typeof first === "object" ? first?.value ?? first?.name ?? null : first ?? null;
  }
  return t ?? null;
}

function normalize(payload) {
  if (!payload || typeof payload !== "object") return null;

  // Resend: { type: "email.delivered", created_at, data: { email_id, to, subject, tags } }
  if (typeof payload.type === "string" && payload.data) {
    const d = payload.data;
    const to = Array.isArray(d.to) ? d.to[0] : d.to;
    return {
      campaign_id: campaignFrom(payload, d),
      provider: "resend",
      event: payload.type.replace(/^email\./, ""),
      email: to || null,
      message_id: pick(d, "email_id", "id") || null,
      subject: d.subject || null,
      occurred_at: payload.created_at || null,
      raw: payload,
    };
  }

  // Brevo: { event, email, "message-id", subject, date, ts, tag/tags, ... }
  if (typeof payload.event === "string") {
    let occurred = pick(payload, "date");
    if (!occurred) {
      const ts = pick(payload, "ts", "ts_event", "ts_epoch");
      if (ts) occurred = new Date(Number(ts) * 1000).toISOString();
    }
    return {
      campaign_id: campaignFrom(payload),
      provider: "brevo",
      event: payload.event,
      email: pick(payload, "email", "recipient") || null,
      message_id: pick(payload, "message-id", "messageId") || null,
      subject: pick(payload, "subject") || null,
      occurred_at: occurred || null,
      raw: payload,
    };
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const sharedSecret = process.env.EMAIL_WEBHOOK_SECRET;
  const resendSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!sharedSecret && !resendSecret) {
    return res.status(500).json({ error: "No webhook secret is configured." });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (e) {
    return res.status(e?.status || 400).json({ error: "Could not read the request body." });
  }

  const svixId = req.headers["svix-id"];
  const signed =
    rawBody !== null &&
    verifySvixSignature({
      secret: resendSecret,
      id: svixId,
      timestamp: req.headers["svix-timestamp"],
      signature: req.headers["svix-signature"],
      rawBody,
    });
  const provided =
    (req.query && (req.query.token || req.query.secret)) || req.headers["x-webhook-secret"];
  const hasSharedSecret = safeCompareSecrets(String(provided || ""), sharedSecret || "");
  if (!signed && !hasSharedSecret) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  if (!supabaseConfigured()) {
    return res
      .status(500)
      .json({ error: "Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." });
  }

  let body = rawBody === null ? req.body : rawBody;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }

  const events = Array.isArray(body)
    ? body
    : Array.isArray(body?.items)
    ? body.items
    : [body];
  if (events.length > MAX_EVENTS) {
    return res.status(413).json({ error: `Too many events. Maximum is ${MAX_EVENTS} per request.` });
  }

  const rows = events.map(normalize).filter(Boolean);
  // Once Resend signing is configured, the shared secret alone no longer
  // vouches for a Resend event.
  if (resendSecret && !signed && rows.some((row) => row.provider === "resend")) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  if (rows.length === 0) {
    console.warn("email-webhook: no recognisable events in payload");
    return res.status(200).json({ received: 0 });
  }

  try {
    // A provider retry repeats the same message, event and timestamp; the
    // unique index from db/messaging_hardening.sql skips it.
    await insertRowsIdempotent("email_events", rows, "provider,message_id,event,occurred_at");
  } catch (e) {
    console.error("email-webhook insert error:", e?.message || e);
    return res.status(500).json({ error: "Failed to store events." }); // provider will retry
  }

  return res.status(200).json({ received: rows.length });
}
