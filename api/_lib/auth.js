/**
 * Shared authorization for the email functions. Import-only (_lib is not a route).
 *
 * Confirms the caller's token is genuine (by replaying it to the backend), then
 * authorizes Super Admins / Church Admins from the verified token claims, or an
 * allowlisted login code.
 */
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
    return res.status;
  } catch (e) {
    console.error("verify fetch failed:", path, e?.message || e);
    return 0;
  }
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

function isAdminFromClaims(claims) {
  if (!claims) return false;
  const dept = String(claims.department || "").trim().toLowerCase();
  const role = String(claims.role || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  const plvl = String(claims.permissionLevel || "").trim().toUpperCase();
  return (
    dept === "super admin" ||
    dept === "church admin" ||
    role === "super-admin" ||
    role === "church-admin" ||
    plvl === "SUPER_ADMIN" ||
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

  const userStatus = await statusOf(authHeader, USER_VERIFY_PATH);
  if (userStatus !== 200) {
    const adminStatus = await statusOf(authHeader, ADMIN_VERIFY_PATH);
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
  if (isAdminFromClaims(claims)) return { ok: true, code };
  if (code && ALLOWLIST.includes(code)) return { ok: true, code };

  return { ok: false, status: 403, reason: "not_authorized" };
}
