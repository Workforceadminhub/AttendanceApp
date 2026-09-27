/**
 * Load ExcelJS on demand. It is ~930 KB, so importing it statically puts it
 * on every page that touches an export or upload helper, including the
 * public meeting check-in pages.
 */
export const loadExcelJS = () => import("exceljs").then((m) => m.default);
