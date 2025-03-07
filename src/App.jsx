import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SkeletonTheme } from "react-loading-skeleton";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import NotFound from "./components/NotFound";
import Login from "./components/Login";
import Dashboard from "./components/Workers/Dashboard";
import DepartmentSummary from "./components/Workers/DeparmentSummary";
import Home from "./components/Home";
import DepartmentAttendance from "./components/Workers/DepartmentAttendance";
import PrivateRoute from "./components/PrivateRoute";
import React, { useEffect, useState } from "react";
import {
  adminRoutes,
  attendanceRoutes,
  dashboardRoutes,
  historyRoutes,
  summaryRoutes,
} from "./utils/routeObject";
import DepartmentAttendanceHistory from "./components/Workers/History/DepartmentAttendanceHistory";
import DepartmentSummaryHistory from "./components/Workers/History/DeparmentSummaryHistory";
import DashboardHistory from "./components/Workers/History/DashboardHistory";
import NewWorker from "./components/Workers/NewWorker";
import UnmarkedAttendance from "./components/Workers/Unmarked";

const App = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });

  const [isClose, setIsClose] = useState(true);
  const [loading, setLoading] = useState(true);
  const date = "no";

  useEffect(() => {
    if (date === "yes") {
      setIsClose(true);
      setLoading(false);
    } else {
      setIsClose(false);
      setLoading(false);
    }
  }, [date]);

  if (isClose) {
    return loading ? (
      <div>Loading...</div>
    ) : (
      <div className="bg-gray-100 h-screen flex items-center justify-center">
        <h1 className="text-4xl font-bold text-gray-800">Attendance Closed</h1>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SkeletonTheme baseColor="#e5e5e5" highlightColor="#d6d4d4">
          <Routes>
            <Route index element={<Home />} />
            <Route path="/login" element={<Login />} />
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
              path="/attendance/unmarked"
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
