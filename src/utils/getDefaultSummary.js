function getDefaultSummary(routeObject) {
  return routeObject.map((department, index) => ({
    id: index + 1,
    department: department.department,
    present: 0,
    absent: 0,
    total: 0,
    percentage: "0%",
  }));
}

export default getDefaultSummary;
