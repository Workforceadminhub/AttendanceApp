import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { hubForgotPassword, hubResetPassword } from "../services/hub/auth";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const forced = !!location.state?.forced;

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Email is required");
      return;
    }
    setIsLoading(true);
    try {
      await hubForgotPassword(trimmed);
      setSent(true);
      toast.success("OTP code sent to your email.");
    } catch (error) {
      toast.error(error.message || "Failed to send OTP code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedOtp = otp.trim();

    if (!trimmedEmail) {
      toast.error("Email address is required");
      return;
    }
    if (!trimmedOtp) {
      toast.error("OTP code is required");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await hubResetPassword({
        email: trimmedEmail,
        otp: trimmedOtp,
        newPassword,
        confirmPassword,
      });
      toast.success("Password updated successfully. Please sign in with your new password.");
      navigate("/login");
    } catch (error) {
      toast.error(error.message || "Failed to reset password. Please check your OTP and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="qc-eyebrow">Reset password</div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
          {sent ? "Reset your password" : forced ? "Set a new password." : "Forgot your password?"}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          {sent
            ? `An OTP code was sent to ${email.trim()}. Enter it below to set your new password.`
            : forced
            ? "Your account requires a new password. We will email you an OTP code."
            : "Enter your email and we will send you an OTP code."}
        </p>

        {sent ? (
          <form onSubmit={handleResetPassword} className="mt-8 space-y-5">
            <div className="rounded-md border border-ink-200 bg-cream-200 px-4 py-3 text-sm text-ink-700">
              An OTP code was sent to <span className="font-medium">{email.trim()}</span>. Check your inbox and enter it below.
            </div>

            <div>
              <label htmlFor="otp" className="qc-label">
                OTP Code
              </label>
              <input
                type="text"
                id="otp"
                autoComplete="one-time-code"
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={isLoading}
                className="qc-input font-mono tracking-wider"
                placeholder="e.g. 482913"
                maxLength={10}
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="qc-label">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                className="qc-input"
              />
              <p className="mt-1 text-xs text-ink-400">At least 8 characters.</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="qc-label">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="qc-input"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !otp.trim() || !newPassword || !confirmPassword}
              className="qc-btn-primary w-full"
            >
              {isLoading ? "Updating..." : "Reset password"}
            </button>

            <div className="flex items-center justify-between text-xs text-ink-500 pt-2">
              <button
                type="button"
                onClick={() => handleRequestOtp()}
                disabled={isLoading}
                className="underline hover:text-ink-900"
              >
                Resend OTP
              </button>
              <button
                type="button"
                onClick={() => setSent(false)}
                disabled={isLoading}
                className="underline hover:text-ink-900"
              >
                Change email
              </button>
            </div>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-ink-500 underline hover:text-ink-900">
                Back to sign in
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRequestOtp} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="qc-label">
                Email
              </label>
              <input
                type="email"
                id="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="qc-input"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="qc-btn-primary w-full"
            >
              {isLoading ? "Sending..." : "Send OTP code"}
            </button>
            <p className="text-xs text-ink-500">
              Remembered it?{" "}
              <Link to="/login" className="underline hover:text-ink-900">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
