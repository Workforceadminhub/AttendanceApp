import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";
import { getNextSunday } from "../utils/getDate";
import { routeObject } from "../utils/routeObject";
import { WORKER_STATUS } from "../utils/enums";

// const table = "attendance2"
const table = "attendance";

export const fetchWorkers = async (department, activeDate) => {
  try {
    const dateForAttendance = activeDate || getNextSunday();
    const { data, error } = await supabase
      .from("worker")
      .select(`*, ${table} ( workerid, attendance, attendancedate )`)
      .eq("department", department)
      .eq(`${table}.attendancedate`, dateForAttendance);

    if (error) {
      throw error;
    }

    const finalResult = data
      .map((item) => ({
        ...item,
        name: item?.fullname?.trim(),
        attendance:
          item[table].length > 0 ? item[table][0].attendance : undefined,
      }))
      .filter(
        (item) =>
          item.status === WORKER_STATUS.ACTIVE ||
          !item.status ||
          item.status === WORKER_STATUS.PENDING_DELETE
      );

    return finalResult;
  } catch (error) {
    console.error("Error fetching workers:", error.message);
    return null; // You can return null or handle errors differently
  }
};

export const fetchUnmarkedWorkers = async (team, activeDate) => {
  try {
    const dateForAttendance = activeDate || getNextSunday();
    const { data: workers, error: workersError } = await supabase
      .from("worker")
      .select("*")
      .eq("team", team);

    const { data: markedWorkers, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("attendancedate", dateForAttendance)
      .eq("team", team);

    const unmarkedWorkers = workers.filter(
      (worker) =>
        !markedWorkers.some(
          (markedWorker) => markedWorker.workerid === worker.id
        )
    );

    if (workersError || error) {
      throw error;
    }

    return unmarkedWorkers;
  } catch (error) {
    console.error("Error fetching workers:", error.message);
    return null; // You can return null or handle errors differently
  }
};

export const fetchAdminWorkers = async (team, activeGroup, activeDate) => {
  try {
    const departments = routeObject
      .filter((item) => item.team === team)
      .map((item) => item.department);
    const dateForAttendance = activeDate || getNextSunday();
    let data;
    let error;
    if (activeGroup === "All") {
      const { data: _data, error: _error } = await supabase
        .from("worker")
        .select(`*, ${table} ( workerid, attendance, attendancedate )`)
        .in("department", departments)
        .eq(`${table}.attendancedate`, dateForAttendance);

      data = _data;
      error = _error;
    }

    if (activeGroup !== "All") {
      const { data: _data, error: _error } = await supabase
        .from("worker")
        .select(`*, ${table} ( workerid, attendance, attendancedate )`)
        .eq("department", activeGroup)
        .eq(`${table}.attendancedate`, dateForAttendance);

      data = _data;
      error = _error;
    }

    if (error) {
      throw error;
    }

    const finalResult = data.map((item) => ({
      ...item,
      name: item?.fullname?.trim(),
      attendance:
        item[table].length > 0 ? item[table][0].attendance : undefined,
    }));

    return finalResult;
  } catch (error) {
    console.error("Error fetching workers:", error.message);
    return null; // You can return null or handle errors differently
  }
};

export const addNewWorker = async (worker) => {
  try {
    const middlename = worker?.othername;
    const { data, error } = await supabase.from("worker").insert({
      ...worker,
      fullname: middlename
        ? `${worker.firstname} ${worker.othername} ${worker.lastname}`
        : `${worker.firstname} ${worker.lastname}`,
      fullnamereverse: middlename
        ? `${worker.lastname} ${worker.othername} ${worker.firstname}`
        : `${worker.lastname} ${worker.firstname}`,
      status: WORKER_STATUS.PENDING_ADD,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error adding new worker:", error.message);
    return null;
  }
};

export const removeWorker = (workerid, deleteData) => {
  // Implement this function to update a worker's status
  try {
    return supabase
      .from("worker")
      .update({
        status: WORKER_STATUS.PENDING_DELETE,
        reasonfordelete: deleteData?.reasonfordelete,
        nameofrequester: deleteData?.nameofrequester,
        roleofrequester: deleteData?.roleofrequester,
      })
      .eq("id", workerid);
  } catch (error) {
    throw error;
  }
};

export const useFetchWorkers = (department) => {
  return useQuery({
    queryKey: [department],
    queryFn: () => fetchWorkers(department),
  });
};
