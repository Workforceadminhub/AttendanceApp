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

const App = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
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
              path="/attendance/subheadsmin"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/leadeff"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/lrecruit"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/leadtr"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/pascares"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/dbsp"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/wadata"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/mincc"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/rcam"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/crfn"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/mdmn"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/edc"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/prm"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/kds"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/hod"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/lea"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
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
