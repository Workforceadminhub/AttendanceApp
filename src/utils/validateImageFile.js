const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/** First-byte signatures for common image formats. */
const SIGNATURES = [
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: "image/gif", bytes: [0x47, 0x49, 0x46] },
  { type: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], extra: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } },
];

function matchesSignature(view, sig) {
  if (view.length < sig.bytes.length) return false;
  for (let i = 0; i < sig.bytes.length; i += 1) {
    if (view[i] !== sig.bytes[i]) return false;
  }
  if (sig.extra) {
    const { offset, bytes } = sig.extra;
    if (view.length < offset + bytes.length) return false;
    for (let i = 0; i < bytes.length; i += 1) {
      if (view[offset + i] !== bytes[i]) return false;
    }
  }
  return true;
}

function detectImageType(view) {
  for (const sig of SIGNATURES) {
    if (matchesSignature(view, sig)) return sig.type;
  }
  return null;
}

function normalizeMime(type) {
  if (!type) return "";
  return type === "image/jpg" ? "image/jpeg" : type;
}

/**
 * Client-side image validation before upload (size + magic bytes).
 * Trusts file content over browser-reported MIME (some OSes leave type blank).
 * @param {File} file
 * @returns {Promise<{ ok: true, contentType: string } | { ok: false, error: string }>}
 */
export async function validateImageFile(file) {
  if (!file) return { ok: false, error: "No file selected." };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image must be under 5 MB." };
  }

  const header = await file.slice(0, 12).arrayBuffer();
  const view = new Uint8Array(header);
  const detected = detectImageType(view);
  if (!detected || !ALLOWED_TYPES.has(detected)) {
    return { ok: false, error: "Only JPEG, PNG, GIF, and WebP images are allowed." };
  }

  const declared = normalizeMime(file.type);
  if (declared && declared !== detected) {
    return { ok: false, error: "File type does not match its contents." };
  }

  return { ok: true, contentType: detected };
}

export { MAX_IMAGE_BYTES, ALLOWED_TYPES };
