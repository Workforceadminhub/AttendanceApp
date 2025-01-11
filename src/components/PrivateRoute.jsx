import React from "react";
import { Navigate } from "react-router-dom";
import { getUser } from "../utils/getUser";

const PrivateRoute = ({ children }) => {
  const authUser = getUser()

  if (!authUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
