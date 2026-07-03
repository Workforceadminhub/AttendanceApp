import { useState, useEffect, useRef } from "react";
import loginService from "../services/login";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getPostLoginPath } from "../utils/routeObject";
import { AUTH_ERROR_MESSAGE } from "../utils/safeMessages";

const Login = () => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const loginInFlight = useRef(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("session") === "expired") {
      toast.warn("Your session has expired. Please log in again.");
    }
  }, [searchParams]);

  const handleKeyPress = (event) => {
    if (event.keyCode === 13 || event.which === 13) {
      handleLogin();
    }
  };

  const handleLogin = async () => {
    if (loginInFlight.current || isLoading || !code.trim()) return;
    loginInFlight.current = true;
    try {
      setIsLoading(true);
      const data = await loginService(code.trim());
      if (data?.accessToken && data?.authUser) {
        navigate(getPostLoginPath(data.authUser));
      } else if (data?.accessToken) {
        toast.error(AUTH_ERROR_MESSAGE);
      }
      setIsLoading(false);
    } catch {
      toast.error(AUTH_ERROR_MESSAGE);
      setIsLoading(false);
    } finally {
      loginInFlight.current = false;
    }
  };

  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top brand bar — hairline, mono "session" tag */}
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
          <span className="qc-num text-2xs uppercase tracking-tag text-ink-500">
            <span className="qc-live-dot mr-2 align-middle" />
            {todayLabel}
          </span>
        </div>
      </header>

      {/* Main split: left identity panel (lg+) / form on the right.
          Mobile: stacked, full-bleed form. */}
      <main className="flex-1 grid lg:grid-cols-[1fr_minmax(420px,520px)]">
        {/* Identity panel — desktop only */}
        <section className="hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-cream-200 border-r border-ink-200 relative overflow-hidden">
          {/* Hairline grid background */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.35] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, #E5E5E0 1px, transparent 1px), linear-gradient(to bottom, #E5E5E0 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="relative">
            <div className="qc-eyebrow">HICC Gbagada Workers Attendance System</div>
            <h1 className="mt-3 text-5xl font-medium text-ink-900 leading-[1.05] tracking-tight max-w-[12ch]">
              Manage worker&rsquo;s attendance.
            </h1>
            <p className="mt-5 max-w-md text-ink-600 text-base">
              Dedicated portal to mark attendance and manage workers.
            </p>
          </div>

        </section>

        {/* Form panel */}
        <section className="flex flex-col justify-center px-5 sm:px-8 py-10 lg:px-14">
          <div className="w-full max-w-sm mx-auto lg:mx-0">
            <div className="qc-eyebrow">Sign in</div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-medium text-ink-900 tracking-tight">
              Mark attendance.
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Enter your pass ID to continue.
            </p>

            <div className="mt-8 space-y-5">
              <div>
                <label htmlFor="id" className="qc-label">
                  ID
                </label>
                <input
                  type="text"
                  id="id"
                  name="id"
                  autoComplete="off"
                  autoFocus
                  inputMode="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onBlur={() => setCode((c) => c.trimEnd())}
                  onKeyDown={handleKeyPress}
                  disabled={isLoading}
                  className="qc-input qc-num"
                />
              </div>

              <button
                type="button"
                onClick={handleLogin}
                onKeyDown={handleKeyPress}
                disabled={isLoading || !code.trim()}
                className="qc-btn-primary w-full"
              >
                {isLoading ? (
                  <>
                    <Spinner />
                    <span>Signing in</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-10 pt-6 border-t border-ink-200">
              <p className="text-xs font-medium text-ink-700">
                Trouble signing in?
              </p>
              <p className="mt-1 text-xs text-ink-500 leading-relaxed">
                Speak to your Team Head, Pastoral or Directional Leader.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-200 bg-cream">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3 flex items-center justify-between text-2xs uppercase tracking-tag text-ink-500">
          <span>Harvesters International Christian Centre</span>
          <span className="qc-num">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export default Login;
