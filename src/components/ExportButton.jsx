import React from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function ExportButton({ data }) {
  const exportToCSV = () => {
    try {
      // Build CSV manually
      const headers = Object.keys(data[0]);
      const rows = data.map((obj) => headers.map((h) => obj[h]));
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "attendance.csv");
    } catch (error) {
      console.error("CSV export failed:", error);
    }
  };

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Data");

      worksheet.columns = Object.keys(data[0]).map((key) => ({
        header: key,
        key,
        width: 20,
      }));

      data.forEach((row) => worksheet.addRow(row));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, "attendance.xlsx");
    } catch (error) {
      console.error("Excel export failed:", error);
    }
  };

  return (
    <div className="flex gap-4 p-6 justify-center">
      <button
        onClick={exportToCSV}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
      >
        Export CSV
      </button>
      <button
        onClick={exportToExcel}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
      >
        Export Excel
      </button>
    </div>
  );
}
