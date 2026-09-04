/**
 * Directorate / team structure used by the meeting report pages.
 *
 * - `teams`     display names shown in the summary table
 * - `apiTeams`  the `team` values stored on registrations for those teams
 * - `bg`/`light` row colours for the summary view
 */
export const TEAM_STRUCTURE = [
  { directorate: "Attraction", teams: ["Programs"], apiTeams: ["Programs"], bg: "#f59e0b", light: "rgba(245,158,11,0.10)" },
  { directorate: "Attraction", teams: ["Mission"], apiTeams: ["Mission"], bg: "#f59e0b", light: "rgba(245,158,11,0.10)" },
  { directorate: "NLP", teams: ["NLP"], apiTeams: ["NLP"], bg: "#06b6d4", light: "rgba(6,182,212,0.10)" },
  { directorate: "SPD", teams: ["Membership"], apiTeams: ["Membership"], bg: "#a855f7", light: "rgba(168,85,247,0.10)" },
  { directorate: "SPD", teams: ["Ministry"], apiTeams: ["Ministry"], bg: "#a855f7", light: "rgba(168,85,247,0.10)" },
  { directorate: "SPD", teams: ["Maturity"], apiTeams: ["Maturity"], bg: "#a855f7", light: "rgba(168,85,247,0.10)" },
  { directorate: "Next Gen", teams: ["Kidzone", "Stir House"], apiTeams: ["Next Gen"], bg: "#eab308", light: "rgba(234,179,8,0.10)" },
  { directorate: "General Services", teams: ["Admin & Facility", "Communication (DMU)", "Finance"], apiTeams: ["General Service"], bg: "#64748b", light: "rgba(100,116,139,0.10)" },
  { directorate: "Communities", teams: ["District (Pastor Biola)", "District (Pastor Isaac)"], apiTeams: ["Districts"], bg: "#ec4899", light: "rgba(236,72,153,0.10)" },
  { directorate: "Interactive Groups", teams: ["Men of Harvest", "Singles Ministry", "Women of Wisdom"], apiTeams: ["Interactive Groups"], bg: "#f43f5e", light: "rgba(244,63,94,0.10)" },
  { directorate: "Senior Leadership", teams: ["Directional Leaders", "Pastoral Leaders"], apiTeams: ["Senior Leadership"], bg: "#84cc16", light: "rgba(132,204,22,0.10)" },
];

/** Excel fill colours per directorate, used by the summary sheet export. */
export const EXCEL_COLORS = {
  "Attraction": { light: "FEF5E7", dark: "FDECCE" },
  "NLP": { light: "E6F8FB", dark: "CDF0F6" },
  "SPD": { light: "F6EEFE", dark: "EEDDFD" },
  "Next Gen": { light: "FDF7E6", dark: "FBF0CE" },
  "General Services": { light: "F0F1F3", dark: "E0E3E8" },
  "Communities": { light: "FDEDF5", dark: "FBDAEB" },
  "Interactive Groups": { light: "FEECEF", dark: "FDD9DF" },
  "Senior Leadership": { light: "F3FAE8", dark: "E6F5D0" },
};

/**
 * Case-insensitive lookup from a registration's team/department string
 * to a TEAM_STRUCTURE display team name.
 */
export function buildTeamNameLookup() {
  const lookup = {};
  TEAM_STRUCTURE.forEach(({ teams }) => {
    teams.forEach((t) => {
      const lower = t.toLowerCase();
      lookup[lower] = t;
      if (lower.endsWith("s")) lookup[lower.slice(0, -1)] = t;
    });
  });
  // DB department names that differ from display names
  lookup["admin and facility"] = "Admin & Facility";
  lookup["communications (dmu)"] = "Communication (DMU)";
  lookup["kidszone"] = "Kidzone";
  lookup["stirhouse"] = "Stir House";
  lookup["stir house"] = "Stir House";
  return lookup;
}
