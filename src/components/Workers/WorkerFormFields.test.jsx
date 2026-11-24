import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import WorkerFormFields from "./WorkerFormFields";
import { EMPTY_WORKER, toWorkerPayload } from "../../hooks/useAddWorkerForm";

vi.mock("../BirthDatePicker", () => ({
  default: ({ id }) => <input id={id} />,
}));

const placement = {
  teams: [
    { value: "Districts", label: "Districts" },
    { value: "Programs", label: "Programs" },
  ],
  departmentOptions: [{ value: "Sound", label: "Sound" }],
};

function Harness({ onState, ...props }) {
  const [worker, setWorker] = useState(EMPTY_WORKER);
  onState?.(worker);
  return <WorkerFormFields worker={worker} onChange={setWorker} errors={{}} {...props} />;
}

describe("WorkerFormFields", () => {
  it("labels every field and keeps phone numbers to 11 digits", () => {
    render(<Harness placement={placement} />);
    for (const label of ["First Name", "Last Name", "Other Name", "Gender", "Email Address", "Team", "Department", "Worker Role", "Birth Date", "Marital Status", "Age Range", "Employment Status", "Occupation", "Address"]) {
      expect(screen.getByLabelText(new RegExp(`^${label}(?: \\*)?$`))).toBeInTheDocument();
    }
    const phone = screen.getByLabelText(/Phone Number/);
    fireEvent.change(phone, { target: { value: "0801-234-56789" } });
    expect(phone).toHaveValue("08012345678");
  });

  it("clears department and cluster when the team changes", () => {
    let state;
    render(<Harness placement={placement} onState={(w) => (state = w)} />);
    expect(screen.getByLabelText(/Department/)).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^Team/), { target: { value: "Districts" } });
    fireEvent.change(screen.getByLabelText(/District\/Sub-team/), { target: { value: "Pastor Isaac Cluster" } });
    expect(state).toMatchObject({ district_sub_team: "Pastor Isaac Cluster", cluster: "Pastor Isaac Cluster" });
    fireEvent.change(screen.getByLabelText(/^Team/), { target: { value: "Programs" } });
    expect(state).toMatchObject({ team: "Programs", department: "", district_sub_team: "", cluster: "" });
    expect(screen.queryByLabelText(/District\/Sub-team/)).not.toBeInTheDocument();
  });

  it("hides placement pickers when the department is fixed by the page", () => {
    render(<Harness team="Districts" occupationRequired />);
    expect(screen.queryByLabelText(/^Team/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Department/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/District\/Sub-team/)).toBeInTheDocument();
    expect(screen.getByLabelText("Occupation *")).toBeInTheDocument();
  });
});

describe("toWorkerPayload", () => {
  it("mirrors the cluster and trims the email", () => {
    expect(toWorkerPayload({ ...EMPTY_WORKER, email: " a@b.co ", district_sub_team: "Pastor Biola Cluster" })).toMatchObject({
      email: "a@b.co",
      cluster: "Pastor Biola Cluster",
      district_sub_team: "Pastor Biola Cluster",
    });
  });

  it("omits cluster fields when none is set", () => {
    const payload = toWorkerPayload({ ...EMPTY_WORKER });
    expect(payload).not.toHaveProperty("cluster");
    expect(payload).not.toHaveProperty("district_sub_team");
  });
});
