import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { hubForgotPassword } from "../services/hub/auth";

export default function ForgotPassword() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const forced = !!location.state?.forced;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Email is required");
      return;
    }
    setIsLoading(true);
    try {
      await hubForgotPassword(trimmed);
      setSent(true);
    } catch (error) {
      toast.error(error.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="qc-eyebrow">Reset password</div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
          {forced ? "Set a new password." : "Forgot your password?"}
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          {forced
            ? "Your account requires a new password. We will email you a reset link."
            : "Enter your email and we will send you a reset link."}
        </p>

        {sent ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-md border border-ink-200 bg-cream-200 px-4 py-3 text-sm text-ink-700">
              If an account exists for <span className="font-medium">{email.trim()}</span>,
              a password reset link has been sent. Check your inbox and follow the link
              to set a new password.
            </div>
            <Link
              to={`/reset-password?email=${encodeURIComponent(email.trim())}`}
              className="qc-btn-primary w-full text-center block"
            >
              Enter OTP & Reset Password
            </Link>
            <div className="text-center">
              <Link to="/login" className="qc-btn-ghost inline-block">
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
              {isLoading ? "Sending..." : "Send reset link"}
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
