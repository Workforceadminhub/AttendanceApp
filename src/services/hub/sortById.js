export function sortById(items) {
  if (!Array.isArray(items)) return items;
  return [...items].sort((a, b) => {
    const idA = a?.id ?? a?._id;
    const idB = b?.id ?? b?._id;
    const numA = Number(idA);
    const numB = Number(idB);
    if (!isNaN(numA) && !isNaN(numB) && idA !== null && idB !== null && idA !== "" && idB !== "") {
      return numA - numB;
    }
    return String(idA ?? "").localeCompare(String(idB ?? ""));
  });
}
