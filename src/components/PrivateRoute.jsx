import React, { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAccessToken, getSessionUser } from "../utils/authSession";

const PrivateRoute = ({ children }) => {
  const location = useLocation();
  const authUser = useMemo(
    () => (getAccessToken() ? getSessionUser() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read the session on navigation
    [location.pathname, location.search]
  );

  if (!authUser) {
    return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}${location.hash}` }} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
