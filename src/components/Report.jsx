import React, { useEffect } from "react";
import ExportButton from "./ExportButton";
import { exportAttendance } from "../services/exportAttendance";

export default function Report() {
  const [data, setData] = React.useState([]);

  useEffect(() => {
    exportAttendance("Sunday - 27/7/2025")
      .then((res) => setData(res))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">Export Data Example</h1>
      <ExportButton data={data} />
    </div>
  );
}
