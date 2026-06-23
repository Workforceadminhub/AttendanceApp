import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Tag } from "../../../components/ui";
import { useCanAction } from "../../../contexts/RBACContext";
import { fetchTemplates, createTemplate } from "../../../services/hub/certificates";

export default function CertificateTemplates() {
  const queryClient = useQueryClient();
  const canCreate = useCanAction("create_training");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    title_text: "",
    body_text: "",
    footer_text: "",
    background_color: "#FFFFFF",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["hub-certificate-templates"],
    queryFn: fetchTemplates,
  });
  const templates = data?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });
      return createTemplate(payload);
    },
    onSuccess: () => {
      toast.success("Template created");
      setForm({ name: "", title_text: "", body_text: "", footer_text: "", background_color: "#FFFFFF" });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["hub-certificate-templates"] });
    },
    onError: (err) => toast.error(err.message || "Failed to create template"),
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

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
            </div>
            {canCreate && (
              <button
                type="button"
                onClick={() => setShowForm(!showForm)}
                className="qc-btn-primary shrink-0"
              >
                {showForm ? "Cancel" : "New Template"}
              </button>
            )}
          </div>

          {/* Create form */}
          {showForm && (
            <div className="qc-card p-5 space-y-4">
              <h3 className="qc-section-title">New Template</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="qc-label">Template Name (slug) *</label>
                  <input
                    className="qc-input qc-num"
                    value={form.name}
                    onChange={set("name")}
                    placeholder="e.g. blc-completion"
                    required
                  />
                </div>
                <div>
                  <label className="qc-label">Background Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={form.background_color}
                      onChange={set("background_color")}
                      className="h-9 w-9 rounded border border-ink-200 cursor-pointer"
                    />
                    <input
                      className="qc-input qc-num flex-1"
                      value={form.background_color}
                      onChange={set("background_color")}
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="qc-label">Title Text</label>
                <input
                  className="qc-input"
                  value={form.title_text}
                  onChange={set("title_text")}
                  placeholder="Certificate of Completion"
                />
              </div>
              <div>
                <label className="qc-label">Body Text</label>
                <textarea
                  className="qc-input min-h-[60px]"
                  value={form.body_text}
                  onChange={set("body_text")}
                  placeholder="This is to certify that {{recipient_name}} has completed..."
                />
              </div>
              <div>
                <label className="qc-label">Footer Text</label>
                <input
                  className="qc-input"
                  value={form.footer_text}
                  onChange={set("footer_text")}
                  placeholder="Harvesters International Christian Centre"
                />
              </div>
              <button
                type="button"
                disabled={!form.name || createMut.isPending}
                onClick={() => createMut.mutate()}
                className="qc-btn-primary"
              >
                {createMut.isPending ? "Creating..." : "Create Template"}
              </button>
            </div>
          )}

          {/* Templates list */}
          <div className="qc-card overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-ink-500">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-500">
                No certificate templates yet.
              </div>
            ) : (
              <div className="divide-y divide-ink-100">
                {templates.map((t, i) => (
                  <div key={t.name ?? i} className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded border border-ink-200 shrink-0"
                        style={{ backgroundColor: t.background_color ?? "#FFFFFF" }}
                      />
                      <div>
                        <div className="text-sm font-medium text-ink-900">{t.name}</div>
                        {t.title_text && (
                          <div className="text-xs text-ink-500 mt-0.5">{t.title_text}</div>
                        )}
                      </div>
                    </div>
                    <Tag tone="neutral">Template</Tag>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
