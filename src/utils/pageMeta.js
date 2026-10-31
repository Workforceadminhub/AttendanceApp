/**
 * Per-page document title, description, Open Graph, and Twitter Card metadata.
 * Shared between client-side navigation (`PageMeta.jsx`) and build-time static
 * HTML generation (`vite.config.mjs`) so both browsers and social link crawlers
 * (WhatsApp, X/Twitter, Facebook, iMessage, LinkedIn) receive page-specific
 * metadata.
 */

export const SITE_NAME = "Harvesters International Christian Centre";
export const APP_NAME = "Workers Hub - Harvesters Gbagada";

export const DEFAULT_META = {
  title: APP_NAME,
  description:
    "Workers Hub - Harvesters International Christian Centre, Gbagada Campus. Dedicated portal to mark attendance and manage workers.",
  ogTitle: APP_NAME,
  ogDescription:
    "Dedicated portal to mark attendance and manage workers at Harvesters International Christian Centre, Gbagada Campus.",
  ogImage: "/logo.jpg",
  ogImageAlt: APP_NAME,
  twitterCard: "summary_large_image",
  themeColor: "#000000",
};

const WB26_META = {
  title: "Workers Ball 2026 · Harvesters Gbagada",
  description:
    "Harvesters International Christian Centre, Gbagada Campus — Workers Ball 2026. A black-tie celebration of honour, excellence, and dedicated service. Register and claim your official Gala Pass.",
  ogTitle: "Workers Ball 2026 · Harvesters Gbagada",
  ogDescription:
    "A Black-Tie Celebration of Excellence, Honour & Dedicated Service. Register and claim your official Workers Ball 2026 Gala Pass.",
  ogImage: "/wb26-og.jpg",
  ogImageWidth: "1200",
  ogImageHeight: "630",
  ogImageAlt: "Workers Ball 2026 · Harvesters Gbagada",
  twitterCard: "summary_large_image",
  themeColor: "#0A0E1A",
};

const WB26_SCANNER_META = {
  title: "Accreditation Scanner · Workers Ball 2026",
  description:
    "Official accreditation scanner and check-in desk for Workers Ball 2026 at Harvesters Gbagada.",
  ogTitle: "Accreditation Scanner · Workers Ball 2026",
  ogDescription:
    "Official accreditation scanner and check-in desk for Workers Ball 2026 at Harvesters Gbagada.",
  ogImage: "/wb26-og.jpg",
  ogImageWidth: "1200",
  ogImageHeight: "630",
  ogImageAlt: "Accreditation Scanner · Workers Ball 2026",
  twitterCard: "summary_large_image",
  themeColor: "#0A0E1A",
};

const WB26_ADMIN_META = {
  title: `Workers Ball 2026 Tracking · ${APP_NAME}`,
  description:
    "Registration and live attendance tracking dashboard for Workers Ball 2026 at Harvesters Gbagada.",
  ogTitle: `Workers Ball 2026 Tracking · ${APP_NAME}`,
  ogDescription:
    "Registration and live attendance tracking dashboard for Workers Ball 2026 at Harvesters Gbagada.",
  ogImage: "/wb26-og.jpg",
  ogImageWidth: "1200",
  ogImageHeight: "630",
  ogImageAlt: "Workers Ball 2026 Tracking · Harvesters Gbagada",
  twitterCard: "summary_large_image",
  themeColor: "#0A0E1A",
};

const AWAKENING_META = {
  title: "Awakening Conference Registration · Harvesters Gbagada",
  description:
    "Register for the Awakening Conference at Harvesters International Christian Centre. Secure your spot as an attendee or volunteer.",
  ogTitle: "Awakening Conference Registration · Harvesters Gbagada",
  ogDescription:
    "Secure your spot for the Awakening Conference at Harvesters International Christian Centre.",
  ogImage: "/logo.jpg",
  ogImageAlt: "Awakening Conference Registration · Harvesters Gbagada",
  twitterCard: "summary_large_image",
  themeColor: "#000000",
};

function hubPage(pageTitle, description) {
  const fullTitle = `${pageTitle} · ${APP_NAME}`;
  return {
    ...DEFAULT_META,
    title: fullTitle,
    description,
    ogTitle: fullTitle,
    ogDescription: description,
    ogImageAlt: fullTitle,
  };
}

export const STATIC_ROUTE_META = {
  "/": DEFAULT_META,
  "/login": hubPage(
    "Sign In",
    "Sign in to the Harvesters Gbagada Workers Hub to mark attendance, manage departments, and access trainings."
  ),
  "/forgot-password": hubPage(
    "Forgot Password",
    "Request a password reset link for your Harvesters Gbagada Workers Hub account."
  ),
  "/reset-password": hubPage(
    "Reset Password",
    "Set a new password for your Harvesters Gbagada Workers Hub account."
  ),
  "/set-password": hubPage(
    "Set Password",
    "Create a password to activate your Harvesters Gbagada Workers Hub account."
  ),
  "/new/worker": hubPage(
    "Worker Registration",
    "Register as a worker at Harvesters International Christian Centre, Gbagada Campus."
  ),
  "/leadership-registration": {
    ...DEFAULT_META,
    title: "Leadership Training Registration · Harvesters Gbagada",
    description:
      "Register for the Group 2 BLC / ALC Leadership Training Course at Harvesters International Christian Centre.",
    ogTitle: "Leadership Training Registration · Harvesters Gbagada",
    ogDescription:
      "Register for the Group 2 BLC / ALC Leadership Training Course at Harvesters International Christian Centre.",
    ogImageAlt: "Leadership Training Registration · Harvesters Gbagada",
  },
  "/awakening": AWAKENING_META,
  "/wb26": WB26_META,
  "/scan/wb26": WB26_SCANNER_META,
  "/workers-ball/scan": WB26_SCANNER_META,
  "/wb26/scan": WB26_SCANNER_META,
  "/leadersmeeting/confirm": hubPage(
    "Leaders Meeting Confirmation",
    "Confirm your attendance for the upcoming Leaders Meeting at Harvesters Gbagada."
  ),
  "/leaders-meeting": hubPage(
    "Leaders Meeting Attendance",
    "Mark your live attendance at the Harvesters Gbagada Leaders Meeting."
  ),
  "/workersmeeting/confirm": hubPage(
    "Workers Meeting Confirmation",
    "Confirm your attendance for the upcoming Workers Meeting at Harvesters Gbagada."
  ),
  "/workers-meeting/confirm": hubPage(
    "Workers Meeting Confirmation",
    "Confirm your attendance for the upcoming Workers Meeting at Harvesters Gbagada."
  ),
  "/workers-meeting": hubPage(
    "Workers Meeting Attendance",
    "Mark your live attendance at the Harvesters Gbagada Workers Meeting."
  ),
  "/report": hubPage(
    "Reports & Analytics",
    "Export Sunday attendance rolls and view workforce analytics for Harvesters Gbagada."
  ),
  "/admin/leadership-registrations": hubPage(
    "Leadership Registrations",
    "Review and manage Leadership Training registrations for Harvesters Gbagada."
  ),
  "/admin/awakening-registrations": hubPage(
    "Awakening Registrations",
    "Manage Awakening Conference registrations at Harvesters Gbagada."
  ),
  "/admin/workers-ball-registrations": WB26_ADMIN_META,
  "/admin/workers-ball": WB26_ADMIN_META,
  "/report/confirmation-leaders-meeting": hubPage(
    "Leaders Meeting Confirmation Report",
    "Confirmation report for the Harvesters Gbagada Leaders Meeting."
  ),
  "/report/leaders-meeting": hubPage(
    "Leaders Meeting Report",
    "Live attendance report for the Harvesters Gbagada Leaders Meeting."
  ),
  "/report/confirmation-workers-meeting": hubPage(
    "Workers Meeting Confirmation Report",
    "Confirmation report for the Harvesters Gbagada Workers Meeting."
  ),
  "/report/workers-meeting": hubPage(
    "Workers Meeting Report",
    "Live attendance report for the Harvesters Gbagada Workers Meeting."
  ),
  "/settings/meetings": hubPage(
    "Meeting Settings",
    "Configure and schedule Leaders and Workers Meetings at Harvesters Gbagada."
  ),
  "/settings/leaders-strength": hubPage(
    "Leaders Strength",
    "Manage expected leaders strength across teams and departments at Harvesters Gbagada."
  ),
  "/manage-leaders-strength": hubPage(
    "Leaders Strength",
    "Manage expected leaders strength across teams and departments at Harvesters Gbagada."
  ),
  "/overview/super-admin": hubPage(
    "Campus Overview",
    "Campus-wide workforce and Sunday attendance overview for Harvesters Gbagada."
  ),
  "/dashboard/super-admin": hubPage(
    "Campus Dashboard",
    "Campus-wide workforce and Sunday attendance dashboard for Harvesters Gbagada."
  ),
  "/attendance/dashboard": hubPage(
    "Dashboard",
    "Sunday attendance dashboard and workforce summary for Harvesters Gbagada."
  ),
  "/summary": hubPage(
    "Attendance Summary",
    "Department and team Sunday attendance summary at Harvesters Gbagada."
  ),
  "/attendance/summary": hubPage(
    "Attendance Summary",
    "Department and team Sunday attendance summary at Harvesters Gbagada."
  ),
  "/summary/super-admin": hubPage(
    "Campus Summary",
    "Campus-wide team and department attendance summary for Harvesters Gbagada."
  ),
  "/summary/history/admin": hubPage(
    "Summary History",
    "Historical Sunday attendance summaries across teams and departments at Harvesters Gbagada."
  ),
  "/dashboard/history/admin": hubPage(
    "Dashboard History",
    "Historical Sunday attendance dashboard metrics at Harvesters Gbagada."
  ),
  "/attendance": hubPage(
    "Mark Attendance",
    "Mark and review Sunday worker attendance at Harvesters Gbagada."
  ),
  "/attendance/super-admin": hubPage(
    "Campus Attendance",
    "Mark and review Sunday worker attendance across all departments at Harvesters Gbagada."
  ),
  "/attendance/devmode": hubPage(
    "Unmarked Attendance",
    "Review and mark unmarked worker attendance at Harvesters Gbagada."
  ),
  "/workers/super-admin": hubPage(
    "Workers Directory",
    "Browse, filter, and manage the Harvesters Gbagada workforce directory."
  ),
  "/church-admin/workers": hubPage(
    "Workers Directory",
    "Browse, filter, and manage the Harvesters Gbagada campus workforce directory."
  ),
  "/church-admin/add-worker": hubPage(
    "Add Worker",
    "Add new workers to the Harvesters Gbagada campus workforce directory."
  ),
  "/add-worker": hubPage(
    "Add Worker",
    "Add new workers to the Harvesters Gbagada workforce directory."
  ),
  "/pending-workers": hubPage(
    "Worker Approvals",
    "Review and approve pending worker registrations at Harvesters Gbagada."
  ),
  "/all-workers": hubPage(
    "Workers Directory",
    "Browse, filter, and manage the Harvesters Gbagada workforce directory."
  ),
  "/team-mismatch": hubPage(
    "Team Mismatch",
    "Identify and resolve worker team and department mismatches at Harvesters Gbagada."
  ),
  "/pastoral-fix": hubPage(
    "Pastoral Fix",
    "Review and update pastoral and leadership records at Harvesters Gbagada."
  ),
  "/manage-departments": hubPage(
    "Manage Departments",
    "Create and manage teams, clusters, and departments at Harvesters Gbagada."
  ),
  "/manage-admins": hubPage(
    "Manage Admins",
    "Manage administrator accounts, roles, and department permissions at Harvesters Gbagada."
  ),
  "/bulk-email": hubPage(
    "Bulk Email",
    "Compose and send bulk email communications to Harvesters Gbagada workers."
  ),
  "/bulk-email/report": hubPage(
    "Email Activity",
    "Track bulk email campaigns and live deliverability metrics at Harvesters Gbagada."
  ),
  "/bulk-sms": hubPage(
    "Bulk SMS",
    "Compose and send bulk SMS messages to Harvesters Gbagada workers."
  ),
  "/admin/audit-log": hubPage(
    "Audit Log",
    "Review system activity and administrative audit logs at Harvesters Gbagada."
  ),
  "/hub/trainings": hubPage(
    "Trainings",
    "Browse and manage workforce training sessions at Harvesters Gbagada."
  ),
  "/hub/trainings/create": hubPage(
    "Create Training",
    "Schedule and configure a new workforce training session at Harvesters Gbagada."
  ),
  "/hub/trainings/pathways": hubPage(
    "Progression Pathways",
    "Track worker training milestones and progression pathways at Harvesters Gbagada."
  ),
  "/hub/trainings/cohorts": hubPage(
    "Training Cohorts",
    "Manage training cohorts and participant groups at Harvesters Gbagada."
  ),
  "/hub/trainings/nominations": hubPage(
    "My Nominations",
    "View and manage worker training nominations at Harvesters Gbagada."
  ),
  "/hub/courses": hubPage(
    "Courses",
    "Explore growth and leadership courses in the Harvesters Gbagada Workers Hub."
  ),
  "/hub/courses/create": hubPage(
    "Create Course",
    "Create a new training course in the Harvesters Gbagada Workers Hub."
  ),
  "/hub/certificates": hubPage(
    "My Certificates",
    "View and download your earned training certificates at Harvesters Gbagada."
  ),
  "/hub/certificates/templates": hubPage(
    "Certificate Templates",
    "Design and manage training certificate templates at Harvesters Gbagada."
  ),
  "/hub/certificates/inventory": hubPage(
    "Certificate Inventory",
    "Browse and audit issued training certificates at Harvesters Gbagada."
  ),
};

function formatSlug(slug = "") {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .trim();
}

const DYNAMIC_ROUTE_MATCHERS = [
  {
    pattern: /^\/worker\/[^/]+\/attendance$/,
    resolve: () =>
      hubPage(
        "Worker Attendance History",
        "View individual worker attendance history at Harvesters Gbagada."
      ),
  },
  {
    pattern: /^\/worker\/[^/]+$/,
    resolve: () =>
      hubPage(
        "Worker Profile",
        "View and edit worker profile details at Harvesters Gbagada."
      ),
  },
  {
    pattern: /^\/department\/admin\/([^/]+)\/add-worker$/,
    resolve: ([, team]) =>
      hubPage(
        `Add Worker (${formatSlug(team)})`,
        `Add a worker to the ${formatSlug(team)} team at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/department\/admin\/([^/]+)\/bulk-add$/,
    resolve: ([, team]) =>
      hubPage(
        `Bulk Add Workers (${formatSlug(team)})`,
        `Bulk-import workers into the ${formatSlug(team)} team at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/department\/admin\/([^/]+)\/workers$/,
    resolve: ([, team]) =>
      hubPage(
        `${formatSlug(team)} Workers`,
        `View and manage workers in the ${formatSlug(team)} team at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/department\/admin\/([^/]+)$/,
    resolve: ([, team]) =>
      hubPage(
        `${formatSlug(team)} Dashboard`,
        `Team attendance dashboard for ${formatSlug(team)} at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/workers\/admin\/([^/]+)$/,
    resolve: ([, team]) =>
      hubPage(
        `${formatSlug(team)} Workers`,
        `View and manage workers in the ${formatSlug(team)} team at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/department\/([^/]+)\/add-worker$/,
    resolve: ([, dept]) =>
      hubPage(
        `Add Worker (${formatSlug(dept)})`,
        `Add a worker to ${formatSlug(dept)} at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/department\/([^/]+)\/bulk-add$/,
    resolve: ([, dept]) =>
      hubPage(
        `Bulk Add Workers (${formatSlug(dept)})`,
        `Bulk-import workers into ${formatSlug(dept)} at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/department\/([^/]+)\/workers$/,
    resolve: ([, dept]) =>
      hubPage(
        `${formatSlug(dept)} Workers`,
        `View and manage workers in ${formatSlug(dept)} at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/department\/([^/]+)$/,
    resolve: ([, dept]) =>
      hubPage(
        `${formatSlug(dept)} Summary`,
        `View attendance summary and workforce statistics for ${formatSlug(dept)} at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/attendance\/history\/([^/]+)$/,
    resolve: () =>
      hubPage(
        "Attendance History",
        "Historical Sunday worker attendance records at Harvesters Gbagada."
      ),
  },
  {
    pattern: /^\/summary\/history\/([^/]+)$/,
    resolve: () =>
      hubPage(
        "Summary History",
        "Historical Sunday attendance summaries by department and team at Harvesters Gbagada."
      ),
  },
  {
    pattern: /^\/dashboard\/history\/([^/]+)$/,
    resolve: () =>
      hubPage(
        "Dashboard History",
        "Historical Sunday attendance dashboard metrics at Harvesters Gbagada."
      ),
  },
  {
    pattern: /^\/attendance\/admin\/([^/]+)$/,
    resolve: ([, team]) =>
      hubPage(
        `${formatSlug(team)} Attendance`,
        `Mark and review Sunday attendance for ${formatSlug(team)} at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/attendance\/([^/]+)$/,
    resolve: ([, dept]) =>
      hubPage(
        `${formatSlug(dept)} Attendance`,
        `Mark and review Sunday attendance for ${formatSlug(dept)} at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/summary\/admin\/([^/]+)$/,
    resolve: ([, team]) =>
      hubPage(
        `${formatSlug(team)} Summary`,
        `Team attendance summary for ${formatSlug(team)} at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/summary\/([^/]+)$/,
    resolve: ([, dept]) =>
      hubPage(
        `${formatSlug(dept)} Summary`,
        `Department attendance summary for ${formatSlug(dept)} at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/dashboard\/admin\/([^/]+)$/,
    resolve: ([, team]) =>
      hubPage(
        `${formatSlug(team)} Dashboard`,
        `Team attendance dashboard for ${formatSlug(team)} at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/dashboard\/([^/]+)$/,
    resolve: ([, dept]) =>
      hubPage(
        `${formatSlug(dept)} Dashboard`,
        `Department attendance dashboard for ${formatSlug(dept)} at Harvesters Gbagada.`
      ),
  },
  {
    pattern: /^\/hub\/trainings\/[^/]+\/nominate$/,
    resolve: () =>
      hubPage(
        "Nominate Workers",
        "Nominate department workers for training at Harvesters Gbagada."
      ),
  },
  {
    pattern: /^\/hub\/trainings\/[^/]+\/attendance$/,
    resolve: () =>
      hubPage(
        "Training Attendance",
        "Mark and verify worker attendance for training sessions at Harvesters Gbagada."
      ),
  },
  {
    pattern: /^\/hub\/trainings\/[^/]+\/assignments$/,
    resolve: () =>
      hubPage(
        "Department Assignments",
        "Manage training assignments across departments at Harvesters Gbagada."
      ),
  },
  {
    pattern: /^\/hub\/trainings\/[^/]+$/,
    resolve: () =>
      hubPage(
        "Training Details",
        "View training schedule, curriculum, and enrolled workers at Harvesters Gbagada."
      ),
  },
  {
    pattern: /^\/hub\/courses\/[^/]+$/,
    resolve: () =>
      hubPage(
        "Course Details",
        "View course modules, requirements, and enrollments in the Harvesters Gbagada Workers Hub."
      ),
  },
  {
    pattern: /^\/verify\/([^/]+)$/,
    resolve: ([, certNo]) =>
      hubPage(
        `Verify Certificate (${decodeURIComponent(certNo)})`,
        "Verify the authenticity of a Harvesters Gbagada training certificate."
      ),
  },
];

/**
 * Resolve page metadata for a given pathname and optional hostname.
 */
export function resolvePageMeta(pathname = "/", hostname = "") {
  if (["awakening.hiccgbagada.com", "awakening.localhost"].includes(hostname)) {
    return AWAKENING_META;
  }

  const normalized =
    pathname && pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";

  if (STATIC_ROUTE_META[normalized]) {
    return STATIC_ROUTE_META[normalized];
  }

  for (const matcher of DYNAMIC_ROUTE_MATCHERS) {
    const match = normalized.match(matcher.pattern);
    if (match) {
      return matcher.resolve(match);
    }
  }

  return DEFAULT_META;
}

function upsertMeta(selector, attributes, content) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector(selector);
  if (content === undefined || content === null || content === "") {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    for (const [k, v] of Object.entries(attributes)) {
      el.setAttribute(k, v);
    }
    document.head.appendChild(el);
  }
  el.setAttribute("content", String(content));
}

/**
 * Apply resolved metadata to the active browser document (`<title>`, description,
 * theme-color, Open Graph tags, and Twitter Card tags).
 */
export function applyPageMeta(meta, pathname = "/") {
  if (typeof document === "undefined") return;
  const resolved = { ...DEFAULT_META, ...meta };

  document.title = resolved.title;

  upsertMeta('meta[name="description"]', { name: "description" }, resolved.description);
  upsertMeta('meta[name="theme-color"]', { name: "theme-color" }, resolved.themeColor);

  upsertMeta('meta[property="og:type"]', { property: "og:type" }, "website");
  upsertMeta('meta[property="og:site_name"]', { property: "og:site_name" }, SITE_NAME);
  upsertMeta('meta[property="og:title"]', { property: "og:title" }, resolved.ogTitle || resolved.title);
  upsertMeta(
    'meta[property="og:description"]',
    { property: "og:description" },
    resolved.ogDescription || resolved.description
  );
  upsertMeta('meta[property="og:image"]', { property: "og:image" }, resolved.ogImage);
  upsertMeta('meta[property="og:image:width"]', { property: "og:image:width" }, resolved.ogImageWidth);
  upsertMeta('meta[property="og:image:height"]', { property: "og:image:height" }, resolved.ogImageHeight);
  upsertMeta(
    'meta[property="og:image:alt"]',
    { property: "og:image:alt" },
    resolved.ogImageAlt || resolved.ogTitle || resolved.title
  );

  if (typeof window !== "undefined" && window.location?.origin) {
    upsertMeta(
      'meta[property="og:url"]',
      { property: "og:url" },
      `${window.location.origin}${pathname}`
    );
  }

  upsertMeta('meta[name="twitter:card"]', { name: "twitter:card" }, resolved.twitterCard);
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, resolved.ogTitle || resolved.title);
  upsertMeta(
    'meta[name="twitter:description"]',
    { name: "twitter:description" },
    resolved.ogDescription || resolved.description
  );
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, resolved.ogImage);
}

function escapeAttr(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Inject route-specific `<title>`, description, theme-color, Open Graph, and
 * Twitter Card tags into an HTML template string (used at build time).
 */
export function renderMetaIntoHtml(html, pathname = "/") {
  const meta = { ...DEFAULT_META, ...resolvePageMeta(pathname) };
  const title = escapeAttr(meta.title);
  const description = escapeAttr(meta.description);
  const ogTitle = escapeAttr(meta.ogTitle || meta.title);
  const ogDescription = escapeAttr(meta.ogDescription || meta.description);
  const ogImage = escapeAttr(meta.ogImage);
  const ogImageAlt = escapeAttr(meta.ogImageAlt || meta.ogTitle || meta.title);
  const themeColor = escapeAttr(meta.themeColor);
  const twitterCard = escapeAttr(meta.twitterCard);

  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  out = out.replace(
    /<meta\s+name="theme-color"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="theme-color" content="${themeColor}" />`
  );
  out = out.replace(
    /<meta\s+name="description"[\s\S]*?\/>/i,
    `<meta name="description" content="${description}" />`
  );
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${ogTitle}" />`
  );
  out = out.replace(
    /<meta\s+property="og:description"[\s\S]*?\/>/i,
    `<meta property="og:description" content="${ogDescription}" />`
  );
  out = out.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${ogImage}" />`
  );
  out = out.replace(
    /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image:alt" content="${ogImageAlt}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:card"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:card" content="${twitterCard}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${ogTitle}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:description"[\s\S]*?\/>/i,
    `<meta name="twitter:description" content="${ogDescription}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${ogImage}" />`
  );

  return out;
}
