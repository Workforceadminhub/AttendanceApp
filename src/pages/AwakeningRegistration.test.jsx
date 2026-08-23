import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { submitAwakeningRegistrationMock } = vi.hoisted(() => ({
  submitAwakeningRegistrationMock: vi.fn(),
}));

vi.mock("../services/awakeningConference", () => ({
  submitAwakeningRegistration: submitAwakeningRegistrationMock,
}));

import AwakeningRegistration from "./AwakeningRegistration";

describe("AwakeningRegistration", () => {
  beforeEach(() => {
    submitAwakeningRegistrationMock.mockReset();
    submitAwakeningRegistrationMock.mockResolvedValue({ success: true });
    window.scrollTo = vi.fn();
  });

  it("submits an attendee with the API-required defaults and day value", async () => {
    const user = userEvent.setup();
    render(<AwakeningRegistration />);

    await user.type(screen.getByLabelText(/First Name/i), "Ada");
    await user.type(screen.getByLabelText(/Last Name/i), "Okafor");
    await user.type(screen.getByLabelText(/Phone Number/i), "+2348012345678");
    await user.type(screen.getByLabelText(/Email Address/i), "ada@example.com");
    await user.selectOptions(screen.getByLabelText(/Campus/i), "Gbagada");
    await user.selectOptions(screen.getByLabelText(/I am registering as/i), "attendee");
    await user.click(screen.getByRole("button", { name: "No" }));
    await user.selectOptions(screen.getByLabelText(/Foundation School Status/i), "yes");
    await user.click(screen.getByRole("checkbox", { name: "Thu 10 September" }));
    await user.click(screen.getByRole("button", { name: "Register for Awakening" }));

    await waitFor(() => expect(submitAwakeningRegistrationMock).toHaveBeenCalledTimes(1));
    expect(submitAwakeningRegistrationMock).toHaveBeenCalledWith({
      first_name: "Ada",
      last_name: "Okafor",
      phone: "+2348012345678",
      email: "ada@example.com",
      campus: "Gbagada",
      registration_type: "attendee",
      belongs_to_cell: "no",
      foundation_course_status: "yes",
      attendance_day: ["thursday_10th"],
      join_prayer_team: "no",
      lead_prayer_team: "no",
    });
    expect(screen.getByRole("heading", { name: "Registration Received" })).toBeInTheDocument();
  });

  it("submits a worker with multiple serving days", async () => {
    const user = userEvent.setup();
    render(<AwakeningRegistration />);

    await user.type(screen.getByLabelText(/First Name/i), "Emeka");
    await user.type(screen.getByLabelText(/Last Name/i), "Nwosu");
    await user.type(screen.getByLabelText(/Phone Number/i), "08023456789");
    await user.type(screen.getByLabelText(/Email Address/i), "emeka@example.com");
    await user.selectOptions(screen.getByLabelText(/Campus/i), "Magodo");
    await user.selectOptions(screen.getByLabelText(/I am registering as/i), "worker");

    const noButtons = screen.getAllByRole("button", { name: "No" });
    await user.click(noButtons[0]);
    await user.selectOptions(screen.getByLabelText(/Foundation School Status/i), "yes");
    await user.selectOptions(screen.getByLabelText(/Worker Team/i), "Program");
    await user.selectOptions(screen.getByLabelText(/Department/i), "Protocol");
    await user.selectOptions(screen.getByLabelText(/Worker Designation/i), "HOD");
    await user.selectOptions(screen.getByLabelText(/Preferred Service Team/i), "Ushering");

    await user.click(screen.getAllByRole("checkbox", { name: "Fri 11 September" })[0]);
    await user.click(screen.getAllByRole("checkbox", { name: "Fri 11 September" })[1]);
    await user.click(screen.getAllByRole("checkbox", { name: "Sun 13 September" })[1]);
    await user.click(noButtons[1]);
    await user.click(noButtons[2]);
    await user.click(screen.getByRole("button", { name: "Register for Awakening" }));

    await waitFor(() => expect(submitAwakeningRegistrationMock).toHaveBeenCalledTimes(1));
    expect(submitAwakeningRegistrationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        registration_type: "worker",
        attendance_day: ["friday_11th"],
        worker_team: "Program",
        department: "Protocol",
        worker_designation: "HOD",
        preferred_service_team: "Ushering",
        serving_day: ["friday_11th", "sunday_13th_september"],
        join_prayer_team: "no",
        lead_prayer_team: "no",
      })
    );
  });
});
