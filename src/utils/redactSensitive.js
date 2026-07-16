const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "authorization",
  "otp",
  "pin",
  "secret",
  "apikey",
  "api_key",
  "phonenumber",
  "phone",
  "email",
  "bvn",
]);

/**
 * Deep-clone and redact sensitive keys before logging or error reporting.
 */
export function redactSensitive(value, depth = 0) {
  if (depth > 6) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "string") {
    if (/^Bearer\s+/i.test(value)) return "Bearer [redacted]";
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, depth + 1));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        out[key] = "[redacted]";
      } else {
        out[key] = redactSensitive(val, depth + 1);
      }
    }
    return out;
  }
  return value;
}
