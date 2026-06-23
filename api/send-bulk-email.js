/**
 * Vercel serverless function — POST /api/send-bulk-email
 *
 * Sends a bulk email via Resend OR Brevo. Keys stay server-side. Each send is
 * tagged with a campaign id and logged to Supabase `bulk_emails` so it shows up
 * in the in-app report; delivery events arrive via api/email-webhook.js and are
 * linked back by that same campaign id.
 *
 * Request body: { subject, html, recipients[], provider?, requesterCode? }
 * Response:      { provider, campaignId, sent, failed[], errors? }
 *
 * Env: EMAIL_FROM, RESEND_API_KEY and/or BREVO_API_KEY, plus the auth/Supabase
 * vars documented in .env.example.
 */
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { ulid } from "ulid";
import { authorize } from "./_lib/auth.js";
import { insertRows, supabaseConfigured } from "./_lib/supabase.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_BATCH = 100;
const BREVO_BATCH = 1000;
const ZOHO_BATCH = 50;
const DEFAULT_FROM_NAME =
  process.env.EMAIL_FROM_NAME || "Harvesters International Christian Centre, Gbagada";

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function parseFrom(from) {
  const m = /^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/.exec(from || "");
  if (m) return { name: m[1] || undefined, email: m[2] };
  return { email: (from || "").trim() };
}

function resolveSender(raw) {
  const parsed = parseFrom(raw);
  const name = parsed.name || DEFAULT_FROM_NAME;
  return { name, email: parsed.email, header: `${name} <${parsed.email}>` };
}

async function sendViaResend({ from, subject, html, recipients, campaignId }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sent = 0;
  const failed = [];
  const errors = [];
  for (const group of chunk(recipients, RESEND_BATCH)) {
    const payload = group.map((to) => ({
      from,
      to,
      subject,
      html,
      tags: [{ name: "campaign_id", value: campaignId }],
      headers: { "X-Campaign-Id": campaignId },
    }));
    try {
      const { error } = await resend.batch.send(payload);
      if (error) {
        failed.push(...group);
        errors.push(error?.message || JSON.stringify(error));
        console.error("Resend batch error:", error);
      } else {
        sent += group.length;
      }
    } catch (e) {
      failed.push(...group);
      errors.push(e?.message || String(e));
      console.error("Resend batch threw:", e?.message || e);
    }
  }
  return { sent, failed, errors };
}

async function sendViaBrevo({ from, subject, html, recipients, campaignId }) {
  const sender = parseFrom(from);
  let sent = 0;
  const failed = [];
  const errors = [];
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
          tags: [campaignId],
          messageVersions: group.map((to) => ({ to: [{ email: to }] })),
        }),
      });
      if (apiRes.status === 201 || apiRes.status === 200) {
        sent += group.length;
      } else {
        failed.push(...group);
        const errText = await apiRes.text().catch(() => "");
        errors.push(`HTTP ${apiRes.status}: ${errText}`);
        console.error("Brevo error:", apiRes.status, errText);
      }
    } catch (e) {
      failed.push(...group);
      errors.push(e?.message || String(e));
      console.error("Brevo threw:", e?.message || e);
    }
  }
  return { sent, failed, errors };
}

async function sendViaZoho({ from, subject, html, recipients, campaignId }) {
  const sender = parseFrom(from);
  const transporter = nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST || "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_SMTP_USER,
      pass: process.env.ZOHO_SMTP_PASS,
    },
  });

  let sent = 0;
  const failed = [];
  const errors = [];

  for (const group of chunk(recipients, ZOHO_BATCH)) {
    const results = await Promise.allSettled(
      group.map((to) =>
        transporter.sendMail({
          from: sender.email ? `${sender.name || ""} <${sender.email}>` : from,
          to,
          subject,
          html,
          headers: { "X-Campaign-Id": campaignId },
        })
      )
    );

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "fulfilled") {
        sent++;
      } else {
        failed.push(group[i]);
        errors.push(results[i].reason?.message || String(results[i].reason));
        console.error("Zoho send failed:", group[i], results[i].reason?.message);
      }
    }
  }

  transporter.close();
  return { sent, failed, errors };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.EMAIL_FROM) {
    return res.status(500).json({ error: "EMAIL_FROM is not configured." });
  }

  // Parse body (needed for both auth and payload).
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }
  body = body || {};

  // Auth: admin (from verified token claims) or allowlisted code.
  const auth = await authorize(req.headers.authorization, body.requesterCode);
  if (!auth.ok) {
    console.error("bulk-email authorize failed:", auth.reason);
    return res.status(auth.status).json({ error: "Unauthorized.", reason: auth.reason });
  }

  const { subject, html, recipients } = body;
  if (!subject || !String(subject).trim()) {
    return res.status(400).json({ error: "Subject is required." });
  }
  if (!html || !String(html).trim()) {
    return res.status(400).json({ error: "Email body (html) is required." });
  }
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: "recipients[] is required." });
  }

  const provider = String(body.provider || process.env.EMAIL_PROVIDER || "resend").toLowerCase();
  if (provider !== "resend" && provider !== "brevo" && provider !== "zoho") {
    return res.status(400).json({ error: `Unknown provider "${provider}".` });
  }
  if (provider === "resend" && !process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "RESEND_API_KEY is not configured." });
  }
  if (provider === "brevo" && !process.env.BREVO_API_KEY) {
    return res.status(500).json({ error: "BREVO_API_KEY is not configured." });
  }
  if (provider === "zoho" && !process.env.ZOHO_SMTP_USER) {
    return res.status(500).json({ error: "ZOHO_SMTP_USER is not configured." });
  }

  const clean = [...new Set(recipients.map((r) => String(r).trim().toLowerCase()))].filter((r) =>
    EMAIL_RE.test(r)
  );
  if (clean.length === 0) {
    return res.status(400).json({ error: "No valid recipient addresses." });
  }

  const campaignId = ulid();
  const sender = resolveSender(process.env.EMAIL_FROM);
  const args = { from: sender.header, subject, html, recipients: clean, campaignId };

  const { sent, failed, errors } =
    provider === "zoho"
      ? await sendViaZoho(args)
      : provider === "brevo"
        ? await sendViaBrevo(args)
        : await sendViaResend(args);

  // Log the send to Supabase for the report (best-effort — never fail the send).
  if (supabaseConfigured()) {
    try {
      await insertRows("bulk_emails", [
        {
          id: campaignId,
          subject: String(subject).trim(),
          provider,
          sender: sender.header,
          sent_by: auth.code || null,
          recipients_count: clean.length,
          sent_count: sent,
          failed_count: failed.length,
        },
      ]);
    } catch (e) {
      console.error("bulk_emails log failed:", e?.message || e);
    }
  }

  const errorSample = [...new Set(errors || [])].slice(0, 3);
  return res.status(200).json({
    provider,
    campaignId,
    sent,
    failed,
    ...(errorSample.length ? { errors: errorSample } : {}),
  });
}
