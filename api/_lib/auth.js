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
// Identity endpoint: only answers 200 for a token the backend has verified, and
// its JSON body carries the caller's role.
const RBAC_VERIFY_PATH = process.env.RBAC_VERIFY_PATH || "/api/hub/rbac/me";
const ADMIN_VERIFY_PATH = process.env.AUTH_VERIFY_PATH || "/api/hub/super/admin/admins";
const USER_VERIFY_PATH = process.env.USER_VERIFY_PATH || "/api/departments";

/**
 * Server-only allowlist of non-Super-Admin identifiers (prefer email or user id)
 * granted bulk email access. Defaults to empty: never hardcode login secrets.
 */
export function getAllowlist() {
  return (process.env.BULK_EMAIL_ALLOWLIST || "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

export const ALLOWLIST = getAllowlist();

/** The Bearer header of a request, whichever case the runtime kept. */
export function bearerFrom(req) {
  const headers = req?.headers || {};
  const value = headers.authorization ?? headers.Authorization;
  return typeof value === "string" ? value : "";
}

async function backendGet(path, authHeader) {
  return fetch(`${BACKEND_API_URL}${path}`, {
    method: "GET",
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
      "Content-Type": "application/json",
    },
  });
}

async function statusOf(authHeader, path) {
  try {
    const res = await backendGet(path, authHeader);
    // Only the status matters; release the connection instead of leaving the
    // (list-sized) body unread.
    await res.body?.cancel().catch(() => {});
    return res.status;
  } catch (e) {
    console.error("verify fetch failed:", path, e?.message || e);
    return 0;
  }
}

// Results the backend gave for a token, remembered per warm function instance
// for up to a minute and never past the token's own exp.
const VERIFIED_TTL_MS = 60 * 1000;
const MAX_VERIFIED = 500;
const verified = new Map();

function cacheKey(authHeader, path) {
  return `${path}:${createHash("sha256").update(authHeader).digest("hex")}`;
}

function cacheGet(key) {
  const hit = verified.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  verified.delete(key);
  return undefined;
}

function cacheSet(key, authHeader, value) {
  const expMs = Number(decodeJwt(authHeader)?.exp) * 1000;
  const cap = Number.isFinite(expMs) && expMs > 0 ? expMs : Infinity;
  if (verified.size >= MAX_VERIFIED) verified.delete(verified.keys().next().value);
  verified.set(key, { until: Math.min(Date.now() + VERIFIED_TTL_MS, cap), value });
}

/**
 * HTTP status the backend returns for this token on `path` (0 on network
 * failure). A recent 200 for the same token and path is served from memory.
 */
export async function verifyStatus(authHeader, path) {
  const key = cacheKey(authHeader, path);
  if (cacheGet(key) !== undefined) return 200;
  const status = await statusOf(authHeader, path);
  if (status === 200) cacheSet(key, authHeader, true);
  return status;
}

/**
 * Asks the backend who this token belongs to. Returns { status, role } where
 * `role` comes from the backend's JSON body, not from the token payload.
 */
async function rbacIdentity(authHeader) {
  const key = cacheKey(authHeader, RBAC_VERIFY_PATH);
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;
  try {
    const res = await backendGet(RBAC_VERIFY_PATH, authHeader);
    if (res.status !== 200) {
      await res.body?.cancel().catch(() => {});
      return { status: res.status, role: "" };
    }
    const json = await res.json().catch(() => null);
    const data = json?.data && typeof json.data === "object" ? json.data : json;
    if (!data || typeof data !== "object") return { status: 0, role: "" };
    const rawRole = data.role && typeof data.role === "object" ? data.role.name : data.role;
    const value = { status: 200, role: String(rawRole ?? data.permissionLevel ?? "") };
    cacheSet(key, authHeader, value);
    return value;
  } catch (e) {
    console.error("verify fetch failed:", RBAC_VERIFY_PATH, e?.message || e);
    return { status: 0, role: "" };
  }
}

// USER_VERIFY_PATH only proves a token is genuine while the endpoint itself
// refuses anonymous callers. Probe it without a token and refuse to rely on it
// if it ever answers 200.
const USER_PATH_PROBE_TTL_MS = 10 * 60 * 1000;
let userPathProbe = { at: 0, requiresAuth: false };

async function userPathRequiresAuth() {
  if (Date.now() - userPathProbe.at < USER_PATH_PROBE_TTL_MS) return userPathProbe.requiresAuth;
  const status = await statusOf("", USER_VERIFY_PATH);
  const requiresAuth = status === 401 || status === 403;
  if (!requiresAuth) {
    console.error(`USER_VERIFY_PATH answered ${status} without a token; not used for verification.`);
  }
  userPathProbe = { at: Date.now(), requiresAuth };
  return requiresAuth;
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

/** Why a token must be refused before the backend is even asked, or null. */
function tokenProblem(claims) {
  if (!claims || typeof claims !== "object") return "malformed_token";
  if (claims.mustResetPassword === true || claims.must_reset_password === true) {
    return "password_reset_required";
  }
  const exp = Number(claims.exp);
  if (Number.isFinite(exp) && exp > 0 && exp * 1000 <= Date.now()) return "token_expired";
  return null;
}

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
}

export function isSuperAdminFromClaims(claims) {
  if (!claims) return false;
  const dept = String(claims.department || "").trim().toLowerCase();
  const role = normalizeRole(claims.role);
  const plvl = String(claims.permissionLevel || "").trim().toUpperCase();
  return (
    dept === "super admin" ||
    role === "super-admin" ||
    role === "superadmin" ||
    plvl === "SUPER_ADMIN"
  );
}

function isChurchAdminFromClaims(claims) {
  if (!claims) return false;
  const dept = String(claims.department || "").trim().toLowerCase();
  const role = normalizeRole(claims.role);
  const plvl = String(claims.permissionLevel || "").trim().toUpperCase();
  return (
    dept === "church admin" ||
    role === "church-admin" ||
    plvl === "CHURCH_ADMIN"
  );
}

/**
 * Confirms the token with the backend and resolves the caller's role.
 * Returns { ok: true, claims, isSuperAdmin, isChurchAdmin } or
 * { ok: false, status, reason }.
 *
 * The token payload is only read after the backend has accepted the token on
 * an endpoint that requires authentication, and the role prefers the
 * backend's own response body over the payload.
 */
async function verifyCaller(authHeader, { allowUserPath }) {
  if (!authHeader || !/^Bearer\s+.+/i.test(authHeader)) {
    return { ok: false, status: 401, reason: "missing_bearer_token" };
  }
  if (!BACKEND_API_URL) {
    return { ok: false, status: 500, reason: "backend_url_not_configured" };
  }

  const claims = decodeJwt(authHeader);
  const problem = tokenProblem(claims);
  if (problem) return { ok: false, status: 401, reason: problem };

  const rbac = await rbacIdentity(authHeader);
  if (rbac.status === 200) {
    const role = normalizeRole(rbac.role);
    if (role) {
      return {
        ok: true,
        claims,
        isSuperAdmin: role === "super-admin" || role === "superadmin",
        isChurchAdmin: role === "church-admin" || role === "churchadmin",
      };
    }
    return {
      ok: true,
      claims,
      isSuperAdmin: isSuperAdminFromClaims(claims),
      isChurchAdmin: isChurchAdminFromClaims(claims),
    };
  }

  // Legacy tokens the Hub identity endpoint does not accept.
  const adminStatus = await verifyStatus(authHeader, ADMIN_VERIFY_PATH);
  let userStatus = null;
  if (adminStatus !== 200 && allowUserPath && (await userPathRequiresAuth())) {
    userStatus = await verifyStatus(authHeader, USER_VERIFY_PATH);
  }
  if (adminStatus !== 200 && userStatus !== 200) {
    if (rbac.status === 0 && adminStatus === 0) {
      return { ok: false, status: 500, reason: "auth_verification_failed" };
    }
    return {
      ok: false,
      status: 401,
      reason: `token_rejected (rbac:${rbac.status}, admin:${adminStatus}, user:${userStatus ?? "skipped"})`,
    };
  }
  return {
    ok: true,
    claims,
    isSuperAdmin: isSuperAdminFromClaims(claims),
    isChurchAdmin: isChurchAdminFromClaims(claims),
  };
}

/**
 * Candidate identifiers extracted from verified JWT claims for server-side
 * allowlist matching. Deliberately excludes mutable display names (`claims.name`).
 */
function allowlistIdentifiersFromClaims(claims) {
  if (!claims) return [];
  const raw = [
    claims.email,
    claims.id,
    claims.sub,
    claims.username,
    claims.preferred_username,
    claims.code,
  ];
  return [
    ...new Set(
      raw
        .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
        .map((v) => String(v).trim().toLowerCase())
    ),
  ];
}

/**
 * Non-secret actor label stored in `bulk_emails.sent_by`.
 * Never persists a raw Pass ID (`claims.code`) in plaintext.
 */
function actorFromClaims(claims) {
  if (!claims) return "";
  const safe =
    claims.email ??
    claims.username ??
    claims.preferred_username ??
    claims.sub ??
    claims.id ??
    "";
  const normalized = String(safe).trim().toLowerCase();
  if (normalized) return normalized;
  if (claims.code) {
    const hash = createHash("sha256")
      .update(String(claims.code).trim().toLowerCase(), "utf8")
      .digest("hex")
      .slice(0, 12);
    return `pass:${hash}`;
  }
  return "";
}

/** Super Admins only. On success returns { ok, claims, code }. */
export async function authorizeSuperAdmin(authHeader) {
  const caller = await verifyCaller(authHeader, { allowUserPath: false });
  if (!caller.ok) return caller;
  if (caller.isSuperAdmin) {
    return { ok: true, claims: caller.claims, code: actorFromClaims(caller.claims) };
  }
  return { ok: false, status: 403, reason: "super_admin_required" };
}

/**
 * Super Admins, or an allowlisted identifier that is not a Church Admin.
 * Returns { ok, status, reason } and, on success, { code }: a non-secret
 * actor identifier. Identity is never taken from the request body or query.
 */
export async function authorize(authHeader) {
  const caller = await verifyCaller(authHeader, { allowUserPath: true });
  if (!caller.ok) return caller;

  const actor = actorFromClaims(caller.claims);
  if (caller.isSuperAdmin) return { ok: true, code: actor };
  if (caller.isChurchAdmin) {
    return { ok: false, status: 403, reason: "not_authorized" };
  }
  const allowlist = getAllowlist();
  const identifiers = allowlistIdentifiersFromClaims(caller.claims);
  if (allowlist.length > 0 && identifiers.some((id) => allowlist.includes(id))) {
    return { ok: true, code: actor };
  }

  return { ok: false, status: 403, reason: "not_authorized" };
}
