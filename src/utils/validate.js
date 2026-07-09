/**
 * Lightweight email check for legacy call sites.
 * Prefer zod `email` from utils/schemas.js in new forms.
 */
export const validateEmail = (email) => {
  const value = String(email ?? "").trim();
  if (!value) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) return false;
  return /\.(com|org|net|co|io|edu|gov|info|biz|app|dev|ai|tech|africa|ng)$/i.test(value);
};
