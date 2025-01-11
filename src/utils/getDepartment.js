import { routeObject } from "./routeObject";

export const getDepartment = (path) => {
  return routeObject.find((item) => item.route === `/${path.split("/").pop()}`);
};
