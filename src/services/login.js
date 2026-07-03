import apiRequest from "../utils/apiClient";
import { initializeFilterData } from "../utils/filterCache";
import { persistSession } from "../utils/authSession";
import { resolveAdminRoute, ensureSessionRoute } from "../utils/routeObject";

const loginService = async (code) => {
  const trimmedCode = (code ?? "").trim();
  const response = await apiRequest("POST", "/auth/signin", { password: trimmedCode }, undefined, false);

  if (response?.accessToken) {
    const rawUser = response.user ?? {};
    const authUser = persistSession(response.accessToken, rawUser, {
      permissionLevel: response.permissionLevel ?? rawUser.permissionLevel,
      assignedDepartments:
        response.assignedDepartments ?? rawUser.assignedDepartments ?? [],
    });
    if (!authUser.route?.trim()) {
      const derived = resolveAdminRoute(authUser);
      if (derived) authUser.route = derived;
    }
    ensureSessionRoute(authUser);
    sessionStorage.setItem("authUser", JSON.stringify(authUser));

    initializeFilterData(response.accessToken).catch(() => {});

    return { ...response, authUser };
  }

  return response;
};

export default loginService;
