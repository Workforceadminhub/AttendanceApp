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
import { useEffect, useState } from "react";

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

            {/* Additional Routes for other departments not Ministry */}
            <Route
              path="/attendance/benevolence"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/callcenter"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/celebration"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/ceremonies"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/datamgt"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/growthtrack"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/guestwelcome"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/infohub"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/interactor"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/newconvert"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/weddings"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/kidszone"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/stirhouse"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/adminfacility"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/dmu"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/finance"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/singles"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/wow"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/moh"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/discipleevent"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/grouppartner"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/testimony"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/courses"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/contentdev"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/prayerbible"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/evangelism"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/godencounter"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/hsap"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/investinvite"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/nlp"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/publicity"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/royalpriesthood"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/ogudualapere"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/bethel"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/harmony"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/newgarage"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/shomolu2"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/oworo1"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/oworo2"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/lightbearers"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/trailblazer"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/praise"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/gbagadaestate"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/lighthouse"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/programsleaders"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/protocol"
              element={
                <PrivateRoute>
                  <DepartmentAttendance />
                </PrivateRoute>
              }
            />
            <Route
              path="/attendance/pearl"
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

            {/* Additional routes nor non ministry teams for dashboard */}
            <Route
              path="/dashboard/benevolence"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/callcenter"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/celebration"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/ceremonies"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/datamgt"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/growthtrack"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/guestwelcome"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/infohub"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/interactor"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/newconvert"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/weddings"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/kidszone"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/stirhouse"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/adminfacility"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/dmu"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/finance"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/singles"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/wow"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/moh"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/discipleevent"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/grouppartner"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/testimony"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/courses"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/contentdev"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/prayerbible"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/evangelism"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/godencounter"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/hsap"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/investinvite"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/nlp"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/publicity"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/royalpriesthood"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/ogudualapere"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/bethel"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/harmony"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/newgarage"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/shomolu2"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/oworo1"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/oworo2"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/lightbearers"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/trailblazer"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/praise"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/gbagadaestate"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/lighthouse"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/programsleaders"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/protocol"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/dashboard/pearl"
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

            {/* Additional routes nor non ministry teams for dashboard and */}
            <Route
              path="/summary/benevolence"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/callcenter"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/celebration"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/ceremonies"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/datamgt"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/growthtrack"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/guestwelcome"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/infohub"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/interactor"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/newconvert"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/weddings"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/kidszone"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/stirhouse"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/adminfacility"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/dmu"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/finance"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/singles"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/wow"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/moh"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/discipleevent"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/grouppartner"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/testimony"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/courses"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/contentdev"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/prayerbible"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/evangelism"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/godencounter"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/hsap"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/investinvite"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/nlp"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/publicity"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/royalpriesthood"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/ogudualapere"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/bethel"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/harmony"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/newgarage"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/shomolu2"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/oworo1"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/oworo2"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/lightbearers"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/trailblazer"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/praise"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/gbagadaestate"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/lighthouse"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/programsleaders"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/protocol"
              element={
                <PrivateRoute>
                  <DepartmentSummary />
                </PrivateRoute>
              }
            />
            <Route
              path="/summary/pearl"
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
