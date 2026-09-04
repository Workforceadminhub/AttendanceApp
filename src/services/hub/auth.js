import { hubPost } from "./client";

export function hubSignIn(email, password) {
  return hubPost("/auth/signin", { email, password }, undefined, false);
}

export function hubRegister(email, password, firstname, lastname) {
  const body = { email, password };
  if (firstname) body.firstname = firstname;
  if (lastname) body.lastname = lastname;
  return hubPost("/auth/register", body, undefined, false);
}

export function hubVerifyEmail(email, otp) {
  return hubPost("/auth/verify-email", { email, otp }, undefined, false);
}

export function hubResendVerification(email) {
  return hubPost("/auth/resend-verification", { email }, undefined, false);
}

export function hubForgotPassword(email) {
  return hubPost("/auth/forgot-password", { email }, undefined, false);
}

export function hubResetPassword(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("hubResetPassword expects an object payload");
  }
  return hubPost("/auth/reset-password", payload, undefined, false);
}

export function hubSetPassword(password, token) {
  return hubPost(
    "/auth/set-password",
    { password },
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
}
