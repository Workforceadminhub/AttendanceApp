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

  if (dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 6 || dayOfWeek === 2) {
    return `${dayNames[0]} - 12/${today.getMonth() + 1}/${year}`;
  } else if (dayOfWeek === 3 || dayOfWeek === 4) {
    return `${dayNames[3]} ${today.getDate()} ${year}`;
  }

  return null;
}

export default getDayAndYear;
