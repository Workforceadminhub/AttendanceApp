import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import WorkersBallRegistration from "./WorkersBallRegistration";
import {
  buildWorkersBallOtpEmail,
  buildWorkersBallConfirmationEmail,
} from "../emails/workersBallEmails";

afterEach(() => {
  cleanup();
});

window.scrollTo = vi.fn();

vi.mock("../services/departments", () => ({
  fetchTeamsAndDepartmentsForFilter: vi.fn().mockResolvedValue({
    teams: [],
    departmentsByTeam: {},
  }),
}));

describe("WorkersBallRegistration (/wb26)", () => {
  it("renders the pre-load ceremonial greeting animation and transitions into the search form", async () => {
    render(<WorkersBallRegistration />);

    expect(
      screen.getByText(/Initializing Accreditation Desk/i)
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Enter Registration Desk/i })
    );

    expect(
      await screen.findByText(/Find your name in the Gbagada registry/i)
    ).toBeInTheDocument();
  });

  it("returns 10 results when searching by name and handles the existing-email OTP + profile update + confirmation flow", async () => {
    render(<WorkersBallRegistration />);
    fireEvent.click(screen.getByRole("button", { name: /Skip Intro/i }));

    const searchInput = await screen.findByLabelText(/Name or Phone Number/i);
    fireEvent.change(searchInput, { target: { value: "Temitope" } });
    fireEvent.click(screen.getByRole("button", { name: /Search Registry/i }));

    expect(
      await screen.findByText(/Showing 10 of 10 Results/i, {}, { timeout: 2500 })
    ).toBeInTheDocument();

    const resultItems = screen.getAllByRole("listitem");
    // 4 step progress items + 10 worker result items = 14 listitems
    expect(resultItems.length).toBe(14);

    // Select Temitope Balogun (has email on record, but missing Role & Department)
    fireEvent.click(screen.getByText(/Temitope Balogun/i));

    // Wait for OTP verification screen
    const autoFillBtn = await screen.findByRole(
      "button",
      { name: /Auto-Fill 202688/i },
      { timeout: 2500 }
    );
    fireEvent.click(autoFillBtn);

    // Wait for Profile Update screen
    const roleSelect = await screen.findByLabelText(/Workforce Role/i, {}, { timeout: 2500 });
    expect(roleSelect).toHaveValue("");

    // Fill missing Role & Department
    fireEvent.change(roleSelect, { target: { value: "Worker" } });
    const deptSelect = screen.getByLabelText(/Department/i);
    fireEvent.change(deptSelect, { target: { value: "Growth Track" } });

    fireEvent.click(
      screen.getByRole("button", {
        name: /Save & Confirm Workers Ball Registration/i,
      })
    );

    // Wait for confirmed pass screen
    expect(
      await screen.findByText(
        /See you at Workers Ball, Temitope!/i,
        {},
        { timeout: 3000 }
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText(/HGWB-/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("button", { name: /Download Official Pass/i })
    ).toBeInTheDocument();
  });

  it("prompts for email first when a selected worker has no email on record", async () => {
    render(<WorkersBallRegistration />);
    fireEvent.click(screen.getByRole("button", { name: /Skip Intro/i }));

    fireEvent.click(
      await screen.findByRole("button", {
        name: /Mayowa \(No Email \+ Missing Dept\)/i,
      })
    );

    expect(
      await screen.findByText(/Showing 10 of 10 Results/i, {}, { timeout: 2500 })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Mayowa Agboade/i));

    // Should ask for email first
    const emailInput = await screen.findByLabelText(/Your Active Email Address/i);
    fireEvent.change(emailInput, {
      target: { value: "mayowa.agboade@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Send Verification Code/i })
    );

    await waitFor(
      () => {
        expect(
          screen.getByText(/Enter the 6-digit code sent to your email/i)
        ).toBeInTheDocument();
      },
      { timeout: 2500 }
    );
  });

  it("builds valid inline-styled HTML for both OTP and Confirmation emails", () => {
    const otpHtml = buildWorkersBallOtpEmail({
      firstName: "Adebayo",
      otpCode: "202688",
      expiryMinutes: 10,
    });
    expect(otpHtml).toContain("202688");
    expect(otpHtml).toContain("Verify your email for Workers Ball 2026");

    const confirmHtml = buildWorkersBallConfirmationEmail({
      firstName: "Adebayo",
      fullName: "Adebayo Okafor",
      accessCode: "HGWB-AO2419",
      role: "Cell Leader",
      department: "Leadership Training",
      team: "Ministry",
    });
    expect(confirmHtml).toContain("HGWB-AO2419");
    expect(confirmHtml).toContain("Adebayo Okafor");
    expect(confirmHtml).toContain("Leadership Training");
  });
});
