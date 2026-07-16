/** Generic auth failure — never surface backend wording for sign-in. */
export const AUTH_ERROR_MESSAGE = "Invalid credentials. Please try again.";

/** Public form submission — avoids confirming whether an account/record exists. */
export const PUBLIC_SUBMIT_SUCCESS =
  "If the details provided are correct, further instructions will be sent.";

export const PUBLIC_SUBMIT_ERROR =
  "We couldn't complete your request. Please check your details and try again.";

export const PUBLIC_LOOKUP_HINT =
  "We couldn't verify those details automatically. You can still complete the form below.";

export function authErrorMessage(status) {
  if (status === 401) return AUTH_ERROR_MESSAGE;
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested resource was not found.";
  if (status >= 500) return "A server error occurred. Please try again later.";
  if (status === undefined || status === null) {
    return "Unable to reach the server. Check your connection and try again.";
  }
  return PUBLIC_SUBMIT_ERROR;
}
