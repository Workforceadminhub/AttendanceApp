import apiRequest from "../utils/apiClient";

const loginService = async (code) => {
  return apiRequest("POST", "/auth/signin", { password: code }, undefined, false);
};

export default loginService;
