import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { hubResetPassword } from "../services/hub/auth";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Missing reset token. Use the link from your email.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setIsLoading(true);
    try {
      await hubResetPassword(token, password);
      toast.success("Password updated. Please sign in with your new password.");
      navigate("/login");
    } catch (error) {
      toast.error(error.message || "Failed to reset password. The link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="qc-eyebrow">Reset password</div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
          Choose a new password.
        </h1>

        {!token ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This page needs a reset token. Open the link from your password
              reset email, or request a new one.
            </div>
            <Link to="/forgot-password" className="qc-btn-primary inline-block">
              Request reset link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="password" className="qc-label">
                New password
              </label>
              <input
                type="password"
                id="password"
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="qc-input"
              />
              <p className="mt-1 text-xs text-ink-400">At least 8 characters.</p>
            </div>
            <div>
              <label htmlFor="confirm" className="qc-label">
                Confirm password
              </label>
              <input
                type="password"
                id="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={isLoading}
                className="qc-input"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !password || !confirm}
              className="qc-btn-primary w-full"
            >
              {isLoading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
