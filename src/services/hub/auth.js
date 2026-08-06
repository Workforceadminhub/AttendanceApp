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

export function hubResetPassword(payloadOrEmail, otpOrPassword, newPassword, confirmPassword) {
  if (typeof payloadOrEmail === "object" && payloadOrEmail !== null) {
    return hubPost("/auth/reset-password", payloadOrEmail, undefined, false);
  }
  if (newPassword !== undefined) {
    return hubPost(
      "/auth/reset-password",
      {
        email: payloadOrEmail,
        otp: otpOrPassword,
        newPassword,
        confirmPassword: confirmPassword || newPassword,
      },
      undefined,
      false
    );
  }
  return hubPost(
    "/auth/reset-password",
    {
      email: payloadOrEmail,
      otp: otpOrPassword,
      token: otpOrPassword,
      password: otpOrPassword,
      newPassword: otpOrPassword,
      confirmPassword: otpOrPassword,
    },
    undefined,
    false
  );
}


export function hubSetPassword(password, token) {
  return hubPost(
    "/auth/set-password",
    { password },
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
}
