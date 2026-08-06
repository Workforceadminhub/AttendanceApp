import { useState } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { hubResetPassword } from "../services/hub/auth";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const initialEmail = searchParams.get("email") || location.state?.email || "";
  const initialOtp = searchParams.get("otp") || searchParams.get("token") || searchParams.get("code") || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(initialOtp);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
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
      toast.success("Password reset successfully. Please sign in with your new password.");
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
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Enter the OTP code sent to your email along with your new password.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="qc-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="qc-input"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="otp" className="qc-label">
              OTP Code
            </label>
            <input
              type="text"
              id="otp"
              autoComplete="one-time-code"
              autoFocus={!initialOtp}
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
              autoFocus={!!initialOtp}
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
            disabled={isLoading || !email.trim() || !otp.trim() || !newPassword || !confirmPassword}
            className="qc-btn-primary w-full"
          >
            {isLoading ? "Resetting..." : "Reset password"}
          </button>

          <p className="text-xs text-ink-500 text-center">
            Need a new OTP code?{" "}
            <Link to="/forgot-password" className="underline hover:text-ink-900">
              Resend request
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
