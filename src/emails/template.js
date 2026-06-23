/**
 * Harvesters Workers System — Email Design Standard
 * ===================================================
 * One source of truth for every transactional / bulk email the app sends.
 *
 * Email HTML is NOT web HTML: clients (Outlook, Gmail, Apple Mail) strip
 * <style> blocks, ignore flexbox/grid, and choke on modern CSS. The rules:
 *   - Layout with <table>, not divs.
 *   - All styling INLINE.
 *   - 600px max content width.
 *   - Web-safe font stack (Geist won't load in mail clients).
 *
 * Usage:
 *   import { buildEmail } from "../emails/template";
 *   const html = buildEmail({
 *     heading: "Welcome",
 *     paragraphs: ["Line one.", "Line two."],
 *     ctaLabel: "Open dashboard",
 *     ctaUrl: "https://example.com",
 *   });
 */

// ── Brand tokens (mirror tailwind.config.js so email matches the app) ──
export const BRAND = {
  ink: "#0A0E1A",
  inkBody: "#2C3142",
  inkMuted: "#6B6B66",
  sienna: "#B5471F",
  cream: "#FAFAF7",
  border: "#E5E5E0",
  white: "#FFFFFF",
};

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Escape user text so it can't break out of the HTML it's injected into. */
export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Allow only safe URL schemes in links (blocks javascript:, data:, etc.). */
function safeUrl(url = "") {
  const trimmed = String(url).trim();
  return /^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed) ? trimmed : "#";
}

/**
 * Render a single line of lightweight markdown to email-safe inline HTML.
 * Supported: **bold**, *italic*, [label](url). Input is escaped FIRST, then
 * markers are converted — so user text can never inject real tags.
 */
export function renderInline(text = "") {
  let out = escapeHtml(text);
  // links: [label](url) — escapeHtml already neutralised the url's quotes
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const href = safeUrl(url.replace(/&amp;/g, "&"));
    return `<a href="${escapeHtml(href)}" target="_blank" style="color:${BRAND.sienna};text-decoration:underline;">${label}</a>`;
  });
  // bold: **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic: *text* (after bold so it doesn't eat ** markers)
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return out;
}

/**
 * Turn a raw body string into email-safe block HTML.
 * Blocks are separated by blank lines. A block whose lines all start with
 * "- " becomes a bullet list; everything else becomes a paragraph.
 */
export function renderBody(body = "") {
  const blocks = String(body)
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      // image block: ![alt](url) on its own line
      const imgMatch = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(block.trim());
      if (imgMatch) {
        const alt = escapeHtml(imgMatch[1]);
        const src = safeUrl(imgMatch[2]);
        return `<img src="${escapeHtml(src)}" alt="${alt}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:6px;margin:0 0 16px;" />`;
      }

      const lines = block.split("\n");
      const isList = lines.every((l) => /^[-*]\s+/.test(l.trim()));
      if (isList) {
        const items = lines
          .map(
            (l) =>
              `<li style="margin:0 0 6px;font-size:16px;line-height:1.6;color:${BRAND.inkBody};">${renderInline(
                l.trim().replace(/^[-*]\s+/, "")
              )}</li>`
          )
          .join("");
        return `<ul style="margin:0 0 16px;padding-left:22px;">${items}</ul>`;
      }
      // join wrapped lines within a paragraph with <br/>
      const inner = lines.map((l) => renderInline(l)).join("<br/>");
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.inkBody};">${inner}</p>`;
    })
    .join("");
}

/**
 * Build a complete, email-safe HTML document from structured content.
 *
 * @param {Object} content
 * @param {string} [content.preheader]  Hidden inbox-preview snippet.
 * @param {string} [content.heading]    Large title at top of the card.
 * @param {string} [content.body]       Raw body text supporting lightweight
 *                                      markdown (**bold**, *italic*, [link](url),
 *                                      "- " bullet lists). Takes precedence over
 *                                      `paragraphs` when provided.
 * @param {string[]} [content.paragraphs] Legacy: plain-text paragraphs (escaped).
 * @param {string} [content.ctaLabel]   Button text (omit to hide button).
 * @param {string} [content.ctaUrl]     Button link.
 * @param {string} [content.footerNote] Small print above the standard footer.
 * @param {string} [content.orgName]    Brand name shown in header/footer.
 * @returns {string} Full HTML document.
 */
export function buildEmail({
  preheader = "",
  heading = "",
  body = "",
  paragraphs = [],
  ctaLabel = "",
  ctaUrl = "#",
  footerNote = "",
  orgName = "Harvesters International Christian Centre, Gbagada",
} = {}) {
  const year = "2026"; // app currentDate; avoids client-clock skew in snapshots

  // Prefer the rich `body` (markdown) path; fall back to the legacy array.
  const paragraphHtml = body
    ? renderBody(body)
    : (paragraphs || [])
        .filter((p) => String(p).trim() !== "")
        .map(
          (p) =>
            `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.inkBody};">${escapeHtml(
              p
            )}</p>`
        )
        .join("");

  const headingHtml = heading
    ? `<h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;font-weight:700;color:${BRAND.ink};">${escapeHtml(
        heading
      )}</h1>`
    : "";

  const ctaHtml = ctaLabel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
         <tr><td style="border-radius:6px;background-color:${BRAND.ink};">
           <a href="${escapeHtml(safeUrl(ctaUrl))}" target="_blank"
              style="display:inline-block;padding:12px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
             ${escapeHtml(ctaLabel)}
           </a>
         </td></tr>
       </table>`
    : "";

  const footerNoteHtml = footerNote
    ? `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${BRAND.inkMuted};">${escapeHtml(
        footerNote
      )}</p>`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(heading || orgName)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.cream};font-family:${FONT_STACK};">
  <!-- preheader: shows in inbox preview, hidden in body -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
    preheader
  )}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">

          <!-- brand bar -->
          <tr>
            <td style="height:4px;background-color:${BRAND.sienna};border-radius:8px 8px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- header -->
          <tr>
            <td style="background-color:${BRAND.white};padding:24px 40px 0;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">
              <span style="font-size:14px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.sienna};">${escapeHtml(
                orgName
              )}</span>
            </td>
          </tr>

          <!-- body card -->
          <tr>
            <td style="background-color:${BRAND.white};padding:24px 40px 40px;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">
              ${headingHtml}
              ${paragraphHtml}
              ${ctaHtml}
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td style="background-color:${BRAND.white};padding:24px 40px 32px;border-top:1px solid ${BRAND.border};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};border-radius:0 0 8px 8px;">
              ${footerNoteHtml}
              <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.inkMuted};">
                You're receiving this email as a worker of Harvesters International Christian Centre, Gbagada.<br />
                &copy; ${year} ${escapeHtml(orgName)}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export default buildEmail;
