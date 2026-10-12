import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ViewWorker from './ViewWorker';
vi.mock('../components/Layout', () => ({ default: ({ children }) => children }));
vi.mock('../utils/getUserRole', () => ({ getUserRole: () => ({ isSuperAdmin:true, user:{department:'Super Admin'} }), canAccessDepartment: () => true }));
vi.mock('../services/departments', () => ({ fetchTeamsAndDepartmentsForFilter: vi.fn().mockResolvedValue({teams:[], departmentsByTeam:{}}) }));
vi.mock('../utils/apiClient', () => ({ default: vi.fn().mockResolvedValue({ data: { id:2, firstname:'Ada', lastname:'Worker', team:'Programs', department:'Sound', birthdate:'12th January' } }) }));
vi.mock('../services/hub/trainings', () => ({ fetchWorkerTrainings:vi.fn().mockResolvedValue([]), fetchWorkerTrainingMetrics:vi.fn().mockResolvedValue({}) }));
afterEach(cleanup);
it('names the profile controls and returns to the selected directory without saving', async () => {
 render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>
 <MemoryRouter initialEntries={['/worker/2?from=department:Programs&returnTo=%2Fdepartment%2Fprograms%2Fworkers%3Fdepartment%3DSound']}><Routes>
 <Route path='/worker/:workerId' element={<ViewWorker/>}/><Route path='/department/programs/workers' element={<p>Sound directory restored</p>}/>
 </Routes></MemoryRouter></QueryClientProvider>);
 expect(await screen.findByLabelText(/First Name/)).toHaveValue('Ada');
 for(const label of ['Last Name','Other Name','Full Name','Full Name Reverse','Gender','Phone Number','Email Address','Team','Department','Worker Role','Birth Date','Marital Status','Age Range','Employment Status','Occupation','Address']) {
  expect(screen.getByLabelText(new RegExp('^'+label+'(?: \\*)?$'))).toBeInTheDocument();
 }
 fireEvent.click(screen.getByRole('button',{name:'← Back'}));
 expect(await screen.findByText('Sound directory restored')).toBeInTheDocument();
});
