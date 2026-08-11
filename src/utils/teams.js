/**
 * Normalize worker role for backend compatibility (case-sensitive values).
 * Converts "Pastoral Leader(s)" and "Directional Leader(s)" to plural form.
 */
export const normalizeWorkerRole = (role) => {
  if (!role || typeof role !== "string") return role;
  const roleLower = role.toLowerCase().trim();
  if (roleLower === "pastoral leader" || roleLower === "pastoral leaders") {
    return "Pastoral Leaders";
  }
  if (roleLower === "directional leader" || roleLower === "directional leaders") {
    return "Directional Leaders";
  }
  return role;
};

export const teams = [
  {
    label: "Maturity (Prayer, Midweek)",
    value: "Maturity",
  },
  {
    label: "General Service (Finance, Facility, Etc)",
    value: "General Service",
  },
  {
    label: "Ministry (Leadership & Dev, Workforce Etc)",
    value: "Ministry",
  },
  {
    label: "Membership (Growth Track, Etc)",
    value: "Membership",
  },
  {
    label: "Programs (Choir, Ushers, Etc)",
    value: "Program",
  },
  { label: "Next Gen (Kidzone & Stir House)", value: "Next Gen" },
  {
    label: "Mission (NLP, HSAP, Evangelism, Etc)",
    value: "Mission",
  },
  { label: "District/Community", value: "District" },
  {
    label: "Interactive Groups (Singles, WOW, Etc)",
    value: "Interactive Groups",
  },
  {
    label: "Pastoral Leaders",
    value: "Pastoral Leaders",
  },
  { label: "Directional Leaders", value: "Directional Leaders" },
];

export const teamsAndDepartments = [
  {
    team: "Districts",
    department: [
      "Anagkazo Community",
      "Bethel Community",
      "Christ Chosen Generation Community",
      "Dominion Kingdom Community",
      "Ephphata Community",
      "Gbagada Estate Community",
      "Harmony Community",
      "Hephzibah Community",
      "Judah Community",
      "Koinonia Community",
      "Lightbearers Community",
      "Living Spring Community",
      "Ogudu/Alapere Community",
      "Praise (Couple) Community",
      "Rehoboth Community",
      "Royal Priesthoods Community",
      "Shekinah Community",
      "Shomolu 2 Community",
      "Sunrise Community",
      "Trailblazer Community",
      "Zion Life Community",
    ],

  },
  {
    team: "General Service",
    department: [
      "Admin and Facility",
      "Communications (DMU)",
      "Finance",
    ],
  },
  {
    team: "Interactive Groups",
    department: [
      "Men of Harvest",
      "Singles Ministry",
      "Women of Wisdom",
    ],
  },
  {
    team: "Maturity",
    department: [
      "Courses HSDC",
      "Discipleship Event",
      "Group Partnership",
      "Prayer and Bible Study",
    ],
  },
  {
    team: "Membership",
    department: [
      "Benevolence",
      "Call Center",
      "Celebration",
      "Ceremonies",
      "Data Management",
      "Growth Track",
      "Guest Welcome",
      "Info Hub",
      "Interactors",
      "Membership Admin",
      "New Convert",
      "Sub team heads Membership",
      "Weddings",
    ],
  },
  {
    team: "Ministry",
    department: [
      "Call Centre",
      "Career and Finance",
      "Discipleship, Bible Study and Prayer",
      "Elders Care",
      "Kids Support",
      "Leadership Effectiveness",
      "Leadership Recruitment",
      "Leadership Training",
      "Legal Aid",
      "Medical Ministry",
      "Ministry team leadership",
      "Pastoral Care",
      "Prison Ministry",
      "Recruitment and Assimilation",
      "Workforce Admin",
    ],
  },
  {
    team: "Mission",
    department: [
      "Evangelism",
      "God's encounter",
      "HSAP",
      "Invest and Invite",
      "Publicity",
      "Sub team-Missions",
      "Target Missions",
    ],
  },
  {
    team: "NLP",
    department: [
      "NLP",
    ],
  },
  {
    team: "Next Gen",
    department: [
      "Administration - Kidszone",
      "Administration - Stirhouse",
      "Learning and Development - Kidszone",
      "Learning and Development - Stirhouse",
      "Programming and Environment - Kidszone",
      "Programming and Environment - Stirhouse",
      "Reach and Partnership - Kidszone",
      "Reach and Partnership - Stirhouse",
    ],
  },
  {
    team: "Programs",
    department: [
      "Diamond ET",
      "Emerald ET",
      "Pearl ET",
      "Sapphire ET",
      "Musicians",
      "Greeters - Team Jireh",
      "Greeters - Team Nissi",
      "Greeters - Team Rapha",
      "Greeters - Team Yahweh",
      "Harvesters Intelligence Unit",
      "Media-Administration",
      "Media-Audio Production",
      "Media-Equipment Management",
      "Media-Experience",
      "Media-Light",
      "Media-Livestream",
      "Media-Photo (Capturing)",
      "Media-Text & Timing",
      "Media-Video",
      "Media-Visuals",
      "Program Management",
      "Programs Admin Team",
      "Protocol",
      "Quality Assurance",
      "Sound",
      "Traffic",
      "Unveil",
      "Ushering - Bimpe",
      "Ushering - Iyaanu",
      "Ushering - Kofoworola",
      "Ushering - Queen",
      "Ushering - Tosin",
      "Venue Management - Boluwatife team",
      "Venue Management - Emmanuel team",
      "Venue Management - Feyisayo Phillip team",
      "Venue Management - Tosin Agbetuyi team",
      "Venue Management - Zeina team",
    ],
  },
  {
    team: "Senior Leadership",
    department: [
      "Directional leader",
      "Pastoral Leaders",
    ],
  },
];

export const workerRoles = [
  "Worker",
  "Small Group Leader",
  "Cell Leader",
  "Assistant HOD",
  "Zonal Leader",
  "HOD",
  "Sub team Head",
  "Community Leader",
  "District Pastor",
  "Team Head/Pastoral Leader",
  "Directional Leader",
];

export const PASTOR_ISAAC_COMMUNITIES = [
  "Trailblazer Community",
  "Gbagada Estate Community",
  "Shomolu 2 Community",
  "Sunrise Community",
  "Dominion Kingdom Community",
  "Shekinah Community",
  "Anagkazo Community",
];

export const PASTOR_BIOLA_COMMUNITIES = [
  "Royal Priesthoods Community",
  "Ogudu/Alapere Community",
  "Lightbearers Community",
  "Praise (Couple) Community",
  "Harmony Community",
  "Bethel Community",
  "Hephzibah Community",
  "Rehoboth Community",
  "Zion Life Community",
  "Living Spring Community",
  "Judah Community",
  "Christ Chosen Generation Community",
  "Ephphata Community",
  "Koinonia Community",
];

/** Labels that are district clusters, not departments — hide from dept dropdowns */
export const DISTRICT_CLUSTER_LABELS = [
  "Pastor Biola",
  "Pastor Isaac",
  "Pastor Biola Cluster",
  "Pastor Isaac Cluster",
];

const districtClusterLabelSet = new Set(
  DISTRICT_CLUSTER_LABELS.map((c) => c.toLowerCase().trim())
);

export const isDistrictClusterLabel = (name) => {
  const norm = String(name || "").trim().toLowerCase();
  if (!norm) return false;
  if (districtClusterLabelSet.has(norm)) return true;
  // e.g. "Pastor Biola" / "pastor isaac cluster"
  return (
    (norm.startsWith("pastor biola") || norm.startsWith("pastor isaac")) &&
    !norm.includes("community")
  );
};

const isaacCommunitySet = new Set([
  ...PASTOR_ISAAC_COMMUNITIES.map((c) => c.toLowerCase().trim()),
  "shomolu community",
]);

const biolaCommunitySet = new Set([
  ...PASTOR_BIOLA_COMMUNITIES.map((c) => c.toLowerCase().trim()),
  "royal priesthood community",
  "ogudu alapere community",
  "praise couple community",
  "zion life community",
  "living spring community",
  "judah community",
  "christ chosen generation community",
  "ephphata community",
  "ephphatha community",
  "koinonia community",
]);

export const isPastorIsaacCommunity = (deptOrSubTeam) => {
  const norm = String(deptOrSubTeam || "").trim().toLowerCase();
  if (!norm || isDistrictClusterLabel(norm)) return false;
  return isaacCommunitySet.has(norm);
};

export const isPastorBiolaCommunity = (deptOrSubTeam) => {
  const norm = String(deptOrSubTeam || "").trim().toLowerCase();
  if (!norm || isDistrictClusterLabel(norm)) return false;
  return biolaCommunitySet.has(norm);
};

export const isIsaacDistrictSubTeam = (subTeam) => {
  const norm = String(subTeam || "").trim().toLowerCase();
  return norm.includes("isaac");
};

export const isBiolaDistrictSubTeam = (subTeam) => {
  const norm = String(subTeam || "").trim().toLowerCase();
  return norm.includes("biola");
};

/**
 * Filter department options for Districts by selected District/Sub-team.
 * Always excludes team-name / cluster-label pseudo-departments.
 */
export const filterDepartmentsForDistrictSubTeam = (
  departments,
  team,
  districtSubTeam
) => {
  const teamName = String(team || "").trim();
  const isDistricts =
    teamName === "Districts" || teamName === "District";
  const list = (Array.isArray(departments) ? departments : [])
    .map((d) => (typeof d === "string" ? d : d?.value ?? d?.label ?? ""))
    .map((d) => String(d || "").trim())
    .filter(Boolean)
    .filter(
      (d) =>
        !isDistrictClusterLabel(d) &&
        d.toLowerCase() !== teamName.toLowerCase()
    );

  if (!isDistricts) return list;

  if (isIsaacDistrictSubTeam(districtSubTeam)) {
    const source = list.length > 0 ? list : PASTOR_ISAAC_COMMUNITIES;
    return Array.from(new Set(source))
      .filter((d) => isPastorIsaacCommunity(d))
      .sort();
  }
  if (isBiolaDistrictSubTeam(districtSubTeam)) {
    const source = list.length > 0 ? list : PASTOR_BIOLA_COMMUNITIES;
    return Array.from(new Set(source))
      .filter((d) => isPastorBiolaCommunity(d))
      .sort();
  }
  // Sub-team not chosen yet: no department options (UI should disable select)
  return [];
};


/**
 * Returns "District (Pastor Isaac)" or "District (Pastor Biola)" given a department and/or sub-team.
 */
export const getDistrictClusterName = (dept, subTeam) => {
  if (isIsaacDistrictSubTeam(subTeam) || isPastorIsaacCommunity(dept)) {
    return "District (Pastor Isaac)";
  }
  if (isBiolaDistrictSubTeam(subTeam) || isPastorBiolaCommunity(dept)) {
    return "District (Pastor Biola)";
  }
  return "District (Pastor Biola)";
};
