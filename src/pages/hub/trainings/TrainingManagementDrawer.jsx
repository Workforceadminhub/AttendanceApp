import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { Tag } from "../../../components/ui";
import {
  createTraining,
  fetchEnrollees,
  fetchTraining,
  updateTraining,
} from "../../../services/hub/trainings";
import { createCohort, fetchCohorts } from "../../../services/hub/cohorts";

const CATEGORY_OPTIONS = [
  { value: "orientation", label: "Orientation" },
  { value: "leadership", label: "Leadership" },
  { value: "skills", label: "Skills" },
  { value: "training", label: "Training" },
  { value: "conference", label: "Conference" },
  { value: "webinar", label: "Webinar" },
];

const MODE_OPTIONS = [
  { value: "physical", label: "Physical" },
  { value: "virtual", label: "Virtual" },
];

const STATUS_TONE = {
  ongoing: "live",
  upcoming: "info",
  completed: "success",
};

function unwrap(value) {
  return value?.data ?? value ?? null;
}

function asDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function display(value, fallback = "—") {
  return value === undefined || value === null || value === "" ? fallback : value;
}

function initials(name) {
  return String(name || "Worker")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Panel({ title, subtitle, children, footer, wide = false, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-ink-900/40"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className={`bg-cream h-full w-full ${wide ? "max-w-xl" : "max-w-md"} overflow-y-auto flex flex-col shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-cream border-b border-ink-200 px-5 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <div className="qc-section-title">{title}</div>
            {subtitle && <div className="text-sm font-medium text-ink-900 mt-0.5 truncate">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="text-ink-500 hover:text-ink-900 p-1 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 px-5 py-5">{children}</div>
        {footer && <div className="sticky bottom-0 bg-cream border-t border-ink-200 px-5 py-4">{footer}</div>}
      </aside>
    </div>
  );
}

export function TrainingDetailDrawer({ trainingId, fallbackTraining, onClose, onEdit, onManageCohorts }) {
  const { data: trainingData, isLoading } = useQuery({
    queryKey: ["hub-training", trainingId],
    queryFn: () => fetchTraining(trainingId),
  });
  const { data: enrolleesData, isLoading: enrolleesLoading } = useQuery({
    queryKey: ["hub-training-enrollees", trainingId],
    queryFn: () => fetchEnrollees(trainingId),
  });

  const fetchedTraining = unwrap(trainingData);
  const training = fetchedTraining?.name || fetchedTraining?.id || fetchedTraining?._id
    ? fetchedTraining
    : fallbackTraining || {};
  const enrollees = unwrap(enrolleesData);
  const workers = Array.isArray(enrollees) ? enrollees : [];
  const status = String(training.status || "upcoming").toLowerCase();
  const enrolled = training.number_of_enrollees ?? training.enrolled ?? workers.length;
  const capacity = training.capacity;

  return (
    <Panel title="Training Detail" subtitle={training.name} onClose={onClose}>
      <div className="space-y-5">
        {isLoading && !fallbackTraining ? (
          <div className="py-12 text-center text-sm text-ink-500">Loading training…</div>
        ) : (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Tag tone={STATUS_TONE[status] ?? "neutral"}>{display(training.status, "Upcoming")}</Tag>
                <Tag tone="neutral">{display(training.category, "Training")}</Tag>
                <span className="qc-eyebrow text-ink-400">{display(training.type, "Standalone")}</span>
              </div>
              <h2 className="text-xl font-semibold text-ink-900">{display(training.name)}</h2>
              <p className="text-sm text-ink-700 mt-2 leading-relaxed">
                {display(training.description, "No description provided.")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="qc-label">Facilitator</span>
                <div className="text-sm text-ink-900">{display(training.facilitator || training.facilitator_name)}</div>
              </div>
              <div>
                <span className="qc-label">Mode</span>
                <div className="text-sm text-ink-900">
                  {display(training.mode, "Physical")}
                  {training.location ? ` — ${training.location}` : ""}
                </div>
              </div>
              <div>
                <span className="qc-label">Start → End</span>
                <div className="qc-num text-sm text-ink-900">
                  {display(asDate(training.start_date || training.startDate))} → {display(asDate(training.end_date || training.endDate))}
                </div>
              </div>
              <div>
                <span className="qc-label">Capacity</span>
                <div className="qc-num text-sm text-ink-900">
                  {display(enrolled, "0")} {capacity ? `/ ${capacity}` : ""} enrolled
                </div>
              </div>
            </div>

            {training.progression_stage && (
              <div>
                <span className="qc-label">Progression pathway</span>
                <div className="mt-1 rounded border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700">
                  Current stage: <span className="font-medium text-ink-900">{training.progression_stage}</span>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="qc-label mb-0">
                  Enrolled workers <span className="qc-num text-ink-400 normal-case">({enrolled})</span>
                </span>
                <button
                  type="button"
                  onClick={onManageCohorts}
                  className="text-xs text-ink-500 hover:text-ink-900 underline underline-offset-2"
                >
                  Manage cohorts
                </button>
              </div>

              {enrolleesLoading ? (
                <div className="border border-ink-200 rounded-md p-4 text-center text-sm text-ink-500">Loading workers…</div>
              ) : workers.length === 0 ? (
                <div className="border border-ink-200 rounded-md p-4 text-center text-sm text-ink-400">No workers enrolled yet.</div>
              ) : (
                <div className="border border-ink-200 rounded-md bg-white divide-y divide-ink-200">
                  {workers.slice(0, 6).map((worker, index) => {
                    const name = worker.worker_name || worker.name || `Worker ${worker.worker_id || index + 1}`;
                    return (
                      <div key={worker.id || worker.worker_id || index} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-ink-200 flex items-center justify-center text-xs font-mono font-medium text-ink-700 shrink-0">
                          {initials(name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-ink-900 truncate">{name}</div>
                          <div className="qc-eyebrow text-ink-400">{display(worker.department)}</div>
                        </div>
                        {worker.status && <Tag tone={worker.status === "completed" ? "success" : "neutral"}>{worker.status}</Tag>}
                      </div>
                    );
                  })}
                  {workers.length > 6 && (
                    <button type="button" onClick={onManageCohorts} className="w-full px-3 py-2 text-xs text-ink-500 hover:bg-cream-200">
                      + {workers.length - 6} more — view all in cohorts
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={onManageCohorts} className="qc-btn-primary">
          Manage Cohorts
        </button>
        <button type="button" onClick={() => onEdit(training)} className="qc-btn-secondary">
          Edit Training
        </button>
        <Link to={`/hub/trainings/${trainingId}`} className="qc-btn-secondary">
          Full details
        </Link>
      </div>
    </Panel>
  );
}

export function TrainingFormDrawer({ mode = "create", initialTraining, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const initial = initialTraining || {};
  const [form, setForm] = useState({
    name: initial.name || "",
    description: initial.description || "",
    start_date: asDate(initial.start_date || initial.startDate),
    end_date: asDate(initial.end_date || initial.endDate),
    category: String(initial.category || "orientation").toLowerCase(),
    mode: String(initial.mode || "physical").toLowerCase(),
    duration: initial.duration || "",
    capacity: initial.capacity || "",
    registration_deadline: asDate(initial.registration_deadline),
  });

  const mutation = useMutation({
    mutationFn: (payload) => mode === "edit"
      ? updateTraining(initial.id || initial._id, payload)
      : createTraining(payload),
    onSuccess: (response) => {
      toast.success(mode === "edit" ? "Training updated successfully" : "Training created successfully");
      queryClient.invalidateQueries({ queryKey: ["hub-trainings"] });
      queryClient.invalidateQueries({ queryKey: ["hub-training", initial.id || initial._id] });
      onSaved(response);
    },
    onError: (error) => toast.error(error.message || "Unable to save training"),
  });

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = { ...form };
    if (payload.capacity) payload.capacity = Number(payload.capacity);
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") delete payload[key];
    });
    mutation.mutate(payload);
  };

  return (
    <Panel
      title={mode === "edit" ? "Edit Training" : "Create Training"}
      subtitle={mode === "edit" ? initial.name : undefined}
      onClose={onClose}
      wide
      footer={(
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="qc-btn-secondary">Cancel</button>
          <button type="submit" form="training-drawer-form" disabled={mutation.isPending} className="qc-btn-primary">
            {mutation.isPending ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Training"}
          </button>
        </div>
      )}
    >
      <form id="training-drawer-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-3 pt-1">
          <span className="qc-section-title">Basics</span>
          <div className="flex-1 h-px bg-ink-200" />
        </div>
        <div>
          <label className="qc-label">Training name *</label>
          <input className="qc-input text-sm" value={form.name} onChange={set("name")} placeholder="e.g. Growth Track - June 2026" required />
        </div>
        <div>
          <label className="qc-label">Description</label>
          <textarea className="qc-input text-sm min-h-[80px] resize-none" value={form.description} onChange={set("description")} placeholder="Brief overview of this training…" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="qc-label">Category *</label>
            <select className="qc-input text-sm" value={form.category} onChange={set("category")} required>
              {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="qc-label">Mode *</label>
            <select className="qc-input text-sm" value={form.mode} onChange={set("mode")} required>
              {MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <span className="qc-section-title">Schedule</span>
          <div className="flex-1 h-px bg-ink-200" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="qc-label">Start date *</label>
            <input type="date" className="qc-input text-sm qc-num" value={form.start_date} onChange={set("start_date")} required />
          </div>
          <div>
            <label className="qc-label">End date *</label>
            <input type="date" className="qc-input text-sm qc-num" value={form.end_date} onChange={set("end_date")} required />
          </div>
        </div>
        <div>
          <label className="qc-label">Registration deadline</label>
          <input type="date" className="qc-input text-sm qc-num" value={form.registration_deadline} onChange={set("registration_deadline")} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <span className="qc-section-title">Capacity</span>
          <div className="flex-1 h-px bg-ink-200" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="qc-label">Duration</label>
            <input className="qc-input text-sm" value={form.duration} onChange={set("duration")} placeholder="e.g. 4 weeks" />
          </div>
          <div>
            <label className="qc-label">Capacity</label>
            <input type="number" min="1" className="qc-input text-sm qc-num" value={form.capacity} onChange={set("capacity")} placeholder="e.g. 30" />
          </div>
        </div>
      </form>
    </Panel>
  );
}

export function CohortManagementDrawer({ trainingId, trainingName, onClose }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["hub-cohorts", trainingId],
    queryFn: () => fetchCohorts({ training_id: trainingId }),
  });
  const cohorts = unwrap(data);
  const items = Array.isArray(cohorts) ? cohorts : [];

  const createMutation = useMutation({
    mutationFn: (payload) => createCohort(payload),
    onSuccess: () => {
      toast.success("Cohort created successfully");
      queryClient.invalidateQueries({ queryKey: ["hub-cohorts"] });
      setName("");
      setStartDate("");
      setEndDate("");
      setAdding(false);
    },
    onError: (error) => toast.error(error.message || "Unable to create cohort"),
  });

  const handleCreate = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    const payload = { name: name.trim(), training_id: trainingId };
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    createMutation.mutate(payload);
  };

  return (
    <Panel title="Cohort Management" subtitle={trainingName} onClose={onClose} wide>
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="qc-section-title">Cohorts & batches</span>
            <button
              type="button"
              onClick={() => setAdding((current) => !current)}
              className="text-xs font-medium text-ink-700 hover:text-ink-900"
            >
              {adding ? "Cancel" : "+ New cohort"}
            </button>
          </div>

          {adding && (
            <form onSubmit={handleCreate} className="mb-4 rounded border border-ink-200 bg-white p-4 space-y-3">
              <div>
                <label className="qc-label">Cohort name *</label>
                <input
                  autoFocus
                  className="qc-input text-sm"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. June 2026"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="qc-label">Start date</label>
                  <input type="date" className="qc-input text-sm qc-num" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </div>
                <div>
                  <label className="qc-label">End date</label>
                  <input type="date" className="qc-input text-sm qc-num" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </div>
              </div>
              <button type="submit" disabled={createMutation.isPending} className="qc-btn-primary">
                {createMutation.isPending ? "Saving…" : "Create Cohort"}
              </button>
            </form>
          )}

          {isLoading ? (
            <div className="rounded border border-ink-200 p-5 text-center text-sm text-ink-500">Loading cohorts…</div>
          ) : items.length === 0 ? (
            <div className="rounded border border-ink-200 p-5 text-center text-sm text-ink-400">No cohorts created yet.</div>
          ) : (
            <div className="rounded border border-ink-200 bg-white divide-y divide-ink-200">
              {items.map((cohort, index) => {
                const cohortId = cohort.id || cohort._id || index;
                return (
                  <div key={cohortId} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-ink-900">{cohort.name || `Cohort ${index + 1}`}</div>
                      <div className="qc-eyebrow text-ink-400">
                        {asDate(cohort.start_date) || "—"} → {asDate(cohort.end_date) || "—"}
                      </div>
                    </div>
                    <span className="qc-num text-xs text-ink-400">{cohortId}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
