/**
 * Shared authorization for the email functions. Import-only (_lib is not a route).
 *
 * Confirms the caller's token is genuine (by replaying it to the backend), then
 * authorizes Super Admins from the verified token claims, or an
 * allowlisted login code (excluding Church Admins).
 */
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time secret comparison using SHA-256 digests so neither timing
 * nor secret length is leaked.
 */
export function safeCompareSecrets(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string" || !provided || !expected) {
    return false;
  }
  const hashA = createHash("sha256").update(provided, "utf8").digest();
  const hashB = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(hashA, hashB);
}

const BACKEND_API_URL =
  process.env.BACKEND_API_URL || process.env.REACT_APP_BASE_URL || "";
const ADMIN_VERIFY_PATH = process.env.AUTH_VERIFY_PATH || "/api/super/admin/admins";
const USER_VERIFY_PATH = process.env.USER_VERIFY_PATH || "/api/departments";

export const ALLOWLIST = (process.env.BULK_EMAIL_ALLOWLIST || "tolutrain,ayo,rhinoceros25@")
  .split(",")
  .map((c) => c.trim().toLowerCase())
  .filter(Boolean);

async function statusOf(authHeader, path) {
  try {
    const res = await fetch(`${BACKEND_API_URL}${path}`, {
      method: "GET",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
    });
    // Only the status matters; release the connection instead of leaving the
    // (list-sized) body unread.
    await res.body?.cancel().catch(() => {});
    return res.status;
  } catch (e) {
    console.error("verify fetch failed:", path, e?.message || e);
    return 0;
  }
}

// Tokens the backend accepted, remembered per warm function instance for up
// to a minute and never past the token's own exp. Every call used to replay
// the token to the backend first: one or two extra round trips per request.
const VERIFIED_TTL_MS = 60 * 1000;
const MAX_VERIFIED = 500;
const verifiedUntil = new Map();

/**
 * HTTP status the backend returns for this token on `path` (0 on network
 * failure). A recent 200 for the same token and path is served from memory.
 */
export async function verifyStatus(authHeader, path) {
  const key = `${path}:${createHash("sha256").update(authHeader).digest("hex")}`;
  const until = verifiedUntil.get(key);
  if (until && until > Date.now()) return 200;
  verifiedUntil.delete(key);

  const status = await statusOf(authHeader, path);
  if (status === 200) {
    const expMs = Number(decodeJwt(authHeader)?.exp) * 1000;
    const cap = Number.isFinite(expMs) && expMs > 0 ? expMs : Infinity;
    if (verifiedUntil.size >= MAX_VERIFIED) {
      verifiedUntil.delete(verifiedUntil.keys().next().value);
    }
    verifiedUntil.set(key, Math.min(Date.now() + VERIFIED_TTL_MS, cap));
  }
  return status;
}

export function decodeJwt(authHeader) {
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

export function isSuperAdminFromClaims(claims) {
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

export async function authorizeSuperAdmin(authHeader) {
  if (!authHeader || !/^Bearer\s+.+/i.test(authHeader)) {
    return { ok: false, status: 401, reason: "missing_bearer_token" };
  }
  if (!BACKEND_API_URL) {
    return { ok: false, status: 500, reason: "backend_url_not_configured" };
  }

  const status = await verifyStatus(authHeader, ADMIN_VERIFY_PATH);
  if (status === 0) {
    return { ok: false, status: 500, reason: "auth_verification_failed" };
  }
  if (status !== 200) {
    return { ok: false, status: 401, reason: `token_rejected (${status})` };
  }

  const claims = decodeJwt(authHeader);
  if (isSuperAdminFromClaims(claims)) {
    return { ok: true, claims };
  }

  return { ok: false, status: 403, reason: "super_admin_required" };
}

function isChurchAdminFromClaims(claims) {
  if (!claims) return false;
  const dept = String(claims.department || "").trim().toLowerCase();
  const role = String(claims.role || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  const plvl = String(claims.permissionLevel || "").trim().toUpperCase();
  return (
    dept === "church admin" ||
    role === "church-admin" ||
    plvl === "CHURCH_ADMIN"
  );
}

function codeFromClaims(claims) {
  if (!claims) return "";
  const v =
    claims.code ?? claims.username ?? claims.preferred_username ?? claims.name ?? claims.sub ?? "";
  return String(v).trim().toLowerCase();
}

/**
 * Returns { ok, status, reason } and, on success, { code } - the caller's
 * lowercased login code/id derived from the verified token claims only.
 * Identity is never taken from the request body or query; the second
 * parameter is accepted for backwards compatibility and ignored.
 */
export async function authorize(authHeader) {
  if (!authHeader || !/^Bearer\s+.+/i.test(authHeader)) {
    return { ok: false, status: 401, reason: "missing_bearer_token" };
  }
  if (!BACKEND_API_URL) {
    return { ok: false, status: 500, reason: "backend_url_not_configured" };
  }

  const userStatus = await verifyStatus(authHeader, USER_VERIFY_PATH);
  if (userStatus !== 200) {
    const adminStatus = await verifyStatus(authHeader, ADMIN_VERIFY_PATH);
    if (adminStatus !== 200) {
      return {
        ok: false,
        status: 401,
        reason: `token_rejected (user:${userStatus}, admin:${adminStatus})`,
      };
    }
  }

  const claims = decodeJwt(authHeader);
  const code = codeFromClaims(claims);
  if (isSuperAdminFromClaims(claims)) return { ok: true, code };
  if (isChurchAdminFromClaims(claims)) {
    return { ok: false, status: 403, reason: "not_authorized" };
  }
  if (code && ALLOWLIST.includes(code)) return { ok: true, code };

  return { ok: false, status: 403, reason: "not_authorized" };
}
