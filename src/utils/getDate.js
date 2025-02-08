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

export default getDayAndYear;
