import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import LoadingState from "./LoadingState";

/**
 * Layout route for the signed-in pages: one Header that stays mounted while
 * you move between them, instead of each page mounting its own. Keyed by the
 * access token so a new session (login, switching accounts) still starts
 * with a fresh Header that re-reads the user. Pages here used to render the
 * Header inside their private-route guard, so it is skipped when signed out.
 */
export default function AppShell() {
  const sessionKey =
    typeof window !== "undefined" ? sessionStorage.getItem("accessToken") || "" : "";
  return (
    <>
      {sessionKey && <Header key={sessionKey} />}
      {/* Pages load lazily; suspend only the page area so the Header stays. */}
      <Suspense fallback={<LoadingState />}>
        <Outlet />
      </Suspense>
    </>
  );
}
