/**
 * Token-refresh handler scaffold.
 *
 * STATUS: scaffold only — your backend must support refresh tokens for this
 * to do anything useful. If it doesn't, the current 401-redirect-to-login
 * flow in apiClient.js stays as-is and this file is dormant.
 *
 * If your backend WILL support refresh:
 *   1. Login response should include `refreshToken` alongside `accessToken`
 *   2. Add an endpoint POST /auth/refresh that takes refreshToken and returns
 *      a fresh accessToken (+ optionally a rotated refreshToken)
 *   3. On login (Login.jsx), persist the refresh token securely (NOT in
 *      localStorage if XSS is a concern — prefer an httpOnly cookie set by
 *      the server, or sessionStorage with short TTL)
 *   4. Wire the interceptor below into apiClient.js: on 401, call refresh,
 *      retry the original request, then fall through to the existing
 *      redirect-to-login if refresh also fails.
 */

const REFRESH_KEY = "refreshToken";

let refreshInFlight = null;

/**
 * Get a fresh access token. Multiple concurrent 401s share one refresh.
 * Returns the new access token, or null if refresh failed.
 */
export async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${process.env.REACT_APP_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const j = await res.json();
      const newAccess = j?.data?.accessToken || j?.accessToken;
      const newRefresh = j?.data?.refreshToken || j?.refreshToken;
      if (newAccess) sessionStorage.setItem("accessToken", newAccess);
      if (newRefresh) sessionStorage.setItem(REFRESH_KEY, newRefresh);
      return newAccess || null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function setRefreshToken(t) {
  if (t) sessionStorage.setItem(REFRESH_KEY, t);
  else sessionStorage.removeItem(REFRESH_KEY);
}

export function clearAuth() {
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem("authUser");
}
