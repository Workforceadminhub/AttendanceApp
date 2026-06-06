/**
 * Minimal Supabase REST helpers — no SDK, just fetch. Used server-side by the
 * email functions with the SERVICE ROLE key (bypasses RLS).
 *
 * Files/folders prefixed with "_" inside /api are NOT exposed as routes by
 * Vercel, so this is import-only.
 */

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseConfigured() {
  return Boolean(URL && KEY);
}

function headers(extra = {}) {
  return {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** Insert one or more rows into a table. Throws on non-2xx. */
export async function insertRows(table, rows) {
  const res = await fetch(`${URL}/rest/v1/${table}`, {
    method: "POST",
    headers: headers({ Prefer: "return=minimal" }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase insert ${table} failed: HTTP ${res.status} ${text}`);
  }
}

/**
 * GET rows with a raw PostgREST query string (e.g. "select=*&order=created_at.desc&limit=50").
 * Returns the parsed JSON array.
 */
export async function selectRows(table, query = "") {
  const res = await fetch(`${URL}/rest/v1/${table}?${query}`, {
    method: "GET",
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase select ${table} failed: HTTP ${res.status} ${text}`);
  }
  return res.json();
}
