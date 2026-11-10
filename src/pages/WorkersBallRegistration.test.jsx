import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import WorkersBallRegistration from "./WorkersBallRegistration";

window.scrollTo = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("WorkersBallRegistration (/wb26)", () => {
  it("renders the opening animation and shows the registration paused / back up soon notice without a search input", async () => {
    render(<WorkersBallRegistration />);
    expect(
      screen.getByRole("heading", { name: /Workers Ball/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Skip Intro/i }));

    expect(
      await screen.findByText(/Registration Will Be Back Up Soon/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/New registrations are temporarily paused and will be back up shortly/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Search Registry/i })
    ).not.toBeInTheDocument();
  });
});
