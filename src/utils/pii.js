/**
 * Partial masking for list/table views. Detail pages may show full values.
 */

export function maskEmail(email) {
  const value = String(email ?? "").trim();
  if (!value || !value.includes("@")) return value || "-";
  const [local, domain] = value.split("@");
  if (!local || !domain) return "-";
  const visible = local.length <= 2 ? local[0] || "*" : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function maskPhone(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 4) return phone || "-";
  const last4 = digits.slice(-4);
  return `***${last4}`;
}
