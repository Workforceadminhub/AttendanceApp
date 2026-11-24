/**
 * Sliding-window quotas backed by Supabase. Serverless instances share no
 * memory, so the counters live in the tables the sends are already logged to.
 * Import-only (_lib is not a route).
 */
import { insertRows, selectRows } from "./supabase.js";

const HOUR_MS = 60 * 60 * 1000;

function envNumber(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function quotaLimits(prefix, defaults) {
  return {
    maxSends: envNumber(`${prefix}_MAX_SENDS_PER_HOUR`, defaults.maxSends),
    maxUnits: envNumber(`${prefix}_MAX_RECIPIENTS_PER_HOUR`, defaults.maxUnits),
  };
}

/**
 * Rows this actor logged to `table` in the last `windowMs`.
 * Returns { count, units }. Throws when Supabase cannot be read, so callers
 * that guard paid sends can refuse instead of sending unmetered.
 */
export async function windowUsage(table, { actor, actorColumn, unitsColumn, windowMs = HOUR_MS }) {
  const since = new Date(Date.now() - windowMs).toISOString();
  const actorFilter = actor
    ? `${actorColumn}=eq.${encodeURIComponent(actor)}`
    : `${actorColumn}=is.null`;
  const rows = await selectRows(
    table,
    `select=${unitsColumn}&${actorFilter}&created_at=gte.${encodeURIComponent(since)}&limit=1000`
  );
  return {
    count: rows.length,
    units: rows.reduce((sum, row) => sum + (Number(row[unitsColumn]) || 0), 0),
  };
}

/**
 * { ok: true } when one more send of `units` recipients fits the actor's
 * hourly quota, otherwise { ok: false, error }.
 */
export async function checkSendQuota(table, columns, actor, units, limits) {
  const usage = await windowUsage(table, { actor, ...columns });
  if (usage.count >= limits.maxSends) {
    return { ok: false, error: `Hourly limit of ${limits.maxSends} sends reached. Try again later.` };
  }
  if (usage.units + units > limits.maxUnits) {
    const left = Math.max(limits.maxUnits - usage.units, 0);
    return {
      ok: false,
      error: `Hourly limit of ${limits.maxUnits} recipients reached (${left} left). Try again later.`,
    };
  }
  return { ok: true };
}

/**
 * Counts and records one use of a lightweight action in `api_usage`
 * (db/messaging_hardening.sql). Returns false when the actor is over `max`
 * for the hour. Fails open if the table is unreachable: these actions cost
 * nothing per call, unlike sends.
 */
export async function allowAction(action, actor, max) {
  try {
    const since = new Date(Date.now() - HOUR_MS).toISOString();
    const rows = await selectRows(
      "api_usage",
      `select=id&action=eq.${encodeURIComponent(action)}&actor=eq.${encodeURIComponent(actor || "unknown")}` +
        `&created_at=gte.${encodeURIComponent(since)}&limit=${max + 1}`
    );
    if (rows.length >= max) return false;
    await insertRows("api_usage", [{ action, actor: actor || "unknown" }]);
  } catch (e) {
    console.error("api_usage quota unavailable:", e?.message || e);
  }
  return true;
}
