/**
 * Vercel serverless function — GET /api/sms-balance
 *
 * Retrieves current Sendchamp wallet balance.
 * Restricted strictly to Super Admins.
 */
import { decodeJwt } from "./_lib/auth.js";

const BACKEND_API_URL =
  process.env.BACKEND_API_URL || process.env.REACT_APP_BASE_URL || "";
const ADMIN_VERIFY_PATH = process.env.AUTH_VERIFY_PATH || "/api/super/admin/admins";
const SENDCHAMP_API_KEY =
  process.env.SENDCHAMP_API_KEY ||
  "sendchamp_live_$2a$10$V6/v3eAzTAUH07GCoBe.SuIaHd1IGwArDP3h52kvP1DpSzpIpHfb.";
const SENDCHAMP_WALLET_URL = "https://api.sendchamp.com/api/v1/wallet/wallet_balance";

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

    return res.status(response.status || 500).json({
      error: data?.message || "Failed to retrieve Sendchamp wallet balance.",
      details: data,
    });
  } catch (err) {
    console.error("Sendchamp wallet fetch error:", err);
    return res.status(500).json({
      error: err?.message || "Failed to connect to Sendchamp wallet service.",
    });
  }
}
