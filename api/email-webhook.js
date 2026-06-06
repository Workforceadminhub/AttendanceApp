/**
 * Vercel serverless function — POST /api/email-webhook
 *
 * Receives email event callbacks from Brevo (and Resend) and logs ALL of them
 * to the Supabase `email_events` table, linked to the originating send via the
 * campaign id (the provider tag set in api/send-bulk-email.js).
 *
 * Security: the provider must call the URL with the shared secret, either as a
 * `?token=...` query param or an `x-webhook-secret` header, matching
 * EMAIL_WEBHOOK_SECRET. (Brevo transactional webhooks aren't signed.)
 *
 * Env: EMAIL_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { insertRows, supabaseConfigured } from "./_lib/supabase.js";

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
    (req.query && (req.query.token || req.query.secret)) || req.headers["x-webhook-secret"];
  if (!safeEqual(String(provided || ""), secret)) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  if (!supabaseConfigured()) {
    return res
      .status(500)
      .json({ error: "Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." });
  }

  let body = req.body;
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

  const rows = events.map(normalize).filter(Boolean);
  if (rows.length === 0) {
    console.warn("email-webhook: no recognisable events in payload");
    return res.status(200).json({ received: 0 });
  }

  try {
    await insertRows("email_events", rows);
  } catch (e) {
    console.error("email-webhook insert error:", e?.message || e);
    return res.status(500).json({ error: "Failed to store events." }); // provider will retry
  }

  return res.status(200).json({ received: rows.length });
}
