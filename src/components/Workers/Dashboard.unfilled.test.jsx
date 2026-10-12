import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
vi.mock('../Layout', () => ({ default: ({ children }) => children }));
vi.mock('../BirthdayWidget', () => ({ default: () => null }));
vi.mock('../../utils/getUser', () => ({ getUser: () => ({ role: 'admin', team: 'Programs', department: 'Programs', route: '/admin/programs' }) }));
vi.mock('../../contexts/DepartmentsContext', () => ({ useAdminSelectOptions: () => [] }));
vi.mock('../../hooks/useAttendanceQueries', () => ({ useAttendanceQuery: () => ({ data: [
 { department: 'Sound', team: 'Programs', total: 5, present: 2, absent: 1, unfilled: 2 },
 { department: 'Protocol', team: 'Programs', total: 2, present: 1, absent: 0, unfilled: ['one'] },
], isLoading: false }) }));
vi.mock('../../services/hub/meetings', () => ({ fetchActiveMeeting: vi.fn().mockResolvedValue({}) }));
afterEach(cleanup);
it('exposes all unfilled attendance in an aggregate team with a scoped attendance link', () => {
 render(<MemoryRouter initialEntries={['/dashboard/admin/programs']}><Dashboard /></MemoryRouter>);
 expect(screen.getByRole('link', { name: /3 unmarked workers/ })).toHaveAttribute('href','/attendance/admin/programs');
});
