import { fetchAdminAttendance, calculateTotals } from "./attendance";
import { getNextSunday } from "../utils/getDate";
import { teamsAndDepartments } from "../utils/teams";

const BASE_URL = "https://hchpk68xfh.execute-api.eu-west-1.amazonaws.com";

// Directorate to Teams mapping
const directorateMapping = [
  {
    directorate: "ATTRACTION",
    teams: ["Mission", "Programs"],
  },
  {
    directorate: "SPD",
    teams: ["Maturity", "Ministry"],
  },
  {
    directorate: "NEXT GEN",
    teams: ["Kidzone", "Stir House"], // Virtual teams - aggregated from departments
    isVirtual: true,
    sourceTeam: "Next Gen",
  },
  {
    directorate: "GENERAL SERVICES",
    teams: ["Admin and Facility", "Communications (DMU)", "Finance"], // Virtual teams from departments
    isVirtual: true,
    sourceTeam: "General Service",
  },
  {
    directorate: "COMMUNITIES",
    teams: ["Membership", "Districts"],
  },
  {
    directorate: "INTERACTIVE GROUPS",
    teams: ["Men of Harvest", "Singles Ministry", "Women of Wisdom"],
    isVirtual: true,
    sourceTeam: "Interactive Groups",
  },
  {
    directorate: "SENIOR LEADERSHIP",
    teams: ["Directional Leaders", "Pastoral Leaders"],
    isVirtual: true,
    sourceTeam: "Senior Leadership",
  },
];

// Departments that belong to Kidzone and Stir House
const kidzoneDeparts = [
  "Administration - Kidszone",
  "Learning and Development - Kidszone",
  "Programming and Environment - Kidszone",
  "Reach and Partnership - Kidszone",
];

const stirhouseDepts = [
  "Administration - Stirhouse",
  "Learning and Development - Stirhouse",
  "Programming and Environment - Stirhouse",
  "Reach and Partnership - Stirhouse",
];

// General Services departments
const generalServicesDepts = {
  "Admin and Facility": ["Admin and Facility"],
  "Communications (DMU)": ["Communications (DMU)"],
  "Finance": ["Finance"],
};

// Interactive Groups departments
const interactiveGroupsDepts = {
  "Men of Harvest": ["Men of Harvest"],
  "Singles Ministry": ["Singles Ministry"],
  "Women of Wisdom": ["Women of Wisdom"],
};

// Senior Leadership departments
const seniorLeadershipDepts = {
  "Directional Leaders": ["Directional leader"],
  "Pastoral Leaders": ["Pastoral Leaders"],
};

/**
 * Fetches all workers data for super admin overview
 * @returns {Promise<Array>} Array of all workers
 */
export const fetchAllWorkersForOverview = async () => {
  try {
    const accessToken = sessionStorage.getItem("accessToken");

    if (!accessToken) {
      throw new Error("No access token found");
    }

    const response = await fetch(
      `${BASE_URL}/api/super/admin/workers?limit=10000`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch workers`);
    }

    const result = await response.json();

    // Handle different response structures
    let workersData = [];
    if (result.data && result.data.data && Array.isArray(result.data.data)) {
      workersData = result.data.data;
    } else if (result.data && Array.isArray(result.data)) {
      workersData = result.data;
    } else if (Array.isArray(result)) {
      workersData = result;
    }

    return workersData;
  } catch (error) {
    console.error("Error fetching workers for overview:", error);
    throw error;
  }
};

/**
 * Aggregates worker data by team
 * @param {Array} workers - Array of worker objects
 * @returns {Array} Array of team statistics
 */
export const aggregateByTeam = (workers) => {
  const teamMap = {};

  workers.forEach((worker) => {
    const team = worker.team || "Unknown";

    if (!teamMap[team]) {
      teamMap[team] = {
        team,
        total: 0,
        active: 0,
        pendingAdd: 0,
        pendingDelete: 0,
        inactive: 0,
      };
    }

    teamMap[team].total += 1;

    // Treat null/undefined status as active (legacy workers without explicit status)
    const status = worker.status;
    if (status === "ACTIVE" || status === null || status === undefined) {
      teamMap[team].active += 1;
    } else if (status === "PENDING_ADD") {
      teamMap[team].pendingAdd += 1;
    } else if (status === "PENDING_DELETE") {
      teamMap[team].pendingDelete += 1;
    } else if (status === "INACTIVE") {
      teamMap[team].inactive += 1;
    } else {
      // Any other unknown status treated as active
      teamMap[team].active += 1;
    }
  });

  return Object.values(teamMap).sort((a, b) => b.total - a.total);
};

/**
 * Aggregates worker data by department
 * @param {Array} workers - Array of worker objects
 * @returns {Array} Array of department statistics
 */
export const aggregateByDepartment = (workers) => {
  const deptMap = {};

  workers.forEach((worker) => {
    const department = worker.department || "Unknown";
    const team = worker.team || "Unknown";

    if (!deptMap[department]) {
      deptMap[department] = {
        department,
        team,
        total: 0,
        active: 0,
        pendingAdd: 0,
        pendingDelete: 0,
        inactive: 0,
      };
    }

    deptMap[department].total += 1;

    // Treat null/undefined status as active (legacy workers without explicit status)
    const status = worker.status;
    if (status === "ACTIVE" || status === null || status === undefined) {
      deptMap[department].active += 1;
    } else if (status === "PENDING_ADD") {
      deptMap[department].pendingAdd += 1;
    } else if (status === "PENDING_DELETE") {
      deptMap[department].pendingDelete += 1;
    } else if (status === "INACTIVE") {
      deptMap[department].inactive += 1;
    } else {
      // Any other unknown status treated as active
      deptMap[department].active += 1;
    }
  });

  return Object.values(deptMap).sort((a, b) => b.total - a.total);
};

/**
 * Calculates overall statistics from workers data
 * @param {Array} workers - Array of worker objects
 * @returns {Object} Overall statistics
 */
export const calculateOverallStats = (workers) => {
  const stats = {
    totalWorkers: workers.length,
    activeWorkers: 0,
    pendingApprovals: 0,
    pendingDeletions: 0,
    inactiveWorkers: 0,
  };

  workers.forEach((worker) => {
    // Treat null/undefined status as active (legacy workers without explicit status)
    const status = worker.status;
    if (status === "ACTIVE" || status === null || status === undefined) {
      stats.activeWorkers += 1;
    } else if (status === "PENDING_ADD") {
      stats.pendingApprovals += 1;
    } else if (status === "PENDING_DELETE") {
      stats.pendingDeletions += 1;
    } else if (status === "INACTIVE") {
      stats.inactiveWorkers += 1;
    } else {
      // Any other unknown status treated as active
      stats.activeWorkers += 1;
    }
  });

  return stats;
};

/**
 * Prepares data for status pie chart
 * @param {Object} stats - Overall statistics object
 * @returns {Array} Array formatted for recharts pie chart
 */
export const prepareStatusChartData = (stats) => {
  return [
    { name: "Active", value: stats.activeWorkers, color: "#22c55e" },
    { name: "Pending Add", value: stats.pendingApprovals, color: "#eab308" },
    { name: "Pending Delete", value: stats.pendingDeletions, color: "#ef4444" },
    { name: "Inactive", value: stats.inactiveWorkers, color: "#6b7280" },
  ].filter((item) => item.value > 0);
};

/**
 * Prepares data for team bar chart
 * @param {Array} teamStats - Array of team statistics
 * @returns {Array} Array formatted for recharts bar chart
 */
export const prepareTeamChartData = (teamStats) => {
  return teamStats.slice(0, 12).map((team) => ({
    name: team.team.length > 15 ? team.team.substring(0, 12) + "..." : team.team,
    fullName: team.team,
    total: team.total,
    active: team.active,
    pending: team.pendingAdd + team.pendingDelete,
  }));
};

/**
 * Fetches attendance statistics for overview (overall totals)
 * @returns {Promise<Object>} Attendance statistics
 */
export const fetchAttendanceStats = async () => {
  try {
    const lastAttendanceDate = getNextSunday();
    const attendance = await fetchAdminAttendance("All", false);
    if (!attendance) {
      return {
        totalStrength: 0,
        totalPresent: 0,
        totalAbsent: 0,
        attendanceRate: "0%",
        lastAttendanceDate,
      };
    }

    const totals = calculateTotals(attendance);
    return {
      totalStrength: totals.find((t) => t.name === "Total strength")?.stat || 0,
      totalPresent: totals.find((t) => t.name === "Total present")?.stat || 0,
      totalAbsent: totals.find((t) => t.name === "Total absent")?.stat || 0,
      attendanceRate:
        totals.find((t) => t.name === "Total percentage")?.stat || "0%",
      lastAttendanceDate,
    };
  } catch (error) {
    console.error("Error fetching attendance stats:", error);
    return {
      totalStrength: 0,
      totalPresent: 0,
      totalAbsent: 0,
      attendanceRate: "0%",
      lastAttendanceDate: getNextSunday(),
    };
  }
};

/**
 * Fetches attendance statistics per team
 * @returns {Promise<Array>} Array of team attendance statistics
 */
export const fetchTeamAttendanceStats = async () => {
  try {
    const lastAttendanceDate = getNextSunday();
    const teamNames = teamsAndDepartments.map((t) => t.team);

    // Fetch attendance for each team in parallel
    const teamAttendancePromises = teamNames.map(async (teamName) => {
      try {
        const attendance = await fetchAdminAttendance(teamName, false);
        if (!attendance || attendance.length === 0) {
          return {
            team: teamName,
            present: 0,
            absent: 0,
            total: 0,
            percentage: "0%",
          };
        }

        const totals = calculateTotals(attendance);
        return {
          team: teamName,
          present: totals.find((t) => t.name === "Total present")?.stat || 0,
          absent: totals.find((t) => t.name === "Total absent")?.stat || 0,
          total: totals.find((t) => t.name === "Total strength")?.stat || 0,
          percentage: totals.find((t) => t.name === "Total percentage")?.stat || "0%",
        };
      } catch (error) {
        console.error(`Error fetching attendance for team ${teamName}:`, error);
        return {
          team: teamName,
          present: 0,
          absent: 0,
          total: 0,
          percentage: "0%",
        };
      }
    });

    const teamAttendanceStats = await Promise.all(teamAttendancePromises);

    return {
      teamAttendanceStats: teamAttendanceStats.sort((a, b) => b.total - a.total),
      lastAttendanceDate,
    };
  } catch (error) {
    console.error("Error fetching team attendance stats:", error);
    return {
      teamAttendanceStats: [],
      lastAttendanceDate: getNextSunday(),
    };
  }
};

/**
 * Fetches attendance statistics grouped by directorate
 * @returns {Promise<Object>} Object with directorate attendance data and totals
 */
export const fetchDirectorateAttendanceStats = async () => {
  try {
    const lastAttendanceDate = getNextSunday();
    
    // Get all regular teams (excluding virtual ones)
    const regularTeams = directorateMapping
      .filter((d) => !d.isVirtual)
      .flatMap((d) => d.teams);
    
    // Get source teams for virtual directorates
    const virtualSourceTeams = directorateMapping
      .filter((d) => d.isVirtual && d.sourceTeam)
      .map((d) => d.sourceTeam);
    
    // Fetch attendance for regular teams in parallel
    const regularTeamPromises = regularTeams.map(async (teamName) => {
      try {
        const attendance = await fetchAdminAttendance(teamName, false);
        if (!attendance || attendance.length === 0) {
          return {
            team: teamName,
            present: 0,
            absent: 0,
            total: 0,
          };
        }

        const totals = calculateTotals(attendance);
        return {
          team: teamName,
          present: totals.find((t) => t.name === "Total present")?.stat || 0,
          absent: totals.find((t) => t.name === "Total absent")?.stat || 0,
          total: totals.find((t) => t.name === "Total strength")?.stat || 0,
        };
      } catch (error) {
        console.error(`Error fetching attendance for team ${teamName}:`, error);
        return {
          team: teamName,
          present: 0,
          absent: 0,
          total: 0,
        };
      }
    });

    // Fetch virtual source teams attendance
    const virtualTeamPromises = virtualSourceTeams.map((teamName) => 
      fetchAdminAttendance(teamName, false)
    );

    const [regularTeamResults, ...virtualTeamResults] = await Promise.all([
      Promise.all(regularTeamPromises),
      ...virtualTeamPromises,
    ]);

    // Debug: Log virtual source teams and their results
    console.log("Virtual source teams:", virtualSourceTeams);
    console.log("Virtual team results count:", virtualTeamResults.length);
    virtualTeamResults.forEach((result, index) => {
      console.log(`Virtual team ${index} (${virtualSourceTeams[index]}):`, result?.length || 0, "records");
      if (result && result.length > 0) {
        console.log(`Sample record from ${virtualSourceTeams[index]}:`, result[0]);
      }
    });
    
    // Create a map for quick lookup of regular teams
    const teamAttendanceMap = {};
    regularTeamResults.forEach((result) => {
      teamAttendanceMap[result.team] = result;
    });

    // Debug: Log regular teams
    console.log("Regular teams attendance:", regularTeamResults);

    // Process Next Gen attendance to separate Kidzone and Stir House
    const nextGenAttendance = virtualTeamResults[0]; // First virtual team is Next Gen
    let kidzoneData = { team: "Kidzone", present: 0, absent: 0, total: 0 };
    let stirhouseData = { team: "Stir House", present: 0, absent: 0, total: 0 };

    console.log("Next Gen attendance records:", nextGenAttendance?.length || 0);
    
    if (nextGenAttendance && nextGenAttendance.length > 0) {
      nextGenAttendance.forEach((record) => {
        const dept = record.department || "";
        console.log("Next Gen record department:", dept, "present:", record.present, "absent:", record.absent, "total:", record.total);
        
        // Check if this record belongs to Kidzone
        if (kidzoneDeparts.some((kd) => dept.toLowerCase().includes(kd.toLowerCase()) || kd.toLowerCase().includes(dept.toLowerCase()))) {
          kidzoneData.present += record.present || 0;
          kidzoneData.absent += record.absent || 0;
          kidzoneData.total += record.total || 0;
        }
        // Check if this record belongs to Stirhouse
        else if (stirhouseDepts.some((sd) => dept.toLowerCase().includes(sd.toLowerCase()) || sd.toLowerCase().includes(dept.toLowerCase()))) {
          stirhouseData.present += record.present || 0;
          stirhouseData.absent += record.absent || 0;
          stirhouseData.total += record.total || 0;
        }
      });
    }

    console.log("Kidzone data:", kidzoneData);
    console.log("Stir House data:", stirhouseData);

    // Add Kidzone and Stir House to the map
    teamAttendanceMap["Kidzone"] = kidzoneData;
    teamAttendanceMap["Stir House"] = stirhouseData;

    // Process General Service attendance to separate departments
    const generalServiceAttendance = virtualTeamResults[1]; // Second virtual team is General Service
    
    // Initialize General Services department data
    const generalServicesData = {
      "Admin and Facility": { team: "Admin and Facility", present: 0, absent: 0, total: 0 },
      "Communications (DMU)": { team: "Communications (DMU)", present: 0, absent: 0, total: 0 },
      "Finance": { team: "Finance", present: 0, absent: 0, total: 0 },
    };

    if (generalServiceAttendance && generalServiceAttendance.length > 0) {
      generalServiceAttendance.forEach((record) => {
        const dept = record.department || "";
        
        // Match department to the appropriate category
        Object.keys(generalServicesDepts).forEach((key) => {
          if (generalServicesDepts[key].some((d) => 
            dept.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(dept.toLowerCase())
          )) {
            generalServicesData[key].present += record.present || 0;
            generalServicesData[key].absent += record.absent || 0;
            generalServicesData[key].total += record.total || 0;
          }
        });
      });
    }

    // Add General Services departments to the map
    Object.keys(generalServicesData).forEach((key) => {
      teamAttendanceMap[key] = generalServicesData[key];
    });

    // Process Interactive Groups attendance to separate departments
    const interactiveGroupsAttendance = virtualTeamResults[2]; // Third virtual team is Interactive Groups
    
    // Initialize Interactive Groups department data
    const interactiveGroupsData = {
      "Men of Harvest": { team: "Men of Harvest", present: 0, absent: 0, total: 0 },
      "Singles Ministry": { team: "Singles Ministry", present: 0, absent: 0, total: 0 },
      "Women of Wisdom": { team: "Women of Wisdom", present: 0, absent: 0, total: 0 },
    };

    if (interactiveGroupsAttendance && interactiveGroupsAttendance.length > 0) {
      interactiveGroupsAttendance.forEach((record) => {
        const dept = record.department || "";
        
        // Match department to the appropriate category
        Object.keys(interactiveGroupsDepts).forEach((key) => {
          if (interactiveGroupsDepts[key].some((d) => 
            dept.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(dept.toLowerCase())
          )) {
            interactiveGroupsData[key].present += record.present || 0;
            interactiveGroupsData[key].absent += record.absent || 0;
            interactiveGroupsData[key].total += record.total || 0;
          }
        });
      });
    }

    // Add Interactive Groups departments to the map
    Object.keys(interactiveGroupsData).forEach((key) => {
      teamAttendanceMap[key] = interactiveGroupsData[key];
    });

    // Process Senior Leadership attendance to separate departments
    const seniorLeadershipAttendance = virtualTeamResults[3]; // Fourth virtual team is Senior Leadership
    
    // Initialize Senior Leadership department data
    const seniorLeadershipData = {
      "Directional Leaders": { team: "Directional Leaders", present: 0, absent: 0, total: 0 },
      "Pastoral Leaders": { team: "Pastoral Leaders", present: 0, absent: 0, total: 0 },
    };

    if (seniorLeadershipAttendance && seniorLeadershipAttendance.length > 0) {
      seniorLeadershipAttendance.forEach((record) => {
        const dept = record.department || "";
        
        // Match department to the appropriate category
        Object.keys(seniorLeadershipDepts).forEach((key) => {
          if (seniorLeadershipDepts[key].some((d) => 
            dept.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(dept.toLowerCase())
          )) {
            seniorLeadershipData[key].present += record.present || 0;
            seniorLeadershipData[key].absent += record.absent || 0;
            seniorLeadershipData[key].total += record.total || 0;
          }
        });
      });
    }

    // Add Senior Leadership departments to the map
    Object.keys(seniorLeadershipData).forEach((key) => {
      teamAttendanceMap[key] = seniorLeadershipData[key];
    });

    // Group by directorate
    const directorateStats = directorateMapping.map((dir) => {
      const teamsData = dir.teams.map((teamName) => {
        const teamData = teamAttendanceMap[teamName] || {
          team: teamName,
          present: 0,
          absent: 0,
          total: 0,
        };
        
        const percentage = teamData.total > 0 
          ? ((teamData.present / teamData.total) * 100).toFixed(2) + "%"
          : "0%";
        
        return {
          ...teamData,
          percentage,
        };
      });

      // Calculate directorate totals
      const directorateTotal = teamsData.reduce((sum, t) => sum + t.total, 0);
      const directoratePresent = teamsData.reduce((sum, t) => sum + t.present, 0);
      const directorateAbsent = teamsData.reduce((sum, t) => sum + t.absent, 0);
      const directoratePercentage = directorateTotal > 0
        ? ((directoratePresent / directorateTotal) * 100).toFixed(2) + "%"
        : "0%";

      return {
        directorate: dir.directorate,
        teams: teamsData,
        total: directorateTotal,
        present: directoratePresent,
        absent: directorateAbsent,
        percentage: directoratePercentage,
      };
    });

    // Calculate grand totals
    const grandTotal = directorateStats.reduce((sum, d) => sum + d.total, 0);
    const grandPresent = directorateStats.reduce((sum, d) => sum + d.present, 0);
    const grandAbsent = directorateStats.reduce((sum, d) => sum + d.absent, 0);
    const grandPercentage = grandTotal > 0
      ? ((grandPresent / grandTotal) * 100).toFixed(2) + "%"
      : "0%";

    return {
      directorateStats,
      grandTotals: {
        total: grandTotal,
        present: grandPresent,
        absent: grandAbsent,
        percentage: grandPercentage,
      },
      lastAttendanceDate,
    };
  } catch (error) {
    console.error("Error fetching directorate attendance stats:", error);
    return {
      directorateStats: [],
      grandTotals: { total: 0, present: 0, absent: 0, percentage: "0%" },
      lastAttendanceDate: getNextSunday(),
    };
  }
};

/**
 * Fetches complete overview data
 * @returns {Promise<Object>} Complete overview data including workers and attendance
 */
export const fetchOverviewData = async () => {
  try {
    const [workers, attendanceStats, teamAttendanceData, directorateAttendanceData] = await Promise.all([
      fetchAllWorkersForOverview(),
      fetchAttendanceStats(),
      fetchTeamAttendanceStats(),
      fetchDirectorateAttendanceStats(),
    ]);

    const overallStats = calculateOverallStats(workers);
    const teamStats = aggregateByTeam(workers);
    const departmentStats = aggregateByDepartment(workers);
    const statusChartData = prepareStatusChartData(overallStats);
    const teamChartData = prepareTeamChartData(teamStats);

    return {
      workers,
      overallStats,
      teamStats,
      departmentStats,
      statusChartData,
      teamChartData,
      attendanceStats,
      teamAttendanceStats: teamAttendanceData.teamAttendanceStats,
      directorateStats: directorateAttendanceData.directorateStats,
      grandTotals: directorateAttendanceData.grandTotals,
    };
  } catch (error) {
    console.error("Error fetching overview data:", error);
    throw error;
  }
};
