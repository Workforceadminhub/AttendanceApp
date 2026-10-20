import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import WorkersBallRegistration from "./WorkersBallRegistration";
import {
  confirmWorkersBallRegistration,
  requestWorkersBallOtp,
  searchWorkersBall,
  updateWorkersBallEmail,
} from "../services/workersBall";

vi.mock("../services/workersBall", () => ({
  searchWorkersBall: vi.fn(),
  updateWorkersBallEmail: vi.fn(),
  requestWorkersBallOtp: vi.fn(),
  confirmWorkersBallRegistration: vi.fn(),
  decodeQrCodeDataUrl: vi.fn().mockResolvedValue(null),
}));

vi.mock("../services/departments", () => ({
  fetchTeamsAndDepartmentsForFilter: vi.fn().mockResolvedValue({
    teams: [],
    departmentsByTeam: {},
  }),
}));

window.scrollTo = vi.fn();

const worker = (overrides = {}) => ({
  id: 18,
  name: "Chidi Bede Enwereji",
  firstName: "Chidi",
  lastName: "Bede Enwereji",
  phone: "******8143",
  email: "c***@g***.com",
  team: "Ministry",
  department: "Workforce Admin",
  role: "Worker",
  registered: false,
  emailEditable: true,
  ...overrides,
});

const enterForm = async () => {
  render(<WorkersBallRegistration />);
  fireEvent.click(screen.getByRole("button", { name: /Skip Intro/i }));
  return screen.findByLabelText(/Your Name/i);
};

const search = async (query) => {
  const input = await enterForm();
  fireEvent.change(input, { target: { value: query } });
  fireEvent.click(screen.getByRole("button", { name: /Search Registry/i }));
};

beforeEach(() => {
  vi.clearAllMocks();
  requestWorkersBallOtp.mockResolvedValue({ success: true });
  updateWorkersBallEmail.mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
});

describe("WorkersBallRegistration (/wb26)", () => {
  it("renders the opening animation and transitions into the search form", async () => {
    render(<WorkersBallRegistration />);
    expect(
      screen.getByRole("heading", { name: /Workers Ball/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Skip Intro/i }));

    expect(
      await screen.findByText(/Find your name in the Gbagada registry/i)
    ).toBeInTheDocument();
  });

  it("searches, sends OTP to the email on record, and confirms registration", async () => {
    searchWorkersBall.mockResolvedValue([worker()]);
    confirmWorkersBallRegistration.mockResolvedValue({
      accessCode: "HGWB-CB1234",
      qrCode: null,
    });

    await search("chidi");

    expect(searchWorkersBall).toHaveBeenCalledWith("chidi");
    fireEvent.click(await screen.findByText(/Chidi Bede Enwereji/i));

    // Uses the masked email on record without calling PUT
    fireEvent.click(
      await screen.findByRole("button", { name: /Send Verification Code/i })
    );
    await waitFor(() => expect(requestWorkersBallOtp).toHaveBeenCalledWith(18));
    expect(updateWorkersBallEmail).not.toHaveBeenCalled();

    const otpInput = await screen.findByLabelText(/6-Digit Verification Code/i);
    fireEvent.change(otpInput, { target: { value: "123456" } });

    await waitFor(() =>
      expect(confirmWorkersBallRegistration).toHaveBeenCalledWith(18, "123456")
    );
    expect(
      await screen.findByText(/See you at Workers Ball, Chidi!/i, {}, { timeout: 3000 })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/HGWB-CB1234/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Download Official Pass \(PNG\)/i)).toBeInTheDocument();
  });

  it("always renders the CeremonialPassCard and download button on confirmation even if API only returns qrCode", async () => {
    searchWorkersBall.mockResolvedValue([worker()]);
    confirmWorkersBallRegistration.mockResolvedValue({
      accessCode: "",
      qrCode: "data:image/png;base64,sampleQr",
    });

    await search("chidi");
    fireEvent.click(await screen.findByText(/Chidi Bede Enwereji/i));

    fireEvent.click(
      await screen.findByRole("button", { name: /Send Verification Code/i })
    );
    await waitFor(() => expect(requestWorkersBallOtp).toHaveBeenCalledWith(18));

    const otpInput = await screen.findByLabelText(/6-Digit Verification Code/i);
    fireEvent.change(otpInput, { target: { value: "123456" } });

    await waitFor(() =>
      expect(confirmWorkersBallRegistration).toHaveBeenCalledWith(18, "123456")
    );

    expect(
      await screen.findByText(/See you at Workers Ball, Chidi!/i, {}, { timeout: 3000 })
    ).toBeInTheDocument();

    expect(screen.getByText(/Download Official Pass \(PNG\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Accreditation QR/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Accreditation QR code/i)).toBeInTheDocument();
  });

  it("saves a new email via PUT before sending the OTP when none is on record", async () => {
    searchWorkersBall.mockResolvedValue([worker({ id: 6753, email: null, name: "Chidinma Onuoha", firstName: "Chidinma", lastName: "Onuoha" })]);

    await search("chidinma");
    fireEvent.click(await screen.findByText(/Chidinma Onuoha/i));

    const emailInput = await screen.findByLabelText(/Email Address/i);
    fireEvent.change(emailInput, { target: { value: "chidinma@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Send Verification Code/i }));

    await waitFor(() =>
      expect(updateWorkersBallEmail).toHaveBeenCalledWith(6753, "chidinma@example.com")
    );
    await waitFor(() => expect(requestWorkersBallOtp).toHaveBeenCalledWith(6753));
    expect(await screen.findByText(/Enter the 6-digit code/i)).toBeInTheDocument();
  });

  it("shows the already-registered screen when confirm returns 409", async () => {
    searchWorkersBall.mockResolvedValue([worker()]);
    const conflict = new Error("Worker already registered");
    conflict.status = 409;
    confirmWorkersBallRegistration.mockRejectedValue(conflict);

    await search("chidi");
    fireEvent.click(await screen.findByText(/Chidi Bede Enwereji/i));
    fireEvent.click(
      await screen.findByRole("button", { name: /Send Verification Code/i })
    );
    const otpInput = await screen.findByLabelText(/6-Digit Verification Code/i);
    fireEvent.change(otpInput, { target: { value: "654321" } });

    expect(
      await screen.findByText(/you’re already on the list/i)
    ).toBeInTheDocument();
  });

  it("shows an inline error for an invalid OTP", async () => {
    searchWorkersBall.mockResolvedValue([worker()]);
    confirmWorkersBallRegistration.mockRejectedValue(
      Object.assign(new Error("Invalid or expired code"), { status: 400 })
    );

    await search("chidi");
    fireEvent.click(await screen.findByText(/Chidi Bede Enwereji/i));
    fireEvent.click(
      await screen.findByRole("button", { name: /Send Verification Code/i })
    );
    const otpInput = await screen.findByLabelText(/6-Digit Verification Code/i);
    fireEvent.change(otpInput, { target: { value: "000000" } });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Invalid or expired code/i
    );
  });
});
