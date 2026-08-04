import { getEffectiveRouteList } from "./routeObject";

export const getDepartment = (path) => {
  if (!path) return null;
  const lastSeg = path.split("/").filter(Boolean).pop() || "";
  if (!lastSeg) return null;
  const list = getEffectiveRouteList();
  const normalized = `/${lastSeg}`;
  return (
    list.find(
      (item) =>
        item.route === normalized ||
        item.route.replace(/^\//, "").toLowerCase() === lastSeg.toLowerCase()
    ) || null
  );
};

export const getDepartmentByUser = (path) => {
  const teamByPath = getDepartment(path);
  if (teamByPath) return teamByPath;
  const authUser = sessionStorage.getItem("authUser");
  const user = authUser ? JSON.parse(authUser) : null;
  return user ? { team: user?.team, department: user?.department } : null;
};

