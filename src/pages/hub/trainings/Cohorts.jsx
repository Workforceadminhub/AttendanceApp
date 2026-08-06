import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { useCanAction } from "../../../contexts/RBACContext";
import {
  fetchCohorts,
  createCohort,
  updateCohort,
  deleteCohort,
} from "../../../services/hub/cohorts";
import GenericModal from "../../../components/GenericModal";

export default function Cohorts() {
  const canCreate = useCanAction("create_training");
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["hub-cohorts"],
    queryFn: () => fetchCohorts(),
  });

  const rawCohorts = data?.data ?? (Array.isArray(data) ? data : []);
  const cohorts = [...rawCohorts].sort((a, b) => {
    const idA = a?.id ?? a?._id;
    const idB = b?.id ?? b?._id;
    const numA = Number(idA);
    const numB = Number(idB);
    if (!isNaN(numA) && !isNaN(numB) && idA !== null && idB !== null && idA !== "" && idB !== "") {
      return numA - numB;
    }
    return String(idA ?? "").localeCompare(String(idB ?? ""));
  });


  const createMut = useMutation({
    mutationFn: (payload) => createCohort(payload),
    onSuccess: () => {
      toast.success("Cohort created successfully");
      queryClient.invalidateQueries({ queryKey: ["hub-cohorts"] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create cohort");
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateCohort(id, payload),
    onSuccess: () => {
      toast.success("Cohort updated successfully");
      queryClient.invalidateQueries({ queryKey: ["hub-cohorts"] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update cohort");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteCohort(id),
    onSuccess: () => {
      toast.success("Cohort deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["hub-cohorts"] });
      setDeleteConfirmId(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete cohort");
    },
  });

  const openCreateModal = () => {
    setEditingCohort(null);
    setForm({ name: "", start_date: "", end_date: "" });
    setModalOpen(true);
  };

  const openEditModal = (cohort) => {
    setEditingCohort(cohort);
    setForm({
      name: cohort.name || "",
      start_date: cohort.start_date ? cohort.start_date.split("T")[0] : "",
      end_date: cohort.end_date ? cohort.end_date.split("T")[0] : "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCohort(null);
    setForm({ name: "", start_date: "", end_date: "" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Cohort name is required");
      return;
    }
    const payload = {
      name: form.name.trim(),
    };
    if (form.start_date) payload.start_date = form.start_date;
    if (form.end_date) payload.end_date = form.end_date;

    const cohortId = editingCohort?.id || editingCohort?._id;
    if (editingCohort && cohortId) {
      updateMut.mutate({ id: cohortId, payload });
    } else {
      createMut.mutate(payload);
    }
  };

  if (!canCreate) {
    return (
      <>
        <Header />
        <Layout>
          <div className="p-8 text-center text-ink-500">
            You do not have permission to manage cohorts.
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Header />
      <Layout>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="qc-eyebrow">Training Setup</div>
              <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                Cohorts & Batches
              </h1>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="qc-btn-primary"
            >
              + Create Cohort
            </button>
          </div>

          <div className="qc-card overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-ink-500">Loading cohorts...</div>
            ) : error ? (
              <div className="p-8 text-center text-brick">
                Failed to load cohorts: {error.message}
              </div>
            ) : cohorts.length === 0 ? (
              <div className="p-8 text-center text-ink-500">
                No cohorts created yet. Click "+ Create Cohort" to add one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-ink-700">
                  <thead className="bg-cream-100 border-b border-ink-200 text-xs font-medium text-ink-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Cohort Name</th>
                      <th className="px-4 py-3">Start Date</th>
                      <th className="px-4 py-3">End Date</th>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {cohorts.map((cohort) => {
                      const cohortId = cohort.id || cohort._id;
                      return (
                        <tr key={cohortId || cohort.name} className="hover:bg-cream-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-ink-900">{cohort.name}</td>
                          <td className="px-4 py-3 qc-num text-xs text-ink-600">
                            {cohort.start_date ? cohort.start_date.split("T")[0] : "-"}
                          </td>
                          <td className="px-4 py-3 qc-num text-xs text-ink-600">
                            {cohort.end_date ? cohort.end_date.split("T")[0] : "-"}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-ink-400">{cohortId || "-"}</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(cohort)}
                              className="qc-btn-secondary py-1 px-2.5 text-xs"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(cohortId)}
                              className="text-xs text-brick hover:underline px-2"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Layout>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <GenericModal
          isOpen={modalOpen}
          onClose={closeModal}
          title={editingCohort ? "Edit Cohort" : "Create Cohort"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="qc-label">Cohort Name *</label>
              <input
                type="text"
                className="qc-input"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. June 2026"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="qc-label">Start Date</label>
                <input
                  type="date"
                  className="qc-input qc-num"
                  value={form.start_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                />
              </div>

              <div>
                <label className="qc-label">End Date</label>
                <input
                  type="date"
                  className="qc-input qc-num"
                  value={form.end_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-ink-200">
              <button
                type="button"
                onClick={closeModal}
                className="qc-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMut.isPending || updateMut.isPending}
                className="qc-btn-primary"
              >
                {createMut.isPending || updateMut.isPending
                  ? "Saving..."
                  : editingCohort
                  ? "Update Cohort"
                  : "Create Cohort"}
              </button>
            </div>
          </form>
        </GenericModal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <GenericModal
          isOpen={Boolean(deleteConfirmId)}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Cohort"
        >
          <div className="space-y-4">
            <p className="text-sm text-ink-700">
              Are you sure you want to delete this cohort? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-ink-200">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="qc-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deleteConfirmId)}
                className="qc-btn-danger"
              >
                {deleteMut.isPending ? "Deleting..." : "Delete Cohort"}
              </button>
            </div>
          </div>
        </GenericModal>
      )}

    </>
  );
}
