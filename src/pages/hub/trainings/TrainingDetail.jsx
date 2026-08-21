import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Tag } from "../../../components/ui";
import { useCanAction } from "../../../contexts/RBACContext";
import { getUserRole } from "../../../utils/getUserRole";
import ProgressionTracker from "../../../components/hub/trainings/ProgressionTracker";
import CertificatePreview from "../../../components/hub/certificates/CertificatePreview";
import {
  fetchTraining,
  fetchTrainings,
  fetchEnrollees,
  fetchSessions,
  fetchCurriculum,
  fetchNominations,
  fetchRegistrationRequests,
  fetchTrainingCertificates,
  registerForTraining,
  reviewRegistrationRequest,
} from "../../../services/hub/trainings";
import {
  asDate,
  completionFor,
  display,
  formatDate,
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
import { buildPathwayChain } from "./TrainingClassification";

const ADMIN_TABS = [
  { key: "enrollees", label: "Enrollees" },
  { key: "sessions", label: "Sessions" },
  { key: "curriculum", label: "Curriculum" },
  { key: "nominations", label: "Nominations" },
  { key: "requests", label: "Requests" },
  { key: "certificates", label: "Certificates" },
];

// A worker does not need the full enrollee list — only their own record.
const WORKER_TABS = [
  { key: "sessions", label: "Sessions" },
  { key: "curriculum", label: "Curriculum" },
];

export default function TrainingDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const canMarkAttendance = useCanAction("mark_training_attendance");
  const canNominate = useCanAction("nominate_workers");

  const { isSuperAdmin, isChurchAdmin, isAdmin, user } = getUserRole();
  const isAdminView = isSuperAdmin || isChurchAdmin || isAdmin;
  const canSelfRegister = !isAdminView;

  const [tab, setTab] = useState(isAdminView ? "enrollees" : "sessions");
  const [showRefresher, setShowRefresher] = useState(false);
  const [previewCertificate, setPreviewCertificate] = useState(null);

  const { data: trainingData, isLoading } = useQuery({
    queryKey: ["hub-training", id],
    queryFn: () => fetchTraining(id),
  });
  const detail = unwrapTrainingDetail(trainingData);
  const training = detail?.training ?? null;
  const participation = detail?.participation ?? [];

  const { data: sessionsData } = useQuery({
    queryKey: ["hub-training-sessions", id],
    queryFn: () => fetchSessions(id),
  });
  const sessions = unwrapData(sessionsData) ?? [];

  const { data: enrolleesData } = useQuery({
    queryKey: ["hub-training-enrollees", id],
    queryFn: () => fetchEnrollees(id),
  });
  const enrollees = unwrapData(enrolleesData) ?? detail?.enrollees ?? [];

  const { data: curriculumData } = useQuery({
    queryKey: ["hub-training-curriculum", id],
    queryFn: () => fetchCurriculum(id),
    enabled: tab === "curriculum",
  });

  const { data: nominationsData } = useQuery({
    queryKey: ["hub-training-nominations", id],
    queryFn: () => fetchNominations(id),
    enabled: isAdminView && tab === "nominations",
  });

  const { data: requestsData } = useQuery({
    queryKey: ["hub-training-requests", id],
    queryFn: () => fetchRegistrationRequests(id),
    enabled: isAdminView && tab === "requests",
  });

  const { data: certsData } = useQuery({
    queryKey: ["hub-training-certificates", id],
    queryFn: () => fetchTrainingCertificates(id),
    enabled: isAdminView && tab === "certificates",
  });

  const { data: pathTrainingsData } = useQuery({
    queryKey: ["hub-trainings", "all-for-pathway"],
    queryFn: () => fetchTrainings({ per_page: 100 }),
    enabled: Boolean(training?.progression_path_id),
  });

  const registerMut = useMutation({
    mutationFn: (options) => registerForTraining(id, undefined, options),
    onSuccess: (response) => {
      const payload = unwrapData(response);
      if (payload?.already_enrolled) toast.info("You are already enrolled in this training");
      else toast.success(response?.message || "Registration submitted for approval");
      setShowRefresher(false);
      queryClient.invalidateQueries({ queryKey: ["hub-training", id] });
      queryClient.invalidateQueries({ queryKey: ["hub-training-enrollees", id] });
    },
    onError: (err) => toast.error(err.message || "Registration failed"),
  });

  // The worker's own record drives the completion / refresher states.
  const myWorkerId = user?.workerId ?? user?.worker_id ?? user?.id;
  const myEnrollment = useMemo(
    () => enrollees.find((e) => String(workerIdOf(e)) === String(myWorkerId)),
    [enrollees, myWorkerId]
  );
  const myProgress = useMemo(
    () => completionFor(myWorkerId, sessions, participation),
    [myWorkerId, sessions, participation]
  );
  const hasCompleted =
    String(myEnrollment?.status ?? "").toLowerCase() === "completed" ||
    (myProgress.total > 0 && myProgress.complete);

  const chain = useMemo(
    () =>
      training?.progression_path_id
        ? buildPathwayChain(pathTrainingsData?.data ?? [], { pathId: training.progression_path_id })
        : [],
    [pathTrainingsData, training]
  );

  if (isLoading) {
    return (
      <>
        <Header />
        <Layout>
          <div className="p-8 text-center text-ink-500">Loading training...</div>
        </Layout>
      </>
    );
  }

  if (!training) {
    return (
      <>
        <Header />
        <Layout>
          <div className="p-8 text-center text-ink-500">Training not found.</div>
        </Layout>
      </>
    );
  }

  const status = trainingStatus(training);
  const curriculum = unwrapData(curriculumData) ?? [];
  const nominations = unwrapData(nominationsData) ?? [];
  const requests = unwrapData(requestsData) ?? [];
  const certificates = unwrapData(certsData) ?? [];
  const tabs = isAdminView ? ADMIN_TABS : WORKER_TABS;
  const nextSession = nextSessionDate(sessions) ?? asDate(training.start_date);

  return (
    <>
      <Header />
      <Layout>
        <div className="space-y-6">
          <Link to="/hub/trainings" className="text-sm text-ink-500 hover:text-ink-900">
            &larr; Back to Trainings
          </Link>

          {/* Training header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="qc-eyebrow capitalize">{training.category}</div>
              <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                {training.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Tag tone={statusTone(status)} live={status === "ongoing"}>
                  {status}
                </Tag>
                <Tag tone="neutral">{kindLabel(training)}</Tag>
                <Tag tone="neutral">{training.mode}</Tag>
                {training.cohort && <Tag tone="neutral">{training.cohort}</Tag>}
                {hasCompleted && <Tag tone="success">Completed</Tag>}
              </div>
              {(training.description || training.short_description) && (
                <p className="mt-3 text-sm text-ink-600 max-w-xl">
                  {training.description || training.short_description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              {canSelfRegister && (
                hasCompleted ? (
                  // FE-T9: Register is blocked once completed; a refresher is the
                  // only way back in, and it is deliberately set apart.
                  <button type="button" disabled className="qc-btn-secondary" aria-disabled="true">
                    Register
                  </button>
                ) : status !== "completed" && !myEnrollment ? (
                  <button
                    type="button"
                    disabled={registerMut.isPending}
                    onClick={() => registerMut.mutate({})}
                    className="qc-btn-primary"
                  >
                    {registerMut.isPending ? "Registering..." : "Register"}
                  </button>
                ) : null
              )}
              {canNominate && (
                <Link to={`/hub/trainings/${id}/nominate`} className="qc-btn-secondary">
                  Nominate Workers
                </Link>
              )}
              {isAdminView && (
                <Link to={`/hub/trainings/${id}/assignments`} className="qc-btn-secondary">
                  In Training
                </Link>
              )}
              {canMarkAttendance && (
                <Link to={`/hub/trainings/${id}/attendance`} className="qc-btn-primary">
                  Mark Attendance
                </Link>
              )}
            </div>
          </div>

          {/* FE-T9 Refresher — separated from a normal registration on purpose */}
          {canSelfRegister && hasCompleted && (
            <div className="qc-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Tag tone="success">Completed</Tag>
                  <span className="text-sm text-ink-600">
                    You have already completed this training.
                  </span>
                </div>
                {!showRefresher && (
                  <button type="button" onClick={() => setShowRefresher(true)} className="qc-btn-secondary">
                    Take as refresher
                  </button>
                )}
              </div>

              {showRefresher && (
                <div className="mt-3 rounded border border-mustard bg-mustard-50 p-4">
                  <div className="qc-section-title text-mustard">Refresher mode</div>
                  <p className="mt-1.5 text-sm text-ink-700 leading-relaxed">
                    Retaking this training will not change your completion record, will not count
                    towards your statistics, and will not issue a new certificate.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={registerMut.isPending}
                      onClick={() => registerMut.mutate({ refresher: true })}
                      className="qc-btn-secondary"
                    >
                      {registerMut.isPending ? "Submitting..." : "Confirm Refresher"}
                    </button>
                    <button type="button" onClick={() => setShowRefresher(false)} className="qc-btn-ghost">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Key facts */}
          <div className="qc-card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="qc-label">Facilitator</span>
              <div className="text-sm text-ink-900">{display(training.facilitator)}</div>
            </div>
            <div>
              <span className="qc-label">Start &rarr; End</span>
              <div className="qc-num text-sm text-ink-900">
                {display(asDate(training.start_date))} &rarr; {display(asDate(training.end_date))}
              </div>
            </div>
            <div>
              <span className="qc-label">Next session</span>
              <div className="qc-num text-sm text-ink-900">{display(nextSession)}</div>
            </div>
            <div>
              <span className="qc-label">Enrolled</span>
              <div className="qc-num text-sm text-ink-900">
                {enrollees.length}
                {training.capacity ? ` / ${training.capacity}` : ""}
              </div>
            </div>
          </div>

          {/* Worker's own attendance record */}
          {canSelfRegister && myEnrollment && myProgress.total > 0 && (
            <div className="qc-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="qc-section-title">My attendance</span>
                <span className={`qc-num text-sm ${progressTone(myProgress.percent).text}`}>
                  {myProgress.present}/{myProgress.total} sessions
                </span>
              </div>
              <div className="w-full h-1.5 bg-ink-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${progressTone(myProgress.percent).bar}`}
                  style={{ width: `${myProgress.percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-ink-500">
                Completion requires being present for every session.
              </p>
            </div>
          )}

          {/* FE-T10 Progression pathway */}
          {isProgressive(training) && chain.length > 0 && (
            <ProgressionTracker
              chain={chain}
              currentTrainingId={training.id}
              sessions={sessions}
              participation={participation}
              workerId={canSelfRegister ? myWorkerId : null}
            />
          )}

          {/* Tab bar */}
          <div className="flex gap-1 border-b border-ink-200 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-ink-900 text-ink-900"
                    : "border-transparent text-ink-500 hover:text-ink-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="qc-card p-0 overflow-hidden">
            {tab === "enrollees" && (
              <EnrolleeTable enrollees={enrollees} sessions={sessions} participation={participation} />
            )}
            {tab === "sessions" && <SessionList sessions={sessions} />}
            {tab === "curriculum" && <CurriculumView curriculum={curriculum} />}
            {tab === "nominations" && <NominationTable nominations={nominations} />}
            {tab === "requests" && <RequestTable requests={requests} trainingId={id} />}
            {tab === "certificates" && (
              <CertificateTable certificates={certificates} onPreview={setPreviewCertificate} />
            )}
          </div>
        </div>
      </Layout>

      {previewCertificate && (
        <CertificatePreview
          certificate={previewCertificate}
          onClose={() => setPreviewCertificate(null)}
        />
      )}
    </>
  );
}

/** No grades are shown anywhere — attendance and completion only. */
function EnrolleeTable({ enrollees, sessions, participation }) {
  if (enrollees.length === 0) return <Empty msg="No enrollees yet." />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-ink-200 bg-cream-200">
          <th className="text-left px-4 py-3 font-medium text-ink-700">Worker</th>
          <th className="text-left px-4 py-3 font-medium text-ink-700">Type</th>
          <th className="text-left px-4 py-3 font-medium text-ink-700">Attendance</th>
          <th className="text-left px-4 py-3 font-medium text-ink-700">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100">
        {enrollees.map((enrollee, index) => {
          const wid = workerIdOf(enrollee);
          const name = workerNameOf(enrollee);
          const progress = completionFor(wid, sessions, participation);
          const tone = progressTone(progress.percent);
          const completed =
            String(enrollee.status ?? "").toLowerCase() === "completed" ||
            (progress.total > 0 && progress.complete);
          return (
            <tr key={enrollee.id ?? wid ?? index}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-ink-200 flex items-center justify-center text-xs font-mono font-medium text-ink-700 shrink-0">
                    {initials(name)}
                  </div>
                  <span className="text-ink-900">{name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-ink-600 capitalize">{enrollee.enrollment_type ?? "primary"}</td>
              <td className="px-4 py-3">
                {progress.total === 0 ? (
                  <span className="text-ink-400">-</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-ink-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${progress.percent}%` }} />
                    </div>
                    <span className={`qc-num text-xs ${tone.text}`}>
                      {progress.present}/{progress.total}
                    </span>
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <Tag tone={completed ? "success" : "neutral"}>
                  {completed ? "Completed" : enrollee.status ?? "enrolled"}
                </Tag>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SessionList({ sessions }) {
  if (sessions.length === 0) return <Empty msg="No sessions scheduled." />;
  return (
    <div className="divide-y divide-ink-100">
      {sessions.map((s, i) => (
        <div key={s.id ?? i} className="px-4 py-3 flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-ink-200 text-ink-700 flex items-center justify-center qc-num text-xs shrink-0">
            {i + 1}
          </span>
          <span className="qc-num text-sm text-ink-900">{formatDate(s.session_date)}</span>
          {s.label && <span className="text-sm text-ink-500">{s.label}</span>}
        </div>
      ))}
    </div>
  );
}

function CurriculumView({ curriculum }) {
  if (curriculum.length === 0) return <Empty msg="No curriculum modules yet." />;
  return (
    <div className="divide-y divide-ink-100">
      {curriculum.map((mod, i) => (
        <div key={mod.id ?? i} className="px-4 py-3">
          <h3 className="text-sm font-medium text-ink-900">{mod.title}</h3>
          {mod.lessons?.length > 0 && (
            <ul className="mt-2 space-y-1 ml-4">
              {mod.lessons.map((l, j) => (
                <li key={l.id ?? j} className="text-sm text-ink-600">
                  {l.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

const NOMINATION_TONE = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
  expired: "neutral",
};

function NominationTable({ nominations }) {
  if (nominations.length === 0) return <Empty msg="No nominations." />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-ink-200 bg-cream-200">
          <th className="text-left px-4 py-3 font-medium text-ink-700">Worker</th>
          <th className="text-left px-4 py-3 font-medium text-ink-700">Status</th>
          <th className="text-left px-4 py-3 font-medium text-ink-700">Expires</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100">
        {nominations.map((n, i) => (
          <tr key={n.id ?? i}>
            <td className="px-4 py-3 text-ink-900">{workerNameOf(n)}</td>
            <td className="px-4 py-3">
              <Tag tone={NOMINATION_TONE[String(n.status ?? "").toLowerCase()] ?? "neutral"}>
                {n.status}
              </Tag>
            </td>
            <td className="px-4 py-3 qc-num text-ink-500">{formatDate(n.expires_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** FE-T6 leader side: the approval queue for self-registrations. */
function RequestTable({ requests, trainingId }) {
  const queryClient = useQueryClient();
  const reviewMut = useMutation({
    mutationFn: ({ requestId, approved }) => reviewRegistrationRequest(requestId, approved),
    onSuccess: (_data, variables) => {
      toast.success(variables.approved ? "Registration approved" : "Registration declined");
      queryClient.invalidateQueries({ queryKey: ["hub-training-requests", trainingId] });
      queryClient.invalidateQueries({ queryKey: ["hub-training-enrollees", trainingId] });
    },
    onError: (err) => toast.error(err.message || "Failed to review request"),
  });

  if (requests.length === 0) return <Empty msg="No pending requests." />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-ink-200 bg-cream-200">
          <th className="text-left px-4 py-3 font-medium text-ink-700">Worker</th>
          <th className="text-left px-4 py-3 font-medium text-ink-700">Status</th>
          <th className="text-right px-4 py-3 font-medium text-ink-700">Decision</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100">
        {requests.map((r, i) => {
          const requestId = r.id ?? r.request_id;
          const pending = String(r.status ?? "pending").toLowerCase() === "pending";
          return (
            <tr key={requestId ?? i}>
              <td className="px-4 py-3 text-ink-900">{workerNameOf(r)}</td>
              <td className="px-4 py-3">
                <Tag tone={pending ? "warning" : "neutral"}>{r.status ?? "pending"}</Tag>
              </td>
              <td className="px-4 py-3 text-right">
                {pending && (
                  <span className="inline-flex gap-2">
                    <button
                      type="button"
                      disabled={reviewMut.isPending}
                      onClick={() => reviewMut.mutate({ requestId, approved: false })}
                      className="text-xs font-medium text-brick hover:underline"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={reviewMut.isPending}
                      onClick={() => reviewMut.mutate({ requestId, approved: true })}
                      className="text-xs font-medium text-forest hover:underline"
                    >
                      Approve
                    </button>
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function CertificateTable({ certificates, onPreview }) {
  if (certificates.length === 0) return <Empty msg="No certificates issued yet." />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-ink-200 bg-cream-200">
          <th className="text-left px-4 py-3 font-medium text-ink-700">Certificate</th>
          <th className="text-left px-4 py-3 font-medium text-ink-700">Worker</th>
          <th className="text-left px-4 py-3 font-medium text-ink-700">Issued</th>
          <th className="text-right px-4 py-3 font-medium text-ink-700">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100">
        {certificates.map((c, i) => (
          <tr key={c.certificate_number ?? i}>
            <td className="px-4 py-3 qc-num text-ink-900">{c.certificate_number}</td>
            <td className="px-4 py-3 text-ink-600">{display(c.recipient_name)}</td>
            <td className="px-4 py-3 qc-num text-ink-500">{formatDate(c.issued_at)}</td>
            <td className="px-4 py-3 text-right">
              <button
                type="button"
                onClick={() => onPreview(c)}
                className="text-xs font-medium text-ink-700 hover:text-ink-900 underline underline-offset-2"
              >
                Preview
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty({ msg }) {
  return <div className="p-8 text-center text-sm text-ink-500">{msg}</div>;
}
