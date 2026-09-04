import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ensureSessionRoute,
  getPostLoginPath,
  resolveAdminRoute,
} from "../utils/routeObject";

const ALLOWED_ROLES = new Set(["church-admin", "super-admin", "hod"]);
const sessionRequests = new Map();

function getOneTimeSession(role) {
  if (!sessionRequests.has(role)) {
    sessionRequests.set(
      role,
      fetch(`/_ux-audit/session/${role}`, { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("The one-time audit session was not found.");
          return response.json();
        })
        .catch((error) => {
          // Drop the failed request so a later attempt can retry.
          sessionRequests.delete(role);
          throw error;
        })
    );
  }
  return sessionRequests.get(role);
}

export default function AuditSessionBootstrap() {
  const { role } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!import.meta.env.DEV || !ALLOWED_ROLES.has(role)) {
      setError("This local audit route is unavailable.");
      return undefined;
    }

    let active = true;
    async function consumeSession() {
      try {
        const session = await getOneTimeSession(role);
        if (!session?.accessToken || !session?.authUser) {
          throw new Error("The one-time audit session was invalid.");
        }

        const authUser = { ...session.authUser };
        if (!authUser.route?.trim()) {
          const derived = resolveAdminRoute(authUser);
          if (derived) authUser.route = derived;
        }
        sessionStorage.setItem("accessToken", session.accessToken);
        sessionStorage.setItem("authUser", JSON.stringify(authUser));
        ensureSessionRoute(authUser);
        if (active) navigate(getPostLoginPath(authUser), { replace: true });
      } catch (requestError) {
        if (active) setError(requestError.message || "Unable to start the local audit session.");
      }
    }

    consumeSession();
    return () => {
      active = false;
    };
  }, [navigate, role]);

  return (
    <main className="min-h-screen bg-cream px-5 py-16 text-center">
      <div className="mx-auto max-w-md">
        <p className="qc-eyebrow">Local UX audit</p>
        <h1 className="mt-3 text-2xl font-semibold text-ink-900">
          {error ? "Session unavailable" : "Starting role session…"}
        </h1>
        <p className="mt-3 text-sm text-ink-600">
          {error || "This one-time session is consumed only by the local development server."}
        </p>
      </div>
    </main>
  );
}
