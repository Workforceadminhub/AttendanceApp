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
      "Dominion Kingdom Community",
      "Gbagada Estate Community",
      "Harmony Community",
      "Hephzibah Community",
      "Lightbearers Community",
      "Ogudu/Alapere Community",
      "Praise (Couple) Community",
      "Rehoboth Community",
      "Royal Priesthoods Community",
      "Shekinah Community",
      "Shomolu 2 Community",
      "Sunrise Community",
      "Trailblazer Community",
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
