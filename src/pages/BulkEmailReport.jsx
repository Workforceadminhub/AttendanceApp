import { useEffect, useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { Button, Card } from "../components/ui";
import { fetchEmailReport } from "../services/email";
import { canSendBulkEmail } from "../utils/bulkEmailAccess";

const fmtDate = (iso) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const pct = (n, d) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "-");

export default function BulkEmailReport() {
  if (!canSendBulkEmail()) return <Navigate to="/" replace />;
  return <Report />;
}

function Report() {
  const [sends, setSends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmailReport();
      setSends(Array.isArray(data?.sends) ? data.sends : []);
    } catch (e) {
      setError(e?.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const th = "px-3 py-2 text-left text-xs font-semibold text-ink-600 uppercase tracking-wide whitespace-nowrap";
  const td = "px-3 py-2 text-sm text-ink-800 whitespace-nowrap";

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <Layout>
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">Email Activity</h1>
            <p className="text-sm text-ink-500 mt-1">
              Every bulk email sent, with live deliverability from provider webhooks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={load} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
            <Link to="/bulk-email">
              <Button>New email</Button>
            </Link>
          </div>
        </div>

        {error && (
          <Card className="mb-4 border-brick/40">
            <p className="text-sm text-brick">{error}</p>
            <p className="text-xs text-ink-500 mt-1">
              If this mentions Supabase, the events table/keys may not be configured yet.
            </p>
          </Card>
        )}

        <Card padding="none" className="overflow-x-auto">
          <table className="min-w-full divide-y divide-ink-100">
            <thead className="bg-cream-100">
              <tr>
                <th className={th}>Sent</th>
                <th className={th}>Subject</th>
                <th className={th}>By</th>
                <th className={th}>Provider</th>
                <th className={th}>Recipients</th>
                <th className={th}>Accepted</th>
                <th className={th}>Delivered</th>
                <th className={th}>Opened</th>
                <th className={th}>Clicked</th>
                <th className={th}>Bounced</th>
                <th className={th}>Spam</th>
                <th className={th}>Unsub</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {loading && sends.length === 0 ? (
                <tr>
                  <td className={td} colSpan={12}>
                    Loading…
                  </td>
                </tr>
              ) : sends.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-sm text-ink-500 text-center" colSpan={12}>
                    No bulk emails sent yet.
                  </td>
                </tr>
              ) : (
                sends.map((s) => {
                  const st = s.stats || {};
                  const denom = s.sent_count || s.recipients_count || 0;
                  return (
                    <tr key={s.id} className="hover:bg-cream-100">
                      <td className={td}>{fmtDate(s.created_at)}</td>
                      <td className={`${td} max-w-[260px] truncate`} title={s.subject}>
                        {s.subject}
                      </td>
                      <td className={td}>{s.sent_by || "-"}</td>
                      <td className={`${td} capitalize`}>{s.provider}</td>
                      <td className={td}>{s.recipients_count ?? "-"}</td>
                      <td className={td}>
                        {s.sent_count ?? 0}
                        {s.failed_count ? (
                          <span className="text-brick"> / {s.failed_count} failed</span>
                        ) : null}
                      </td>
                      <td className={td}>
                        {st.delivered ?? 0}{" "}
                        <span className="text-ink-400">({pct(st.delivered ?? 0, denom)})</span>
                      </td>
                      <td className={td}>
                        {st.opened ?? 0}{" "}
                        <span className="text-ink-400">({pct(st.opened ?? 0, denom)})</span>
                      </td>
                      <td className={td}>{st.clicked ?? 0}</td>
                      <td className={`${td} ${st.bounced ? "text-brick" : ""}`}>{st.bounced ?? 0}</td>
                      <td className={`${td} ${st.complained ? "text-brick" : ""}`}>
                        {st.complained ?? 0}
                      </td>
                      <td className={td}>{st.unsubscribed ?? 0}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>

        <p className="text-xs text-ink-400 mt-3">
          Deliverability updates as providers send webhook events. "Accepted" is what the
          provider took at send time; the rest arrive over the following minutes/hours.
        </p>
      </Layout>
    </div>
  );
}
