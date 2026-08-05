import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { hubSetPassword } from "../services/hub/auth";
import { persistSession } from "../utils/authSession";
import { getPostLoginPath, resolveAdminRoute, ensureSessionRoute } from "../utils/routeObject";

/* ── SVG icons ─────────────────────────────────────────────── */
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

const CheckCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
  </svg>
);

const XCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
  </svg>
);

export default function SetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState("");
  const [loginData, setLoginData] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  /* ── Password strength checks ────────────────────────────── */
  const checks = useMemo(() => ({
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }), [password]);

  const allChecksPassed = checks.length && checks.uppercase && checks.number && checks.special;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = allChecksPassed && passwordsMatch && !isLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Session expired or missing token. Please sign in again.");
      navigate("/login");
      return;
    }
    if (!allChecksPassed) {
      toast.error("Password does not meet all requirements.");
      return;
    }
    if (!passwordsMatch) {
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

  const inputType = showPassword ? "text" : "password";

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
              {/* New Password */}
              <div>
                <label htmlFor="password" className="qc-label">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={inputType}
                    id="password"
                    autoComplete="new-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="qc-input pr-11"
                    placeholder="Enter new password"
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

                {/* Password requirements guide */}
                {password.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {[
                      { key: "length", label: "At least 12 characters" },
                      { key: "uppercase", label: "At least 1 uppercase letter" },
                      { key: "number", label: "At least 1 number" },
                      { key: "special", label: "At least 1 special character" },
                    ].map(({ key, label }) => (
                      <li
                        key={key}
                        className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                          checks[key] ? "text-green-600" : "text-ink-400"
                        }`}
                      >
                        {checks[key] ? <CheckCircle /> : <XCircle />}
                        {label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Confirm Password */}
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
                    placeholder="Confirm new password"
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
                {confirmPassword.length > 0 && (
                  <p
                    className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
                      passwordsMatch ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {passwordsMatch ? <CheckCircle /> : <XCircle />}
                    {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
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
