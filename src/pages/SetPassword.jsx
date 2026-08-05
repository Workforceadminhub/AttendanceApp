import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { hubSetPassword } from "../services/hub/auth";
import { persistSession } from "../utils/authSession";
import { getPostLoginPath, resolveAdminRoute, ensureSessionRoute } from "../utils/routeObject";

export default function SetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState("");
  const [loginData, setLoginData] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stateToken = location.state?.token;
    const stateLoginData = location.state?.loginData;

    const storedToken = sessionStorage.getItem("tempResetToken");
    const storedLoginDataStr = sessionStorage.getItem("tempResetLoginData");
    let storedLoginData = null;
    try {
      if (storedLoginDataStr) storedLoginData = JSON.parse(storedLoginDataStr);
    } catch {
      // ignore
    }

    const effectiveToken = stateToken || storedToken || "";
    const effectiveLoginData = stateLoginData || storedLoginData || null;

    if (effectiveToken) {
      setToken(effectiveToken);
      sessionStorage.setItem("tempResetToken", effectiveToken);
    }
    if (effectiveLoginData) {
      setLoginData(effectiveLoginData);
      sessionStorage.setItem("tempResetLoginData", JSON.stringify(effectiveLoginData));
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Session expired or missing token. Please sign in again.");
      navigate("/login");
      return;
    }
    if (!password || !confirmPassword) {
      toast.error("Please fill in both password fields.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      // API requires body: { "password": "" } with Authorization: Bearer <token>
      await hubSetPassword(password, token);
      toast.success("Password set successfully.");

      sessionStorage.removeItem("tempResetToken");
      sessionStorage.removeItem("tempResetLoginData");

      if (loginData?.accessToken) {
        const authUser = persistSession(loginData.accessToken, loginData.user ?? {}, {
          permissionLevel: loginData.permissionLevel ?? loginData.user?.permissionLevel,
          assignedDepartments:
            loginData.assignedDepartments ?? loginData.user?.assignedDepartments ?? [],
        });
        if (!authUser.route?.trim()) {
          const derived = resolveAdminRoute(authUser);
          if (derived) authUser.route = derived;
        }
        ensureSessionRoute(authUser);
        sessionStorage.setItem("authUser", JSON.stringify(authUser));
        navigate(getPostLoginPath(authUser));
      } else {
        navigate("/login");
      }
    } catch (error) {
      toast.error(error.message || "Failed to set new password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="border-b border-ink-200 bg-cream">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="Harvesters"
              className="h-12 w-auto select-none mix-blend-multiply"
            />
            <span className="hidden sm:inline-block h-4 w-px bg-ink-200" />
            <span className="hidden sm:inline-block qc-section-title">
              HICC-GBAGADA
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 sm:px-8 py-10">
        <div className="w-full max-w-sm">
          <div className="qc-eyebrow">Account Setup</div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
            Set your new password.
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            You must set a new password before accessing your account.
          </p>

          {!token ? (
            <div className="mt-8 space-y-4">
              <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Session expired or invalid login. Please sign in again.
              </div>
              <Link to="/login" className="qc-btn-primary inline-block">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="password" className="qc-label">
                  New Password
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
                  placeholder="Enter new password"
                />
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
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className="qc-btn-primary w-full"
              >
                {isLoading ? "Updating Password..." : "Set Password & Continue"}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-ink-500 hover:text-ink-900 underline"
                  onClick={() => {
                    sessionStorage.removeItem("tempResetToken");
                    sessionStorage.removeItem("tempResetLoginData");
                  }}
                >
                  Cancel and back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
