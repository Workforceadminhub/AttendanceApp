import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { Tag } from "../../../components/ui";
import {
  createTraining,
  fetchEnrollees,
  fetchProgressionPaths,
  fetchSessions,
  fetchTraining,
  fetchTrainings,
  updateTraining,
} from "../../../services/hub/trainings";
import { createCohort, fetchCohorts } from "../../../services/hub/cohorts";
import { fetchTemplates } from "../../../services/hub/certificates";
import {
  TRAINING_KIND,
  asDate,
  completionFor,
  display,
  initials,
  isProgressive,
  kindLabel,
  nextSessionDate,
  progressTone,
  statusTone,
  trainingStatus,
  unwrapData,
  unwrapTrainingDetail,
  workerIdOf,
  workerNameOf,
} from "../../../utils/training";
import TrainingClassification, { buildPathwayChain } from "./TrainingClassification";

const CATEGORY_OPTIONS = [
  { value: "training", label: "Training" },
  { value: "conference", label: "Conference" },
  { value: "webinar", label: "Webinar" },
  { value: "orientation", label: "Orientation" },
  { value: "leadership", label: "Leadership" },
  { value: "skills", label: "Skills" },
];

const MODE_OPTIONS = [
  { value: "physical", label: "Physical" },
  { value: "virtual", label: "Virtual" },
];

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

function SectionHeading({ children }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="qc-section-title">{children}</span>
      <div className="flex-1 h-px bg-ink-200" />
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
  const { data: sessionsData } = useQuery({
    queryKey: ["hub-training-sessions", trainingId],
    queryFn: () => fetchSessions(trainingId),
  });

  const detail = unwrapTrainingDetail(trainingData);
  const fetchedTraining = detail?.training;
  const training = fetchedTraining?.name ? fetchedTraining : fallbackTraining || {};

  // Enrollees come from the dedicated paginated endpoint, falling back to the
  // copy embedded in the detail payload.
  const enrolleeList = unwrapData(enrolleesData);
  const workers = Array.isArray(enrolleeList) ? enrolleeList : detail?.enrollees ?? [];
  const sessions = unwrapData(sessionsData) ?? [];
  const participation = detail?.participation ?? [];

  const status = trainingStatus(training);
  const enrolled = training.number_of_enrollees ?? workers.length;
  const capacity = training.capacity;
  const nextSession = nextSessionDate(sessions) ?? asDate(training.start_date);

  // Chain view: what sits before and after this training on its pathway.
  const { data: pathTrainingsData } = useQuery({
    queryKey: ["hub-trainings", "pathway", training.progression_path_id],
    queryFn: () => fetchTrainings({ per_page: 100 }),
    enabled: Boolean(training.progression_path_id),
  });
  const chain = useMemo(
    () =>
      training.progression_path_id
        ? buildPathwayChain(pathTrainingsData?.data ?? [], {
            pathId: training.progression_path_id,
          })
        : [],
    [pathTrainingsData, training.progression_path_id]
  );

  return (
    <Panel title="Training Detail" subtitle={training.name} onClose={onClose}>
      <div className="space-y-5">
        {isLoading && !fallbackTraining ? (
          <div className="py-12 text-center text-sm text-ink-500">Loading training...</div>
        ) : (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Tag tone={statusTone(status)} live={status === "ongoing"}>
                  {status}
                </Tag>
                <Tag tone="neutral">{kindLabel(training)}</Tag>
                <span className="qc-eyebrow text-ink-400 capitalize">{display(training.category, "Training")}</span>
              </div>
              <h2 className="text-xl font-semibold text-ink-900">{display(training.name)}</h2>
              <p className="text-sm text-ink-700 mt-2 leading-relaxed">
                {display(training.description || training.short_description, "No description provided.")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="qc-label">Facilitator</span>
                <div className="text-sm text-ink-900">{display(training.facilitator)}</div>
              </div>
              <div>
                <span className="qc-label">Mode</span>
                <div className="text-sm text-ink-900 capitalize">{display(training.mode, "Physical")}</div>
              </div>
              <div>
                <span className="qc-label">Start &rarr; End</span>
                <div className="qc-num text-sm text-ink-900">
                  {display(asDate(training.start_date))} &rarr; {display(asDate(training.end_date))}
                </div>
              </div>
              <div>
                <span className="qc-label">Capacity</span>
                <div className="qc-num text-sm text-ink-900">
                  {display(enrolled, "0")}
                  {capacity ? ` / ${capacity}` : ""} enrolled
                </div>
              </div>
              <div>
                <span className="qc-label">Next session</span>
                <div className="qc-num text-sm text-ink-900">{display(nextSession)}</div>
              </div>
              <div>
                <span className="qc-label">Sessions</span>
                <div className="qc-num text-sm text-ink-900">{sessions.length}</div>
              </div>
            </div>

            {isProgressive(training) && chain.length > 0 && (
              <div>
                <span className="qc-label">Progression pathway</span>
                <div className="flex flex-col gap-1.5 mt-1">
                  {chain.map((step, index) => {
                    const isThis = String(step.id) === String(training.id);
                    return (
                      <div key={step.id} className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center qc-num text-xs shrink-0 ${
                            isThis ? "bg-ink-900 text-cream" : "bg-ink-200 text-ink-500"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className={`text-sm truncate ${isThis ? "font-medium text-ink-900" : "text-ink-500"}`}>
                          {step.name}
                        </span>
                        {isThis && <span className="qc-eyebrow text-sienna shrink-0">this training</span>}
                      </div>
                    );
                  })}
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
                <div className="border border-ink-200 rounded-md p-4 text-center text-sm text-ink-500">Loading workers...</div>
              ) : workers.length === 0 ? (
                <div className="border border-ink-200 rounded-md p-4 text-center text-sm text-ink-400">No workers enrolled yet.</div>
              ) : (
                <div className="border border-ink-200 rounded-md bg-white divide-y divide-ink-200">
                  {workers.slice(0, 6).map((worker, index) => {
                    const name = workerNameOf(worker);
                    const progress = completionFor(workerIdOf(worker), sessions, participation);
                    return (
                      <div key={worker.id || workerIdOf(worker) || index} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-ink-200 flex items-center justify-center text-xs font-mono font-medium text-ink-700 shrink-0">
                          {initials(name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-ink-900 truncate">{name}</div>
                          <div className="qc-eyebrow text-ink-400">{display(worker.department)}</div>
                        </div>
                        {progress.total > 0 ? (
                          <Tag tone={progress.complete ? "success" : "neutral"}>
                            {progress.complete ? "Complete" : `${progress.percent}%`}
                          </Tag>
                        ) : (
                          worker.status && (
                            <Tag tone={worker.status === "completed" ? "success" : "neutral"}>{worker.status}</Tag>
                          )
                        )}
                      </div>
                    );
                  })}
                  {workers.length > 6 && (
                    <button type="button" onClick={onManageCohorts} className="w-full px-3 py-2 text-xs text-ink-500 hover:bg-cream-200">
                      + {workers.length - 6} more &mdash; view all in cohorts
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
        <Link to={`/hub/trainings/${trainingId}/attendance`} className="qc-btn-secondary">
          Mark Attendance
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
    description: initial.description || initial.short_description || "",
    facilitator: initial.facilitator || "",
    start_date: asDate(initial.start_date),
    end_date: asDate(initial.end_date),
    category: String(initial.category || "training").toLowerCase(),
    mode: String(initial.mode || "physical").toLowerCase(),
    duration: initial.duration || "",
    capacity: initial.capacity || "",
    registration_deadline: asDate(initial.registration_deadline),
    cohort: initial.cohort || "",
    certificate_template_id: initial.certificate_template_id || "",
    training_kind: String(initial.training_kind || TRAINING_KIND.STANDALONE).toLowerCase(),
    progression_path_id: initial.progression_path_id || "",
    prerequisite_template_slug: initial.prerequisite_template_slug || "",
  });
  const [errors, setErrors] = useState({});

  const { data: pathsData, isLoading: pathsLoading } = useQuery({
    queryKey: ["hub-progression-paths"],
    queryFn: fetchProgressionPaths,
  });
  const paths = unwrapData(pathsData) ?? [];

  const { data: allTrainingsData } = useQuery({
    queryKey: ["hub-trainings", "all-for-pathway"],
    queryFn: () => fetchTrainings({ per_page: 100 }),
  });
  const allTrainings = allTrainingsData?.data ?? [];

  const { data: templatesData } = useQuery({
    queryKey: ["hub-certificate-templates"],
    queryFn: fetchTemplates,
  });
  const templates = unwrapData(templatesData) ?? [];

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

  const set = (field) => (event) => {
    const value = event?.target ? event.target.value : event;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const setKind = (kind) =>
    setForm((current) => ({
      ...current,
      training_kind: kind,
      // Leaving the pathway clears its links so a standalone never keeps a stale
      // prerequisite that would silently lock workers out.
      progression_path_id: kind === TRAINING_KIND.PROGRESSIVE ? current.progression_path_id : "",
      prerequisite_template_slug: kind === TRAINING_KIND.PROGRESSIVE ? current.prerequisite_template_slug : "",
    }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Required";
    if (!form.start_date) next.start_date = "Required";
    if (!form.end_date) next.end_date = "Required";
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      next.end_date = "End date cannot be before the start date";
    }
    if (form.training_kind === TRAINING_KIND.PROGRESSIVE && !form.progression_path_id) {
      next.progression_path_id = "Select the pathway this training belongs to";
    }
    return next;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    const payload = { ...form };
    if (payload.capacity) payload.capacity = Number(payload.capacity);
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") delete payload[key];
    });
    mutation.mutate(payload);
  };

  const draft = {
    id: initial.id ?? initial._id,
    name: form.name || "This training",
    status: initial.status,
    template_slug: initial.template_slug,
    progression_path_id: form.progression_path_id,
    prerequisite_template_slug: form.prerequisite_template_slug,
    start_date: form.start_date,
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
            {mutation.isPending ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Training"}
          </button>
        </div>
      )}
    >
      <form id="training-drawer-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
        <SectionHeading>Basics</SectionHeading>
        <div>
          <label className="qc-label" htmlFor="training-name">Training name *</label>
          <input
            id="training-name"
            className={`qc-input text-sm ${errors.name ? "border-brick" : ""}`}
            value={form.name}
            onChange={set("name")}
            placeholder="e.g. Basic Leadership Course"
          />
          {errors.name && <span className="text-xs text-brick mt-1 block">{errors.name}</span>}
        </div>
        <div>
          <label className="qc-label" htmlFor="training-description">Description</label>
          <textarea
            id="training-description"
            className="qc-input text-sm min-h-[80px] resize-none"
            value={form.description}
            onChange={set("description")}
            placeholder="Brief overview of this training..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="qc-label" htmlFor="training-category">Category *</label>
            <select id="training-category" className="qc-input text-sm" value={form.category} onChange={set("category")}>
              {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label className="qc-label" htmlFor="training-facilitator">Facilitator</label>
            <input
              id="training-facilitator"
              className="qc-input text-sm"
              value={form.facilitator}
              onChange={set("facilitator")}
              placeholder="Full name"
            />
          </div>
        </div>

        <SectionHeading>Schedule</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="qc-label" htmlFor="training-start">Start date *</label>
            <input
              id="training-start"
              type="date"
              className={`qc-input text-sm qc-num ${errors.start_date ? "border-brick" : ""}`}
              value={form.start_date}
              onChange={set("start_date")}
            />
            {errors.start_date && <span className="text-xs text-brick mt-1 block">{errors.start_date}</span>}
          </div>
          <div>
            <label className="qc-label" htmlFor="training-end">End date *</label>
            <input
              id="training-end"
              type="date"
              className={`qc-input text-sm qc-num ${errors.end_date ? "border-brick" : ""}`}
              value={form.end_date}
              onChange={set("end_date")}
            />
            {errors.end_date && <span className="text-xs text-brick mt-1 block">{errors.end_date}</span>}
          </div>
        </div>
        <div>
          <label className="qc-label">Mode</label>
          <div className="flex gap-2">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={form.mode === option.value}
                onClick={() => setForm((current) => ({ ...current, mode: option.value }))}
                className={`flex-1 py-2 text-sm font-medium rounded border transition-colors ${
                  form.mode === option.value
                    ? "bg-ink-900 text-cream border-ink-900"
                    : "bg-white text-ink-700 border-ink-200 hover:bg-cream-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="qc-label" htmlFor="training-deadline">Registration deadline</label>
            <input
              id="training-deadline"
              type="date"
              className="qc-input text-sm qc-num"
              value={form.registration_deadline}
              onChange={set("registration_deadline")}
            />
          </div>
          <div>
            <label className="qc-label" htmlFor="training-duration">Duration</label>
            <input
              id="training-duration"
              className="qc-input text-sm"
              value={form.duration}
              onChange={set("duration")}
              placeholder="e.g. 3 days"
            />
          </div>
        </div>

        <SectionHeading>Capacity &amp; cohort</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="qc-label" htmlFor="training-capacity">Capacity (optional)</label>
            <input
              id="training-capacity"
              type="number"
              min="1"
              className="qc-input text-sm qc-num"
              value={form.capacity}
              onChange={set("capacity")}
              placeholder="e.g. 30"
            />
          </div>
          <div>
            <label className="qc-label" htmlFor="training-cohort">Cohort label</label>
            <input
              id="training-cohort"
              className="qc-input text-sm"
              value={form.cohort}
              onChange={set("cohort")}
              placeholder="e.g. June 2026"
            />
          </div>
        </div>

        {/* FE-T2 Classification — a core decision, not a buried toggle. */}
        <SectionHeading>Classification</SectionHeading>
        <TrainingClassification
          kind={form.training_kind}
          onKindChange={setKind}
          pathId={form.progression_path_id}
          onPathChange={set("progression_path_id")}
          prerequisiteSlug={form.prerequisite_template_slug}
          onPrerequisiteChange={set("prerequisite_template_slug")}
          paths={paths}
          pathsLoading={pathsLoading}
          trainings={allTrainings}
          draft={draft}
          error={errors.progression_path_id}
        />

        {/* FE-C2 — the template is assigned here rather than on its own screen. */}
        <SectionHeading>Certificate</SectionHeading>
        <div>
          <label className="qc-label" htmlFor="training-template">Certificate template</label>
          <select
            id="training-template"
            className="qc-input text-sm"
            value={form.certificate_template_id}
            onChange={set("certificate_template_id")}
          >
            <option value="">No certificate for this training</option>
            {templates.map((template) => (
              <option key={template.id ?? template.name} value={template.id ?? template.name}>
                {template.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-500 mt-1">
            Workers who attend every session are issued this certificate automatically.
          </p>
        </div>
      </form>
    </Panel>
  );
}

export function CohortManagementDrawer({ trainingId, trainingName, onClose }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [activeCohortId, setActiveCohortId] = useState(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["hub-cohorts", trainingId],
    queryFn: () => fetchCohorts({ training_id: trainingId }),
  });
  const items = unwrapData(data) ?? [];
  const cohorts = Array.isArray(items) ? items : [];

  const { data: sessionsData } = useQuery({
    queryKey: ["hub-training-sessions", trainingId],
    queryFn: () => fetchSessions(trainingId),
  });
  const sessions = unwrapData(sessionsData) ?? [];

  const { data: trainingData } = useQuery({
    queryKey: ["hub-training", trainingId],
    queryFn: () => fetchTraining(trainingId),
  });
  const participation = unwrapTrainingDetail(trainingData)?.participation ?? [];

  const activeCohort =
    cohorts.find((cohort) => String(cohort.id) === String(activeCohortId)) ?? cohorts[0] ?? null;

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

  const members = activeCohort?.participants ?? activeCohort?.members ?? [];

  return (
    <Panel title="Cohort Management" subtitle={trainingName} onClose={onClose} wide>
      <div className="space-y-5">
        <p className="rounded border border-ink-200 bg-white px-3 py-2 text-xs text-ink-600">
          Attendance and certificates always attach to a batch, never to the training as a whole.
          Pick the batch below before marking a session.
        </p>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="qc-section-title">Cohorts &amp; batches</span>
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
                <label className="qc-label" htmlFor="cohort-name">Cohort name *</label>
                <input
                  id="cohort-name"
                  autoFocus
                  className="qc-input text-sm"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. BLC Batch C - Sept 2026"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="qc-label" htmlFor="cohort-start">Start date</label>
                  <input id="cohort-start" type="date" className="qc-input text-sm qc-num" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </div>
                <div>
                  <label className="qc-label" htmlFor="cohort-end">End date</label>
                  <input id="cohort-end" type="date" className="qc-input text-sm qc-num" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </div>
              </div>
              <button type="submit" disabled={createMutation.isPending} className="qc-btn-primary">
                {createMutation.isPending ? "Saving..." : "Create Cohort"}
              </button>
            </form>
          )}

          {isLoading ? (
            <div className="rounded border border-ink-200 p-5 text-center text-sm text-ink-500">Loading cohorts...</div>
          ) : cohorts.length === 0 ? (
            <div className="rounded border border-ink-200 p-5 text-center text-sm text-ink-400">No cohorts created yet.</div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {cohorts.map((cohort) => {
                const selected = String(activeCohort?.id) === String(cohort.id);
                return (
                  <button
                    key={cohort.id}
                    type="button"
                    onClick={() => setActiveCohortId(cohort.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                      selected
                        ? "bg-ink-900 text-cream border-ink-900"
                        : "bg-white text-ink-700 border-ink-200 hover:bg-cream-200"
                    }`}
                  >
                    {cohort.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {activeCohort && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="qc-card p-3">
                <div className="qc-num text-xl font-semibold text-ink-900">{members.length}</div>
                <div className="qc-eyebrow text-ink-500 mt-0.5">Enrolled</div>
              </div>
              <div className="qc-card p-3">
                <div className="qc-num text-xl font-semibold text-forest">
                  {members.filter((m) => completionFor(workerIdOf(m), sessions, participation).complete).length}
                </div>
                <div className="qc-eyebrow text-ink-500 mt-0.5">Complete</div>
              </div>
              <div className="qc-card p-3">
                <div className="qc-num text-xl font-semibold text-ink-900">{sessions.length}</div>
                <div className="qc-eyebrow text-ink-500 mt-0.5">Sessions</div>
              </div>
            </div>

            <div>
              <span className="qc-section-title">Sessions</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {sessions.length === 0 ? (
                  <span className="text-sm text-ink-400">No sessions scheduled yet.</span>
                ) : (
                  sessions.map((session) => (
                    <div key={session.id ?? session.session_date} className="px-2.5 py-1 bg-white border border-ink-200 rounded text-xs">
                      <span className="qc-num text-ink-700">{asDate(session.session_date)}</span>
                      {session.label && <span className="text-ink-400 ml-1.5">{session.label}</span>}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <span className="qc-section-title">Enrolled workers</span>
              <div className="qc-card mt-2 divide-y divide-ink-200">
                {members.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-ink-400">
                    No workers enrolled in this batch.
                  </div>
                ) : (
                  members.map((member, index) => {
                    const name = workerNameOf(member);
                    const progress = completionFor(workerIdOf(member), sessions, participation);
                    const tone = progressTone(progress.percent);
                    return (
                      <div key={member.id ?? workerIdOf(member) ?? index} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-ink-200 flex items-center justify-center text-xs font-mono font-medium text-ink-700 shrink-0">
                          {initials(name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-ink-900 truncate">{name}</div>
                          <div className="qc-eyebrow text-ink-400">{display(member.department)}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-20 h-1.5 bg-ink-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${progress.percent}%` }} />
                          </div>
                          <span className={`qc-num text-xs w-9 text-right ${tone.text}`}>{progress.percent}%</span>
                          <Tag tone={progress.complete ? "success" : "neutral"}>
                            {progress.complete ? "Complete" : "In progress"}
                          </Tag>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
