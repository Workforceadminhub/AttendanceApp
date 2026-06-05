/**
 * Vercel serverless function — POST /api/email-webhook
 *
 * Receives email event callbacks from Brevo (and Resend) and logs ALL of them
 * to the Supabase `email_events` table (see db/email_events.sql).
 *
 * Events captured: delivered, opened, click, hard_bounce, soft_bounce, spam,
 * unsubscribed, deferred, blocked, invalid_email, error (Brevo) and the
 * email.* equivalents (Resend).
 *
 * Security: the provider must call the URL with the shared secret, either as
 * a `?token=...` query param or an `x-webhook-secret` header, matching the
 * EMAIL_WEBHOOK_SECRET env var. (Brevo transactional webhooks aren't signed,
 * so a URL secret is the standard guard.)
 *
 * Required Vercel environment variables:
 *   SUPABASE_URL                — your Supabase project URL.
 *   SUPABASE_SERVICE_ROLE_KEY   — service role key (server-only; bypasses RLS).
 *   EMAIL_WEBHOOK_SECRET        — shared secret included in the webhook URL.
 */
import { createClient } from "@supabase/supabase-js";

/** Pull a value from common Brevo/Resend field name variants. */
function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return undefined;
}

/** Normalise one provider payload into an email_events row (or null if unrecognised). */
function normalize(payload) {
  if (!payload || typeof payload !== "object") return null;

  // Resend: { type: "email.delivered", created_at, data: { email_id, to, subject, from } }
  if (typeof payload.type === "string" && payload.data) {
    const d = payload.data;
    const to = Array.isArray(d.to) ? d.to[0] : d.to;
    return {
      provider: "resend",
      event: payload.type.replace(/^email\./, ""),
      email: to || null,
      message_id: pick(d, "email_id", "id") || null,
      subject: d.subject || null,
      occurred_at: payload.created_at || null,
      raw: payload,
    };
  }

  // Brevo: { event, email, "message-id", subject, date, ts, ... }
  if (typeof payload.event === "string") {
    let occurred = pick(payload, "date");
    if (!occurred) {
      const ts = pick(payload, "ts", "ts_event", "ts_epoch");
      if (ts) occurred = new Date(Number(ts) * 1000).toISOString();
    }
    return {
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

/** Constant-time-ish string compare to avoid trivial timing leaks. */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "EMAIL_WEBHOOK_SECRET is not configured." });
  }
  const provided =
    (req.query && (req.query.token || req.query.secret)) ||
    req.headers["x-webhook-secret"];
  if (!safeEqual(String(provided || ""), secret)) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res
      .status(500)
      .json({ error: "Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." });
  }

  // Parse body (Vercel usually parses JSON; fall back to manual).
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }

  // Brevo sends one event per call; some setups batch as an array. Handle both.
  const events = Array.isArray(body)
    ? body
    : Array.isArray(body?.items)
    ? body.items
    : [body];

  const rows = events.map(normalize).filter(Boolean);
  if (rows.length === 0) {
    // Acknowledge so the provider doesn't retry an unrecognised (e.g. test) ping.
    console.warn("email-webhook: no recognisable events in payload");
    return res.status(200).json({ received: 0 });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const { error } = await supabase.from("email_events").insert(rows);
    if (error) {
      console.error("email-webhook insert error:", error.message || error);
      // 500 → provider will retry, so we don't silently drop events.
      return res.status(500).json({ error: "Failed to store events." });
    }
  } catch (e) {
    console.error("email-webhook threw:", e?.message || e);
    return res.status(500).json({ error: "Failed to store events." });
  }

  return res.status(200).json({ received: rows.length });
}
