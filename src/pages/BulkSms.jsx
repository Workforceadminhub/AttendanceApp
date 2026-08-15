import { useState, useMemo, useCallback, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  InformationCircleIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { Button, Card } from "../components/ui";
import {
  parsePhoneRecipients,
  calculateSmsSegments,
  sendBulkSms,
  fetchSmsBalance,
} from "../services/sms";
import { canSendBulkSms } from "../utils/bulkSmsAccess";

const DEFAULT_SENDER_NAME = "HICC";
const SENDER_SUGGESTIONS = ["HICC", "HICC Gbagada", "Sendchamp"];
const ROUTE_OPTIONS = [
  { value: "non_dnd", label: "Non-DND (Recommended)", desc: "Delivers to all active mobile numbers" },
  { value: "dnd", label: "DND Route", desc: "For DND-registered corporate routes" },
  { value: "international", label: "International", desc: "For non-Nigerian phone numbers" },
];

const TEMPLATES = [
  {
    name: "Workers' Meeting",
    text: "Dear Leader, this is a reminder for our Workers' Meeting this Saturday at 7:00 AM. Please be punctual. Harvesters Gbagada.",
  },
  {
    name: "Leaders' Meeting",
    text: "Dear Pastor/HOD, Leaders' Meeting holds this Saturday at 6:30 AM. Kindly confirm your attendance. Harvesters Gbagada.",
  },
  {
    name: "Attendance Reminder",
    text: "Hi! Kindly mark your attendance for today's service at attendance.hiccgbagada.com. God bless you!",
  },
];

export default function BulkSms() {
  if (!canSendBulkSms()) {
    return <Navigate to="/" replace />;
  }
  return <BulkSmsComposer />;
}

function BulkSmsComposer() {
  const [senderName, setSenderName] = useState(DEFAULT_SENDER_NAME);
  const [route, setRoute] = useState("non_dnd");
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Balance state
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState(null);

  // Computed recipients
  const { valid, invalid, duplicates } = useMemo(
    () => parsePhoneRecipients(recipientsRaw),
    [recipientsRaw]
  );

  // Computed message segment metrics
  const smsMetrics = useMemo(() => calculateSmsSegments(message), [message]);

  const totalSmsUnits = valid.length * Math.max(1, smsMetrics.segments);

  // Webhook URL
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/sms-webhook`
      : "https://attendance.hiccgbagada.com/api/sms-webhook";

  const loadBalance = useCallback(async () => {
    setLoadingBalance(true);
    setBalanceError(null);
    try {
      const data = await fetchSmsBalance();
      setBalance(data);
    } catch (err) {
      setBalanceError(err?.message || "Failed to load wallet balance");
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast.success("Webhook URL copied to clipboard");
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleClearInvalid = () => {
    setRecipientsRaw(valid.join("\n"));
    toast.info("Cleared invalid recipient entries");
  };

  const handleSampleRecipients = () => {
    setRecipientsRaw(
      "08031234567\n08098765432\n+2348123456789\n8109224274"
    );
  };

  const handleSend = async () => {
    if (!senderName.trim()) {
      return toast.error("Please provide a Sender Name.");
    }
    if (!message.trim()) {
      return toast.error("Please enter a message to send.");
    }
    if (valid.length === 0) {
      return toast.error("Please add at least one valid phone number.");
    }

    const confirmMsg = `Send SMS to ${valid.length} recipient${
      valid.length === 1 ? "" : "s"
    }?\n\n` +
      `• Sender: ${senderName.trim()}\n` +
      `• Segments per recipient: ${smsMetrics.segments}\n` +
      `• Total SMS units: ${totalSmsUnits}\n` +
      `• Route: ${route}`;

    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    setSendResult(null);

    try {
      const res = await sendBulkSms({
        message,
        recipients: valid,
        senderName,
        route,
      });

      setSendResult({
        success: true,
        sent: res?.sent || valid.length,
        failed: res?.failed || [],
        errors: res?.errors,
        campaignId: res?.campaignId,
      });

      toast.success(
        `SMS successfully dispatched to ${res?.sent || valid.length} recipient${
          (res?.sent || valid.length) === 1 ? "" : "s"
        }!`
      );

      // Refresh balance after send
      loadBalance();
    } catch (err) {
      toast.error(err?.message || "Failed to send bulk SMS.");
      setSendResult({
        success: false,
        error: err?.message || "Failed to send bulk SMS.",
      });
    } finally {
      setSending(false);
    }
  };

  const inputCls =
    "w-full rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-ink-900/10 focus:border-ink-400";
  const labelCls = "block text-sm font-medium text-ink-700 mb-1.5";

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <Layout>
        {/* Top Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                Sendchamp Live
              </span>
              <span className="text-xs font-medium text-ink-400">Super Admin Only</span>
            </div>
            <h1 className="text-2xl font-bold text-ink-900 mt-1">Bulk SMS Broadcast</h1>
            <p className="text-sm text-ink-500">
              Send SMS messages to workers, leaders, and attendees via Sendchamp.
            </p>
          </div>

          {/* Wallet Balance Widget */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-ink-200 shadow-sm shrink-0">
            <div className="p-2 bg-emerald-100/60 rounded-md text-emerald-700">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-ink-500 font-medium">Sendchamp Balance</p>
              <div className="flex items-center gap-2">
                {loadingBalance ? (
                  <span className="text-sm font-semibold text-ink-400">Loading...</span>
                ) : balanceError ? (
                  <span className="text-xs font-semibold text-rose-600">Offline</span>
                ) : (
                  <span className="text-base font-bold text-ink-900">
                    {balance?.wallet_balance != null
                      ? `₦${Number(balance.wallet_balance).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : balance?.balance != null
                      ? `₦${Number(balance.balance).toLocaleString()}`
                      : "Connected"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={loadBalance}
                  title="Refresh balance"
                  className="text-ink-400 hover:text-ink-700 transition"
                >
                  <ArrowPathIcon
                    className={`w-3.5 h-3.5 ${loadingBalance ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: SMS Composer */}
          <div className="lg:col-span-7 space-y-6">
            <Card padding="lg" className="space-y-5">
              <div className="border-b border-ink-100 pb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink-900 flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5 text-amber-600" />
                  Compose Broadcast
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-ink-500">Quick Template:</span>
                  <select
                    className="text-xs border border-ink-200 rounded px-2 py-1 bg-white text-ink-700"
                    onChange={(e) => {
                      const t = TEMPLATES.find((item) => item.name === e.target.value);
                      if (t) setMessage(t.text);
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select template...
                    </option>
                    {TEMPLATES.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sender Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls}>Sender Name (Sender ID) *</label>
                  <span className="text-xs text-ink-400">Max 11 alphanumeric chars</span>
                </div>
                <input
                  className={inputCls}
                  value={senderName}
                  maxLength={11}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. HICC"
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-ink-500">Suggestions:</span>
                  {SENDER_SUGGESTIONS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSenderName(name)}
                      className={`text-xs px-2.5 py-0.5 rounded-full border transition ${
                        senderName === name
                          ? "bg-ink-900 text-white border-ink-900"
                          : "bg-white text-ink-700 border-ink-200 hover:border-ink-400"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Route */}
              <div>
                <label className={labelCls}>Delivery Route</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ROUTE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRoute(opt.value)}
                      className={`text-left p-3 rounded-lg border text-xs transition ${
                        route === opt.value
                          ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 font-medium ring-1 ring-emerald-600"
                          : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
                      }`}
                    >
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-ink-500 text-[11px] mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipients Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls}>
                    Phone Numbers *{" "}
                    <span className="text-xs font-normal text-ink-500">
                      (separate by commas, spaces, or new lines)
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    {invalid.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearInvalid}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Remove invalid ({invalid.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSampleRecipients}
                      className="text-xs text-ink-500 hover:text-ink-800"
                    >
                      Fill sample
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  className={`${inputCls} font-mono text-xs`}
                  value={recipientsRaw}
                  onChange={(e) => setRecipientsRaw(e.target.value)}
                  placeholder="08031234567&#10;08098765432&#10;2348123456789&#10;+2348109224274"
                />

                {/* Recipient Statistics */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium ${
                      valid.length > 0
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    {valid.length} Valid recipient{valid.length === 1 ? "" : "s"}
                  </span>
                  {duplicates > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                      {duplicates} Duplicate{duplicates === 1 ? "" : "s"} removed
                    </span>
                  )}
                  {invalid.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircleIcon className="w-3.5 h-3.5" />
                      {invalid.length} Invalid entry (e.g. {invalid.slice(0, 2).join(", ")})
                    </span>
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls}>Message Text *</label>
                  <div className="flex items-center gap-2 text-xs">
                    {smsMetrics.isUnicode && (
                      <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Unicode (70 chars/seg)
                      </span>
                    )}
                    <span className="font-medium text-ink-600">
                      {smsMetrics.chars} chars · {smsMetrics.segments} segment
                      {smsMetrics.segments === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <textarea
                  rows={5}
                  className={inputCls}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your SMS message here..."
                />
                <div className="mt-1.5 flex items-center justify-between text-xs text-ink-500">
                  <span>
                    {smsMetrics.charsLeftInSegment} chars left in current segment
                  </span>
                  <span className="font-semibold text-ink-800">
                    Est. Total Units: {totalSmsUnits}
                  </span>
                </div>
              </div>

              {/* Send Button & Summary */}
              <div className="pt-3 border-t border-ink-100 flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSend}
                  loading={sending}
                  disabled={sending || valid.length === 0 || !message.trim()}
                  className="bg-emerald-700 hover:bg-emerald-800 font-semibold shadow-sm"
                >
                  <PaperAirplaneIcon className="w-4 h-4 mr-1.5 -rotate-45" />
                  {sending
                    ? "Dispatching SMS..."
                    : `Send to ${valid.length} Recipient${valid.length === 1 ? "" : "s"}`}
                </Button>
              </div>

              {/* Results Banner */}
              {sendResult && (
                <div
                  className={`p-4 rounded-lg border text-sm ${
                    sendResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  <div className="font-semibold flex items-center gap-2">
                    {sendResult.success ? (
                      <>
                        <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                        Dispatched Successfully
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="w-5 h-5 text-rose-600" />
                        Dispatch Failed
                      </>
                    )}
                  </div>
                  {sendResult.success && (
                    <p className="mt-1 text-xs text-emerald-700">
                      Successfully forwarded {sendResult.sent} message
                      {sendResult.sent === 1 ? "" : "s"} to Sendchamp.
                      {sendResult.failed?.length > 0 &&
                        ` (${sendResult.failed.length} failed)`}
                    </p>
                  )}
                  {sendResult.error && (
                    <p className="mt-1 text-xs text-rose-700">{sendResult.error}</p>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Mobile Live Preview & Webhook Card */}
          <div className="lg:col-span-5 space-y-6">
            {/* Realistic Phone Device Preview */}
            <Card padding="md" className="space-y-3">
              <div className="flex items-center justify-between border-b border-ink-100 pb-2.5">
                <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                  <DevicePhoneMobileIcon className="w-4 h-4 text-ink-500" />
                  Live Phone Preview
                </h3>
                <span className="text-xs text-ink-400">Recipient View</span>
              </div>

              {/* Smartphone Frame */}
              <div className="mx-auto max-w-[280px] bg-slate-900 rounded-[32px] p-2.5 shadow-xl border-4 border-slate-800">
                {/* Screen */}
                <div className="bg-slate-100 rounded-[22px] overflow-hidden flex flex-col h-[400px]">
                  {/* Phone Status Bar */}
                  <div className="bg-slate-200 px-4 py-1.5 flex justify-between items-center text-[10px] text-slate-600 font-medium">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <span>5G</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* SMS Header */}
                  <div className="bg-slate-200/80 px-3 py-2 border-b border-slate-300 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {(senderName || "H")[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {senderName || "Sender ID"}
                      </p>
                      <p className="text-[10px] text-slate-500">Text Message</p>
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 p-3 overflow-y-auto space-y-2 flex flex-col justify-end">
                    <div className="text-center">
                      <span className="text-[10px] bg-slate-200/90 text-slate-500 px-2 py-0.5 rounded-full">
                        Today 9:41 AM
                      </span>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-3 text-xs text-slate-800 shadow-sm leading-relaxed whitespace-pre-wrap break-words max-w-[90%]">
                      {message ? (
                        message
                      ) : (
                        <span className="text-slate-400 italic">
                          Your message will appear here as recipients see it on their mobile phone...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom input area mockup */}
                  <div className="bg-white p-2 border-t border-slate-200 flex items-center gap-1.5">
                    <div className="bg-slate-100 text-slate-400 rounded-full px-3 py-1 text-[10px] flex-1">
                      Text Message
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Webhook Configuration Widget */}
            <Card padding="md" className="space-y-3 bg-white">
              <div className="flex items-center gap-2 border-b border-ink-100 pb-2.5">
                <InformationCircleIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-ink-900">
                  Sendchamp Webhook Configuration
                </h3>
              </div>

              <p className="text-xs text-ink-600 leading-relaxed">
                To receive instant SMS delivery reports and status updates from Sendchamp,
                supply this Webhook URL in your Sendchamp Dashboard:
              </p>

              <div className="bg-cream-100 border border-ink-200 rounded-md p-2.5 flex items-center justify-between gap-2">
                <code className="text-xs text-ink-900 font-mono break-all select-all">
                  {webhookUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="text-xs font-semibold text-ink-700 bg-white border border-ink-200 px-2.5 py-1 rounded hover:bg-cream-200 transition shrink-0 flex items-center gap-1"
                >
                  {copiedWebhook ? (
                    <>
                      <ClipboardDocumentCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      Copy URL
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1.5 pt-1 text-[11px] text-ink-500">
                <p className="font-semibold text-ink-700">Setup Steps:</p>
                <ol className="list-decimal list-inside space-y-1 pl-0.5">
                  <li>Log in to your <strong>Sendchamp Dashboard</strong>.</li>
                  <li>Navigate to <strong>Settings</strong> &gt; <strong>APIs &amp; Webhooks</strong>.</li>
                  <li>Paste the URL above into the <strong>Webhook URL</strong> field.</li>
                  <li>Check SMS delivery events and click <strong>Save</strong>.</li>
                </ol>
              </div>
            </Card>
          </div>
        </div>
      </Layout>
    </div>
  );
}
