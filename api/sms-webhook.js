/**
 * Vercel serverless function — POST /api/sms-webhook
 *
 * Receives SMS delivery event callbacks from Sendchamp and responds
 * with HTTP 200 OK. Logs delivery events to Supabase if configured.
 *
 * Security: the provider must call the URL with the shared secret, either as a
 * `?token=...` query param or an `x-webhook-secret` header, matching
 * SMS_WEBHOOK_SECRET.
 *
 * Sendchamp webhook payload sample:
 * {
 *   "service": "sms",
 *   "status": "delivered",
 *   "phone_number": "+2349039099438",
 *   "message": "...",
 *   "sms_uid": "e2a3a174-fd3a-47d3-ade5-f5f200dd116a",
 *   "reference": "6b25bd5ed71e0b4ab30cfdedfa32a707"
 * }
 */
import { insertRows, supabaseConfigured } from "./_lib/supabase.js";

function normalizeSmsEvent(payload) {
  if (!payload || typeof payload !== "object") return null;

  return {
    service: payload.service || "sms",
    status: payload.status || "unknown",
    phone_number: payload.phone_number || payload.recipient || payload.to || null,
    message: payload.message || null,
    sms_uid: payload.sms_uid || payload.id || null,
    reference: payload.reference || null,
    occurred_at: new Date().toISOString(),
    raw: payload,
  };
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "POST, GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const secret = process.env.SMS_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "SMS_WEBHOOK_SECRET is not configured." });
  }
  const provided =
    (req.query && (req.query.token || req.query.secret)) || req.headers["x-webhook-secret"];
  if (!safeEqual(String(provided || ""), secret)) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  // Health check / verification ping
  if (req.method === "GET") {
    return res.status(200).json({
      status: "active",
      message: "Sendchamp SMS webhook endpoint is healthy and ready.",
      timestamp: new Date().toISOString(),
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }

  console.log("Received Sendchamp SMS webhook event:", JSON.stringify(body));

  const events = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
    ? body.data
    : [body];

  const rows = events.map(normalizeSmsEvent).filter(Boolean);

  if (supabaseConfigured() && rows.length > 0) {
    try {
      await insertRows("sms_events", rows);
    } catch (e) {
      console.error("sms-webhook insert error:", e?.message || e);
      return res.status(500).json({ error: "Failed to store events." }); // provider will retry
    }
  }

  return res.status(200).json({
    received: true,
    count: rows.length,
    timestamp: new Date().toISOString(),
  });
}
