import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Tag } from "../../../components/ui";
import { useCanAction } from "../../../contexts/RBACContext";
import ProgressionTracker from "../../../components/hub/trainings/ProgressionTracker";
import {
  fetchTraining,
  fetchEnrollees,
  fetchSessions,
  fetchCurriculum,
  fetchNominations,
  fetchRegistrationRequests,
  fetchTrainingCertificates,
  registerForTraining,
} from "../../../services/hub/trainings";

const TABS = [
  { key: "enrollees", label: "Enrollees" },
  { key: "sessions", label: "Sessions" },
  { key: "curriculum", label: "Curriculum" },
  { key: "nominations", label: "Nominations" },
  { key: "requests", label: "Requests" },
  { key: "certificates", label: "Certificates" },
];

const STATUS_TONE = {
  ongoing: "live",
  upcoming: "info",
  completed: "success",
};

export default function TrainingDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("enrollees");
  const canMarkAttendance = useCanAction("mark_training_attendance");
  const canNominate = useCanAction("nominate_workers");

  const { data: trainingData, isLoading } = useQuery({
    queryKey: ["hub-training", id],
    queryFn: () => fetchTraining(id),
  });
  const training = trainingData?.data ?? trainingData ?? null;

  const registerMut = useMutation({
    mutationFn: () => registerForTraining(id),
    onSuccess: () => {
      toast.success("Registered successfully");
      queryClient.invalidateQueries({ queryKey: ["hub-training", id] });
      queryClient.invalidateQueries({ queryKey: ["hub-training-enrollees", id] });
    },
    onError: (err) => toast.error(err.message || "Registration failed"),
  });

  const { data: enrolleesData } = useQuery({
    queryKey: ["hub-training-enrollees", id],
    queryFn: () => fetchEnrollees(id),
    enabled: tab === "enrollees",
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["hub-training-sessions", id],
    queryFn: () => fetchSessions(id),
    enabled: tab === "sessions",
  });

  const { data: curriculumData } = useQuery({
    queryKey: ["hub-training-curriculum", id],
    queryFn: () => fetchCurriculum(id),
    enabled: tab === "curriculum",
  });

  const { data: nominationsData } = useQuery({
    queryKey: ["hub-training-nominations", id],
    queryFn: () => fetchNominations(id),
    enabled: tab === "nominations",
  });

  const { data: requestsData } = useQuery({
    queryKey: ["hub-training-requests", id],
    queryFn: () => fetchRegistrationRequests(id),
    enabled: tab === "requests",
  });

  const { data: certsData } = useQuery({
    queryKey: ["hub-training-certificates", id],
    queryFn: () => fetchTrainingCertificates(id),
    enabled: tab === "certificates",
  });

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

  const enrollees = enrolleesData?.data ?? [];
  const sessions = sessionsData?.data ?? [];
  const curriculum = curriculumData?.data ?? [];
  const nominations = nominationsData?.data ?? [];
  const requests = requestsData?.data ?? [];
  const certificates = certsData?.data ?? [];

  return (
    <>
      <Header />
      <Layout>
        <div className="space-y-6">
          {/* Back link */}
          <Link to="/hub/trainings" className="text-sm text-ink-500 hover:text-ink-900">
            &larr; Back to Trainings
          </Link>

          {/* Training header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="qc-eyebrow">{training.category}</div>
              <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                {training.name}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Tag tone={STATUS_TONE[training.status] ?? "neutral"} live={training.status === "ongoing"}>
                  {training.status}
                </Tag>
                <Tag tone="neutral">{training.mode}</Tag>
                {training.cohort && <Tag tone="neutral">{training.cohort}</Tag>}
              </div>
              {training.description && (
                <p className="mt-3 text-sm text-ink-600 max-w-xl">{training.description}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              {training.status !== "completed" && !training.is_enrolled && (
                <button
                  type="button"
                  disabled={registerMut.isPending}
                  onClick={() => registerMut.mutate()}
                  className="qc-btn-secondary"
                >
                  {registerMut.isPending ? "Registering..." : "Self-Register"}
                </button>
              )}
              {canNominate && (
                <Link to={`/hub/trainings/${id}/nominate`} className="qc-btn-secondary">
                  Nominate Workers
                </Link>
              )}
              <Link to={`/hub/trainings/${id}/assignments`} className="qc-btn-secondary">
                Dept Assignments
              </Link>
              {canMarkAttendance && (
                <Link to={`/hub/trainings/${id}/attendance`} className="qc-btn-primary">
                  Mark Attendance
                </Link>
              )}
            </div>
          </div>

          {/* Progression tracker */}
          {training.progression_stage && (
            <ProgressionTracker
              currentStage={training.progression_stage}
              completedStages={training.completed_stages ?? []}
            />
          )}

          {/* Tab bar */}
          <div className="flex gap-1 border-b border-ink-200 overflow-x-auto">
            {TABS.map((t) => (
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
              <EnrolleeTable enrollees={enrollees} />
            )}
            {tab === "sessions" && (
              <SessionList sessions={sessions} />
            )}
            {tab === "curriculum" && (
              <CurriculumView curriculum={curriculum} />
            )}
            {tab === "nominations" && (
              <NominationTable nominations={nominations} />
            )}
            {tab === "requests" && (
              <RequestTable requests={requests} trainingId={id} />
            )}
            {tab === "certificates" && (
              <CertificateTable certificates={certificates} />
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}

function EnrolleeTable({ enrollees }) {
  if (enrollees.length === 0) return <Empty msg="No enrollees yet." />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-ink-200 bg-cream-200">
          <th className="text-left px-4 py-3 font-medium text-ink-700">Worker</th>
          <th className="text-left px-4 py-3 font-medium text-ink-700">Type</th>
          <th className="text-left px-4 py-3 font-medium text-ink-700">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100">
        {enrollees.map((e, i) => (
          <tr key={e.id ?? i}>
            <td className="px-4 py-3 text-ink-900">{e.worker_name ?? `Worker ${e.worker_id}`}</td>
            <td className="px-4 py-3 text-ink-600">{e.enrollment_type ?? "primary"}</td>
            <td className="px-4 py-3">
              <Tag tone={e.status === "completed" ? "success" : "neutral"}>{e.status ?? "enrolled"}</Tag>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SessionList({ sessions }) {
  if (sessions.length === 0) return <Empty msg="No sessions scheduled." />;
  return (
    <div className="divide-y divide-ink-100">
      {sessions.map((s, i) => (
        <div key={s.id ?? i} className="px-4 py-3 flex items-center justify-between">
          <div>
            <span className="qc-num text-sm text-ink-900">{s.session_date}</span>
            {s.label && <span className="ml-2 text-sm text-ink-500">{s.label}</span>}
          </div>
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
            <td className="px-4 py-3 text-ink-900">{n.worker_name ?? `Worker ${n.worker_id}`}</td>
            <td className="px-4 py-3">
              <Tag tone={n.status === "accepted" ? "success" : n.status === "declined" ? "danger" : "neutral"}>
                {n.status}
              </Tag>
            </td>
            <td className="px-4 py-3 qc-num text-ink-500">{n.expires_at ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RequestTable({ requests }) {
  if (requests.length === 0) return <Empty msg="No pending requests." />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-ink-200 bg-cream-200">
          <th className="text-left px-4 py-3 font-medium text-ink-700">Worker</th>
          <th className="text-left px-4 py-3 font-medium text-ink-700">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100">
        {requests.map((r, i) => (
          <tr key={r.id ?? i}>
            <td className="px-4 py-3 text-ink-900">{r.worker_name ?? `Worker ${r.worker_id}`}</td>
            <td className="px-4 py-3">
              <Tag tone="neutral">{r.status ?? "pending"}</Tag>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CertificateTable({ certificates }) {
  if (certificates.length === 0) return <Empty msg="No certificates issued yet." />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-ink-200 bg-cream-200">
          <th className="text-left px-4 py-3 font-medium text-ink-700">Certificate</th>
          <th className="text-left px-4 py-3 font-medium text-ink-700">Worker</th>
          <th className="text-left px-4 py-3 font-medium text-ink-700">Issued</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-100">
        {certificates.map((c, i) => (
          <tr key={c.certificate_number ?? i}>
            <td className="px-4 py-3 qc-num text-ink-900">{c.certificate_number}</td>
            <td className="px-4 py-3 text-ink-600">{c.recipient_name ?? "-"}</td>
            <td className="px-4 py-3 qc-num text-ink-500">{c.issued_at ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty({ msg }) {
  return <div className="p-8 text-center text-sm text-ink-500">{msg}</div>;
}
