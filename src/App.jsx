import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SkeletonTheme } from "react-loading-skeleton";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import React, { Suspense, lazy } from "react";
import NotFound from "./components/NotFound";
import Login from "./components/Login";
import Home from "./components/Home";
import PrivateRoute from "./components/PrivateRoute";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import LoadingState from "./components/LoadingState";
import { DepartmentsProvider, useDepartmentRoutes } from "./contexts/DepartmentsContext";
import { RBACProvider } from "./contexts/RBACContext";
import HubRoute from "./components/auth/HubRoute";

// Code-split heavy pages — keeps initial bundle small
const Dashboard = lazy(() => import("./components/Workers/Dashboard"));
const DepartmentSummary = lazy(() => import("./components/Workers/DepartmentSummary"));
const DepartmentAttendance = lazy(() => import("./components/Workers/DepartmentAttendance"));
const DepartmentAttendanceHistory = lazy(() => import("./components/Workers/History/DepartmentAttendanceHistory"));
const DepartmentSummaryHistory = lazy(() => import("./components/Workers/History/DepartmentSummaryHistory"));
const DashboardHistory = lazy(() => import("./components/Workers/History/DashboardHistory"));
const NewWorker = lazy(() => import("./components/Workers/NewWorker"));
const UnmarkedAttendance = lazy(() => import("./components/Workers/Unmarked"));
const Workers = lazy(() => import("./components/Workers/Workers"));
const ChurchAdminWorkers = lazy(() => import("./components/Workers/ChurchAdminWorkers"));
const AddWorker = lazy(() => import("./pages/AddWorker"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SetPassword = lazy(() => import("./pages/SetPassword"));
const ChurchAdminAddWorker = lazy(() => import("./pages/ChurchAdminAddWorker"));
const ViewWorker = lazy(() => import("./pages/ViewWorker"));
const PendingWorkers = lazy(() => import("./pages/PendingWorkers"));
const AllWorkers = lazy(() => import("./pages/AllWorkers"));
const TeamMismatch = lazy(() => import("./pages/TeamMismatch"));
const PastoralFix = lazy(() => import("./pages/PastoralFix"));
const Report = lazy(() => import("./components/Report"));
const ManageDepartments = lazy(() => import("./pages/ManageDepartments"));
const ManageAdmins = lazy(() => import("./pages/ManageAdmins"));
const ManageLeadersStrength = lazy(() => import("./pages/ManageLeadersStrength"));
const BulkEmail = lazy(() => import("./pages/BulkEmail"));
const BulkEmailReport = lazy(() => import("./pages/BulkEmailReport"));
const BulkSms = lazy(() => import("./pages/BulkSms"));
const DepartmentDetail = lazy(() => import("./pages/DepartmentDetail"));
const DepartmentWorkers = lazy(() => import("./pages/DepartmentWorkers"));
const HODBulkAddWorker = lazy(() => import("./pages/HODBulkAddWorker"));
const HODAddWorker = lazy(() => import("./pages/HODAddWorker"));
const WorkerAttendanceHistory = lazy(() => import("./pages/WorkerAttendanceHistory"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const LeadershipRegistration = lazy(() => import("./pages/LeadershipRegistration"));
const LeadershipRegistrationAdmin = lazy(() => import("./pages/LeadershipRegistrationAdmin"));
const AwakeningRegistration = lazy(() => import("./pages/AwakeningRegistration"));
const AwakeningRegistrationAdmin = lazy(() => import("./pages/AwakeningRegistrationAdmin"));
const LeadersMeetingConfirm = lazy(() => import("./pages/LeadersMeetingConfirm"));
const LeadersMeetingPresent = lazy(() => import("./pages/LeadersMeetingPresent"));
const LeadersMeetingReport = lazy(() => import("./pages/LeadersMeetingReport"));
const LeadersMeetingPresentReport = lazy(() => import("./pages/LeadersMeetingPresentReport"));
const WorkersMeetingConfirm = lazy(() => import("./pages/WorkersMeetingConfirm"));
const WorkersMeetingPresent = lazy(() => import("./pages/WorkersMeetingPresent"));
const WorkersMeetingReport = lazy(() => import("./pages/WorkersMeetingReport"));
const WorkersMeetingPresentReport = lazy(() => import("./pages/WorkersMeetingPresentReport"));
const MeetingSettings = lazy(() => import("./pages/MeetingSettings"));
const AdminDepartmentRedirect = lazy(() => import("./pages/AdminDepartmentRedirect"));
const AdminWorkersRedirect = lazy(() => import("./pages/AdminWorkersRedirect"));
const AdminSummaryDetail = lazy(() => import("./pages/AdminSummaryDetail"));
const AuditSessionBootstrap = import.meta.env.DEV
  ? lazy(() => import("./pages/AuditSessionBootstrap"))
  : null;

// Hub pages (RBAC, Trainings, Courses, Certificates)
const TrainingList = lazy(() => import("./pages/hub/trainings/TrainingList"));
const CreateTraining = lazy(() => import("./pages/hub/trainings/CreateTraining"));
const TrainingDetail = lazy(() => import("./pages/hub/trainings/TrainingDetail"));
const CourseList = lazy(() => import("./pages/hub/courses/CourseList"));
const VerifyCertificate = lazy(() => import("./pages/hub/certificates/VerifyCertificate"));
const NominateWorkers = lazy(() => import("./pages/hub/trainings/NominateWorkers"));
const MyNominations = lazy(() => import("./pages/hub/trainings/MyNominations"));
const MarkAttendance = lazy(() => import("./pages/hub/trainings/MarkAttendance"));
const DepartmentAssignments = lazy(() => import("./pages/hub/trainings/DepartmentAssignments"));
const CourseDetail = lazy(() => import("./pages/hub/courses/CourseDetail"));
const CreateCourse = lazy(() => import("./pages/hub/courses/CreateCourse"));
const WorkerCertificates = lazy(() => import("./pages/hub/certificates/WorkerCertificates"));
const CertificateTemplates = lazy(() => import("./pages/hub/certificates/CertificateTemplates"));
const CertificateInventory = lazy(() => import("./pages/hub/certificates/CertificateInventory"));
const Cohorts = lazy(() => import("./pages/hub/trainings/Cohorts"));
const ProgressionPathwaysPage = lazy(() => import("./pages/hub/trainings/ProgressionPathwaysPage"));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry auth/permission errors (deterministic — won't change on retry)
        const msg = error?.message || "";
        if (msg.includes("Invalid credentials") || msg.includes("permission")) return false;
        // Server errors (5xx) ARE often transient (Lambda cold starts, API
        // Gateway throttling). Retry up to 3 times with exponential backoff.
        return failureCount < 3;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});

const AppRoutes = () => {
  const { attendanceRoutes, dashboardRoutes, summaryRoutes, adminRoutes, historyRoutes } =
    useDepartmentRoutes();

  // awakening.hiccgbagada.com serves the public registration form at any path
  // (awakening.localhost lets you test the subdomain branch locally)
  const isAwakeningHost =
    typeof window !== "undefined" &&
    ["awakening.hiccgbagada.com", "awakening.localhost"].includes(
      window.location.hostname
    );

  if (isAwakeningHost) {
    return (
      <RouteErrorBoundary>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="*" element={<AwakeningRegistration />} />
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
    );
  }

  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingState />}>
          <Routes>
            {AuditSessionBootstrap && (
              <Route path="/__ux-audit/:role" element={<AuditSessionBootstrap />} />
            )}
            <Route index element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route
              path="/report"
              element={
                <PrivateRoute>
                  <Report />
                </PrivateRoute>
              }
            />
            <Route path="/new/worker" element={<NewWorker />} />
            <Route path="/leadership-registration" element={<LeadershipRegistration />} />
            <Route path="/awakening" element={<AwakeningRegistration />} />
            <Route path="/leadersmeeting/confirm" element={<LeadersMeetingConfirm />} />
            <Route path="/leaders-meeting" element={<LeadersMeetingPresent />} />
            <Route path="/workersmeeting/confirm" element={<WorkersMeetingConfirm />} />
            <Route path="/workers-meeting/confirm" element={<WorkersMeetingConfirm />} />
            <Route path="/workers-meeting" element={<WorkersMeetingPresent />} />
            <Route
              path="/admin/leadership-registrations"
              element={
                <PrivateRoute>
                  <LeadershipRegistrationAdmin />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/awakening-registrations"
              element={
                <PrivateRoute>
                  <AwakeningRegistrationAdmin />
                </PrivateRoute>
              }
            />
            <Route
              path="/report/confirmation-leaders-meeting"
              element={
                <PrivateRoute>
                  <LeadersMeetingReport />
                </PrivateRoute>
              }
            />
            <Route
              path="/report/leaders-meeting"
              element={
                <PrivateRoute>
                  <LeadersMeetingPresentReport />
                </PrivateRoute>
              }
            />
            <Route
              path="/report/confirmation-workers-meeting"
              element={
                <PrivateRoute>
                  <WorkersMeetingReport />
                </PrivateRoute>
              }
            />
            <Route
              path="/report/workers-meeting"
              element={
                <PrivateRoute>
                  <WorkersMeetingPresentReport />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings/meetings"
              element={
                <PrivateRoute>
                  <MeetingSettings />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/devmode"
              element={
                <PrivateRoute>
                  <UnmarkedAttendance />
                </PrivateRoute>
              }
            />

            {/* Attendance */}
            {attendanceRoutes.map((route) => (
              <Route
                path={route}
                key={route}
                element={
                  <PrivateRoute>
                    <DepartmentAttendance />
                  </PrivateRoute>
                }
              />
            ))}

            {/* Dashboard  */}
            {dashboardRoutes.map((route) => (
              <Route
                path={route}
                key={route}
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
            ))}

            {/* Summary  */}
            {summaryRoutes.map((route) => (
              <Route
                path={route}
                key={route}
                element={
                  <PrivateRoute>
                    <DepartmentSummary />
                  </PrivateRoute>
                }
              />
            ))}

            {/* Admin routes */}
            <Route
              path="/attendance/summary"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />

            <Route
              path="/settings/leaders-strength"
              element={
                <PrivateRoute>
                  <ManageLeadersStrength />
                </PrivateRoute>
              }
            />
            <Route
              path="/manage-leaders-strength"
              element={
                <PrivateRoute>
                  <ManageLeadersStrength />
                </PrivateRoute>
              }
            />
            <Route
              path="/overview/super-admin"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/super-admin"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/super-admin"
              element={
                <PrivateRoute>
                  <AdminSummaryDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/super-admin"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/workers/super-admin"
              element={
                <PrivateRoute>
                  <Workers />
                </PrivateRoute>
              }
            />
            <Route
              path="/add-worker"
              element={
                <PrivateRoute>
                  <AddWorker />
                </PrivateRoute>
              }
            />
            <Route
              path="/worker/:workerId"
              element={
                <PrivateRoute>
                  <ViewWorker />
                </PrivateRoute>
              }
            />
            <Route
              path="/pending-workers"
              element={
                <PrivateRoute>
                  <PendingWorkers />
                </PrivateRoute>
              }
            />
            <Route
              path="/all-workers"
              element={
                <PrivateRoute>
                  <AllWorkers />
                </PrivateRoute>
              }
            />
            <Route
              path="/team-mismatch"
              element={
                <PrivateRoute>
                  <TeamMismatch />
                </PrivateRoute>
              }
            />
            <Route
              path="/pastoral-fix"
              element={
                <PrivateRoute>
                  <PastoralFix />
                </PrivateRoute>
              }
            />
            <Route
              path="/manage-departments"
              element={
                <PrivateRoute>
                  <ManageDepartments />
                </PrivateRoute>
              }
            />
            <Route
              path="/manage-admins"
              element={
                <PrivateRoute>
                  <ManageAdmins />
                </PrivateRoute>
              }
            />
            <Route
              path="/bulk-email"
              element={
                <PrivateRoute>
                  <BulkEmail />
                </PrivateRoute>
              }
            />
            <Route
              path="/bulk-email/report"
              element={
                <PrivateRoute>
                  <BulkEmailReport />
                </PrivateRoute>
              }
            />
            <Route
              path="/bulk-sms"
              element={
                <PrivateRoute>
                  <BulkSms />
                </PrivateRoute>
              }
            />

            {/* Church Admin Routes */}
            <Route
              path="/church-admin/workers"
              element={
                <PrivateRoute>
                  <ChurchAdminWorkers />
                </PrivateRoute>
              }
            />
            <Route
              path="/church-admin/add-worker"
              element={
                <PrivateRoute>
                  <ChurchAdminAddWorker />
                </PrivateRoute>
              }
            />

            {/* Phase 7: New routes */}
            {/* Team Admin canonical URLs */}
            <Route
              path="/department/admin/:teamRoute"
              element={
                <PrivateRoute>
                  <AdminDepartmentRedirect targetPrefix="dashboard" />
                </PrivateRoute>
              }
            />
            <Route
              path="/department/admin/:teamRoute/workers"
              element={
                <PrivateRoute>
                  <AdminDepartmentRedirect targetPrefix="workers" />
                </PrivateRoute>
              }
            />
            {/* Team Admin workers overview */}
            <Route
              path="/workers/admin/:teamRoute"
              element={
                <PrivateRoute>
                  <AdminWorkersRedirect />
                </PrivateRoute>
              }
            />
            <Route
              path="/department/:departmentRoute"
              element={
                <PrivateRoute>
                  <DepartmentDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/department/:departmentRoute/workers"
              element={
                <PrivateRoute>
                  <DepartmentWorkers />
                </PrivateRoute>
              }
            />
            <Route
              path="/department/:departmentRoute/add-worker"
              element={
                <PrivateRoute>
                  <HODAddWorker />
                </PrivateRoute>
              }
            />
            <Route
              path="/department/:departmentRoute/bulk-add"
              element={
                <PrivateRoute>
                  <HODBulkAddWorker />
                </PrivateRoute>
              }
            />
            <Route
              path="/worker/:workerId/attendance"
              element={
                <PrivateRoute>
                  <WorkerAttendanceHistory />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/audit-log"
              element={
                <PrivateRoute>
                  <AuditLog />
                </PrivateRoute>
              }
            />

            {adminRoutes.map((route) => (
              <React.Fragment key={route}>
                <Route
                  path={`/attendance/${route}`}
                  element={
                    <PrivateRoute>
                      <DepartmentAttendance />
                    </PrivateRoute>
                  }
                />
                <Route
                  path={`/summary/${route}`}
                  element={
                    <PrivateRoute>
                      <AdminSummaryDetail />
                    </PrivateRoute>
                  }
                />
                <Route
                  path={`/dashboard/${route}`}
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  }
                />
              </React.Fragment>
            ))}

            {historyRoutes.map((route) => (
              <React.Fragment key={route}>
                <Route
                  path={`/attendance/${route}`}
                  element={
                    <PrivateRoute>
                      <DepartmentAttendanceHistory />
                    </PrivateRoute>
                  }
                />
                <Route
                  path={`/summary/${route}`}
                  element={
                    <PrivateRoute>
                      <DepartmentSummaryHistory />
                    </PrivateRoute>
                  }
                />
                <Route
                  path={`/dashboard/${route}`}
                  element={
                    <PrivateRoute>
                      <DashboardHistory />
                    </PrivateRoute>
                  }
                />
              </React.Fragment>
            ))}
            <Route
              path={`/summary/history/admin`}
              element={
                <PrivateRoute>
                  <DepartmentSummaryHistory />
                </PrivateRoute>
              }
            />
            <Route
              path={`/dashboard/history/admin`}
              element={
                <PrivateRoute>
                  <DashboardHistory />
                </PrivateRoute>
              }
            />

            {/* ── Hub routes (additive — existing routes above are untouched) ── */}
            <Route
              path="/hub/trainings"
              element={
                <HubRoute requiredNav="trainings">
                  <TrainingList />
                </HubRoute>
              }
            />
            <Route
              path="/hub/trainings/create"
              element={
                <HubRoute requiredNav="trainings">
                  <CreateTraining />
                </HubRoute>
              }
            />
            <Route
              path="/hub/trainings/pathways"
              element={
                <HubRoute requiredNav="trainings">
                  <ProgressionPathwaysPage />
                </HubRoute>
              }
            />
            <Route
              path="/hub/trainings/cohorts"
              element={
                <HubRoute requiredNav="trainings">
                  <Cohorts />
                </HubRoute>
              }
            />

            <Route
              path="/hub/trainings/:id"
              element={
                <HubRoute requiredNav="trainings">
                  <TrainingDetail />
                </HubRoute>
              }
            />
            <Route
              path="/hub/trainings/:id/nominate"
              element={
                <HubRoute requiredNav="trainings">
                  <NominateWorkers />
                </HubRoute>
              }
            />
            <Route
              path="/hub/trainings/:id/attendance"
              element={
                <HubRoute requiredNav="trainings">
                  <MarkAttendance />
                </HubRoute>
              }
            />
            <Route
              path="/hub/trainings/:id/assignments"
              element={
                <HubRoute requiredNav="trainings">
                  <DepartmentAssignments />
                </HubRoute>
              }
            />
            <Route
              path="/hub/trainings/nominations"
              element={
                <HubRoute requiredNav="trainings">
                  <MyNominations />
                </HubRoute>
              }
            />
            <Route
              path="/hub/courses"
              element={
                <HubRoute requiredNav="courses">
                  <CourseList />
                </HubRoute>
              }
            />
            <Route
              path="/hub/courses/create"
              element={
                <HubRoute requiredNav="courses">
                  <CreateCourse />
                </HubRoute>
              }
            />
            <Route
              path="/hub/courses/:id"
              element={
                <HubRoute requiredNav="courses">
                  <CourseDetail />
                </HubRoute>
              }
            />
            <Route
              path="/hub/certificates"
              element={
                <HubRoute requiredNav="trainings">
                  <WorkerCertificates />
                </HubRoute>
              }
            />
            <Route
              path="/hub/certificates/templates"
              element={
                <HubRoute requiredNav="admin_panel">
                  <CertificateTemplates />
                </HubRoute>
              }
            />
            <Route
              path="/hub/certificates/inventory"
              element={
                <HubRoute requiredNav="admin_panel">
                  <CertificateInventory />
                </HubRoute>
              }
            />
            {/* Public — no auth required */}
            <Route path="/verify/:certificateNumber" element={<VerifyCertificate />} />

            {/* Fallback param routes — catch new dept/admin slugs before dept cache refreshes */}
            <Route
              path="/dashboard/admin/:teamRoute"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/:departmentRoute"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/admin/:teamRoute"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/:departmentRoute"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/admin/:teamRoute"
              element={
                <PrivateRoute>
                  <AdminSummaryDetail />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/:departmentRoute"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />

            <Route path="*" exact={true} element={<NotFound />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RBACProvider>
          <DepartmentsProvider>
            <SkeletonTheme baseColor="#e5e5e5" highlightColor="#d6d4d4">
              <AppRoutes />
            </SkeletonTheme>
          </DepartmentsProvider>
        </RBACProvider>
      </BrowserRouter>
      <ToastContainer
        hideProgressBar
        autoClose={5000}
        theme="colored"
        position="top-center"
      />
    </QueryClientProvider>
  );
};

export default App;
