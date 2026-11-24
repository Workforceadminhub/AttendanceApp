/**
 * Vercel serverless function — POST /api/send-bulk-sms
 *
 * Supports Sendchamp & SmartSMSSolutions SMS APIs.
 * Keys stay server-side. Restricted strictly to Super Admins.
 *
 * Request body: { message, recipients[], sender_name?, route?, provider? }
 * Response:     { success: true, campaignId, sent, failed[], totalRecipients, errors? }
 */
import { ulid } from "ulid";
import { authorizeSuperAdmin, bearerFrom } from "./_lib/auth.js";
import { checkSendQuota, quotaLimits } from "./_lib/quota.js";
import { insertRows, supabaseConfigured } from "./_lib/supabase.js";

// Sendchamp Config
const SENDCHAMP_API_KEY = process.env.SENDCHAMP_API_KEY || "";
const SENDCHAMP_SEND_URL = "https://api.sendchamp.com/api/v1/sms/send";

// SmartSMSSolutions Config
const SMARTSMS_API_TOKEN = process.env.SMARTSMS_API_TOKEN || "";
const SMARTSMS_SEND_URL = "https://app.smartsmssolutions.com/io/api/client/v1/sms/";

const BATCH_SIZE = 100;
// Hard cap on recipients per request; the hourly per-user quota is checked
// against the bulk_sms log.
const MAX_BULK_RECIPIENTS = Number(process.env.MAX_BULK_RECIPIENTS) || 2000;
const MAX_MESSAGE_LENGTH = 1600;
// GSM sender IDs: 1 to 11 letters or digits.
const SENDER_NAME_RE = /^[A-Za-z0-9]{1,11}$/;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const auth = await authorizeSuperAdmin(bearerFrom(req));
  if (!auth.ok) {
    return res.status(auth.status).json({
      error: "Access denied. Super Admin access required.",
      reason: auth.reason,
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON request body." });
    }
  }

  const {
    message,
    recipients,
    sender_name: rawSenderName,
    route: rawRoute = "non_dnd",
    provider: rawProvider = "sendchamp",
  } = body || {};

  const sender_name = String(rawSenderName ?? "Sendchamp").trim();
  if (!SENDER_NAME_RE.test(sender_name)) {
    return res.status(400).json({ error: "Sender name must be 1 to 11 letters or digits." });
  }

  const provider = String(rawProvider || "sendchamp").trim().toLowerCase();
  if (provider !== "sendchamp" && provider !== "smartsmssolutions") {
    return res.status(400).json({ error: `Unknown SMS provider "${provider}".` });
  }

  const route = String(rawRoute || "non_dnd").trim().toLowerCase();
  if (route !== "non_dnd" && route !== "dnd" && route !== "international") {
    return res.status(400).json({ error: `Invalid SMS route "${route}".` });
  }

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "Message content is required." });
  }

  if (String(message).length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Message is too long. Maximum is ${MAX_MESSAGE_LENGTH} characters.` });
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: "At least one recipient phone number is required." });
  }
  if (recipients.length > MAX_BULK_RECIPIENTS) {
    return res.status(400).json({
      error: `Too many recipients. Maximum is ${MAX_BULK_RECIPIENTS} per request.`,
    });
  }

  // Ensure all recipients are cleaned, deduped phone strings without leading +
  const cleanRecipients = [
    ...new Set(recipients.map((p) => String(p).replace(/\D/g, "")).filter((p) => p.length >= 10)),
  ];

  if (cleanRecipients.length === 0) {
    return res.status(400).json({ error: "No valid recipient phone numbers provided." });
  }

  const actor = auth.code || null;
  if (supabaseConfigured()) {
    try {
      const quota = await checkSendQuota(
        "bulk_sms",
        { actorColumn: "sent_by", unitsColumn: "recipient_count" },
        actor,
        cleanRecipients.length,
        quotaLimits("BULK_SMS", { maxSends: 10, maxUnits: 5000 })
      );
      if (!quota.ok) return res.status(429).json({ error: quota.error });
    } catch (e) {
      // SMS spends wallet funds, so an unreadable quota refuses the send.
      console.error("bulk_sms quota check failed:", e?.message || e);
      return res.status(503).json({ error: "Could not check the sending quota. Try again shortly." });
    }
  }

  const campaignId = ulid();
  let sent = 0;
  const failed = [];
  const errors = [];
  const providerResponses = [];

  const batches = chunk(cleanRecipients, BATCH_SIZE);

  if (provider === "smartsmssolutions") {
    if (!SMARTSMS_API_TOKEN) {
      return res.status(500).json({
        error: "SmartSMSSolutions API Token is not configured. Please set SMARTSMS_API_TOKEN in environment variables.",
      });
    }

    // SmartSMSSolutions delivery routing: 3 = Standard / Non-DND, 4 = Direct Corporate / DND Bypass
    const smartRouting = route === "dnd" ? "4" : "3";

    for (const batch of batches) {
      try {
        const formData = new URLSearchParams();
        formData.append("token", SMARTSMS_API_TOKEN);
        formData.append("sender", sender_name);
        formData.append("to", batch.join(","));
        formData.append("message", String(message).trim());
        formData.append("type", "0");
        formData.append("routing", smartRouting);

        const response = await fetch(SMARTSMS_SEND_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: formData.toString(),
        });

        let resData = null;
        try {
          resData = await response.json();
        } catch {
          // non-JSON
        }

        if (response.ok && (resData?.code === 1000 || resData?.successful || resData?.status === "OK")) {
          sent += batch.length;
          providerResponses.push(resData);
        } else {
          failed.push(...batch);
          const errMsg = resData?.comment || resData?.error || resData?.message || `HTTP ${response.status}`;
          errors.push(errMsg);
          console.error("SmartSMS send batch error:", resData || response.status);
        }
      } catch (err) {
        failed.push(...batch);
        errors.push(err?.message || String(err));
        console.error("SmartSMS send exception:", err);
      }
    }
  } else {
    if (!SENDCHAMP_API_KEY) {
      return res.status(500).json({
        error: "Sendchamp API key is not configured. Please set SENDCHAMP_API_KEY in environment variables.",
      });
    }

    // Sendchamp Dispatch
    for (const batch of batches) {
      try {
        const payload = {
          to: batch,
          message: String(message).trim(),
          sender_name,
          route: route || "non_dnd",
        };

        const response = await fetch(SENDCHAMP_SEND_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SENDCHAMP_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        let resData = null;
        try {
          resData = await response.json();
        } catch {
          // non-JSON
        }

        if (response.ok && (resData?.status === "success" || resData?.code === 200 || resData?.data)) {
          sent += batch.length;
          providerResponses.push(resData);
        } else {
          failed.push(...batch);
          const errMsg = resData?.message || resData?.error || `HTTP ${response.status}`;
          errors.push(errMsg);
          console.error("Sendchamp send batch error:", resData || response.status);
        }
      } catch (err) {
        failed.push(...batch);
        errors.push(err?.message || String(err));
        console.error("Sendchamp send exception:", err);
      }
    }
  }

  // Optionally log to Supabase bulk_sms table
  if (supabaseConfigured()) {
    try {
      await insertRows("bulk_sms", [
        {
          id: campaignId,
          provider: provider || "sendchamp",
          sender_name,
          sent_by: actor,
          route: route || "non_dnd",
          message: String(message).trim(),
          recipient_count: cleanRecipients.length,
          sent_count: sent,
          failed_count: failed.length,
          created_at: new Date().toISOString(),
          details: { errors, responses: providerResponses },
        },
      ]);
    } catch (dbErr) {
      console.warn("Supabase bulk_sms log error (non-fatal):", dbErr?.message || dbErr);
    }
  }

  // Return error response if no messages could be sent
  if (sent === 0) {
    const mainError = errors[0] || `Failed to send SMS via ${provider}.`;
    return res.status(502).json({
      error: `${provider === "smartsmssolutions" ? "SmartSMSSolutions" : "Sendchamp"} error: ${mainError}`,
      errors,
      campaignId,
      totalRecipients: cleanRecipients.length,
      sent: 0,
      failed,
    });
  }

  return res.status(200).json({
    success: true,
    campaignId,
    provider,
    totalRecipients: cleanRecipients.length,
    sent,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
