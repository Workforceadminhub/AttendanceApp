import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SetPassword from "./SetPassword";
import ResetPassword from "./ResetPassword";
import { hubResetPassword, hubSetPassword } from "../services/hub/auth";

vi.mock("../services/hub/auth", () => ({
  hubSetPassword: vi.fn(),
  hubResetPassword: vi.fn(),
}));
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const STRONG = "Str0ng!Passw0rd";

function renderAt(entry, element, path) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path={path} element={element} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function fill(id, value) {
  fireEvent.change(document.getElementById(id), { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SetPassword", () => {
  it("asks the user to sign in again when there is no token", () => {
    renderAt("/set-password", <SetPassword />, "/set-password");
    expect(screen.getByText(/Session expired or invalid login/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Set Password/ })).not.toBeInTheDocument();
  });

  it("keeps submit disabled until the password is strong and matches, then sets it", async () => {
    hubSetPassword.mockResolvedValue({});
    renderAt({ pathname: "/set-password", state: { token: "temp-token" } }, <SetPassword />, "/set-password");
    const submit = await screen.findByRole("button", { name: /Set Password/ });

    fill("password", "weak");
    fill("confirmPassword", "weak");
    expect(submit).toBeDisabled();

    fill("password", STRONG);
    expect(submit).toBeDisabled();
    fill("confirmPassword", STRONG);
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    await waitFor(() => expect(hubSetPassword).toHaveBeenCalledWith(STRONG, "temp-token"));
    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(sessionStorage.getItem("tempResetToken")).toBeNull();
  });
});

describe("ResetPassword", () => {
  it("prefills the code from the link and removes it from the address bar", () => {
    window.history.replaceState(null, "", "/reset-password?email=a%40b.co&otp=123456");
    renderAt("/reset-password?email=a%40b.co&otp=123456", <ResetPassword />, "/reset-password");
    expect(document.getElementById("email")).toHaveValue("a@b.co");
    expect(document.getElementById("otp")).toHaveValue("123456");
    expect(window.location.search).not.toContain("otp");
    window.history.replaceState(null, "", "/");
  });

  it("submits the reset and returns to login", async () => {
    hubResetPassword.mockResolvedValue({});
    renderAt("/reset-password?email=a%40b.co", <ResetPassword />, "/reset-password");
    const submit = screen.getByRole("button", { name: "Reset password" });
    expect(submit).toBeDisabled();

    fill("otp", "123456");
    fill("newPassword", STRONG);
    fill("confirmPassword", "different");
    expect(submit).toBeDisabled();
    fill("confirmPassword", STRONG);
    fireEvent.click(submit);

    await waitFor(() =>
      expect(hubResetPassword).toHaveBeenCalledWith({
        email: "a@b.co",
        otp: "123456",
        newPassword: STRONG,
        confirmPassword: STRONG,
      })
    );
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });
});
