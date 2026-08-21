import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { useCanAction } from "../../../contexts/RBACContext";
import {
  fetchTrainingPrograms,
  createTrainingProgram,
  updateTrainingProgram,
  deleteTrainingProgram,
} from "../../../services/hub/trainingPrograms";
import GenericModal from "../../../components/GenericModal";
import ProgressionPaths from "./ProgressionPaths";

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

export default function TrainingPrograms() {
  const canCreate = useCanAction("create_training");
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [form, setForm] = useState({ name: "", slug: "" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["hub-training-programs"],
    queryFn: () => fetchTrainingPrograms(),
  });

  const rawPrograms = data?.data ?? (Array.isArray(data) ? data : []);
  const programs = [...rawPrograms].sort((a, b) => {
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
    mutationFn: (payload) => createTrainingProgram(payload),
    onSuccess: () => {
      toast.success("Training program created successfully");
      queryClient.invalidateQueries({ queryKey: ["hub-training-programs"] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create training program");
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateTrainingProgram(id, payload),
    onSuccess: () => {
      toast.success("Training program updated successfully");
      queryClient.invalidateQueries({ queryKey: ["hub-training-programs"] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update training program");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteTrainingProgram(id),
    onSuccess: () => {
      toast.success("Training program deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["hub-training-programs"] });
      setDeleteConfirmId(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete training program");
    },
  });

  const openCreateModal = () => {
    setEditingProgram(null);
    setForm({ name: "", slug: "" });
    setModalOpen(true);
  };

  const openEditModal = (program) => {
    setEditingProgram(program);
    setForm({
      name: program.name || "",
      slug: program.slug || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProgram(null);
    setForm({ name: "", slug: "" });
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((prev) => ({
      ...prev,
      name,
      slug: !editingProgram && (!prev.slug || prev.slug === slugify(prev.name)) ? slugify(name) : prev.slug,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Program name is required");
      return;
    }
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
    };

    if (editingProgram) {
      updateMut.mutate({ id: editingProgram.id || editingProgram._id, payload });
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
            You do not have permission to manage training programs.
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
                Training Programs & Certificates
              </h1>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="qc-btn-primary"
            >
              + Create Program
            </button>
          </div>

          <div className="qc-card overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-ink-500">Loading programs...</div>
            ) : error ? (
              <div className="p-8 text-center text-brick">
                Failed to load training programs: {error.message}
              </div>
            ) : programs.length === 0 ? (
              <div className="p-8 text-center text-ink-500">
                No training programs created yet. Click "+ Create Program" to add one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-ink-700">
                  <thead className="bg-cream-100 border-b border-ink-200 text-xs font-medium text-ink-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Slug</th>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {programs.map((program) => {
                      const programId = program.id || program._id;
                      return (
                        <tr key={programId || program.slug} className="hover:bg-cream-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-ink-900">{program.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-ink-600">{program.slug}</td>
                          <td className="px-4 py-3 font-mono text-xs text-ink-400">{programId || "-"}</td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(program)}
                              className="qc-btn-secondary py-1 px-2.5 text-xs"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(programId)}
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

          <div className="border-t border-ink-200 pt-6">
            <ProgressionPaths />
          </div>
        </div>
      </Layout>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <GenericModal
          isOpen={modalOpen}
          onClose={closeModal}
          title={editingProgram ? "Edit Training Program" : "Create Training Program"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="qc-label">Program Name *</label>
              <input
                type="text"
                className="qc-input"
                value={form.name}
                onChange={handleNameChange}
                placeholder="e.g. Growth Track"
                required
              />
            </div>

            <div>
              <label className="qc-label">Slug *</label>
              <input
                type="text"
                className="qc-input font-mono"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="e.g. growth-track"
                required
              />
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
                  : editingProgram
                  ? "Update Program"
                  : "Create Program"}
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
          title="Delete Training Program"
        >
          <div className="space-y-4">
            <p className="text-sm text-ink-700">
              Are you sure you want to delete this training program? This action cannot be undone.
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
                {deleteMut.isPending ? "Deleting..." : "Delete Program"}
              </button>
            </div>
          </div>
        </GenericModal>
      )}

    </>
  );
}
