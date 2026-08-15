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
import { decodeJwt } from "./_lib/auth.js";
import { insertRows, supabaseConfigured } from "./_lib/supabase.js";

const BACKEND_API_URL =
  process.env.BACKEND_API_URL || process.env.REACT_APP_BASE_URL || "";
const ADMIN_VERIFY_PATH = process.env.AUTH_VERIFY_PATH || "/api/super/admin/admins";

// Sendchamp Config
const SENDCHAMP_API_KEY =
  process.env.SENDCHAMP_API_KEY ||
  "sendchamp_live_$2a$10$V6/v3eAzTAUH07GCoBe.SuIaHd1IGwArDP3h52kvP1DpSzpIpHfb.";
const SENDCHAMP_SEND_URL = "https://api.sendchamp.com/api/v1/sms/send";

// SmartSMSSolutions Config
const SMARTSMS_API_TOKEN = process.env.SMARTSMS_API_TOKEN || "";
const SMARTSMS_SEND_URL = "https://app.smartsmssolutions.com/io/api/client/v1/sms/";

const BATCH_SIZE = 100;

function isSuperAdminFromClaims(claims) {
  if (!claims) return false;
  const dept = String(claims.department || "").trim().toLowerCase();
  const role = String(claims.role || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  const plvl = String(claims.permissionLevel || "").trim().toUpperCase();
  return (
    dept === "super admin" ||
    role === "super-admin" ||
    role === "superadmin" ||
    plvl === "SUPER_ADMIN"
  );
}

async function authorizeSuperAdmin(authHeader) {
  if (!authHeader || !/^Bearer\s+.+/i.test(authHeader)) {
    return { ok: false, status: 401, reason: "missing_bearer_token" };
  }
  if (!BACKEND_API_URL) {
    return { ok: false, status: 500, reason: "backend_url_not_configured" };
  }

  try {
    const res = await fetch(`${BACKEND_API_URL}${ADMIN_VERIFY_PATH}`, {
      method: "GET",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
    });
    if (res.status !== 200) {
      return { ok: false, status: 401, reason: `token_rejected (${res.status})` };
    }
  } catch (e) {
    console.error("verify fetch failed:", e?.message || e);
    return { ok: false, status: 500, reason: "auth_verification_failed" };
  }

  const claims = decodeJwt(authHeader);
  if (isSuperAdminFromClaims(claims)) {
    return { ok: true, claims };
  }

  return { ok: false, status: 403, reason: "super_admin_required" };
}

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

  const authHeader = req.headers.authorization || req.headers.Authorization;
  const auth = await authorizeSuperAdmin(authHeader);
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
    sender_name = "Sendchamp",
    route = "non_dnd",
    provider = "sendchamp",
  } = body || {};

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "Message content is required." });
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: "At least one recipient phone number is required." });
  }

  // Ensure all recipients are cleaned phone strings without leading +
  const cleanRecipients = recipients
    .map((p) => String(p).replace(/\D/g, ""))
    .filter((p) => p.length >= 10);

  if (cleanRecipients.length === 0) {
    return res.status(400).json({ error: "No valid recipient phone numbers provided." });
  }

  const campaignId = ulid();
  let sent = 0;
  const failed = [];
  const errors = [];
  const providerResponses = [];

  const batches = chunk(cleanRecipients, BATCH_SIZE);

  if (provider === "smartsmssolutions") {
    if (!SMARTSMS_API_TOKEN) {
      return res.status(400).json({
        error: "SmartSMSSolutions API Token is not configured. Please set SMARTSMS_API_TOKEN in environment variables.",
      });
    }

    // SmartSMSSolutions delivery routing: 3 = Standard / Non-DND, 4 = Direct Corporate / DND Bypass
    const smartRouting = route === "dnd" ? "4" : "3";

    for (const batch of batches) {
      try {
        const formData = new URLSearchParams();
        formData.append("token", SMARTSMS_API_TOKEN);
        formData.append("sender", String(sender_name).trim() || "HICC");
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
    // Sendchamp Dispatch
    for (const batch of batches) {
      try {
        const payload = {
          to: batch,
          message: String(message).trim(),
          sender_name: String(sender_name).trim() || "Sendchamp",
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
          sender_name: sender_name || "Sendchamp",
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
    return res.status(400).json({
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
    data: providerResponses,
  });
}
