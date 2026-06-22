import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Tag } from "../../../components/ui";
import {
  fetchTraining,
  fetchDeptAssignments,
  createDeptAssignment,
} from "../../../services/hub/trainings";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "probation", label: "Probation" },
];

export default function DepartmentAssignments() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    worker_id: "",
    department: "",
    status: "active",
    notes: "",
  });

  const { data: trainingData } = useQuery({
    queryKey: ["hub-training", id],
    queryFn: () => fetchTraining(id),
  });
  const training = trainingData?.data ?? trainingData;

  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ["hub-training-dept-assignments", id],
    queryFn: () => fetchDeptAssignments(id),
  });
  const assignments = assignmentsData?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => {
      const payload = { ...form };
      if (!payload.notes) delete payload.notes;
      return createDeptAssignment(id, payload);
    },
    onSuccess: () => {
      toast.success("Assignment created");
      setForm({ worker_id: "", department: "", status: "active", notes: "" });
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["hub-training-dept-assignments", id] });
    },
    onError: (err) => toast.error(err.message || "Failed to create assignment"),
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const statusTone = (s) =>
    s === "active" ? "success" : s === "inactive" ? "danger" : "warning";

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
              <div className="qc-eyebrow">Department Assignments</div>
              <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                Assignments
              </h1>
              {training && (
                <p className="mt-1 text-sm text-ink-500">{training.name}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="qc-btn-primary shrink-0"
            >
              {showForm ? "Cancel" : "New Assignment"}
            </button>
          </div>

          {/* Create form */}
          {showForm && (
            <div className="qc-card p-5 space-y-4">
              <h3 className="qc-section-title">New Assignment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="qc-label">Worker ID *</label>
                  <input
                    className="qc-input qc-num"
                    value={form.worker_id}
                    onChange={set("worker_id")}
                    placeholder="Worker ID or UUID"
                    required
                  />
                </div>
                <div>
                  <label className="qc-label">Department *</label>
                  <input
                    className="qc-input"
                    value={form.department}
                    onChange={set("department")}
                    placeholder="e.g. Media, Ushering"
                    required
                  />
                </div>
                <div>
                  <label className="qc-label">Status</label>
                  <select className="qc-input" value={form.status} onChange={set("status")}>
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="qc-label">Notes</label>
                  <input
                    className="qc-input"
                    value={form.notes}
                    onChange={set("notes")}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={!form.worker_id || !form.department || createMut.isPending}
                onClick={() => createMut.mutate()}
                className="qc-btn-primary"
              >
                {createMut.isPending ? "Saving..." : "Create Assignment"}
              </button>
            </div>
          )}

          {/* Assignments table */}
          <div className="qc-card overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-ink-500">Loading assignments...</div>
            ) : assignments.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-500">
                No department assignments yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 bg-cream-200">
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Worker</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Department</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {assignments.map((a, i) => (
                      <tr key={a.id ?? i}>
                        <td className="px-4 py-3 text-ink-900">
                          {a.worker_name ?? `Worker ${a.worker_id}`}
                        </td>
                        <td className="px-4 py-3 text-ink-600">{a.department}</td>
                        <td className="px-4 py-3">
                          <Tag tone={statusTone(a.status)}>{a.status}</Tag>
                        </td>
                        <td className="px-4 py-3 text-ink-500 max-w-xs truncate">
                          {a.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
