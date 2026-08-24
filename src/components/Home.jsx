import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../utils/getUser";
import { getPostLoginPath } from "../utils/routeObject";

export default function Home() {
  const navigate = useNavigate();
  const authUser = getUser();

  useEffect(() => {
    if (authUser) {
      navigate(getPostLoginPath(authUser), { replace: true });
    }
  }, [authUser, navigate]);

  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Brand bar */}
      <header className="border-b border-ink-200 bg-cream">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              alt="Harvesters"
              src="/logo.jpg"
              className="h-12 w-auto select-none mix-blend-multiply"
            />
            <span className="hidden sm:flex items-center gap-2">
              <span className="h-4 w-px bg-ink-200" />
              <span className="qc-section-title text-ink-700">HICC-GBAGADA</span>
            </span>
          </div>
          <span className="qc-num text-2xs uppercase tracking-tag text-ink-500">
            <span className="qc-live-dot mr-2 align-middle" />
            {todayLabel}
          </span>
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-2 relative">
        {/* Hairline grid backdrop, faint */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.3] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #E5E5E0 1px, transparent 1px), linear-gradient(to bottom, #E5E5E0 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <section className="relative flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-16">
          <div className="qc-eyebrow">HICC Gbagada Workers Attendance System</div>
          <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-medium text-ink-900 tracking-tight leading-[1.05] max-w-[14ch]">
            Manage worker&rsquo;s attendance.
          </h1>
          <p className="mt-5 max-w-md text-ink-600 text-base sm:text-lg">
            Dedicated portal to mark attendance and manage workers.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <a href="/login" className="qc-btn-primary sm:px-6">
              <span>Sign in</span>
              <span aria-hidden="true">→</span>
            </a>
            <a
              href="/new/worker"
              className="qc-btn-ghost sm:px-3"
            >
              Register a worker <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <section className="hidden lg:flex relative items-end p-12 xl:p-16 border-l border-ink-200 bg-cream-200/60">
          <div className="qc-num text-2xs uppercase tracking-tag text-ink-500 max-w-xs leading-relaxed">
            Built for Sundays. Operated by HODs, Pastoral &amp; Directional Leaders.
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
}
