import { ADMIN_ENUMS } from "./enums";

/**
 * Static fallback list — used before the DepartmentsProvider has loaded
 * the live `/api/departments` response, and as a backstop for legacy
 * direct imports. Once the provider calls `setDynamicDepartments(...)`,
 * helpers in this file read from the merged effective list instead.
 */
export const routeObject = [
  { department: "Workforce Admin", route: "/wadata", team: "Ministry" },
  { department: "Ministry team leadership", route: "/subheadsmin", team: "Ministry" },
  { department: "Leadership Effectiveness", route: "/leadeff", team: "Ministry" },
  { department: "Leadership Recruitment", route: "/lrecruit", team: "Ministry" },
  { department: "Leadership Training", route: "/leadtr", team: "Ministry" },
  { department: "Pastoral Care", route: "/pascares", team: "Ministry" },
  { department: "Discipleship, Bible Study and Prayer", route: "/dbsp", team: "Ministry" },
  { department: "Call Centre", route: "/mincc", team: "Ministry" },
  { department: "Recruitment and Assimilation", route: "/rcam", team: "Ministry" },
  { department: "Career and Finance", route: "/crfn", team: "Ministry" },
  { department: "Medical Ministry", route: "/mdmn", team: "Ministry" },
  { department: "Elders Care", route: "/edc", team: "Ministry" },
  { department: "Prison Ministry", route: "/prm", team: "Ministry" },
  { department: "Kids Support", route: "/kds", team: "Ministry" },
  { department: "House of Dorcas", route: "/hod", team: "Ministry" },
  { department: "Legal Aid", route: "/lea", team: "Ministry" },
  { department: "Benevolence", route: "/benevolence", team: "Membership" },
  { department: "Call Center", route: "/callcenter", team: "Membership" },
  { department: "Celebration", route: "/celebration", team: "Membership" },
  { department: "Ceremonies", route: "/ceremonies", team: "Membership" },
  { department: "Data Management", route: "/datamgt", team: "Membership" },
  { department: "Growth Track", route: "/growthtrack", team: "Membership" },
  { department: "Guest Welcome", route: "/guestwelcome", team: "Membership" },
  { department: "Info Hub", route: "/infohub", team: "Membership" },
  { department: "Interactors", route: "/interactor", team: "Membership" },
  { department: "New Convert", route: "/newconvert", team: "Membership" },
  { department: "Weddings", route: "/weddings", team: "Membership" },
  { department: "Sub team heads Membership", route: "/sthm", team: "Membership" },
  { department: "Admin and Facility", route: "/adminfacility", team: "General Service" },
  { department: "Communications (DMU)", route: "/dmu", team: "General Service" },
  { department: "Finance", route: "/finance", team: "General Service" },
  { department: "Singles Ministry", route: "/singles", team: "Interactive Groups" },
  { department: "Women of Wisdom", route: "/wow", team: "Interactive Groups" },
  { department: "Men of Harvest", route: "/moh", team: "Interactive Groups" },
  { department: "Discipleship Event", route: "/discipleevent", team: "Maturity" },
  { department: "Group Partnership", route: "/grouppartner", team: "Maturity" },
  { department: "Testimony Capture", route: "/testimony", team: "Maturity" },
  { department: "Courses HSDC", route: "/courses", team: "Maturity" },
  { department: "Content Development (Resources)", route: "/contentdev", team: "Maturity" },
  { department: "Prayer and Bible Study", route: "/prayerbible", team: "Maturity" },
  { department: "Evangelism", route: "/evangelism", team: "Mission" },
  { department: "God's encounter", route: "/godencounter", team: "Mission" },
  { department: "HSAP", route: "/hsap", team: "Mission" },
  { department: "Invest and Invite", route: "/investinvite", team: "Mission" },
  { department: "NLP", route: "/nlp", team: "NLP" },
  { department: "Publicity", route: "/publicity", team: "Mission" },
  { department: "Royal Priesthoods Community", route: "/royalpriesthood", team: "Districts" },
  { department: "Ogudu/Alapere Community", route: "/ogudualapere", team: "Districts" },
  { department: "Bethel Community", route: "/bethel", team: "Districts" },
  { department: "Harmony Community", route: "/harmony", team: "Districts" },
  { department: "Shomolu 2 Community", route: "/shomolu2", team: "Districts" },
  { department: "Lightbearers Community", route: "/lightbearers", team: "Districts" },
  { department: "Trailblazer Community", route: "/trailblazer", team: "Districts" },
  { department: "Praise (Couple) Community", route: "/praise", team: "Districts" },
  { department: "Gbagada Estate Community", route: "/gbagadaestate", team: "Districts" },
  { department: "Shekinah Community", route: "/shekinah", team: "Districts" },
  { department: "Rehoboth Community", route: "/rehoboth", team: "Districts" },
  { department: "Dominion Kingdom Community", route: "/dominionkgm", team: "Districts" },
  { department: "Hephzibah Community", route: "/hephzibah", team: "Districts" },
  { department: "Sapphire ET", route: "/sapphire", team: "Programs" },
  { department: "Musicians", route: "/musicians", team: "Programs" },
  { department: "Diamond ET", route: "/diamont", team: "Programs" },
  { department: "Emerald ET", route: "/emerald", team: "Programs" },
  { department: "Pearl ET", route: "/pearl", team: "Programs" },
  { department: "Greeters - Team Yahweh", route: "/greeters1", team: "Programs" },
  { department: "Greeters - Team Jireh", route: "/greeters2", team: "Programs" },
  { department: "Greeters - Team Nissi", route: "/greeters3", team: "Programs" },
  { department: "Greeters - Team Rapha", route: "/greeters4", team: "Programs" },
  { department: "Harvesters Intelligence Unit", route: "/hiu", team: "Programs" },
  { department: "Media-Administration", route: "/mediaadmin", team: "Programs" },
  { department: "Media-Experience", route: "/mexperience", team: "Programs" },
  { department: "Media-Graphics", route: "/mgraphics", team: "Programs" },
  { department: "Media-Light", route: "/mlight", team: "Programs" },
  { department: "Media-Livestream", route: "/mlivestream", team: "Programs" },
  { department: "Media-Photo (Capturing)", route: "/mphoto", team: "Programs" },
  { department: "Media-Text & Timing", route: "/mtext", team: "Programs" },
  { department: "Media-Video", route: "/mvideo", team: "Programs" },
  { department: "Media-Video Production", route: "/media-videoproduction", team: "Programs" },
  { department: "Media-Display", route: "/mdisplay", team: "Programs" },
  { department: "Media-Visuals", route: "/mvisuals", team: "Programs" },
  { department: "Media-Audio Production", route: "/maudio", team: "Programs" },
  { department: "Media-Equipment Management", route: "/mequipment", team: "Programs" },
  { department: "Program Management", route: "/programmgt", team: "Programs" },
  { department: "Protocol", route: "/protocol", team: "Programs" },
  { department: "Sound", route: "/sound", team: "Programs" },
  { department: "Quality Assurance", route: "/qa", team: "Programs" },
  { department: "Unveil", route: "/unveildance", team: "Programs" },
  { department: "Traffic", route: "/traffic", team: "Programs" },
  { department: "Ushering - Bimpe", route: "/usheringbimpe", team: "Programs" },
  { department: "Ushering - Queen", route: "/usheringqueen", team: "Programs" },
  { department: "Ushering - Iyaanu", route: "/usheringiyanu", team: "Programs" },
  { department: "Ushering - Tosin", route: "/usheringtosin", team: "Programs" },
  { department: "Ushering - Kofoworola", route: "/usheringkofo", team: "Programs" },
  // { department: "Venue Management", route: "/venuemgt", team: "Programs" },
  { department: "Programs Admin Team", route: "/programsadminteam", team: "Programs" },
  { department: "Sub team-Missions", route: "/subtmission", team: "Mission" },
  { department: "Anagkazo Community", route: "/anagkazo", team: "Districts" },
  { department: "Sunrise Community", route: "/sunrise", team: "Districts" },
  { department: "Target Missions", route: "/targetmissions", team: "Mission" },
  { department: "Reach and Partnership - Stirhouse", route: "/rpstirhouse", team: "Next Gen" },
  { department: "Learning and Development - Stirhouse", route: "/ldstirhouse", team: "Next Gen" },
  { department: "Programming and Environment - Stirhouse", route: "/pestirhouse", team: "Next Gen" },
  { department: "Administration - Stirhouse", route: "/adminstirhouse", team: "Next Gen" },
  { department: "Reach and Partnership - Kidszone", route: "/rpkidszone", team: "Next Gen" },
  // { department: "New Workers - Kidszone", route: "/nwkidszone", team: "Next Gen" },
  { department: "Administration - Kidszone", route: "/adminkidszone", team: "Next Gen" },
  { department: "Programming and Environment - Kidszone", route: "/progkidszone", team: "Next Gen" },
  { department: "Learning and Development - Kidszone", route: "/learnkidszone", team: "Next Gen" },
  { department: "Venue Management - Zeina team", route: "/vmgtzeina", team: "Programs" },
  { department: "Venue Management - Tosin Agbetuyi team", route: "/vmgttosin", team: "Programs" },
  { department: "Venue Management - Emmanuel team", route: "/vmgtemma", team: "Programs" },
  { department: "Venue Management - Boluwatife team", route: "/vmgtbolu", team: "Programs" },
  { department: "Venue Management - Feyisayo Phillip team", route: "/vmgtfeyi", team: "Programs" },
  { department: "Pastoral Leaders", route: "/pastoralleader", team: "Senior Leadership" },
  { department: "Directional Leaders", route: "/directionalleader", team: "Senior Leadership" },
  // Sub-team-admin aggregate routes
  { department: "Leadership Development", route: "/ld", team: "Ministry" },
  { department: "Workforce Growth", route: "/wfg", team: "Ministry" },
  { department: "Special Ministries", route: "/sm", team: "Ministry" },
];

// ─── Dynamic-departments machinery ────────────────────────────────
// The DepartmentsProvider (src/contexts/DepartmentsContext.jsx) calls
// setDynamicDepartments() once /api/departments resolves. Helpers below
// transparently switch to the merged list (static ∪ dynamic) so newly
// created departments work without redeploy.

let _dynamicList = null; // null = not loaded yet → fall back to static

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeRoute(r) {
  if (!r) return null;
  const s = String(r).trim();
  if (!s) return null;
  return s.startsWith("/") ? s : `/${s}`;
}

/**
 * Replace the in-memory dynamic dept list. Pass the raw /api/departments
 * response (array of { id, name, team, route, isactive }).
 * @param {Array} departments
 */
export function setDynamicDepartments(departments) {
  if (!Array.isArray(departments)) {
    _dynamicList = null;
    return;
  }
  const mapped = departments
    .filter((d) => d && d.isactive !== false)
    .map((d) => {
      const name = d.name || d.department;
      if (!name) return null;
      const route = normalizeRoute(d.route) || `/${slugify(name)}`;
      return { department: name, route, team: d.team || "" };
    })
    .filter(Boolean);
  _dynamicList = mapped;
}

/**
 * Returns the effective list of departments to route through.
 * Prefers the live API list once loaded; falls back to the static array.
 * Used by all helpers in this file.
 * @returns {Array<{ department: string, route: string, team: string }>}
 */
export function getEffectiveRouteList() {
  if (Array.isArray(_dynamicList) && _dynamicList.length > 0) return _dynamicList;
  return routeObject;
}

export const attendanceRoutes = routeObject.map(
  (item) => `/attendance${item.route}`
);
export const summaryRoutes = routeObject.map((item) => `/summary${item.route}`);
export const dashboardRoutes = routeObject.map(
  (item) => `/dashboard${item.route}`
);

const specialDepartmentsFromTeam = Array.from(
  new Set(routeObject.map((item) => item.team))
);

export const specialDepartments = [
  ...specialDepartmentsFromTeam,
  ADMIN_ENUMS.ADMIN_DEPARTMENT,
];
export const adminRoutes = Array.from(
  new Set(
    routeObject.map(
      (item) => `admin/${item.team.toLowerCase().trim().replaceAll(" ", "")}`
    )
  )
);
export const historyRoutes = Array.from(
  new Set(
    routeObject.map(
      (item) => `history/admin/${item.team.toLowerCase().trim().replaceAll(" ", "")}`
    )
  )
);

/**
 * Returns all department names that belong to a given team.
 * @param {string} teamName
 * @returns {string[]} Unique department names for the team
 */
export const getDepartmentsForTeam = (teamName) => {
  if (!teamName) return [];
  const name = teamName.toString().trim();
  if (!name) return [];

  const depts = new Set();
  getEffectiveRouteList().forEach((item) => {
    if (item.team === name && item.department) {
      depts.add(item.department);
    }
  });
  return Array.from(depts);
};

/**
 * Returns the team name for a given department.
 * @param {string} departmentName
 * @returns {string|null} Team name or null if not found
 */
export const getTeamForDepartment = (departmentName) => {
  if (!departmentName) return null;
  const entry = getEffectiveRouteList().find((r) => r.department === departmentName);
  return entry?.team ?? null;
};

/**
 * Filters a permissions array down to only departments that belong to the given team.
 * If the team has no mapped departments, the original permissions array is returned.
 *
 * @param {string[]} permissions
 * @param {string} teamName
 * @returns {string[]} Filtered permissions
 */
export const filterPermissionsByTeam = (permissions, teamName) => {
  if (!Array.isArray(permissions) || !teamName) return permissions;
  const teamDepartments = new Set(getDepartmentsForTeam(teamName));
  if (teamDepartments.size === 0) return permissions;
  return permissions.filter((perm) => teamDepartments.has(perm));
};

/**
 * @param {boolean} isChurchAdmin
 * @param {object} team - { team, department }
 * @param {object} [authUser] - Optional. If has permissions array, options are filtered to those departments only (for non-Super Admin).
 */
export const getAdminSelectOptions = (isChurchAdmin, team, authUser) => {
  const isSuperAdmin = team.department === "Super Admin";
  const permissions = authUser?.permissions;
  const filterByPermissions = Array.isArray(permissions) && permissions.length > 0 && !isSuperAdmin;

  const list = getEffectiveRouteList();
  let options = (isChurchAdmin || isSuperAdmin)
    ? Array.from(new Set(list.map((item) => item.team))).map((t) => ({
        value: t,
        label: t,
      }))
    : list
        .filter((item) => item.team === team.department)
        .map((item) => ({ value: item.department, label: item.department }));

  if (filterByPermissions) {
    const allowed = new Set(permissions);
    options = (isChurchAdmin || isSuperAdmin)
      ? options.filter((opt) => {
          const deptsInTeam = list.filter((item) => item.team === opt.value).map((d) => d.department);
          return deptsInTeam.some((d) => allowed.has(d));
        })
      : options.filter((opt) => allowed.has(opt.value));
  }

  return options;
};

/**
 * Phase 7: Get department route (without leading slash) from department name.
 * Uses exact match, then case-insensitive, then Senior Leadership aliases
 * so backend variants (e.g. "Directional leader", "Pastoral leader") resolve
 * like other HOD departments and get the correct Summary/Workers/Attendance links.
 * @param {string} departmentName - Department name (e.g. "Call Centre" or "Directional leader")
 * @returns {string|null} Route (e.g. "mincc") or null if not found
 */
export const getDepartmentRoute = (departmentName) => {
  if (!departmentName) return null;
  const list = getEffectiveRouteList();
  const entry = list.find((r) => r.department === departmentName);
  if (entry) return entry.route.replace(/^\//, "");
  const lower = departmentName.trim().toLowerCase();
  const caseInsensitive = list.find(
    (r) => r.department && r.department.trim().toLowerCase() === lower
  );
  if (caseInsensitive) return caseInsensitive.route.replace(/^\//, "");
  if (lower.includes("directional") && lower.includes("leader")) {
    const e = list.find((r) => r.department === "Directional Leaders");
    return e ? e.route.replace(/^\//, "") : null;
  }
  if (lower.includes("pastoral") && lower.includes("leader")) {
    const e = list.find((r) => r.department === "Pastoral Leaders");
    return e ? e.route.replace(/^\//, "") : null;
  }
  return null;
};

/**
 * Phase 7: Get department name from route.
 * @param {string} route - Route with or without leading slash (e.g. "mincc" or "/mincc")
 * @returns {string|null} Department name or null if not found
 */
export const getDepartmentNameFromRoute = (route) => {
  if (!route) return null;
  const normalized = route.startsWith("/") ? route : `/${route}`;
  const entry = getEffectiveRouteList().find(
    (r) => r.route === normalized || r.route.replace(/^\//, "") === route
  );
  return entry?.department ?? null;
};

/**
 * Phase 7: Resolve department/team string to API params { departmentRoute?, teamName? }.
 * Uses getDepartmentRoute so variants like "Directional leader" resolve like other departments.
 * @param {string} value - "All", department name, or team name
 * @returns {{ departmentRoute?: string, teamName?: string }}
 */
export const resolveDepartmentParams = (value) => {
  if (!value || value === "All") return {};
  const route = getDepartmentRoute(value);
  if (route) return { departmentRoute: route };
  const teams = [...new Set(getEffectiveRouteList().map((r) => r.team))];
  if (teams.includes(value)) return { teamName: value };
  return { departmentRoute: value.startsWith("/") ? value.slice(1) : value };
};

/**
 * Map UI department names to the form the API expects (e.g. "Pastoral Leaders" -> "Pastoral leader").
 * Use when sending department in request params/body.
 * @param {string} departmentName - Display name (e.g. "Pastoral Leaders")
 * @returns {string} Name to send to API (e.g. "Pastoral leader")
 */
export const departmentNameForApi = (departmentName) => {
  if (!departmentName) return departmentName;
  const apiNames = {
    "Pastoral leader": "Pastoral leader",
    "Pastoral Leaders": "Pastoral leader",
    "Directional leader": "Directional leader",
    "Directional Leaders": "Directional leader",
  };
  return apiNames[departmentName] ?? departmentName;
};
