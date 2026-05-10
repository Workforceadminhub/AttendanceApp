import { getEffectiveRouteList } from "./routeObject";

export const getDepartment = (path) => {
  return getEffectiveRouteList().find(
    (item) => item.route === `/${path.split("/").pop()}`
  );
};

export const getDepartmentByUser = (path) => {
  const authUser = sessionStorage.getItem("authUser");
  const user = authUser ? JSON.parse(authUser) : null;
  const teamByPath = getDepartment(path);
  const finalTeam = user
    ? { team: user?.team, department: user?.department }
    : teamByPath;
  return finalTeam;
};
