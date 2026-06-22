import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Tag } from "../../../components/ui";
import { useCanAction } from "../../../contexts/RBACContext";
import { fetchCourses } from "../../../services/hub/courses";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "in_progress", label: "In Progress" },
];

const STATUS_TONE = {
  published: "success",
  draft: "neutral",
  in_progress: "live",
  review: "warning",
};

export default function CourseList() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const canCreate = useCanAction("create_training");

  const { data, isLoading } = useQuery({
    queryKey: ["hub-courses", { status, search, page }],
    queryFn: () => fetchCourses({ status, search, page, per_page: 20 }),
  });

  const courses = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <Header />
      <Layout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="qc-eyebrow">Course Management</div>
              <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                Courses
              </h1>
            </div>
            {canCreate && (
              <Link to="/hub/courses/create" className="qc-btn-primary shrink-0">
                Create Course
              </Link>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-1 border border-ink-200 rounded-md p-0.5 bg-white">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setStatus(tab.key); setPage(1); }}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    status === tab.key
                      ? "bg-ink-900 text-cream"
                      : "text-ink-600 hover:text-ink-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="qc-input flex-1"
            />
          </div>

          <div className="qc-card overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-ink-500">Loading courses...</div>
            ) : courses.length === 0 ? (
              <div className="p-8 text-center text-ink-500">No courses found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 bg-cream-200">
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Title</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Category</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Level</th>
                      <th className="text-left px-4 py-3 font-medium text-ink-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {courses.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-cream-200 cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/hub/courses/${c.id}`}
                      >
                        <td className="px-4 py-3 font-medium text-ink-900">{c.title}</td>
                        <td className="px-4 py-3 text-ink-600">{c.category}</td>
                        <td className="px-4 py-3 text-ink-600">{c.level}</td>
                        <td className="px-4 py-3">
                          <Tag tone={STATUS_TONE[c.status] ?? "neutral"}>
                            {c.status}
                          </Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-500">
                Page <span className="qc-num">{page}</span> of <span className="qc-num">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="qc-btn-secondary"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="qc-btn-secondary"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
