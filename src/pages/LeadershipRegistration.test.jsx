import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LeadershipRegistration from "./LeadershipRegistration";
import { lookupWorkerByPhone } from "../services/leadershipRegistrations";
import { PUBLIC_LOOKUP_HINT } from "../utils/safeMessages";
import { toast } from "react-toastify";

vi.mock("../services/leadershipRegistrations", () => ({
  lookupWorkerByPhone: vi.fn(),
  submitRegistration: vi.fn(),
}));
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LeadershipRegistration phone lookup", () => {
  it("rejects a short number without calling the lookup", () => {
    render(<LeadershipRegistration />);
    fireEvent.change(screen.getByLabelText(/Your Registered Phone Number/), { target: { value: "0801" } });
    fireEvent.click(screen.getByRole("button", { name: /Find Me/ }));
    expect(toast.error).toHaveBeenCalledWith("Enter a valid 11-digit phone number.");
    expect(lookupWorkerByPhone).not.toHaveBeenCalled();
  });

  it("strips non-digits and shows the generic hint when nobody matches", async () => {
    lookupWorkerByPhone.mockRejectedValue(new Error("Worker 42 not found in department X"));
    render(<LeadershipRegistration />);
    const input = screen.getByLabelText(/Your Registered Phone Number/);
    fireEvent.change(input, { target: { value: "0801-234 5678" } });
    expect(input).toHaveValue("08012345678");
    fireEvent.click(screen.getByRole("button", { name: /Find Me/ }));

    await waitFor(() => expect(lookupWorkerByPhone).toHaveBeenCalledWith("08012345678"));
    expect(await screen.findByText(PUBLIC_LOOKUP_HINT)).toBeInTheDocument();
    expect(screen.queryByText(/Worker 42/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fill in my details" }));
    expect(await screen.findByLabelText(/Full Name/)).toBeInTheDocument();
  });
});
