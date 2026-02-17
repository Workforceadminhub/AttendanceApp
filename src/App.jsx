import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SkeletonTheme } from "react-loading-skeleton";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import NotFound from "./components/NotFound";
import Login from "./components/Login";
import Dashboard from "./components/Workers/Dashboard";
import DepartmentSummary from "./components/Workers/DepartmentSummary";
import Home from "./components/Home";
import DepartmentAttendance from "./components/Workers/DepartmentAttendance";
import PrivateRoute from "./components/PrivateRoute";
import React from "react";
import {
  adminRoutes,
  attendanceRoutes,
  dashboardRoutes,
  historyRoutes,
  summaryRoutes,
} from "./utils/routeObject";
import DepartmentAttendanceHistory from "./components/Workers/History/DepartmentAttendanceHistory";
import DepartmentSummaryHistory from "./components/Workers/History/DepartmentSummaryHistory";
import DashboardHistory from "./components/Workers/History/DashboardHistory";
import NewWorker from "./components/Workers/NewWorker";
import UnmarkedAttendance from "./components/Workers/Unmarked";
import Workers from "./components/Workers/Workers";
import ChurchAdminWorkers from "./components/Workers/ChurchAdminWorkers";
import AddWorker from "./pages/AddWorker";
import ChurchAdminAddWorker from "./pages/ChurchAdminAddWorker";
import ViewWorker from "./pages/ViewWorker";
import PendingWorkers from "./pages/PendingWorkers";
import AllWorkers from "./pages/AllWorkers";
import TeamMismatch from "./pages/TeamMismatch";
import Report from "./components/Report";
import SuperAdminOverview from "./pages/SuperAdminOverview";
import ManageDepartments from "./pages/ManageDepartments";
import ManageAdmins from "./pages/ManageAdmins";
import DepartmentDetail from "./pages/DepartmentDetail";
import DepartmentWorkers from "./pages/DepartmentWorkers";
import HODBulkAddWorker from "./pages/HODBulkAddWorker";
import HODAddWorker from "./pages/HODAddWorker";
import WorkerAttendanceHistory from "./pages/WorkerAttendanceHistory";
import AuditLog from "./pages/AuditLog";
import AdminDepartmentRedirect from "./pages/AdminDepartmentRedirect";

const App = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SkeletonTheme baseColor="#e5e5e5" highlightColor="#d6d4d4">
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
                  <AdminDepartmentRedirect targetPrefix="attendance" />
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
                      <DepartmentSummary />
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
        </SkeletonTheme>
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
