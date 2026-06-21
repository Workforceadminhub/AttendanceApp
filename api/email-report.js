/**
 * Vercel serverless function — GET /api/email-report
 *
 * Returns the running list of bulk sends with aggregated deliverability,
 * for the in-app "Email activity" table. Same authorization as sending.
 *
 * Response: { sends: [ { id, subject, provider, sender, sent_by, created_at,
 *                        recipients_count, sent_count, failed_count,
 *                        stats: { delivered, opened, clicked, bounced,
 *                                 complained, unsubscribed, other, total } } ] }
 */
import { authorize } from "./_lib/auth.js";
import { selectRows, supabaseConfigured } from "./_lib/supabase.js";

// Map raw provider event names to summary buckets.
function bucket(event) {
  const e = String(event || "").toLowerCase();
  if (e.includes("deliver")) return "delivered";
  if (e.includes("uniqueopen") || e === "opened" || e === "open" || e.includes("open"))
    return "opened";
  if (e.includes("click")) return "clicked";
  if (e.includes("bounce") || e === "blocked" || e === "invalid_email" || e === "hardbounce" || e === "softbounce")
    return "bounced";
  if (e === "spam" || e.includes("complain")) return "complained";
  if (e.includes("unsub")) return "unsubscribed";
  return "other";
}

const EMPTY = () => ({
  delivered: 0,
  opened: 0,
  clicked: 0,
  bounced: 0,
  complained: 0,
  unsubscribed: 0,
  other: 0,
  total: 0,
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const auth = await authorize(req.headers.authorization, req.query?.requesterCode);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: "Unauthorized.", reason: auth.reason });
  }

  if (!supabaseConfigured()) {
    return res.status(500).json({ error: "Supabase is not configured." });
  }

  const limit = Math.min(Number(req.query?.limit) || 100, 500);

  try {
    const sends = await selectRows(
      "bulk_emails",
      `select=*&order=created_at.desc&limit=${limit}`
    );

    const stats = {};
    const ids = sends.map((s) => s.id).filter(Boolean);
    if (ids.length) {
      // PostgREST in.() — quote ids to be safe with special chars.
      const inList = ids.map((id) => `"${String(id).replace(/"/g, '""')}"`).join(",");
      const events = await selectRows(
        "email_events",
        `select=campaign_id,event&campaign_id=in.(${encodeURIComponent(inList)})&limit=100000`
      );
      for (const ev of events) {
        const s = (stats[ev.campaign_id] = stats[ev.campaign_id] || EMPTY());
        s[bucket(ev.event)] += 1;
        s.total += 1;
      }
    }

    const result = sends.map((s) => ({ ...s, stats: stats[s.id] || EMPTY() }));
    return res.status(200).json({ sends: result });
  } catch (e) {
    console.error("email-report error:", e?.message || e);
    return res.status(500).json({ error: "Failed to load report." });
  }
}
