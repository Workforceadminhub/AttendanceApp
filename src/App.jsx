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
const ChurchAdminAddWorker = lazy(() => import("./pages/ChurchAdminAddWorker"));
const ViewWorker = lazy(() => import("./pages/ViewWorker"));
const PendingWorkers = lazy(() => import("./pages/PendingWorkers"));
const AllWorkers = lazy(() => import("./pages/AllWorkers"));
const TeamMismatch = lazy(() => import("./pages/TeamMismatch"));
const PastoralFix = lazy(() => import("./pages/PastoralFix"));
const Report = lazy(() => import("./components/Report"));
const SuperAdminOverview = lazy(() => import("./pages/SuperAdminOverview"));
const ManageDepartments = lazy(() => import("./pages/ManageDepartments"));
const ManageAdmins = lazy(() => import("./pages/ManageAdmins"));
const BulkEmail = lazy(() => import("./pages/BulkEmail"));
const BulkEmailReport = lazy(() => import("./pages/BulkEmailReport"));
const DepartmentDetail = lazy(() => import("./pages/DepartmentDetail"));
const DepartmentWorkers = lazy(() => import("./pages/DepartmentWorkers"));
const HODBulkAddWorker = lazy(() => import("./pages/HODBulkAddWorker"));
const HODAddWorker = lazy(() => import("./pages/HODAddWorker"));
const WorkerAttendanceHistory = lazy(() => import("./pages/WorkerAttendanceHistory"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const LeadershipRegistration = lazy(() => import("./pages/LeadershipRegistration"));
const LeadershipRegistrationAdmin = lazy(() => import("./pages/LeadershipRegistrationAdmin"));
const LeadersMeetingConfirm = lazy(() => import("./pages/LeadersMeetingConfirm"));
const AdminDepartmentRedirect = lazy(() => import("./pages/AdminDepartmentRedirect"));
const AdminWorkersRedirect = lazy(() => import("./pages/AdminWorkersRedirect"));
const AdminSummaryDetail = lazy(() => import("./pages/AdminSummaryDetail"));

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
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingState />}>
        <Routes>
            <Route index element={<Home />} />
            <Route path="/login" element={<Login />} />
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
            <Route path="/leadersmeeting/confirm" element={<LeadersMeetingConfirm />} />
            <Route
              path="/admin/leadership-registrations"
              element={
                <PrivateRoute>
                  <LeadershipRegistrationAdmin />
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

            {/* Super Admin Routes - Based on login response route: "/super-admin" */}
            <Route
              path="/overview/super-admin"
              element={
                <PrivateRoute>
                  <SuperAdminOverview />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/super-admin"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/super-admin"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
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
        <DepartmentsProvider>
          <SkeletonTheme baseColor="#e5e5e5" highlightColor="#d6d4d4">
            <AppRoutes />
          </SkeletonTheme>
        </DepartmentsProvider>
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
