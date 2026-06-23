import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Tag } from "../../../components/ui";
import {
  fetchCourse,
  fetchCourseCurriculum,
  fetchEnrollments,
  enrollInCourse,
  completeLecture,
} from "../../../services/hub/courses";

const TABS = [
  { key: "curriculum", label: "Curriculum" },
  { key: "enrollments", label: "Enrollments" },
];

export default function CourseDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("curriculum");

  const { data: courseData, isLoading } = useQuery({
    queryKey: ["hub-course", id],
    queryFn: () => fetchCourse(id),
  });
  const course = courseData?.data ?? courseData ?? null;

  const { data: curriculumData } = useQuery({
    queryKey: ["hub-course-curriculum", id],
    queryFn: () => fetchCourseCurriculum(id),
    enabled: tab === "curriculum",
  });
  const sections = curriculumData?.data ?? [];

  const { data: enrollmentsData } = useQuery({
    queryKey: ["hub-course-enrollments", id],
    queryFn: () => fetchEnrollments(id),
    enabled: tab === "enrollments",
  });
  const enrollments = enrollmentsData?.data ?? [];

  const enrollMut = useMutation({
    mutationFn: () => enrollInCourse(id),
    onSuccess: () => {
      toast.success("Enrolled in course");
      queryClient.invalidateQueries({ queryKey: ["hub-course", id] });
      queryClient.invalidateQueries({ queryKey: ["hub-course-enrollments", id] });
    },
    onError: (err) => toast.error(err.message || "Enrollment failed"),
  });

  if (isLoading) {
    return (
      <>
        <Header />
        <Layout>
          <div className="p-8 text-center text-ink-500">Loading course...</div>
        </Layout>
      </>
    );
  }

  if (!course) {
    return (
      <>
        <Header />
        <Layout>
          <div className="p-8 text-center text-ink-500">Course not found.</div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Header />
      <Layout>
        <div className="space-y-6">
          <Link to="/hub/courses" className="text-sm text-ink-500 hover:text-ink-900">
            &larr; Back to Courses
          </Link>

          {/* Course header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="qc-eyebrow">{course.category}</div>
              <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
                {course.title}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Tag tone={course.status === "published" ? "success" : "neutral"}>
                  {course.status}
                </Tag>
                {course.level && <Tag tone="neutral">{course.level}</Tag>}
              </div>
              {course.description && (
                <p className="mt-3 text-sm text-ink-600 max-w-xl">{course.description}</p>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              {!course.is_enrolled && course.status === "published" && (
                <button
                  type="button"
                  disabled={enrollMut.isPending}
                  onClick={() => enrollMut.mutate()}
                  className="qc-btn-primary"
                >
                  {enrollMut.isPending ? "Enrolling..." : "Enroll"}
                </button>
              )}
              {course.is_enrolled && (
                <Tag tone="success">Enrolled</Tag>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 border-b border-ink-200">
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
          {tab === "curriculum" && (
            <CurriculumTree
              sections={sections}
              courseId={id}
              enrollmentId={course.enrollment_id}
            />
          )}
          {tab === "enrollments" && (
            <EnrollmentTable enrollments={enrollments} />
          )}
        </div>
      </Layout>
    </>
  );
}

function CurriculumTree({ sections, courseId, enrollmentId }) {
  const queryClient = useQueryClient();

  const completeMut = useMutation({
    mutationFn: ({ lectureId }) => completeLecture(enrollmentId, lectureId),
    onSuccess: () => {
      toast.success("Lecture completed");
      queryClient.invalidateQueries({ queryKey: ["hub-course-curriculum", courseId] });
    },
    onError: (err) => toast.error(err.message || "Failed to mark complete"),
  });

  if (sections.length === 0) {
    return (
      <div className="qc-card p-8 text-center text-sm text-ink-500">
        No curriculum content yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <div key={section.id ?? si} className="qc-card overflow-hidden">
          <div className="px-4 py-3 bg-cream-200 border-b border-ink-200">
            <h3 className="text-sm font-medium text-ink-900">
              <span className="qc-num text-ink-500 mr-2">{si + 1}.</span>
              {section.title}
            </h3>
          </div>
          {section.lectures?.length > 0 ? (
            <div className="divide-y divide-ink-100">
              {section.lectures.map((lecture, li) => {
                const isCompleted = lecture.completed || lecture.is_completed;
                return (
                  <div
                    key={lecture.id ?? li}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`flex items-center justify-center w-5 h-5 rounded-full border shrink-0 ${
                          isCompleted
                            ? "bg-forest border-forest"
                            : "border-ink-300"
                        }`}
                      >
                        {isCompleted && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 14 14" fill="none">
                            <path
                              d="M3 7l3 3 5-6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm ${isCompleted ? "text-ink-500 line-through" : "text-ink-900"}`}>
                          {lecture.title}
                        </div>
                        {lecture.type && (
                          <span className="text-xs text-ink-400 capitalize">{lecture.type}</span>
                        )}
                      </div>
                    </div>
                    {enrollmentId && !isCompleted && (
                      <button
                        type="button"
                        disabled={completeMut.isPending}
                        onClick={() => completeMut.mutate({ lectureId: lecture.id })}
                        className="text-xs text-ink-600 hover:text-ink-900 underline shrink-0"
                      >
                        Mark done
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-ink-500">No lectures yet.</div>
          )}
        </div>
      ))}
    </div>
  );
}

function EnrollmentTable({ enrollments }) {
  if (enrollments.length === 0) {
    return (
      <div className="qc-card p-8 text-center text-sm text-ink-500">
        No enrollments yet.
      </div>
    );
  }

  return (
    <div className="qc-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-200 bg-cream-200">
            <th className="text-left px-4 py-3 font-medium text-ink-700">Worker</th>
            <th className="text-left px-4 py-3 font-medium text-ink-700">Progress</th>
            <th className="text-left px-4 py-3 font-medium text-ink-700">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {enrollments.map((e, i) => (
            <tr key={e.id ?? i}>
              <td className="px-4 py-3 text-ink-900">
                {e.worker_name ?? `Worker ${e.worker_id}`}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-ink-200 rounded-full overflow-hidden max-w-[120px]">
                    <div
                      className="h-full bg-forest rounded-full transition-all"
                      style={{ width: `${e.progress ?? 0}%` }}
                    />
                  </div>
                  <span className="qc-num text-xs text-ink-500">{e.progress ?? 0}%</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Tag tone={e.status === "completed" ? "success" : "neutral"}>
                  {e.status ?? "active"}
                </Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
