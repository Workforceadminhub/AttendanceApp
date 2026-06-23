import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { useCanAction } from "../../../contexts/RBACContext";
import {
  fetchTraining,
  fetchEnrollees,
  fetchSessions,
  addSession,
  markParticipation,
} from "../../../services/hub/trainings";

export default function MarkAttendance() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const canMark = useCanAction("mark_training_attendance");

  const [selectedDate, setSelectedDate] = useState("");
  const [newDate, setNewDate] = useState("");
  const [marks, setMarks] = useState({});

  const { data: trainingData } = useQuery({
    queryKey: ["hub-training", id],
    queryFn: () => fetchTraining(id),
  });
  const training = trainingData?.data ?? trainingData;

  const { data: enrolleesData, isLoading: enrolleesLoading } = useQuery({
    queryKey: ["hub-training-enrollees", id],
    queryFn: () => fetchEnrollees(id),
  });
  const enrollees = enrolleesData?.data ?? [];

  const { data: sessionsData } = useQuery({
    queryKey: ["hub-training-sessions", id],
    queryFn: () => fetchSessions(id),
  });
  const sessionDates = useMemo(
    () => (sessionsData?.data ?? []).map((s) => s.session_date).filter(Boolean),
    [sessionsData]
  );

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
    onSuccess: () => {
      toast.success("Attendance saved");
      setMarks({});
      queryClient.invalidateQueries({ queryKey: ["hub-training-enrollees", id] });
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
      const wid = e.worker_id ?? e.id;
      allPresent[wid] = "present";
    });
    setMarks(allPresent);
  };

  const markedCount = Object.keys(marks).length;

  if (!canMark) {
    return (
      <>
        <Header />
        <Layout>
          <div className="p-8 text-center text-ink-500">
            You do not have permission to mark training attendance.
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

          <div>
            <div className="qc-eyebrow">Attendance</div>
            <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
              Mark Attendance
            </h1>
            {training && (
              <p className="mt-1 text-sm text-ink-500">{training.name}</p>
            )}
          </div>

          {/* Session date picker */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="qc-label">Session Date</label>
              {sessionDates.length > 0 ? (
                <select
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setMarks({}); }}
                  className="qc-input qc-num"
                >
                  <option value="">Select a session date</option>
                  {sessionDates.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-ink-500 mt-1">No sessions yet — add one below.</p>
              )}
            </div>

            <div className="sm:self-end">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="qc-input qc-num"
                />
                <button
                  type="button"
                  disabled={!newDate || addSessionMut.isPending}
                  onClick={() => addSessionMut.mutate()}
                  className="qc-btn-secondary shrink-0"
                >
                  Add Session
                </button>
              </div>
            </div>
          </div>

          {/* Enrollee list */}
          {selectedDate && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-500">
                  {enrollees.length} enrollee{enrollees.length !== 1 ? "s" : ""} &middot;{" "}
                  <span className="qc-num">{markedCount}</span> marked
                </span>
                <button type="button" onClick={markAllPresent} className="text-sm text-ink-600 hover:text-ink-900 underline">
                  Mark all present
                </button>
              </div>

              <div className="qc-card overflow-hidden">
                {enrolleesLoading ? (
                  <div className="p-8 text-center text-ink-500">Loading enrollees...</div>
                ) : enrollees.length === 0 ? (
                  <div className="p-8 text-center text-ink-500">No enrollees found.</div>
                ) : (
                  <div className="divide-y divide-ink-100">
                    {enrollees.map((e) => {
                      const wid = e.worker_id ?? e.id;
                      const name = e.worker_name ?? `Worker ${wid}`;
                      const current = marks[wid];
                      return (
                        <div key={wid} className="flex items-center justify-between px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-ink-900 truncate">{name}</div>
                            {e.enrollment_type && (
                              <div className="text-xs text-ink-500">{e.enrollment_type}</div>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleMark(wid, "present")}
                              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                                current === "present"
                                  ? "bg-forest text-white"
                                  : "bg-cream-200 text-ink-600 hover:bg-cream-300"
                              }`}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleMark(wid, "absent")}
                              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                                current === "absent"
                                  ? "bg-brick text-white"
                                  : "bg-cream-200 text-ink-600 hover:bg-cream-300"
                              }`}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleMark(wid, "excused")}
                              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                                current === "excused"
                                  ? "bg-amber-500 text-white"
                                  : "bg-cream-200 text-ink-600 hover:bg-cream-300"
                              }`}
                            >
                              Excused
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={markedCount === 0 || submitMut.isPending}
                  onClick={() => submitMut.mutate()}
                  className="qc-btn-primary"
                >
                  {submitMut.isPending ? "Saving..." : `Save Attendance (${markedCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => setMarks({})}
                  className="qc-btn-secondary"
                >
                  Clear
                </button>
              </div>
            </>
          )}
        </div>
      </Layout>
    </>
  );
}
