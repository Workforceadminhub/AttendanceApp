import { useState } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { hubResetPassword } from "../services/hub/auth";
import {
  usePasswordRequirements,
  PasswordRequirementsList,
  PasswordMatchIndicator,
} from "../components/PasswordHelper";

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className="w-5 h-5">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx={12} cy={12} r={3} />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    className="w-5 h-5">
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </svg>
);

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
  const [showPassword, setShowPassword] = useState(false);

  const { allPassed } = usePasswordRequirements(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = email.trim() && otp.trim() && allPassed && passwordsMatch && !isLoading;
  const inputType = showPassword ? "text" : "password";

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
    if (!allPassed) {
      toast.error("Password does not meet all requirements.");
      return;
    }
    if (!passwordsMatch) {
      toast.error("Passwords do not match.");
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
              maxLength={10}
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="qc-label">
              New Password
            </label>
            <div className="relative">
              <input
                type={inputType}
                id="newPassword"
                autoComplete="new-password"
                autoFocus={!!initialOtp}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                className="qc-input pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <PasswordRequirementsList password={newPassword} />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="qc-label">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={inputType}
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className={`qc-input pr-11 ${
                  confirmPassword.length > 0
                    ? passwordsMatch
                      ? "border-green-500 focus:ring-green-500/20"
                      : "border-red-400 focus:ring-red-400/20"
                    : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <PasswordMatchIndicator password={newPassword} confirmPassword={confirmPassword} />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="qc-btn-primary w-full"
          >
            {isLoading ? "Resetting..." : "Reset password"}
          </button>

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
