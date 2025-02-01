import { useEffect, useState } from "react";
import { calculateTotals, fetchAttendance } from "../../services/attendance";
import Header from "../Header";
import getDayAndYear from "../../utils/getDate";
import { useLocation } from "react-router-dom";
import { getDepartmentByUser } from "../../utils/getDepartment";
import LoadingState from "../LoadingState";

export default function Dashboard() {
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dateForAttendance = getDayAndYear();
  const location = useLocation();
  const team = getDepartmentByUser(location.pathname);

  useEffect(() => {
    setIsLoading(true);
    fetchAttendance().then((attendance) => {
      setAttendanceSummary(calculateTotals(attendance));
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="p-4">
      <Header />
      {/* <h3 className="text-base font-semibold text-gray-900">Last 30 days</h3> */}
      <div className="flex flex-col space-y-4 font-bold">
        {/* <Select title="Select service" options={services} /> */}
        {`${team?.team} Dashboard`} - {dateForAttendance}
      </div>

      {isLoading && (
        <div className="ml-24 mt-24">
          <LoadingState />
        </div>
      )}

      <dl className="mt-5 space-y-4">
        {attendanceSummary.map((item) => (
          <div
            key={item.name}
            className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6"
          >
            <dt className="truncate text-sm font-medium text-gray-500">
              {item.name}
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {item.stat}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
