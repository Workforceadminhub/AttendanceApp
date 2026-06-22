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

export function hubResetPassword(token, password) {
  return hubPost("/auth/reset-password", { token, password }, undefined, false);
}
