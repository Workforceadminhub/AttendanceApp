import { Route } from "react-router-dom";
import PrivateRoute from "./PrivateRoute"; // Adjust the path as needed
import DepartmentAttendance from "./DepartmentAttendance"; // Adjust the path as needed

const routes = (
  <>
    <Route
      path="/subheadsmin"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/leadeff"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/lrecruit"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/leadtr"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/pascares"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/dbsp"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/wadata"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/mincc"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/rcam"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/crfn"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/mdmn"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/edc"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/prm"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/kds"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/hod"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
    <Route
      path="/lea"
      element={
        <PrivateRoute>
          <DepartmentAttendance />
        </PrivateRoute>
      }
    />
  </>
);

export default routes;
