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
            {/* Attendance */}
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
            
            {/* Dashboard  */}
            <Route
              path="/dashboard/subheadsmin"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/leadeff"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/lrecruit"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/leadtr"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/pascares"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/dbsp"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/wadata"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/mincc"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/rcam"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/crfn"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/mdmn"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/edc"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/prm"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/kds"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/hod"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/lea"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />

            {/* Summary  */}
            <Route
              path="/summary/subheadsmin"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/leadeff"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/lrecruit"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/leadtr"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/pascares"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/dbsp"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/wadata"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/mincc"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/rcam"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/crfn"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/mdmn"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/edc"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/prm"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/kds"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/hod"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/lea"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
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
