import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { registrations, exportRows, saveAs } = vi.hoisted(() => ({
  registrations: vi.fn(), exportRows: [], saveAs: vi.fn(),
}));
vi.mock("../../services/meeting", () => ({ getMeetingRegistrations: registrations }));
vi.mock("../Layout", () => ({ default: ({ children }) => <main>{children}</main> }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn() } }));
vi.mock("../../utils/getUserRole", () => ({ getUserRole: () => ({ isTeamAdmin: true }) }));
vi.mock("../../utils/getUser", () => ({ getUser: () => ({ team: "Programs" }) }));
vi.mock("./useMeetingDate", () => ({ default: () => ({ meetingDate: "2026-10-17" }) }));
vi.mock("../../utils/meetingConfig", () => ({
  getAllMeetings: () => [{ id: "1", date: "2026-10-17", title: "October Meeting", isActive: true }],
  formatMeetingDisplayDate: () => "17 October 2026",
}));
vi.mock("file-saver", () => ({ saveAs }));
vi.mock("../../utils/loadExcelJS", () => ({ loadExcelJS: async () => ({
  Workbook: class {
    xlsx = { writeBuffer: async () => new ArrayBuffer(0) };
    addWorksheet() {
      const cell = () => ({});
      const row = () => ({ getCell: cell, eachCell: () => {} });
      return { getRow: row, getCell: cell, mergeCells: () => {}, addRow: (values) => {
        exportRows.push(values); return row();
      } };
    }
  },
}) }));

import MeetingReport from "./MeetingReport";

const rows = [
  { id: 1, name: "Confirmed Worker", team: "Programs", department: "Sound", is_confirmed: true, is_present: true },
  { id: 2, name: "Declined Worker", team: "Programs", department: "Sound", is_confirmed: false },
  { id: 3, name: "Unanswered Worker", team: "Programs", department: "Media", is_confirmed: null },
  { id: 4, name: "Other Team Worker", team: "NLP", department: "NLP", is_confirmed: true, is_present: true },
];
function show(metric = "confirmed", meetingType = "leaders") {
  return render(<MemoryRouter><MeetingReport metric={metric} meetingType={meetingType} /></MemoryRouter>);
}
async function loaded() {
  await waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());
}
function card(label) {
  return screen.getByText(label, { selector: ".qc-eyebrow" }).closest(".qc-card");
}

beforeEach(() => {
  vi.clearAllMocks();
  exportRows.length = 0;
  registrations.mockResolvedValue({ data: rows });
});
afterEach(cleanup);

describe("Programs meeting report consistency", () => {
  it.each(["leaders", "workers"])("keeps %s confirmation populations consistent across cards, rows and export", async (type) => {
    show("confirmed", type);
    await loaded();
    expect(card("Registrations")).toHaveTextContent("3");
    expect(card("Confirmed")).toHaveTextContent("1");
    expect(card("Not Attending")).toHaveTextContent("1");
    expect(card("Unconfirmed (No Response)")).toHaveTextContent("1");
    const total = screen.getByRole("row", { name: /^Total / });
    expect(within(total).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Total", "3", "1", "1", "1"]);
    fireEvent.click(screen.getByRole("button", { name: "Export Summary Sheet" }));
    await waitFor(() => expect(saveAs).toHaveBeenCalledOnce());
    expect(exportRows.find((r) => r.directorate === "TOTAL")).toMatchObject({ total: 3, confirmed: 1, notAttending: 1, absent: 1 });
    expect(exportRows.find((r) => r.team === "Sound")).toMatchObject({ total: 2, confirmed: 1, notAttending: 1, absent: 0 });
    expect(exportRows.find((r) => r.team === "Media")).toMatchObject({ total: 1, absent: 1 });
    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    expect(screen.getByText("3 of 3 registrations")).toBeInTheDocument();
    expect(screen.getByText("Unanswered Worker")).toBeInTheDocument();
    expect(screen.queryByText("Other Team Worker")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "No Response" }));
    expect(screen.getByText("1 of 3 registrations")).toBeInTheDocument();
    expect(card("Not Attending")).toHaveTextContent("0");
    expect(card("Unconfirmed (No Response)")).toHaveTextContent("1");
  });

  it.each(["leaders", "workers"])("uses %s registrations for attendance cards, table and export", async (type) => {
    show("present", type);
    await loaded();
    expect(card("Registrations")).toHaveTextContent("3");
    expect(card("Present")).toHaveTextContent("1");
    expect(card("Absent")).toHaveTextContent("2");
    expect(card("% of Present")).toHaveTextContent("33.3%");
    expect(within(screen.getByRole("row", { name: /^Total / })).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Total", "3", "1", "1", "2"]);
    fireEvent.click(screen.getByRole("button", { name: "Export Summary Sheet" }));
    await waitFor(() => expect(saveAs).toHaveBeenCalledOnce());
    expect(exportRows.find((r) => r.directorate === "TOTAL")).toMatchObject({ total: 3, present: 1, absent: 2 });
    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "Sound" } });
    expect(card("Registrations")).toHaveTextContent("2");
    expect(card("Absent")).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "Summary View" }));
    expect(card("Registrations")).toHaveTextContent("3");
  });

  it("uses the whole team summary after returning from a department, status and search filtered list", async () => {
    show("confirmed", "workers");
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "Sound" } });
    fireEvent.click(screen.getByRole("button", { name: "Not Attending" }));
    fireEvent.change(screen.getByLabelText("Search name"), { target: { value: "Declined" } });
    await waitFor(() => expect(screen.getByText("1 of 3 registrations")).toBeInTheDocument());
    expect(card("Registrations")).toHaveTextContent("1");
    expect(card("Not Attending")).toHaveTextContent("1");
    expect(card("Unconfirmed (No Response)")).toHaveTextContent("0");
    fireEvent.click(screen.getByRole("button", { name: "Summary View" }));
    expect(card("Registrations")).toHaveTextContent("3");
    expect(card("Confirmed")).toHaveTextContent("1");
    expect(card("Unconfirmed (No Response)")).toHaveTextContent("1");
    expect(within(screen.getByRole("row", { name: /^Total / })).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Total", "3", "1", "1", "1"]);
    fireEvent.click(screen.getByRole("button", { name: "Export Summary Sheet" }));
    await waitFor(() => expect(saveAs).toHaveBeenCalledOnce());
    expect(exportRows.find((r) => r.directorate === "TOTAL")).toMatchObject({ total: 3, confirmed: 1, notAttending: 1, absent: 1 });
    // Returning to List preserves the user's selection and reapplies its population to cards.
    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    expect(screen.getByLabelText("Department")).toHaveValue("Sound");
    expect(screen.getByLabelText("Search name")).toHaveValue("Declined");
    expect(screen.getByRole("button", { name: "Not Attending" })).toHaveAttribute("aria-pressed", "true");
    expect(card("Registrations")).toHaveTextContent("1");
  });

  it("withholds statistics and empty-success messages when loading fails, then retries", async () => {
    registrations.mockRejectedValueOnce(new Error("Server unavailable"));
    show("present", "workers");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Unable to load this report");
    expect(alert).toHaveTextContent("Server unavailable");
    expect(screen.queryByText("No registrations found.")).not.toBeInTheDocument();
    expect(screen.queryByText("Absent")).not.toBeInTheDocument();
    expect(screen.queryByText("Registrations", { selector: ".qc-eyebrow" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Export/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry report" }));
    await loaded();
    expect(registrations).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(card("Absent")).toHaveTextContent("2");
  });

  it("filters summary, list view, and Excel export by campus and includes Campus column", async () => {
    registrations.mockResolvedValueOnce({
      data: [
        { id: 1, name: "Gbagada Leader", team: "Programs", department: "Sound", is_confirmed: true, is_present: true },
        { id: 2, firstname: "Ada", lastname: "Okeke", team: "Programs", department: "Sound", campus: "Yaba", is_confirmed: true, is_present: true },
        { id: 3, name: "Apapa Leader", team: "Programs", department: "Media", campus: "Apapa", is_confirmed: true, is_present: true },
      ],
    });
    show("present", "leaders");
    await loaded();

    // All Campuses by default
    expect(card("Registrations")).toHaveTextContent("3");
    expect(card("Present")).toHaveTextContent("3");

    // Filter to Yaba
    fireEvent.change(screen.getByLabelText("Campus"), { target: { value: "Yaba" } });
    expect(card("Registrations")).toHaveTextContent("1");
    expect(card("Present")).toHaveTextContent("1");

    // Filter to Other Campuses (non-Gbagada)
    fireEvent.change(screen.getByLabelText("Campus"), { target: { value: "__other__" } });
    expect(card("Registrations")).toHaveTextContent("2");

    // Switch to List View and verify Campus column and rows
    fireEvent.click(screen.getByRole("button", { name: "List View" }));
    expect(screen.getByRole("columnheader", { name: "Campus" })).toBeInTheDocument();
    expect(screen.getByText("Ada Okeke")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Yaba" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Apapa" })).toBeInTheDocument();
    expect(screen.queryByText("Gbagada Leader")).not.toBeInTheDocument();

    // Export Excel List and verify campus field in exported rows
    exportRows.length = 0;
    fireEvent.click(screen.getByRole("button", { name: "Export Excel List" }));
    await waitFor(() => expect(saveAs).toHaveBeenCalledOnce());
    expect(exportRows.find((r) => r.name === "Ada Okeke")).toMatchObject({
      name: "Ada Okeke",
      campus: "Yaba",
      department: "Sound",
    });
  });
});

