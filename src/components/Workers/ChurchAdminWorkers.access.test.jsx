import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ChurchAdminWorkers from './ChurchAdminWorkers';
import { getUserRole } from '../../utils/getUserRole';
import { fetchWorkers } from '../../services/workers';
vi.mock('../../utils/getUserRole', () => ({ getUserRole: vi.fn() }));
vi.mock('../../services/workers', () => ({ fetchWorkers: vi.fn(), fetchAdminWorkersPage: vi.fn(), listSuperAdminWorkers: vi.fn() }));
afterEach(cleanup);
it.each([
 { isHOD: true, user: { permissionLevel: 'HOD', route: '/wadata' } },
 { isTeamAdmin: true, user: { permissionLevel: 'TEAM_ADMIN', team: 'Programs', route: '/admin/programs' } },
])('denies the campus worker surface before loading its directory', async (role) => {
 getUserRole.mockReturnValue(role);
 render(<MemoryRouter initialEntries={['/church-admin/workers']}><Routes>
 <Route path='/church-admin/workers' element={<ChurchAdminWorkers />} />
 <Route path='/dashboard/*' element={<p>Own dashboard</p>} />
 </Routes></MemoryRouter>);
 expect(await screen.findByText('Own dashboard')).toBeInTheDocument();
 expect(fetchWorkers).not.toHaveBeenCalled();
 expect(screen.queryByRole('button', { name: 'Delete Worker' })).not.toBeInTheDocument();
});
