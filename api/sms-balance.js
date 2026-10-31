/**
 * Vercel serverless function — GET /api/sms-balance
 *
 * Retrieves wallet balance for Sendchamp or SmartSMSSolutions.
 * Restricted strictly to Super Admins.
 */
import { authorizeSuperAdmin } from "./_lib/auth.js";

const SENDCHAMP_API_KEY = process.env.SENDCHAMP_API_KEY || "";
const SENDCHAMP_WALLET_URL = "https://api.sendchamp.com/api/v1/wallet/wallet_balance";

const SMARTSMS_API_TOKEN = process.env.SMARTSMS_API_TOKEN || "";
const SMARTSMS_BALANCE_URL = "https://app.smartsmssolutions.com/io/api/client/v1/balance/";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  const auth = await authorizeSuperAdmin(authHeader);
  if (!auth.ok) {
    return res.status(auth.status).json({
      error: "Access denied. Super Admin access required.",
      reason: auth.reason,
    });
  }

  const provider = (req.query?.provider || "sendchamp").toLowerCase();

  if (provider === "smartsmssolutions") {
    if (!SMARTSMS_API_TOKEN) {
      return res.status(500).json({ error: "SMARTSMS_API_TOKEN is not configured." });
    }

    try {
      const response = await fetch(`${SMARTSMS_BALANCE_URL}?token=${SMARTSMS_API_TOKEN}`);
      const data = await response.json().catch(() => null);

      if (response.ok && data) {
        return res.status(200).json({
          success: true,
          data: {
            wallet_balance: data?.balance ?? data?.wallet_balance ?? 0,
            currency: data?.currency || "NGN",
            business_name: "SmartSMSSolutions",
          },
        });
      }

      // 502 so an upstream 401 is not mistaken for the caller's own auth failing.
      return res.status(502).json({
        error: data?.comment || data?.message || "Failed to retrieve SmartSMS balance.",
        providerStatus: response.status,
        details: data,
      });
    } catch (err) {
      console.error("SmartSMS balance fetch error:", err);
      return res.status(500).json({
        error: err?.message || "Failed to connect to SmartSMSSolutions balance service.",
      });
    }
  }

  // Default: Sendchamp balance
  if (!SENDCHAMP_API_KEY) {
    return res.status(500).json({ error: "SENDCHAMP_API_KEY is not configured." });
  }

  try {
    const response = await fetch(SENDCHAMP_WALLET_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDCHAMP_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data) {
      return res.status(200).json({
        success: true,
        data: data.data || data,
      });
    }

    // 502 so an upstream 401 is not mistaken for the caller's own auth failing.
    return res.status(502).json({
      error: data?.message || "Failed to retrieve Sendchamp wallet balance.",
      providerStatus: response.status,
      details: data,
    });
  } catch (err) {
    console.error("Sendchamp wallet fetch error:", err);
    return res.status(500).json({
      error: err?.message || "Failed to connect to Sendchamp wallet service.",
    });
  }
}
