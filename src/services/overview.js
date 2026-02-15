import { fetchAdminAttendance, calculateTotals } from "./attendance";
import { getNextSunday } from "../utils/getDate";
import { teamsAndDepartments } from "../utils/teams";
import apiRequest, { API_BASE_URL } from "../utils/apiClient";

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
    teams: ["Kidszone", "Stir House"], // Virtual teams - aggregated from departments
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

// Departments that belong to Kidszone and Stir House
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
      `${API_BASE_URL}/api/super/admin/workers?limit=10000`,
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
 * @param {string} [activeDate] - Optional date for attendance (defaults to getNextSunday)
 * @returns {Promise<Object>} Attendance statistics
 */
export const fetchAttendanceStats = async (activeDate) => {
  try {
    const lastAttendanceDate = activeDate || getNextSunday();
    const attendance = await fetchAdminAttendance("All", true, lastAttendanceDate);
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
 * Uses a single "All" API call and parses data client-side to avoid 503 errors
 * @param {string} [activeDate] - Optional date for attendance (defaults to getNextSunday)
 * @returns {Promise<Array>} Array of team attendance statistics
 */
export const fetchTeamAttendanceStats = async (activeDate) => {
  try {
    const lastAttendanceDate = activeDate || getNextSunday();
    const teamNames = teamsAndDepartments.map((t) => t.team);

    // Fetch all attendance data with a single API call
    const allAttendance = await fetchAdminAttendance("All", true, lastAttendanceDate);
    
    if (!allAttendance || allAttendance.length === 0) {
      return {
        teamAttendanceStats: teamNames.map((teamName) => ({
          team: teamName,
          present: 0,
          absent: 0,
          total: 0,
          percentage: "0%",
        })),
        lastAttendanceDate,
      };
    }

    // Aggregate attendance by team
    const teamAttendanceMap = {};
    allAttendance.forEach((record) => {
      const team = record.team || "Unknown";
      if (!teamAttendanceMap[team]) {
        teamAttendanceMap[team] = {
          team,
          present: 0,
          absent: 0,
          total: 0,
        };
      }
      teamAttendanceMap[team].present += record.present || 0;
      teamAttendanceMap[team].absent += record.absent || 0;
      teamAttendanceMap[team].total += record.total || 0;
    });

    // Map to team stats with percentages
    const teamAttendanceStats = teamNames.map((teamName) => {
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
        team: teamName,
        present: teamData.present,
        absent: teamData.absent,
        total: teamData.total,
        percentage,
      };
    });

    return {
      teamAttendanceStats: teamAttendanceStats.sort((a, b) => b.total - a.total),
      lastAttendanceDate,
    };
  } catch (error) {
    return {
      teamAttendanceStats: [],
      lastAttendanceDate: getNextSunday(),
    };
  }
};

/**
 * Fetches attendance statistics grouped by directorate
 * Uses a single "All" API call and parses data client-side to avoid 503 errors
 * @param {string} [activeDate] - Optional date for attendance (defaults to getNextSunday)
 * @returns {Promise<Object>} Object with directorate attendance data and totals
 */
export const fetchDirectorateAttendanceStats = async (activeDate) => {
  try {
    const lastAttendanceDate = activeDate || getNextSunday();
    
    // Fetch all attendance data with a single API call
    const allAttendance = await fetchAdminAttendance("All", true, lastAttendanceDate);
    
    
    if (!allAttendance || allAttendance.length === 0) {
      return {
        directorateStats: directorateMapping.map((dir) => ({
          directorate: dir.directorate,
          teams: dir.teams.map((teamName) => ({
            team: teamName,
            present: 0,
            absent: 0,
            total: 0,
            percentage: "0%",
          })),
          total: 0,
          present: 0,
          absent: 0,
          percentage: "0%",
        })),
        grandTotals: { total: 0, present: 0, absent: 0, percentage: "0%" },
        lastAttendanceDate,
      };
    }

    // Create a map to aggregate attendance by team
    const teamAttendanceMap = {};
    
    // Process each attendance record and group by team
    allAttendance.forEach((record) => {
      const team = record.team || "Unknown";
      const dept = record.department || "";
      
      // Initialize team if not exists
      if (!teamAttendanceMap[team]) {
        teamAttendanceMap[team] = {
          team,
          present: 0,
          absent: 0,
          total: 0,
          departments: {},
        };
      }
      
      // Add to team totals
      teamAttendanceMap[team].present += record.present || 0;
      teamAttendanceMap[team].absent += record.absent || 0;
      teamAttendanceMap[team].total += record.total || 0;
      
      // Also track by department for virtual teams
      if (dept) {
        if (!teamAttendanceMap[team].departments[dept]) {
          teamAttendanceMap[team].departments[dept] = {
            department: dept,
            present: 0,
            absent: 0,
            total: 0,
          };
        }
        teamAttendanceMap[team].departments[dept].present += record.present || 0;
        teamAttendanceMap[team].departments[dept].absent += record.absent || 0;
        teamAttendanceMap[team].departments[dept].total += record.total || 0;
      }
    });


    // Create directorate team data map
    const directorateTeamMap = {};

    // Process regular teams (non-virtual directorates)
    directorateMapping.filter((d) => !d.isVirtual).forEach((dir) => {
      dir.teams.forEach((teamName) => {
        // Try to find matching team in attendance data
        const teamData = teamAttendanceMap[teamName];
        if (teamData) {
          directorateTeamMap[teamName] = {
            team: teamName,
            present: teamData.present,
            absent: teamData.absent,
            total: teamData.total,
          };
        } else {
          directorateTeamMap[teamName] = {
            team: teamName,
            present: 0,
            absent: 0,
            total: 0,
          };
        }
      });
    });

    // Process Next Gen -> Kidszone and Stir House
    const nextGenData = teamAttendanceMap["Next Gen"];
    let kidzoneData = { team: "Kidszone", present: 0, absent: 0, total: 0 };
    let stirhouseData = { team: "Stir House", present: 0, absent: 0, total: 0 };

    if (nextGenData && nextGenData.departments) {
      Object.values(nextGenData.departments).forEach((deptData) => {
        const dept = deptData.department || "";
        if (kidzoneDeparts.some((kd) => dept.toLowerCase().includes(kd.toLowerCase()) || kd.toLowerCase().includes(dept.toLowerCase()))) {
          kidzoneData.present += deptData.present || 0;
          kidzoneData.absent += deptData.absent || 0;
          kidzoneData.total += deptData.total || 0;
        } else if (stirhouseDepts.some((sd) => dept.toLowerCase().includes(sd.toLowerCase()) || sd.toLowerCase().includes(dept.toLowerCase()))) {
          stirhouseData.present += deptData.present || 0;
          stirhouseData.absent += deptData.absent || 0;
          stirhouseData.total += deptData.total || 0;
        }
      });
    }
    directorateTeamMap["Kidszone"] = kidzoneData;
    directorateTeamMap["Stir House"] = stirhouseData;

    // Process General Service -> Admin and Facility, Communications (DMU), Finance
    const generalServiceData = teamAttendanceMap["General Service"];
    if (generalServiceData && generalServiceData.departments) {
      Object.keys(generalServicesDepts).forEach((key) => {
        let data = { team: key, present: 0, absent: 0, total: 0 };
        Object.values(generalServiceData.departments).forEach((deptData) => {
          const dept = deptData.department || "";
          if (generalServicesDepts[key].some((d) => 
            dept.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(dept.toLowerCase())
          )) {
            data.present += deptData.present || 0;
            data.absent += deptData.absent || 0;
            data.total += deptData.total || 0;
          }
        });
        directorateTeamMap[key] = data;
      });
    } else {
      Object.keys(generalServicesDepts).forEach((key) => {
        directorateTeamMap[key] = { team: key, present: 0, absent: 0, total: 0 };
      });
    }

    // Process Interactive Groups -> Men of Harvest, Singles Ministry, Women of Wisdom
    const interactiveGroupsData = teamAttendanceMap["Interactive Groups"];
    if (interactiveGroupsData && interactiveGroupsData.departments) {
      Object.keys(interactiveGroupsDepts).forEach((key) => {
        let data = { team: key, present: 0, absent: 0, total: 0 };
        Object.values(interactiveGroupsData.departments).forEach((deptData) => {
          const dept = deptData.department || "";
          if (interactiveGroupsDepts[key].some((d) => 
            dept.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(dept.toLowerCase())
          )) {
            data.present += deptData.present || 0;
            data.absent += deptData.absent || 0;
            data.total += deptData.total || 0;
          }
        });
        directorateTeamMap[key] = data;
      });
    } else {
      Object.keys(interactiveGroupsDepts).forEach((key) => {
        directorateTeamMap[key] = { team: key, present: 0, absent: 0, total: 0 };
      });
    }

    // Process Senior Leadership -> Directional Leaders, Pastoral Leaders
    const seniorLeadershipData = teamAttendanceMap["Senior Leadership"];
    if (seniorLeadershipData && seniorLeadershipData.departments) {
      Object.keys(seniorLeadershipDepts).forEach((key) => {
        let data = { team: key, present: 0, absent: 0, total: 0 };
        Object.values(seniorLeadershipData.departments).forEach((deptData) => {
          const dept = deptData.department || "";
          if (seniorLeadershipDepts[key].some((d) => 
            dept.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(dept.toLowerCase())
          )) {
            data.present += deptData.present || 0;
            data.absent += deptData.absent || 0;
            data.total += deptData.total || 0;
          }
        });
        directorateTeamMap[key] = data;
      });
    } else {
      Object.keys(seniorLeadershipDepts).forEach((key) => {
        directorateTeamMap[key] = { team: key, present: 0, absent: 0, total: 0 };
      });
    }


    // Group by directorate
    const directorateStats = directorateMapping.map((dir) => {
      const teamsData = dir.teams.map((teamName) => {
        const teamData = directorateTeamMap[teamName] || {
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
    return {
      directorateStats: [],
      grandTotals: { total: 0, present: 0, absent: 0, percentage: "0%" },
      lastAttendanceDate: getNextSunday(),
    };
  }
};

/**
 * Fetches worker statistics only (metric cards, charts, breakdown tables).
 * Separated for progressive loading — resolves independently of attendance data.
 * @returns {Promise<Object>} Worker stats: overallStats, teamStats, departmentStats, chartData
 */
export const fetchWorkerStats = async () => {
  const workers = await fetchAllWorkersForOverview();
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
  };
};

/**
 * Fetches attendance data only (attendance report table, directorate stats).
 * Separated for progressive loading — resolves independently of worker data.
 * @param {string} [activeDate] - Optional date for attendance
 * @returns {Promise<Object>} Attendance data: attendanceStats, directorateStats, grandTotals
 */
export const fetchAttendanceData = async (activeDate) => {
  const [attendanceStats, teamAttendanceData, directorateAttendanceData] = await Promise.all([
    fetchAttendanceStats(activeDate),
    fetchTeamAttendanceStats(activeDate),
    fetchDirectorateAttendanceStats(activeDate),
  ]);

  return {
    attendanceStats,
    teamAttendanceStats: teamAttendanceData.teamAttendanceStats,
    directorateStats: directorateAttendanceData.directorateStats,
    grandTotals: directorateAttendanceData.grandTotals,
  };
};

/**
 * Fetches complete overview data (legacy — kept for backwards compatibility)
 * @param {Object} [params] - Optional params { startDate, endDate } for date-filtered attendance
 * @returns {Promise<Object>} Complete overview data including workers and attendance
 */
export const fetchOverviewData = async (params = {}) => {
  try {
    const { startDate, endDate } = params;
    const activeDate = endDate || startDate || null;

    const [workerData, attendanceData] = await Promise.all([
      fetchWorkerStats(),
      fetchAttendanceData(activeDate),
    ]);

    return {
      ...workerData,
      ...attendanceData,
    };
  } catch (error) {
    throw error;
  }
};

// ========== Phase 7 - Audit Log Functions ==========

/**
 * Fetches audit log entries with pagination and filtering.
 * Phase 7 spec: GET /api/audit-logs?startDate&endDate&departmentRoute&limit&offset&action
 * @param {number} [page=1] - Page number (converted to offset)
 * @param {number} [limit=50] - Number of entries per page
 * @param {Object} [filters={}] - Optional filters { startDate, endDate, departmentRoute, teamName, action }
 * @returns {Promise<Object|null>} Audit log data { data: [], logs: [], pagination: {}, total } or null on error
 */
export const fetchAuditLogs = async (page = 1, limit = 50, filters = {}) => {
  try {
    const offset = (page - 1) * limit;
    const params = {
      limit,
      offset,
      ...filters,
    };

    const response = await apiRequest("GET", "/api/audit-logs", params);

    if (!response || response.error) {
      throw new Error(response?.error || "Failed to fetch audit logs");
    }

    const data = response.data ?? response;
    if (Array.isArray(data.logs) && !Array.isArray(data.data)) {
      data.data = data.logs;
    }
    if (data.total !== undefined && !data.pagination?.total) {
      data.pagination = data.pagination || {};
      data.pagination.total = data.total;
      data.pagination.totalPages = Math.ceil(data.total / limit);
      data.pagination.hasNext = page * limit < data.total;
      data.pagination.hasPrev = page > 1;
    }
    return data;
  } catch (error) {
    return null;
  }
};

// ========== End Phase 7 - Audit Log Functions ==========
