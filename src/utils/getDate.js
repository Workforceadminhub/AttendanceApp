const day = process.env.REACT_APP_DATE;
function getDayAndYear() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const year = today.getFullYear();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  if (
    dayOfWeek === 0 ||
    dayOfWeek === 1 ||
    dayOfWeek === 6 ||
    dayOfWeek === 2
  ) {
    return `${dayNames[0]} - ${day}/${today.getMonth() + 1}/${year}`;
  } else if (dayOfWeek === 3 || dayOfWeek === 4) {
    return `${dayNames[0]} - ${day}/${today.getMonth() + 1}/${year}`;
    // return `${dayNames[3]} ${today.getDate()} ${year}`;
  }

  return null;
}

/**
 * Generates all Sundays from Jan 1 of the current year up to today (or the current Sunday).
 * Returns them in the API format: "Sunday - day/month/year". Most recent Sunday first.
 * @param {number} [year] - If provided, return all Sundays in that year (Jan 1–Dec 31).
 */
export function getSundaysInYear(year) {
  const now = new Date();
  const targetYear = year != null ? year : now.getFullYear();
  const jan1 = new Date(targetYear, 0, 1);
  const firstSundayOffset = jan1.getDay() === 0 ? 0 : 7 - jan1.getDay();
  const firstSunday = new Date(targetYear, 0, 1 + firstSundayOffset);

  const endDate = year != null
    ? new Date(targetYear, 11, 31)
    : now;

  const sundays = [];
  const current = new Date(firstSunday);
  while (current <= endDate) {
    const day = current.getDate();
    const month = current.getMonth() + 1;
    const y = current.getFullYear();
    sundays.push(`Sunday - ${day}/${month}/${y}`);
    current.setDate(current.getDate() + 7);
  }
  return year != null ? sundays : sundays.reverse();
}

export function getNextSunday() {
  const date = new Date();

  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = dayOfWeek === 0 ? 0 : dayOfWeek; // If Sunday, keep it; otherwise, go back to last Sunday
  const previousSunday = new Date(date);
  previousSunday.setDate(date.getDate() - diff);

  // Get the weekday name
  const dayName = previousSunday.toLocaleDateString("en-GB", {
    weekday: "long",
  });

  // Get the day, month, and year without leading zeros
  const day = previousSunday.getDate();
  const month = previousSunday.getMonth() + 1; // Months are 0-based in JS
  const year = previousSunday.getFullYear();

  const formattedDay = `${dayName} - ${day}/${month}/${year}`;
  return formattedDay;
}

/**
 * Returns the Sunday's date formatted as "Sunday 14, February 2026".
 * Accepts:
 *   - No argument: uses the most recent Sunday
 *   - YYYY-MM-DD string: uses the Sunday of that week
 *   - API format "Sunday - day/month/year": parses and formats it
 */
export function getSundayDisplayDate(dateStr) {
  let date;
  if (dateStr && /^Sunday - \d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    // Parse API format: "Sunday - day/month/year"
    const parts = dateStr.split(" - ")[1].split("/");
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    date = new Date(year, month, day, 12, 0, 0);
  } else if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    date = new Date(dateStr + "T12:00:00");
  } else {
    date = new Date();
  }
  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? 0 : dayOfWeek;
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - diff);

  const dayName = sunday.toLocaleDateString("en-GB", { weekday: "long" });
  const dayNum = sunday.getDate();
  const month = sunday.toLocaleDateString("en-GB", { month: "long" });
  const year = sunday.getFullYear();

  return `${dayName} ${dayNum}, ${month} ${year}`;
}

/**
 * Returns the Sunday's date formatted as "February 22nd 2026" for table titles.
 * Accepts same formats as getSundayDisplayDate.
 */
export function getSundayTitleDate(dateStr) {
  let date;
  if (dateStr && /^Sunday - \d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split(" - ")[1].split("/");
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    date = new Date(year, month, day, 12, 0, 0);
  } else if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    date = new Date(dateStr + "T12:00:00");
  } else {
    date = new Date();
  }
  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? 0 : dayOfWeek;
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - diff);

  const dayNum = sunday.getDate();
  const monthName = sunday.toLocaleDateString("en-GB", { month: "long" });
  const year = sunday.getFullYear();
  const ord =
    dayNum === 1 || dayNum === 21 || dayNum === 31
      ? "st"
      : dayNum === 2 || dayNum === 22
        ? "nd"
        : dayNum === 3 || dayNum === 23
          ? "rd"
          : "th";
  return `${monthName} ${dayNum}${ord} ${year}`;
}

export default getDayAndYear;
