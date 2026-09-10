import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AllWorkers from "./AllWorkers";
import { fetchAllSuperAdminWorkers } from "../services/workers";
vi.mock("../services/workers", () => ({ fetchAllSuperAdminWorkers: vi.fn() }));
vi.mock("../components/Header", () => ({ default: () => null }));
vi.mock("../components/Layout", () => ({ default: ({ children }) => children }));
vi.mock("../utils/getUserRole", () => ({ getUserRole: () => ({ isSuperAdmin: true, user: { id: 1 } }) }));

describe("All Workers pagination", () => {
  it("renders 50 rows at a time and filters the entire dataset when on another page", async () => {
    fetchAllSuperAdminWorkers.mockResolvedValue(Array.from({ length: 55 }, (_, index) => ({ id: index + 1, firstname: `Person${index + 1}`, lastname: 'Worker' })));
    render(<MemoryRouter><AllWorkers /></MemoryRouter>);
    expect(await screen.findByText('Showing 55 of 55 workers')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(51);
    expect(screen.queryByText('Person51')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2', exact: true }));
    expect(screen.getByText('Person51')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(6);
    fireEvent.change(screen.getByPlaceholderText('Filter first name...'), { target: { value: 'Person2' } });
    expect(screen.getByText('Person2')).toBeInTheDocument();
    expect(screen.getByText('Showing 11 of 55 workers')).toBeInTheDocument();
    expect(fetchAllSuperAdminWorkers).toHaveBeenCalledTimes(1);
  });
});
