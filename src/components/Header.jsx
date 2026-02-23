"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { getUser } from "../utils/getUser";
import { clearFilterCache } from "../utils/filterCache";
import { getUserRole } from "../utils/getUserRole";
import { getDepartmentRoute } from "../utils/routeObject";

function NavDropdown({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 text-sm/6 font-semibold text-gray-900 cursor-pointer"
      >
        {label}
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            {items.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setOpen(false)}
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileDropdown({ label, items }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="-mx-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
      >
        {label}
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="ml-4 space-y-1">
          {items.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="-mx-3 block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {item.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const authUser = getUser();
  const navigate = useNavigate();

  if (!authUser) navigate("/login");

  // Phase 7: Use getUserRole for cleaner role detection
  const {
    isSuperAdmin,
    isChurchAdmin: isChurchAdminRole,
    isTeamAdmin,
    isSubTeamAdmin,
    isHOD,
    isAdmin,
  } = getUserRole();

  // Approvals: visible to all admin roles (Super/Church/Team/Sub-team)
  const canAccessApprovals = isAdmin;

  // Base department route for HOD-style links
  const departmentRouteForUser =
    getDepartmentRoute(authUser?.department)?.replace?.(/^\//, "") || "";

  // Summary:
  // - HOD & Sub-team-admin: go to department detail page (e.g. /department/mincc)
  // - Team Admin: go to team summary (e.g. /summary/admin/ministry)
  // - Others: default summary list (/summary)
  const summaryHref = (() => {
    if ((isHOD || isSubTeamAdmin) && departmentRouteForUser) {
      return `/department/${departmentRouteForUser}`;
    }
    if (isTeamAdmin && authUser?.route) {
      return `/summary${authUser.route}`;
    }
    return "/summary";
  })();

  // HOD: Home, Summary, Workers, Attendance
  const hodWorkersHref = authUser?.route
    ? `/department/${authUser.route.replace(/^\//, "")}/workers`
    : "/attendance/dashboard";

  const hodNav = [
    { name: "Home", href: authUser?.route ? `/dashboard${authUser.route}` : "/attendance/dashboard" },
    { name: "Summary", href: summaryHref },
    { name: "Workers", href: hodWorkersHref },
    { name: "Attendance", href: authUser?.route ? `/attendance${authUser.route}` : "/attendance/dashboard" },
  ];

  // Admin navigation with dropdown groups
  const adminNavPrimary = [
    { name: "Home", href: isSuperAdmin ? "/overview/super-admin" : isChurchAdminRole ? "/attendance/dashboard" : authUser?.route ? `/dashboard${authUser.route}` : "/attendance/dashboard" },
    { name: "Summary", href: summaryHref },
  ];

  const approvalsItem = canAccessApprovals ? { name: "Approvals", href: "/pending-workers" } : null;

  const attendanceItem = {
    name: "Attendance",
    href: isSuperAdmin
      ? "/attendance/super-admin"
    : isChurchAdminRole
    ? "/attendance"
    : authUser?.route
    ? `/attendance${authUser.route}`
    : "/attendance/dashboard",
  };

  const workersHref = (() => {
    if (isSuperAdmin) return "/workers/super-admin";
    if (isChurchAdminRole) return "/church-admin/workers";
    // Team Admin: use a team-level department workers URL, e.g.
    // /department/ministry/workers for /admin/ministry
    if (isTeamAdmin && authUser?.route) {
      const teamSlug = authUser.route
        .replace(/^\/admin\//, "")
        .replace(/^\//, "");
      return `/department/${teamSlug}/workers`;
    }
    if (departmentRouteForUser) {
      return `/department/${departmentRouteForUser}/workers`;
    }
    return "/attendance/dashboard";
  })();

  // Settings/Admin dropdown items
  const settingsDropdown = [
    ...(isSuperAdmin ? [{ name: "Dashboard", href: "/dashboard/super-admin" }] : []),
    ...(isSuperAdmin ? [{ name: "All Workers", href: "/all-workers" }] : []),
    ...(isSuperAdmin ? [{ name: "Team Mismatch", href: "/team-mismatch" }] : []),
    ...(isSuperAdmin ? [{ name: "Departments", href: "/manage-departments" }] : []),
    ...(isSuperAdmin ? [{ name: "Admins", href: "/manage-admins" }] : []),
    ...(isSuperAdmin ? [{ name: "Report", href: "/report" }] : []),
    ...(isSuperAdmin || isChurchAdminRole ? [{ name: "Audit Log", href: "/admin/audit-log" }] : []),
  ];

  // Determine the home/landing page (overview for super admin)
  const homePage = isSuperAdmin
    ? "/overview/super-admin"
    : isChurchAdminRole
    ? "/attendance/dashboard"
    : authUser?.route
    ? `/dashboard${authUser.route}`
    : "/attendance/dashboard";

  return (
    <header className="bg-white">
      <nav
        aria-label="Global"
        className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
      >
        <a href={homePage} className="-m-1.5 p-1.5 flex">
          <span className="sr-only">Dashboard</span>
          <span>HICC - Gbagada</span>
          <img alt="" src="/logo.jpg" className="h-8 w-auto" />
        </a>
        <div className="flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
        </div>
        <div className="hidden lg:flex lg:items-center lg:gap-x-8">
          {isHOD && !isAdmin ? (
            // HOD: flat links
            hodNav.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
              >
                {item.name}
              </a>
            ))
          ) : (
            // Admin: top-level links + dropdowns
            <>
              {adminNavPrimary.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
                >
                  {item.name}
                </a>
              ))}
              <a
                href={workersHref}
                className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
              >
                Workers
              </a>
              {approvalsItem && (
                <a
                  href={approvalsItem.href}
                  className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
                >
                  {approvalsItem.name}
                </a>
              )}
              <a
                href={attendanceItem.href}
                className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
              >
                {attendanceItem.name}
              </a>
              {settingsDropdown.length > 0 && (
                <NavDropdown label="Settings" items={settingsDropdown} />
              )}
            </>
          )}
          {!authUser ? (
            <a
              href="/login"
              className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
            >
              Log in <span aria-hidden="true">&rarr;</span>
            </a>
          ) : (
            <div
              className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
              onClick={() => {
                sessionStorage.removeItem("authUser");
                sessionStorage.removeItem("accessToken");
                clearFilterCache(); // Clear filter cache on logout
                navigate("/login");
              }}
            >
              Logout
            </div>
          )}
        </div>
      </nav>
      <Dialog
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
        className="lg:hidden"
      >
        <div className="fixed inset-0 z-10" />
        <DialogPanel className="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between">
            <a href={homePage} className="-m-1.5 p-1.5">
              <span className="sr-only">Dashboard</span>
              <span>HICC - Gbagada</span>
              <img alt="" src="/logo.jpg" className="h-8 w-auto" />
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="-m-2.5 rounded-md p-2.5 text-gray-700"
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-500/10">
              <div className="space-y-2 py-6">
                {isHOD && !isAdmin ? (
                  hodNav.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                    >
                      {item.name}
                    </a>
                  ))
                ) : (
                  <>
                    {adminNavPrimary.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                      >
                        {item.name}
                      </a>
                    ))}
                    <a
                      href={workersHref}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                    >
                      Workers
                    </a>
                    {approvalsItem && (
                      <a
                        href={approvalsItem.href}
                        className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                      >
                        {approvalsItem.name}
                      </a>
                    )}
                    <a
                      href={attendanceItem.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                    >
                      {attendanceItem.name}
                    </a>
                    {settingsDropdown.length > 0 && (
                      <MobileDropdown label="Settings" items={settingsDropdown} />
                    )}
                  </>
                )}
              </div>
              <div className="py-6">
                {!authUser ? (
                  <a
                    href="/login"
                    className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
                  >
                    Log in <span aria-hidden="true">&rarr;</span>
                  </a>
                ) : (
                  <div
                    className="text-sm/6 font-semibold text-gray-900 cursor-pointer"
                    onClick={() => {
                      sessionStorage.removeItem("authUser");
                      sessionStorage.removeItem("accessToken");
                      clearFilterCache(); // Clear filter cache on logout
                      navigate("/login");
                    }}
                  >
                    Logout
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  );
}
