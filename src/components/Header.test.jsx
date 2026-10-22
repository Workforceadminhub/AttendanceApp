import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";
import { getUser } from "../utils/getUser";
import { getUserRole } from "../utils/getUserRole";
import * as RBACContextModule from "../contexts/RBACContext";

vi.mock("../utils/getUser", () => ({
  getUser: vi.fn(),
}));

vi.mock("../utils/getUserRole", () => ({
  getUserRole: vi.fn(),
}));

vi.mock("../utils/bulkEmailAccess", () => ({
  canSendBulkEmail: () => false,
}));

vi.mock("../utils/authSession", () => ({
  logoutSession: vi.fn(),
}));

describe("Header mobile navigation", () => {
  beforeEach(() => {
    vi.spyOn(RBACContextModule, "useHubNav").mockReturnValue(false);
  });

  it("does not duplicate Summary Overview in mobile menu for Super Admin", () => {
    vi.mocked(getUser).mockReturnValue({
      email: "workforceadmin@hiccgbagada.com",
      fullname: "Super Admin",
      role: "Super Admin",
    });
    vi.mocked(getUserRole).mockReturnValue({
      isSuperAdmin: true,
      isChurchAdmin: false,
      isTeamAdmin: false,
      isSubTeamAdmin: false,
      isHOD: false,
      isAdmin: true,
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Open mobile menu
    const menuBtn = screen.getByRole("button", { name: /open menu/i });
    fireEvent.click(menuBtn);

    // Links inside the mobile sheet
    const summaryLinks = screen.getAllByRole("link", { name: /^Summary$/i });
    expect(summaryLinks.length).toBeGreaterThan(0);

    // "Summary Overview" should NOT be present because it is deduplicated
    expect(
      screen.queryByRole("link", { name: /^Summary Overview$/i })
    ).not.toBeInTheDocument();

    // Other unique items from the Summary dropdown should still be present
    expect(
      screen.getByRole("link", { name: /^Departments$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /^Reports & Analytics$/i })
    ).toBeInTheDocument();
  });
});
