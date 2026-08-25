import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Tag } from "../../../components/ui";
import { useCanAction } from "../../../contexts/RBACContext";
import { getUserRole } from "../../../utils/getUserRole";
import { fetchTemplates, createTemplate } from "../../../services/hub/certificates";
import { display, formatDate } from "../../../utils/training";

const BLANK = {
  name: "",
  description: "",
  headline: "Certificate of Completion",
  subtitle: "This certifies that",
  body: "has successfully completed the programme",
  signatory: "Authorised Signatory",
  accent_color: "#0A0E1A",
  logo_url: "",
  signature_url: "",
};

/** Uploads are held as data URLs so the preview is faithful before saving. */
const MAX_IMAGE_BYTES = 400 * 1024;

export default function CertificateTemplates() {
  const queryClient = useQueryClient();
  const canCreate = useCanAction("create_training");
  const { isAdmin } = getUserRole();
  const canManageTemplates = canCreate || isAdmin;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [activeTemplate, setActiveTemplate] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["hub-certificate-templates"],
    queryFn: fetchTemplates,
  });
  const templates = data?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => {
      // The API takes a nested `layout`, not flat text fields.
      const layout = {
        headline: form.headline,
        subtitle: form.subtitle,
        body: form.body,
        signatory: form.signatory,
        accent_color: form.accent_color,
      };
      if (form.logo_url) layout.logo_url = form.logo_url;
      if (form.signature_url) layout.signature_url = form.signature_url;
      Object.keys(layout).forEach((key) => {
        if (layout[key] === "") delete layout[key];
      });

      const payload = { name: form.name.trim(), layout };
      if (form.description.trim()) payload.description = form.description.trim();
      return createTemplate(payload);
    },
    onSuccess: () => {
      toast.success("Template created");
      setForm(BLANK);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["hub-certificate-templates"] });
    },
    onError: (err) => toast.error(err.message || "Failed to create template"),
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const saveTemplate = () => {
    if (!form.name.trim()) {
      toast.error("Give this certificate template a name before saving it.");
      return;
    }
    createMut.mutate();
  };

  const handleImage = (field) => (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be under 400KB");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, [field]: String(reader.result) }));
    reader.onerror = () => toast.error("Could not read that image");
    reader.readAsDataURL(file);
  };

  return (
    <>
      <Header />
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="qc-eyebrow">Certificate Engine</div>
              <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                Certificate Templates
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                Build a layout once, then assign it to a training from its Certificate section.
              </p>
            </div>
            {canManageTemplates && (
              <button
                type="button"
                onClick={() => setShowForm(!showForm)}
                className="qc-btn-primary shrink-0"
              >
                {showForm ? "Cancel" : "New Template"}
              </button>
            )}
          </div>

          {/* Builder — fields on the left, live preview on the right */}
          {showForm && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="qc-card p-5 space-y-4">
                <h3 className="qc-section-title">Template details</h3>
                <div>
                  <label className="qc-label" htmlFor="template-name">Template name *</label>
                  <input
                    id="template-name"
                    className="qc-input text-sm"
                    value={form.name}
                    onChange={set("name")}
                    placeholder="e.g. Standard Completion Certificate"
                    required
                  />
                </div>
                <div>
                  <label className="qc-label" htmlFor="template-description">Description</label>
                  <input
                    id="template-description"
                    className="qc-input text-sm"
                    value={form.description}
                    onChange={set("description")}
                    placeholder="Where this layout is used"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <span className="qc-section-title">Fields on the certificate</span>
                  <div className="flex-1 h-px bg-ink-200" />
                </div>
                <div>
                  <label className="qc-label" htmlFor="template-headline">Headline</label>
                  <input id="template-headline" className="qc-input text-sm" value={form.headline} onChange={set("headline")} />
                </div>
                <div>
                  <label className="qc-label" htmlFor="template-subtitle">Subtitle</label>
                  <input id="template-subtitle" className="qc-input text-sm" value={form.subtitle} onChange={set("subtitle")} />
                </div>
                <div>
                  <label className="qc-label" htmlFor="template-body">Body</label>
                  <textarea
                    id="template-body"
                    className="qc-input text-sm min-h-[60px] resize-none"
                    value={form.body}
                    onChange={set("body")}
                  />
                </div>
                <div>
                  <label className="qc-label" htmlFor="template-signatory">Authorised signatory</label>
                  <input id="template-signatory" className="qc-input text-sm" value={form.signatory} onChange={set("signatory")} />
                  <p className="mt-1 text-xs text-ink-500">This certificate uses one signatory.</p>
                </div>
                <div>
                  <label className="qc-label" htmlFor="template-accent">Accent colour</label>
                  <div className="flex gap-2 items-center">
                    <input
                      id="template-accent"
                      type="color"
                      value={form.accent_color}
                      onChange={set("accent_color")}
                      className="h-9 w-9 rounded border border-ink-200 cursor-pointer"
                    />
                    <input
                      className="qc-input text-sm qc-num flex-1"
                      value={form.accent_color}
                      onChange={set("accent_color")}
                      maxLength={7}
                      aria-label="Accent colour hex value"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <span className="qc-section-title">Logo &amp; signature</span>
                  <div className="flex-1 h-px bg-ink-200" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ImageField
                    id="template-logo"
                    label="Logo"
                    value={form.logo_url}
                    onChange={handleImage("logo_url")}
                    onClear={() => setForm((f) => ({ ...f, logo_url: "" }))}
                  />
                  <ImageField
                    id="template-signature"
                    label="Signature"
                    value={form.signature_url}
                    onChange={handleImage("signature_url")}
                    onClear={() => setForm((f) => ({ ...f, signature_url: "" }))}
                  />
                </div>

                <button
                  type="button"
                  disabled={createMut.isPending}
                  onClick={saveTemplate}
                  className="qc-btn-primary"
                >
                  {createMut.isPending ? "Creating..." : "Save Template"}
                </button>
              </div>

              <div className="space-y-2">
                <span className="qc-section-title">Preview</span>
                <TemplateFace layout={form} />
              </div>
            </div>
          )}

          {/* Template bank */}
          <div>
            <div className="qc-section-title mb-3">Template bank</div>
            {isLoading ? (
              <div className="qc-card p-8 text-center text-ink-500">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="qc-card p-8 text-center text-sm text-ink-500">
                No certificate templates yet. Build one to reuse across trainings.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template, index) => {
                  const layout = template.layout ?? {};
                  return (
                    <button
                      key={template.id ?? template.name ?? index}
                      type="button"
                      onClick={() => setActiveTemplate(template)}
                      className="qc-card p-4 text-left hover:bg-cream-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-ink-900 truncate">{template.name}</div>
                          <div className="qc-eyebrow text-ink-400 mt-0.5">
                            {display(layout.headline, "Certificate of Completion")}
                          </div>
                        </div>
                        <span
                          className="w-6 h-6 rounded border border-ink-200 shrink-0"
                          style={{ backgroundColor: layout.accent_color ?? "#FFFFFF" }}
                          aria-hidden="true"
                        />
                      </div>
                      {template.description && (
                        <p className="mt-2 text-xs text-ink-500 line-clamp-2">{template.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <Tag tone="neutral">Template</Tag>
                        <span className="qc-num text-2xs text-ink-400">
                          {formatDate(template.createdat ?? template.created_at)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Layout>

      {/* Full-size preview of a saved template */}
      {activeTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveTemplate(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${activeTemplate.name} preview`}
            className="bg-cream w-full max-w-2xl max-h-full overflow-y-auto rounded-md border border-ink-200"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 bg-cream border-b border-ink-200 px-5 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <div className="qc-section-title">Template Preview</div>
                <div className="text-sm font-medium text-ink-900 truncate">{activeTemplate.name}</div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTemplate(null)}
                aria-label="Close preview"
                className="text-ink-500 hover:text-ink-900 p-1"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <TemplateFace layout={activeTemplate.layout ?? {}} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ImageField({ id, label, value, onChange, onClear }) {
  return (
    <div>
      <label className="qc-label" htmlFor={id}>{label}</label>
      {value ? (
        <div className="rounded border border-ink-200 bg-white p-2 flex items-center gap-2">
          <img src={value} alt="" className="h-10 w-auto max-w-[80px] object-contain" />
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-brick hover:underline ml-auto"
          >
            Remove
          </button>
        </div>
      ) : (
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          onChange={onChange}
          className="block w-full text-xs text-ink-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-ink-200 file:bg-white file:text-xs file:text-ink-700"
        />
      )}
    </div>
  );
}

/** The certificate face, shared by the builder preview and the bank preview. */
function TemplateFace({ layout }) {
  const accent = layout.accent_color || "#0A0E1A";
  return (
    <div className="bg-white border-2 rounded-md px-8 py-10 text-center" style={{ borderColor: accent }}>
      {layout.logo_url && (
        <img src={layout.logo_url} alt="" className="h-12 w-auto mx-auto mb-4 object-contain" />
      )}
      <div className="qc-eyebrow" style={{ color: accent }}>
        Harvesters International Christian Centre
      </div>
      <h2 className="mt-3 text-2xl font-medium text-ink-900 tracking-tight">
        {layout.headline || "Certificate of Completion"}
      </h2>
      <p className="mt-4 text-sm text-ink-500">{layout.subtitle || "This certifies that"}</p>
      <p className="mt-2 text-xl font-medium text-ink-900">Worker Name</p>
      <p className="mt-3 text-sm text-ink-600 max-w-md mx-auto">
        {layout.body || "has successfully completed the programme"}
      </p>
      <p className="mt-2 text-base font-medium text-ink-900">Training Title</p>

      <div className="mt-8 flex items-end justify-between gap-6">
        <div className="text-left">
          <div className="qc-num text-xs text-ink-700">DD MMM YYYY</div>
          <div className="mt-1 pt-1 border-t border-ink-200 qc-eyebrow text-ink-400">Date issued</div>
        </div>
        <div className="text-right">
          {layout.signature_url ? (
            <img src={layout.signature_url} alt="" className="h-10 w-auto ml-auto object-contain" />
          ) : (
            <div className="h-10" />
          )}
          <div className="mt-1 pt-1 border-t border-ink-200 qc-eyebrow text-ink-400">
            {layout.signatory || "Leadership & Development"}
          </div>
        </div>
      </div>

      <div className="mt-6 qc-num text-2xs text-ink-400">HRV-XXXXX-XXXXXX</div>
    </div>
  );
}
