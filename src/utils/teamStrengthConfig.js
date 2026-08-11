const TEAM_STRENGTH_STORAGE_KEY = "harvesters_team_strengths_config";

export const DEFAULT_TEAM_STRENGTH = {
  "Programs": 168,
  "Mission": 25,
  "NLP": 15,
  "Membership": 82,
  "Ministry": 55,
  "Maturity": 23,
  "Kidzone": 25,
  "Stir House": 14,
  "Admin & Facility": 2,
  "Communication (DMU)": 7,
  "Finance": 4,
  "District (Pastor Biola)": 236,
  "District (Pastor Isaac)": 143,
  "Men of Harvest": 23,
  "Singles Ministry": 58,
  "Women of Wisdom": 71,
  "Directional Leaders": 11,
  "Pastoral Leaders": 23,
};

/**
 * Reads team strengths mapping from localStorage, falling back to default
 * @returns {Record<string, number>}
 */
export function getStoredTeamStrengths() {
  try {
    const raw = localStorage.getItem(TEAM_STRENGTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const merged = { ...DEFAULT_TEAM_STRENGTH };
        Object.keys(parsed).forEach((key) => {
          const val = Number(parsed[key]);
          if (!isNaN(val) && val >= 0) {
            merged[key] = val;
          }
        });
        return merged;
      }
    }
  } catch (err) {
    console.error("Failed to read team strengths from storage:", err);
  }
  return { ...DEFAULT_TEAM_STRENGTH };
}

/**
 * Saves updated team strengths to localStorage
 * @param {Record<string, number>} strengths
 */
export function saveStoredTeamStrengths(strengths) {
  try {
    localStorage.setItem(TEAM_STRENGTH_STORAGE_KEY, JSON.stringify(strengths));
  } catch (err) {
    console.error("Failed to save team strengths to storage:", err);
  }
}

/**
 * Resets team strengths back to factory defaults
 * @returns {Record<string, number>}
 */
export function resetTeamStrengthsToDefault() {
  saveStoredTeamStrengths(DEFAULT_TEAM_STRENGTH);
  return { ...DEFAULT_TEAM_STRENGTH };
}
