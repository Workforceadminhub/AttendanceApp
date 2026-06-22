import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { useCanAction } from "../../../contexts/RBACContext";
import { createCourse } from "../../../services/hub/courses";

const CATEGORIES = [
  { value: "leadership", label: "Leadership" },
  { value: "orientation", label: "Orientation" },
  { value: "skills", label: "Skills" },
  { value: "discipleship", label: "Discipleship" },
];

const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export default function CreateCourse() {
  const navigate = useNavigate();
  const canCreate = useCanAction("create_training");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "leadership",
    level: "beginner",
    duration: "",
  });

  const mutation = useMutation({
    mutationFn: (data) => createCourse(data),
    onSuccess: (res) => {
      toast.success("Course created successfully");
      const courseId = res?.data?.id ?? res?.data?.course_id;
      if (courseId) {
        navigate(`/hub/courses/${courseId}`);
      } else {
        navigate("/hub/courses");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create course");
    },
  });

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
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
            You do not have permission to create courses.
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
            <div className="qc-eyebrow">Course Management</div>
            <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
              Create Course
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="qc-label">Title *</label>
              <input className="qc-input" value={form.title} onChange={set("title")} required maxLength={500} />
            </div>

            <div>
              <label className="qc-label">Description</label>
              <textarea className="qc-input min-h-[80px]" value={form.description} onChange={set("description")} maxLength={1500} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="qc-label">Category *</label>
                <select className="qc-input" value={form.category} onChange={set("category")} required>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="qc-label">Level *</label>
                <select className="qc-input" value={form.level} onChange={set("level")} required>
                  {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="qc-label">Duration</label>
              <input className="qc-input" value={form.duration} onChange={set("duration")} placeholder="e.g. 6 weeks, 3 months" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={mutation.isPending} className="qc-btn-primary">
                {mutation.isPending ? "Creating..." : "Create Course"}
              </button>
              <button type="button" onClick={() => navigate("/hub/courses")} className="qc-btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </>
  );
}
