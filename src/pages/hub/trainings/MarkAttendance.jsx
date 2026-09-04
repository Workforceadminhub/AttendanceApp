import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Tag } from "../../../components/ui";
import { useCanAction } from "../../../contexts/RBACContext";
import {
  fetchTraining,
  fetchEnrollees,
  fetchSessions,
  addSession,
  markParticipation,
} from "../../../services/hub/trainings";
import { fetchCohorts } from "../../../services/hub/cohorts";
import {
  asDate,
  completionFor,
  display,
  formatDate,
  initials,
  progressTone,
  unwrapData,
  unwrapTrainingDetail,
  workerIdOf,
  workerNameOf,
} from "../../../utils/training";

const STATUS_CHOICES = [
  { value: "present", label: "Present", on: "bg-forest text-white border-forest", off: "hover:bg-forest-50 hover:border-forest hover:text-forest" },
  { value: "absent", label: "Absent", on: "bg-brick text-white border-brick", off: "hover:bg-brick-50 hover:border-brick hover:text-brick" },
  { value: "excused", label: "Excused", on: "bg-mustard text-white border-mustard", off: "hover:bg-mustard-50 hover:border-mustard hover:text-mustard" },
];

export default function MarkAttendance() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const canMark = useCanAction("mark_training_attendance");

  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [newDate, setNewDate] = useState("");
  const [marks, setMarks] = useState({});

  const { data: trainingData } = useQuery({
    queryKey: ["hub-training", id],
    queryFn: () => fetchTraining(id),
    enabled: canMark,
  });
  const detail = unwrapTrainingDetail(trainingData);
  const training = detail?.training;
  const participation = detail?.participation ?? [];

  const { data: enrolleesData, isLoading: enrolleesLoading } = useQuery({
    queryKey: ["hub-training-enrollees", id],
    queryFn: () => fetchEnrollees(id),
    enabled: canMark,
  });
  const allEnrollees = unwrapData(enrolleesData) ?? [];

  const { data: sessionsData } = useQuery({
    queryKey: ["hub-training-sessions", id],
    queryFn: () => fetchSessions(id),
    enabled: canMark,
  });
  const sessions = useMemo(() => unwrapData(sessionsData) ?? [], [sessionsData]);
  const sessionDates = useMemo(
    () => sessions.map((s) => asDate(s.session_date)).filter(Boolean).sort(),
    [sessions]
  );

  const { data: cohortsData } = useQuery({
    queryKey: ["hub-cohorts", id],
    queryFn: () => fetchCohorts({ training_id: id }),
    enabled: canMark,
  });
  const cohorts = unwrapData(cohortsData) ?? [];

  // Attendance and certificates attach to a batch, so the roster narrows to the
  // selected cohort whenever one is chosen.
  const enrollees = useMemo(() => {
    if (!selectedCohortId) return allEnrollees;
    const cohort = cohorts.find((c) => String(c.id) === String(selectedCohortId));
    const memberIds = new Set(
      (cohort?.participants ?? cohort?.members ?? []).map((m) => String(workerIdOf(m)))
    );
    if (memberIds.size === 0) return [];
    return allEnrollees.filter((e) => memberIds.has(String(workerIdOf(e))));
  }, [allEnrollees, cohorts, selectedCohortId]);

  // Default to the first session so the page is usable without a click.
  useEffect(() => {
    if (!selectedDate && sessionDates.length > 0) setSelectedDate(sessionDates[0]);
  }, [sessionDates, selectedDate]);

  // Show what is already saved for this session rather than a blank slate.
  const savedStatusFor = (workerId) => {
    const record = participation.find(
      (p) =>
        String(workerIdOf(p)) === String(workerId) &&
        asDate(p.session_date) === selectedDate
    );
    return record ? String(record.status ?? "").toLowerCase() : null;
  };

  const statusFor = (workerId) => marks[workerId] ?? savedStatusFor(workerId) ?? null;

  const addSessionMut = useMutation({
    mutationFn: () => addSession(id, newDate),
    onSuccess: () => {
      toast.success("Session date added");
      setSelectedDate(newDate);
      setNewDate("");
      queryClient.invalidateQueries({ queryKey: ["hub-training-sessions", id] });
    },
    onError: (err) => toast.error(err.message || "Failed to add session"),
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(marks);
      if (entries.length === 0) throw new Error("No attendance marked");
      const results = await Promise.allSettled(
        entries.map(([workerId, status]) =>
          markParticipation(id, workerId, selectedDate, status)
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) throw new Error(`${failed} record(s) failed to save`);
      return results;
    },
    onSuccess: (results) => {
      // Marking the final session can auto-complete a worker and issue their
      // certificate - surface that rather than letting it happen silently.
      const autoCompleted = results.filter(
        (r) => r.value?.data?.auto_complete?.auto_completed
      ).length;
      const certificates = results.filter(
        (r) => r.value?.data?.auto_complete?.certificate_created
      ).length;
      toast.success("Attendance saved");
      if (autoCompleted > 0) {
        toast.success(
          `${autoCompleted} worker${autoCompleted === 1 ? "" : "s"} completed the training` +
            (certificates > 0 ? ` and ${certificates === 1 ? "a certificate was" : "certificates were"} issued` : "")
        );
      }
      setMarks({});
      queryClient.invalidateQueries({ queryKey: ["hub-training-enrollees", id] });
      queryClient.invalidateQueries({ queryKey: ["hub-training", id] });
    },
    onError: (err) => toast.error(err.message || "Failed to save attendance"),
  });

  const toggleMark = (workerId, status) => {
    setMarks((prev) => {
      if (prev[workerId] === status) {
        const next = { ...prev };
        delete next[workerId];
        return next;
      }
      return { ...prev, [workerId]: status };
    });
  };

  const markAllPresent = () => {
    const allPresent = {};
    enrollees.forEach((e) => {
      allPresent[workerIdOf(e)] = "present";
    });
    setMarks(allPresent);
  };

  const counts = useMemo(() => {
    const tally = { present: 0, absent: 0, excused: 0, unmarked: 0 };
    enrollees.forEach((e) => {
      const status = statusFor(workerIdOf(e));
      if (status && tally[status] !== undefined) tally[status] += 1;
      else tally.unmarked += 1;
    });
    return tally;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollees, marks, participation, selectedDate]);

  const markedCount = Object.keys(marks).length;

  // FE-T7 acceptance: a worker must not be able to reach this screen at all.
  if (!canMark) {
    return (
      <>
        <Header />
        <Layout>
          <div className="max-w-lg mx-auto qc-card p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-brick-50 flex items-center justify-center mx-auto mb-3">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <rect x="4" y="8" width="10" height="7" rx="1.5" stroke="#A8311E" strokeWidth="1.4" />
                <path d="M6.5 8V6a2.5 2.5 0 015 0v2" stroke="#A8311E" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-ink-900">Attendance marking is restricted</h1>
            <p className="mt-2 text-sm text-ink-500">
              Only Admins and Facilitators can mark training attendance.
            </p>
            <Link to={`/hub/trainings/${id}`} className="qc-btn-secondary mt-5 inline-block">
              Back to training
            </Link>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Header />
      <Layout>
        <div className="space-y-6">
          <Link to={`/hub/trainings/${id}`} className="text-sm text-ink-500 hover:text-ink-900">
            &larr; Back to {training?.name ?? "Training"}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="qc-eyebrow">Attendance</div>
              <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">Mark Attendance</h1>
              {training && <p className="mt-1 text-sm text-ink-500">{training.name}</p>}
            </div>
            <Tag tone="info">Admin / Facilitator only</Tag>
          </div>

          {/* Session tally */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Present", counts.present, "success"],
              ["Absent", counts.absent, "danger"],
              ["Excused", counts.excused, "warning"],
              ["Unmarked", counts.unmarked, "neutral"],
            ].map(([label, count, tone]) => (
              <div key={label} className="qc-card p-4 text-center">
                <div className="qc-num text-2xl font-medium text-ink-900">{count}</div>
                <div className="mt-1 flex justify-center">
                  <Tag tone={tone}>{label}</Tag>
                </div>
              </div>
            ))}
          </div>

          {/* Batch + session selectors - a multi-day training has one pass per session */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="qc-label" htmlFor="attendance-cohort">Batch</label>
              <select
                id="attendance-cohort"
                value={selectedCohortId}
                onChange={(e) => { setSelectedCohortId(e.target.value); setMarks({}); }}
                className="qc-input text-sm"
              >
                <option value="">All enrollees</option>
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="qc-label" htmlFor="attendance-session">Session</label>
              {sessionDates.length > 0 ? (
                <select
                  id="attendance-session"
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setMarks({}); }}
                  className="qc-input text-sm qc-num"
                >
                  {sessionDates.map((d, index) => (
                    <option key={d} value={d}>Day {index + 1} - {formatDate(d)}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-ink-500 mt-2">No sessions yet - add one alongside.</p>
              )}
            </div>

            <div>
              <label className="qc-label" htmlFor="attendance-new-session">Add a session</label>
              <div className="flex gap-2">
                <input
                  id="attendance-new-session"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="qc-input text-sm qc-num"
                />
                <button
                  type="button"
                  disabled={!newDate || addSessionMut.isPending}
                  onClick={() => addSessionMut.mutate()}
                  className="qc-btn-secondary shrink-0"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {selectedDate && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink-900">
                    Day {sessionDates.indexOf(selectedDate) + 1} &mdash; {formatDate(selectedDate)}
                  </h2>
                  <div className="qc-eyebrow text-ink-500 mt-0.5">
                    {enrollees.length - counts.unmarked} of {enrollees.length} marked
                    {selectedCohortId ? " in this batch" : ""}
                  </div>
                </div>
                <button type="button" onClick={markAllPresent} className="text-sm text-ink-600 hover:text-ink-900 underline">
                  Mark all present
                </button>
              </div>

              <div className="qc-card overflow-hidden">
                <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 border-b border-ink-200 bg-cream-200">
                  <span className="qc-section-title">Worker</span>
                  <span className="qc-section-title">Completion</span>
                  <span className="qc-section-title w-[230px]">This session</span>
                </div>

                {enrolleesLoading ? (
                  <div className="p-8 text-center text-ink-500">Loading enrollees...</div>
                ) : enrollees.length === 0 ? (
                  <div className="p-8 text-center text-ink-500">
                    {selectedCohortId ? "No workers in this batch." : "No enrollees found."}
                  </div>
                ) : (
                  <div className="divide-y divide-ink-200">
                    {enrollees.map((enrollee) => {
                      const wid = workerIdOf(enrollee);
                      const name = workerNameOf(enrollee);
                      const current = statusFor(wid);
                      const pending = marks[wid] !== undefined;

                      // Running completion counts saved records plus what is
                      // staged in this pass, so the bar reacts as you mark.
                      const stagedParticipation = [
                        ...participation.filter(
                          (p) => !(String(workerIdOf(p)) === String(wid) && asDate(p.session_date) === selectedDate)
                        ),
                        ...(marks[wid] ? [{ worker_id: wid, session_date: selectedDate, status: marks[wid] }] : []),
                      ];
                      const progress = completionFor(wid, sessions, stagedParticipation);
                      const tone = progressTone(progress.percent);

                      return (
                        <div key={wid} className="grid sm:grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-ink-200 flex items-center justify-center text-xs font-mono font-medium text-ink-700 shrink-0">
                              {initials(name)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-ink-900 truncate">{name}</div>
                              <div className="qc-eyebrow text-ink-400">
                                {display(enrollee.department ?? enrollee.enrollment_type)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-ink-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${tone.bar}`}
                                style={{ width: `${progress.percent}%` }}
                              />
                            </div>
                            <span className={`qc-num text-xs w-9 text-right ${tone.text}`}>{progress.percent}%</span>
                            {progress.complete && <Tag tone="success">Complete</Tag>}
                          </div>

                          <div className="flex gap-1.5 sm:w-[230px]">
                            {STATUS_CHOICES.map((choice) => {
                              const active = current === choice.value;
                              return (
                                <button
                                  key={choice.value}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => toggleMark(wid, choice.value)}
                                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded border transition-colors ${
                                    active
                                      ? choice.on
                                      : `bg-white text-ink-700 border-ink-200 ${choice.off}`
                                  }`}
                                >
                                  {choice.label}
                                </button>
                              );
                            })}
                          </div>
                          {pending && (
                            <span className="qc-eyebrow text-sienna sm:col-span-3 sm:text-right">unsaved</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={markedCount === 0 || submitMut.isPending}
                  onClick={() => submitMut.mutate()}
                  className="qc-btn-primary"
                >
                  {submitMut.isPending ? "Saving..." : `Save Attendance (${markedCount})`}
                </button>
                <button type="button" onClick={() => setMarks({})} className="qc-btn-secondary">
                  Clear
                </button>
              </div>

              <p className="text-xs text-ink-500">
                A worker is marked Completed only when they are present for every session.
                Completion issues their certificate automatically.
              </p>
            </>
          )}
        </div>
      </Layout>
    </>
  );
}
