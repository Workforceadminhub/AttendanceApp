import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { useCanAction } from "../../../contexts/RBACContext";
import { createTraining } from "../../../services/hub/trainings";
import { fetchTemplates } from "../../../services/hub/certificates";

const CATEGORIES = [
  { value: "leadership", label: "Leadership" },
  { value: "orientation", label: "Orientation" },
  { value: "skills", label: "Skills" },
];

const MODES = [
  { value: "physical", label: "Physical" },
  { value: "virtual", label: "Virtual" },
];

export default function CreateTraining() {
  const navigate = useNavigate();
  const canCreate = useCanAction("create_training");

  const [form, setForm] = useState({
    name: "",
    description: "",
    cohort: "",
    start_date: "",
    end_date: "",
    category: "leadership",
    mode: "physical",
    duration: "",
    capacity: "",
    registration_deadline: "",
    template_slug: "",
  });

  const [registrationLink, setRegistrationLink] = useState(null);

  const { data: templatesData } = useQuery({
    queryKey: ["hub-certificate-templates"],
    queryFn: fetchTemplates,
  });
  const templates = templatesData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (data) => createTraining(data),
    onSuccess: (res) => {
      toast.success("Training created successfully");
      if (res?.data?.registration_link) {
        setRegistrationLink(res.data.registration_link);
      }
      if (res?.data?.training_id) {
        setTimeout(() => navigate(`/hub/trainings/${res.data.training_id}`), 2000);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create training");
    },
  });

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (payload.capacity) payload.capacity = Number(payload.capacity);
    // Remove empty optional fields
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") delete payload[k];
    });
    mutation.mutate(payload);
  };

  if (!canCreate) {
    return (
      <>
        <Header />
        <Layout>
          <div className="p-8 text-center text-ink-500">
            You do not have permission to create trainings.
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Header />
      <Layout>
        <div className="max-w-2xl">
          <div className="mb-6">
            <div className="qc-eyebrow">Training Management</div>
            <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
              Create Training
            </h1>
          </div>

          {registrationLink && (
            <div className="qc-card p-4 mb-6 border-l-4 border-forest">
              <p className="text-sm font-medium text-ink-900">Training created</p>
              <p className="text-sm text-ink-600 mt-1">Registration link:</p>
              <p className="qc-num text-sm text-ink-900 mt-1 break-all">{registrationLink}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="qc-label">Name *</label>
              <input className="qc-input" value={form.name} onChange={set("name")} required maxLength={500} />
            </div>

            <div>
              <label className="qc-label">Description</label>
              <textarea className="qc-input min-h-[80px]" value={form.description} onChange={set("description")} maxLength={1500} />
            </div>

            <div>
              <label className="qc-label">Cohort / Batch</label>
              <input className="qc-input" value={form.cohort} onChange={set("cohort")} placeholder="e.g. Batch A" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="qc-label">Start Date *</label>
                <input type="date" className="qc-input qc-num" value={form.start_date} onChange={set("start_date")} required />
              </div>
              <div>
                <label className="qc-label">End Date *</label>
                <input type="date" className="qc-input qc-num" value={form.end_date} onChange={set("end_date")} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="qc-label">Category *</label>
                <select className="qc-input" value={form.category} onChange={set("category")} required>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="qc-label">Mode *</label>
                <select className="qc-input" value={form.mode} onChange={set("mode")} required>
                  {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="qc-label">Duration</label>
                <input className="qc-input" value={form.duration} onChange={set("duration")} placeholder="e.g. 4 weeks" />
              </div>
              <div>
                <label className="qc-label">Capacity</label>
                <input type="number" className="qc-input qc-num" value={form.capacity} onChange={set("capacity")} min={1} />
              </div>
            </div>

            <div>
              <label className="qc-label">Registration Deadline</label>
              <input type="datetime-local" className="qc-input qc-num" value={form.registration_deadline} onChange={set("registration_deadline")} />
            </div>

            {templates.length > 0 && (
              <div>
                <label className="qc-label">Certificate Template</label>
                <select className="qc-input" value={form.template_slug} onChange={set("template_slug")}>
                  <option value="">None</option>
                  {templates.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={mutation.isPending} className="qc-btn-primary">
                {mutation.isPending ? "Creating..." : "Create Training"}
              </button>
              <button type="button" onClick={() => navigate("/hub/trainings")} className="qc-btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </>
  );
}
