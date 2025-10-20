import apiRequest from "../utils/apiClient";
import { initializeFilterData } from "../utils/filterCache";

const loginService = async (code) => {
  try {
    const response = await apiRequest("POST", "/auth/signin", { password: code }, undefined, false);
    
    // If login is successful and we have an access token, initialize filter data
    if (response && response.accessToken) {
      // Initialize filter data in the background
      initializeFilterData(response.accessToken).catch(error => {
        // Silent error handling
      });
    }
    
    return response;
  } catch (error) {
    // Silent error handling
    throw error;
  }
};

export default loginService;
