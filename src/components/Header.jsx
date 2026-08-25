"use client";

import { useState, useRef, useEffect } from "react";
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { getUser } from "../utils/getUser";
import { logoutSession } from "../utils/authSession";
import { getUserRole } from "../utils/getUserRole";
import { getDepartmentRoute } from "../utils/routeObject";
import { canSendBulkEmail } from "../utils/bulkEmailAccess";
import MobileSheet from "./ui/MobileSheet";
import { useHubNav } from "../contexts/RBACContext";

/**
 * Quiet Cockpit Header.
 *
 * Top bar at lg+: brand + role-aware section links + Settings dropdown +
 * user identity + logout. Hairline border, cream surface, mono labels.
 *
 * On mobile: brand + hamburger that opens a full-screen MobileSheet with
 * grouped sections, current user identity at the top, and logout pinned
 * to the bottom action area.
 */

function NavDropdown({ label, items }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const ref = useRef(null);
  const closeTimer = useRef(null);

  const getCloseMs = () =>
    parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur")
    ) || 150;

  const openDropdown = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setClosing(false);
    setOpen(true);
  };

  const closeDropdown = () => {
    setOpen(false);
    setClosing(true);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setClosing(false);
      closeTimer.current = null;
    }, getCloseMs());
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (open && ref.current && !ref.current.contains(e.target)) closeDropdown();
    };
    const handleEscape = (e) => {
      if (open && e.key === "Escape") {
        closeDropdown();
        ref.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const menuId = `nav-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => (open ? closeDropdown() : openDropdown())}
        className="flex items-center gap-1 text-sm font-medium text-ink-700 hover:text-ink-900 transition-colors py-1"
        aria-expanded={open}
        aria-controls={menuId}
      >
        {label}
        <ChevronDownIcon
          className={`h-3.5 w-3.5 text-ink-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
        <div
          id={menuId}
          data-origin="top-right"
          aria-hidden={!open}
          inert={!open}
          className={`t-dropdown absolute right-0 top-full mt-2 w-56 bg-white border border-ink-200 rounded-md z-50 overflow-hidden ${
            open ? "is-open" : closing ? "is-closing" : ""
          }`}
        >
          <div className="px-3 py-2 border-b border-ink-100">
            <span className="qc-section-title">{label}</span>
          </div>
          <div className="py-1 max-h-96 overflow-y-auto">
            {items.map((item, idx) =>
              item.header ? (
                <div
                  key={`header-${idx}`}
                  className="px-3 pt-2.5 pb-1 text-2xs font-semibold uppercase tracking-wider text-sienna-dark bg-cream-100/50 border-t border-ink-100 first:border-t-0"
                >
                  {item.header}
                </div>
              ) : (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={closeDropdown}
                  className="block px-3 py-2 text-sm text-ink-700 hover:bg-cream-200 hover:text-ink-900 transition-colors"
                >
                  {item.name}
                </a>
              )
            )}
          </div>
        </div>
    </div>
  );
}

function NavLink({ href, children }) {
  return (
    <a
      href={href}
      className="text-sm font-medium text-ink-700 hover:text-ink-900 transition-colors py-1 relative"
    >
      {children}
    </a>
  );
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const authUser = getUser();
  const navigate = useNavigate();

  // Fix: redirect side-effect must not run during render
  useEffect(() => {
    if (!authUser) navigate("/login");
  }, [authUser, navigate]);

  const {
    isSuperAdmin,
    isChurchAdmin: isChurchAdminRole,
    isTeamAdmin,
    isSubTeamAdmin,
    isHOD,
    isAdmin,
  } = getUserRole();

  const canAccessApprovals = isAdmin;

  // Hub nav items — only appear when RBAC context loads successfully.
  // If legacy JWT is rejected by /rbac/me, these stay false → no change to existing nav.
  const showTrainings = useHubNav("trainings");
  const showCourses = useHubNav("courses");
  const showAdminPanel = useHubNav("admin_panel");

  const trainingItems = [
    ...(showTrainings ? [{ name: "Trainings", href: "/hub/trainings" }] : []),
    ...(showTrainings && (isSuperAdmin || isChurchAdminRole || isAdmin)
      ? [
          { name: "Progression Pathways", href: "/hub/trainings/pathways" },
          { name: "Cohorts & Batches", href: "/hub/trainings/cohorts" },
        ]
      : []),
    ...(showTrainings ? [{ name: "My Nominations", href: "/hub/trainings/nominations" }] : []),
  ];

  const courseItems = [
    ...(showCourses ? [{ name: "Courses", href: "/hub/courses" }] : []),
    ...(showTrainings || showCourses ? [{ name: "My Certificates", href: "/hub/certificates" }] : []),
    ...(showAdminPanel || (isSuperAdmin || isChurchAdminRole || isAdmin)
      ? [{ name: "Certificate Templates", href: "/hub/certificates/templates" }]
      : []),
  ];

  const hubDropdownItems = [
    ...(trainingItems.length > 0 ? [{ header: "Training" }, ...trainingItems] : []),
    ...(courseItems.length > 0 ? [{ header: "Courses" }, ...courseItems] : []),
  ];

  const hubDropdownLabel = "Hub";

  const departmentRouteForUser =
    getDepartmentRoute(authUser?.department)?.replace?.(/^\//, "") || "";

  const summaryHref = (() => {
    if ((isHOD || isSubTeamAdmin) && departmentRouteForUser) {
      return `/department/${departmentRouteForUser}`;
    }
    if (isTeamAdmin && authUser?.route) return `/summary${authUser.route}`;
    if (isSuperAdmin) return "/summary/super-admin";
    return "/summary";
  })();

  const hodDeptRoute =
    authUser?.route?.replace?.(/^\//, "") || departmentRouteForUser;
  const hodWorkersHref = hodDeptRoute
    ? `/department/${hodDeptRoute}/workers`
    : "/attendance/dashboard";
  const hodAttendanceHref = hodDeptRoute
    ? `/attendance/${
        hodDeptRoute.startsWith("/") ? hodDeptRoute.slice(1) : hodDeptRoute
      }`
    : "/attendance/dashboard";
  const hodDashboardHref = hodDeptRoute
    ? `/dashboard/${hodDeptRoute}`
    : "/attendance/dashboard";

  const homePage = isSuperAdmin
    ? "/overview/super-admin"
    : isChurchAdminRole
    ? "/attendance/dashboard"
    : authUser?.route
    ? `/dashboard${authUser.route}`
    : "/attendance/dashboard";

  const hodNav = [
    { name: "Home", href: hodDeptRoute ? hodDashboardHref : "/attendance/dashboard" },
    { name: "Summary", href: summaryHref },
    { name: "Workers", href: hodWorkersHref },
    { name: "Attendance", href: hodAttendanceHref },
  ];

  const adminNavPrimary = [
    { name: "Home", href: homePage },
    { name: "Summary", href: summaryHref },
  ];

  const approvalsItem = canAccessApprovals
    ? { name: "Approvals", href: "/pending-workers" }
    : null;

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

  const summaryDropdownItems = [
    { name: "Summary Overview", href: summaryHref },
    ...(isSuperAdmin ? [{ name: "Departments", href: "/manage-departments" }] : []),
    ...(isSuperAdmin ? [{ name: "Reports & Analytics", href: "/report" }] : []),
  ];

  const workersDropdownItems = [
    { name: "Workers Directory", href: workersHref },
    ...(isSuperAdmin ? [{ name: "All Workers", href: "/all-workers" }] : []),
    ...(canAccessApprovals ? [{ name: "Approvals", href: "/pending-workers" }] : []),
    ...(isSuperAdmin ? [{ name: "Team Mismatch", href: "/team-mismatch" }] : []),
  ];

  const attendanceDropdownItems = [
    { name: "Attendance", href: attendanceItem.href },
    ...((isChurchAdminRole || isTeamAdmin || isSuperAdmin || isAdmin)
      ? [
          { header: "Meeting Reports" },
          { name: "Leaders Meeting Confirmation", href: "/report/confirmation-leaders-meeting" },
          { name: "Leaders Meeting Report", href: "/report/leaders-meeting" },
          { name: "Workers Meeting Confirmation", href: "/report/confirmation-workers-meeting" },
          { name: "Workers Meeting Report", href: "/report/workers-meeting" },
        ]
      : []),
    ...((isSuperAdmin || isChurchAdminRole)
      ? [{ header: "Conference Reports" }, { name: "Awakening Registrations", href: "/admin/awakening-registrations" }]
      : []),
  ];

  const settingsDropdown = [
    ...(isSuperAdmin ? [{ name: "Leaders Strength", href: "/settings/leaders-strength" }] : []),
    ...(isSuperAdmin ? [{ name: "Meeting Settings", href: "/settings/meetings" }] : []),
    ...(isSuperAdmin ? [{ name: "Admins", href: "/manage-admins" }] : []),
    ...(isSuperAdmin ? [{ name: "Bulk SMS", href: "/bulk-sms" }] : []),
    ...(isSuperAdmin || isChurchAdminRole
      ? [{ name: "Audit Log", href: "/admin/audit-log" }]
      : []),
    ...(canSendBulkEmail(authUser)
      ? [
          { name: "Bulk Email", href: "/bulk-email" },
          { name: "Email Activity", href: "/bulk-email/report" },
        ]
      : []),
  ];

  const handleLogout = () => {
    logoutSession();
    navigate("/login");
  };

  // Role label shown in identity chip
  const roleLabel = isSuperAdmin
    ? "Super Admin"
    : isChurchAdminRole
    ? "Church Admin"
    : isTeamAdmin
    ? "Team Admin"
    : isSubTeamAdmin
    ? "Sub-team Admin"
    : isHOD
    ? "HOD"
    : authUser?.department || "Worker";

  const firstLast = [
    authUser?.firstname ?? authUser?.firstName,
    authUser?.lastname ?? authUser?.lastName,
  ]
    .filter(Boolean)
    .join(" ");
  const displayName =
    authUser?.fullname ||
    firstLast ||
    authUser?.name ||
    authUser?.code ||
    authUser?.email ||
    "";
  const userInitials = displayName
    .trim()
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const hasInitials = userInitials.length > 0;

  // Determine which top-level links to render
  const topLinks = isHOD && !isAdmin ? hodNav : null;

  return (
    <header className="sticky top-0 z-40 bg-cream border-b border-ink-200">
      <nav
        aria-label="Global"
        className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-16"
      >
        {/* Brand */}
        <a
          href={homePage}
          className="-m-1.5 p-1.5 flex min-w-0 items-center gap-3 shrink-0"
        >
          <img
            alt="Harvesters"
            src="/logo.jpg"
            className="h-12 w-auto shrink-0 mix-blend-multiply"
          />
          <span className="hidden sm:flex items-center gap-2 min-w-0">
            <span className="h-4 w-px bg-ink-200" />
            <span className="qc-section-title text-ink-700">HICC-GBAGADA</span>
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-7 flex-1 justify-end">
          {topLinks ? (
            topLinks.map((item) => (
              <NavLink key={item.name} href={item.href}>
                {item.name}
              </NavLink>
            ))
          ) : (
            <>
              <NavLink href={homePage}>Home</NavLink>

              {summaryDropdownItems.length > 1 ? (
                <NavDropdown label="Summary" items={summaryDropdownItems} />
              ) : (
                <NavLink href={summaryHref}>Summary</NavLink>
              )}

              {workersDropdownItems.length > 1 ? (
                <NavDropdown label="Workers" items={workersDropdownItems} />
              ) : (
                <NavLink href={workersHref}>Workers</NavLink>
              )}

              {attendanceDropdownItems.length > 1 ? (
                <NavDropdown label="Attendance" items={attendanceDropdownItems} />
              ) : (
                <NavLink href={attendanceItem.href}>Attendance</NavLink>
              )}
            </>
          )}

          {/* Training & Course dropdown */}
          {hubDropdownItems.length > 0 && (
            <NavDropdown label={hubDropdownLabel} items={hubDropdownItems} />
          )}

          {/* Settings dropdown */}
          {settingsDropdown.length > 0 && (
            <NavDropdown label="Settings" items={settingsDropdown} />
          )}

          <span className="h-5 w-px bg-ink-200 mx-1" />

          {!authUser ? (
            <a
              href="/login"
              className="text-sm font-medium text-ink-900 hover:underline"
            >
              Log in <span aria-hidden="true">→</span>
            </a>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="qc-num text-2xs uppercase tracking-tag text-ink-500 px-2 py-0.5 border border-ink-200 rounded-sm">
                  {roleLabel}
                </span>
                {hasInitials && (
                  <span
                    className="h-7 w-7 rounded-full bg-ink-900 text-cream text-2xs font-mono uppercase flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {userInitials}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-brick hover:text-brick/80"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Mobile trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="lg:hidden inline-flex items-center justify-center p-2 -mr-2 text-ink-900 min-h-touch min-w-touch"
          aria-label="Open menu"
        >
          <Bars3Icon aria-hidden="true" className="h-6 w-6" />
        </button>
      </nav>

      {/* Mobile menu */}
      <MobileSheet
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title={null}
        footer={
          authUser ? (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              className="qc-btn-danger w-full"
            >
              <XMarkIcon className="h-4 w-4" />
              Logout
            </button>
          ) : (
            <a
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="qc-btn-primary w-full"
            >
              Log in →
            </a>
          )
        }
      >
        {/* Identity strip */}
        {authUser && (
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-ink-200">
            {hasInitials && (
              <span
                className="h-10 w-10 rounded-full bg-ink-900 text-cream text-sm font-mono uppercase flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                {userInitials}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink-900 truncate">
                {displayName || "Worker"}
              </div>
              <div className="qc-num text-2xs uppercase tracking-tag text-ink-500 mt-0.5">
                {roleLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close"
              className="p-2 text-ink-500 hover:text-ink-900 min-h-touch min-w-touch"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Sections */}
        <NavGroup label="Main">
          {(topLinks ?? adminNavPrimary).map((item) => (
            <SheetLink
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
            >
              {item.name}
            </SheetLink>
          ))}
          {!topLinks && (
            <>
              <SheetLink
                href={workersHref}
                onClick={() => setMobileOpen(false)}
              >
                Workers
              </SheetLink>
              {approvalsItem && (
                <SheetLink
                  href={approvalsItem.href}
                  onClick={() => setMobileOpen(false)}
                >
                  {approvalsItem.name}
                </SheetLink>
              )}
              <SheetLink
                href={attendanceItem.href}
                onClick={() => setMobileOpen(false)}
              >
                {attendanceItem.name}
              </SheetLink>
            </>
          )}
        </NavGroup>

        {/* Training & Course nav */}
        {hubDropdownItems.length > 0 && (
          <NavGroup label={hubDropdownLabel}>
            {hubDropdownItems.map((item) => (
              <SheetLink
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </SheetLink>
            ))}
          </NavGroup>
        )}

        {/* Conference reports */}
        {(isSuperAdmin || isChurchAdminRole) && (
          <NavGroup label="Conference Reports">
            <SheetLink
              href="/admin/awakening-registrations"
              onClick={() => setMobileOpen(false)}
            >
              Awakening Registrations
            </SheetLink>
          </NavGroup>
        )}


        {settingsDropdown.length > 0 && (
          <NavGroup label="Manage">
            {settingsDropdown.map((item) => (
              <SheetLink
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </SheetLink>
            ))}
          </NavGroup>
        )}
      </MobileSheet>
    </header>
  );
}

function NavGroup({ label, children }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="qc-section-title px-1 mb-1.5">{label}</div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function SheetLink({ href, onClick, children }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="flex items-center justify-between px-3 py-3 -mx-1 rounded-md text-base text-ink-900 hover:bg-cream-200 transition-colors min-h-touch"
    >
      <span>{children}</span>
      <span className="text-ink-400" aria-hidden="true">
        →
      </span>
    </a>
  );
}
