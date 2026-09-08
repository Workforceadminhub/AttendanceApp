import { afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
vi.mock("../services/hub/auth", () => ({ hubSignIn: vi.fn().mockResolvedValue({ accessToken: "test", user: { role: "super-admin" } }) }));
vi.mock("../services/login", () => ({ default: vi.fn().mockResolvedValue({ accessToken: "test", authUser: { role: "super-admin" } }) }));
vi.mock("../utils/authSession", () => ({ persistSession: () => ({ role: "super-admin" }), getSessionUser: () => null }));
vi.mock("../utils/routeObject", () => ({ getPostLoginPath: () => "/attendance/dashboard", resolveAdminRoute: () => "/attendance/dashboard", ensureSessionRoute: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), warn: vi.fn() } }));
import Login from "./Login";
import PrivateRoute from "./PrivateRoute";
afterEach(cleanup);
const reportPath = "/report/confirmation-leaders-meeting?meeting_date=2026-09-19";
function Destination() { const location = useLocation(); return <output>{location.pathname + location.search}</output>; }
it.each(["email", "pass ID"])("retains the report date after %s login", async (mode) => {
  render(<MemoryRouter initialEntries={[{ pathname: "/login", state: { from: reportPath } }]}><Routes>
    <Route path="/login" element={<Login />} /><Route path="*" element={<Destination />} />
  </Routes></MemoryRouter>);
  if (mode === "email") {
    fireEvent.click(screen.getByRole("button", { name: "Sign in with email and password instead" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "test-password" } });
  } else fireEvent.change(screen.getByLabelText("ID"), { target: { value: "test-id" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(await screen.findByText(reportPath)).toBeInTheDocument();
});
function LoginDestination() { const location = useLocation(); return <output>{location.state?.from}</output>; }
it("preserves the dated destination when a report requires login", () => {
  render(<MemoryRouter initialEntries={[reportPath]}><Routes>
    <Route path="/report/confirmation-leaders-meeting" element={<PrivateRoute><div>Report</div></PrivateRoute>} />
    <Route path="/login" element={<LoginDestination />} />
  </Routes></MemoryRouter>);
  expect(screen.getByText(reportPath)).toBeInTheDocument();
});
