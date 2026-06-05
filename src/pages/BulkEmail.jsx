import { useState, useMemo, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { Button, Card } from "../components/ui";
import { buildEmail } from "../emails/template";
import { parseRecipients, sendBulkEmail } from "../services/email";

const PREVIEW_WIDTHS = { desktop: "100%", mobile: "375px" };

export default function BulkEmail() {
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [previewMode, setPreviewMode] = useState("desktop");
  const [provider, setProvider] = useState("resend");
  const [sending, setSending] = useState(false);
  const bodyRef = useRef(null);

  // Recipients are parsed live so the operator sees the count + bad entries.
  const { valid, invalid } = useMemo(
    () => parseRecipients(recipientsRaw),
    [recipientsRaw]
  );

  const html = useMemo(
    () =>
      buildEmail({
        preheader,
        heading,
        body,
        ctaLabel,
        ctaUrl,
      }),
    [preheader, heading, body, ctaLabel, ctaUrl]
  );

  /**
   * Apply a formatting action to the body textarea around the current
   * selection, then restore focus + a sensible cursor position.
   *   - "wrap": surround selection with `marker` on both sides (bold/italic)
   *   - "link": turn selection into [selection](url)
   *   - "list": prefix each selected line with "- "
   */
  const applyFormat = useCallback(
    (action, marker) => {
      const ta = bodyRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = body.slice(start, end);
      let insert = selected;
      // caret position (relative to insert start) when nothing was selected
      let emptyCaret = 0;

      if (action === "wrap") {
        const placeholder = marker === "**" ? "bold text" : "italic text";
        insert = `${marker}${selected || placeholder}${marker}`;
        emptyCaret = marker.length; // land just after the opening marker
      } else if (action === "link") {
        insert = `[${selected || "link text"}](https://)`;
        emptyCaret = 1; // land on the label
      } else if (action === "list") {
        const lines = (selected || "List item").split("\n");
        insert = lines.map((l) => (l.startsWith("- ") ? l : `- ${l}`)).join("\n");
        emptyCaret = 2; // after the "- "
      }

      setBody(body.slice(0, start) + insert + body.slice(end));

      requestAnimationFrame(() => {
        ta.focus();
        const caret = selected ? start + insert.length : start + emptyCaret;
        ta.setSelectionRange(caret, caret);
      });
    },
    [body]
  );

  const copyHtml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(html);
      toast.success("HTML copied to clipboard");
    } catch {
      toast.error("Could not copy HTML");
    }
  }, [html]);

  const handleSend = useCallback(async () => {
    if (!subject.trim()) return toast.error("Add a subject line.");
    if (valid.length === 0) return toast.error("Add at least one valid recipient.");

    const ok = window.confirm(
      `Send this email to ${valid.length} recipient${valid.length === 1 ? "" : "s"}?`
    );
    if (!ok) return;

    setSending(true);
    try {
      const res = await sendBulkEmail({ subject, html, recipients: valid, provider });
      const sent = res?.sent ?? valid.length;
      const failedCount = res?.failed?.length || 0;
      toast.success(
        `Sent to ${sent} recipient${sent === 1 ? "" : "s"} via ${provider}` +
          (failedCount ? ` (${failedCount} failed).` : ".")
      );
    } catch (err) {
      toast.error(err?.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  }, [subject, valid, html, provider]);

  const inputCls =
    "w-full rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-400";
  const labelCls = "block text-sm font-medium text-ink-700 mb-1.5";

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <Layout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-900">Bulk Email</h1>
          <p className="text-sm text-ink-500 mt-1">
            Compose a branded email, preview it exactly as recipients will see it, and send.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Composer ── */}
          <Card padding="lg" className="space-y-4">
            <div>
              <label className={labelCls}>Subject *</label>
              <input
                className={inputCls}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Workers' Meeting — This Saturday"
              />
            </div>

            <div>
              <label className={labelCls}>Inbox preview text</label>
              <input
                className={inputCls}
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="Short snippet shown in the inbox before opening"
              />
            </div>

            <div>
              <label className={labelCls}>Heading</label>
              <input
                className={inputCls}
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="Large title at the top of the email"
              />
            </div>

            <div>
              <label className={labelCls}>Body</label>
              <div className="flex items-center gap-1 mb-1.5 rounded-md border border-ink-200 bg-cream-100 px-1.5 py-1">
                {[
                  { key: "bold", title: "Bold", Icon: BoldIcon, run: () => applyFormat("wrap", "**") },
                  { key: "italic", title: "Italic", Icon: ItalicIcon, run: () => applyFormat("wrap", "*") },
                  { key: "link", title: "Link", Icon: LinkIcon, run: () => applyFormat("link") },
                  { key: "list", title: "Bullet list", Icon: ListBulletIcon, run: () => applyFormat("list") },
                ].map(({ key, title, Icon, run }) => (
                  <button
                    key={key}
                    type="button"
                    title={title}
                    aria-label={title}
                    onClick={run}
                    className="inline-flex items-center justify-center h-7 w-7 rounded text-ink-600 hover:bg-white hover:text-ink-900"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <textarea
                ref={bodyRef}
                className={`${inputCls} min-h-[160px] resize-y`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={"Write your message.\n\nLeave a blank line between paragraphs."}
              />
              <p className="text-xs text-ink-400 mt-1">
                Blank line = new paragraph. Use the toolbar for{" "}
                <strong>**bold**</strong>, <em>*italic*</em>, links and lists.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Button label</label>
                <input
                  className={inputCls}
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="e.g. Open dashboard"
                />
              </div>
              <div>
                <label className={labelCls}>Button link</label>
                <input
                  className={inputCls}
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Recipients *</label>
              <textarea
                className={`${inputCls} min-h-[100px] resize-y font-mono text-xs`}
                value={recipientsRaw}
                onChange={(e) => setRecipientsRaw(e.target.value)}
                placeholder="Paste emails separated by commas, spaces, or new lines"
              />
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className="text-forest font-medium">
                  {valid.length} valid recipient{valid.length === 1 ? "" : "s"}
                </span>
                {invalid.length > 0 && (
                  <span className="text-brick" title={invalid.join(", ")}>
                    {invalid.length} invalid (ignored)
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className={labelCls}>Send with</label>
              <div className="inline-flex rounded-md border border-ink-200 overflow-hidden text-sm">
                {[
                  { key: "resend", label: "Resend" },
                  { key: "brevo", label: "Brevo" },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setProvider(p.key)}
                    className={
                      "px-4 py-1.5 " +
                      (provider === p.key
                        ? "bg-ink-900 text-white"
                        : "bg-white text-ink-600 hover:bg-cream-200")
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSend} loading={sending} disabled={sending}>
                Send to {valid.length}
              </Button>
              <Button variant="ghost" onClick={copyHtml} disabled={sending}>
                Copy HTML
              </Button>
            </div>
          </Card>

          {/* ── Live preview ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-ink-700">Live preview</span>
              <div className="inline-flex rounded-md border border-ink-200 overflow-hidden text-xs">
                {["desktop", "mobile"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPreviewMode(mode)}
                    className={
                      "px-3 py-1.5 capitalize " +
                      (previewMode === mode
                        ? "bg-ink-900 text-white"
                        : "bg-white text-ink-600 hover:bg-cream-200")
                    }
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-center bg-ink-100 rounded-lg border border-ink-200 p-3 overflow-auto">
              <iframe
                title="Email preview"
                srcDoc={html}
                sandbox=""
                style={{
                  width: PREVIEW_WIDTHS[previewMode],
                  maxWidth: "100%",
                  height: "640px",
                  border: "none",
                  background: "#fff",
                  borderRadius: "6px",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          </div>
        </div>
      </Layout>
    </div>
  );
}
