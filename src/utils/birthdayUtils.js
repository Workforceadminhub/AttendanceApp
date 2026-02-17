/**
 * Parse birthdate string to { month, day } (1-based). Returns null if unparseable.
 * Handles: "2020-05-15", "15/5", "May 15", "15th May", "15 May", etc.
 */
export function parseBirthdateMonthDay(value) {
  if (value == null || String(value).trim() === "") return null;
  const s = String(value).trim();
  const d = new Date(s.replace(/(\d+)(st|nd|rd|th)/i, "$1"));
  if (!isNaN(d.getTime())) {
    return { month: d.getMonth() + 1, day: d.getDate() };
  }
  return null;
}

/**
 * Next occurrence of month/day from today (this year or next).
 */
function nextOccurrence(month, day) {
  const now = new Date();
  let y = now.getFullYear();
  let next = new Date(y, month - 1, day);
  if (next < now) next = new Date(y + 1, month - 1, day);
  return next;
}

/**
 * Days from today to the given date (0 = today).
 */
function daysFromToday(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (24 * 60 * 60 * 1000));
}

/**
 * Split workers with birthdate into { today: [], upcoming: [] } (upcoming = next 30 days).
 * Each worker gets daysUntil attached for upcoming.
 */
export function splitWorkersByBirthday(workers, options = {}) {
  const maxUpcomingDays = options.maxUpcomingDays ?? 30;
  const today = [];
  const upcoming = [];

  (Array.isArray(workers) ? workers : []).forEach((worker) => {
    const md = parseBirthdateMonthDay(worker.birthdate || worker.birthday);
    if (!md) return;
    const days = daysFromToday(nextOccurrence(md.month, md.day));
    if (days === 0) {
      today.push(worker);
    } else if (days > 0 && days <= maxUpcomingDays) {
      upcoming.push({ ...worker, daysUntil: days });
    }
  });

  upcoming.sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0));
  return { today, upcoming };
}
