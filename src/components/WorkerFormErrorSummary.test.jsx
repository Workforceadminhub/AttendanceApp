import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import WorkerFormErrorSummary from "./WorkerFormErrorSummary";

afterEach(cleanup);

describe("WorkerFormErrorSummary", () => {
  it("keeps field errors visible and lets a mobile user return to the field", () => {
    render(
      <>
        <input id="email" aria-label="Email address" />
        <WorkerFormErrorSummary
          errors={{ email: "Enter a valid email address, such as name@example.com." }}
        />
      </>
    );

    const errorLink = screen.getByRole("button", { name: /email address/i });
    expect(screen.getByRole("alert")).toBeVisible();
    expect(errorLink).toHaveTextContent("Enter a valid email address");

    fireEvent.click(errorLink);
    expect(screen.getByLabelText("Email address")).toHaveFocus();
    expect(screen.getByRole("alert")).toBeVisible();
  });

  it("keeps an API failure visible instead of relying on the temporary toast", () => {
    render(<WorkerFormErrorSummary submitError="The server could not add this worker." />);

    expect(screen.getByRole("alert")).toHaveTextContent("The worker was not added.");
    expect(screen.getByRole("alert")).toHaveTextContent("The server could not add this worker.");
  });
});
