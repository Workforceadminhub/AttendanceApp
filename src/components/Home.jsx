import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../utils/getUser";
import Header from "./Header";

export default function Home() {
  const navigate = useNavigate();
  const authUser = getUser();

  useEffect(() => {
    // Redirect logged-in users to their dashboard
    if (authUser) {
      if (authUser.department === "Super Admin") {
        navigate("/overview/super-admin", { replace: true });
      } else if (authUser.route) {
        navigate(`/dashboard${authUser.route}`, { replace: true });
      } else {
        navigate("/attendance/dashboard", { replace: true });
      }
    }
  }, [authUser, navigate]);

  return (
    <div className="bg-white">
      <Header />
      <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            Manage worker's attendance.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg/8 text-gray-600">
            Portal for managing team's attendance
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <a
              href="/login"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Get started
            </a>
            <a href="/login" className="text-sm/6 font-semibold text-gray-900">
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
