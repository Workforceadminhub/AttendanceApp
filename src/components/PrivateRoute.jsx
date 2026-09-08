import React, { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSessionUser } from "../utils/authSession";

const PrivateRoute = ({ children }) => {
  const location = useLocation();
  const authUser = useMemo(() => getSessionUser(), []);

  if (!authUser) {
    return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}${location.hash}` }} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
