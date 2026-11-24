import { createElement as h } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import { persistSession } from "./utils/authSession";

function renderGuarded(path) {
  render(
    h(
      MemoryRouter,
      { initialEntries: [path] },
      h(
        Routes,
        null,
        h(Route, { path: "/login", element: h("div", null, "Login page") }),
        h(Route, { path: "*", element: h(PrivateRoute, null, h("div", null, "Protected page")) })
      )
    )
  );
}

describe("route guards", () => {
  it("sends a signed-out visitor to login", () => {
    renderGuarded("/workers/super-admin");
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected page")).not.toBeInTheDocument();
  });

  it("does not trust a stored user without an access token", () => {
    sessionStorage.setItem("authUser", JSON.stringify({ id: 1, role: "super-admin" }));
    renderGuarded("/manage-admins");
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders the page for a signed-in session", () => {
    persistSession("test-token", { id: 1, role: "super-admin", fullname: "Test Admin" });
    renderGuarded("/workers/super-admin");
    expect(screen.getByText("Protected page")).toBeInTheDocument();
  });
});
