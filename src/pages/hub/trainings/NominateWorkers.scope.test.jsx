import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NominateWorkers from './NominateWorkers';
import { hubGetAll } from '../../../services/hub/client';
vi.mock('../../../components/Layout', () => ({ default: ({children})=>children }));
vi.mock('../../../utils/getUserRole', () => ({ getUserRole:()=>({ role:'TEAM_ADMIN',isTeamAdmin:true,user:{id:7,team:'Programs'} }) }));
vi.mock('../../../contexts/RBACContext', () => ({ useCanAction:()=>true,useScopeFilter:()=>null }));
vi.mock('../../../contexts/DepartmentsContext', () => ({ useEffectiveRouteList:()=>[
 {department:'Sound',team:'Programs',route:'/sound'}, {department:'Protocol',team:'Programs',route:'/protocol'}, {department:'Workforce Admin',team:'Ministry',route:'/wadata'}
] }));
vi.mock('../../../services/hub/client', () => ({ hubGetAll:vi.fn().mockResolvedValue([
 {id:1,firstname:'In Scope',department:'Sound'}, {id:2,firstname:'Outside Scope',department:'Workforce Admin'}
]) }));
vi.mock('../../../services/hub/trainings', () => ({ fetchTraining:vi.fn().mockResolvedValue({data:{id:'training',name:'Training'}}),fetchNominations:vi.fn().mockResolvedValue([]),nominateWorkers:vi.fn() }));
afterEach(cleanup);
it('offers only team departments and rejects broader candidate responses',async()=>{
 render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter initialEntries={['/training/nominate']}><Routes><Route path='/:id/nominate' element={<NominateWorkers/>}/></Routes></MemoryRouter></QueryClientProvider>);
 expect(screen.queryByRole('option',{name:'Workforce Admin'})).not.toBeInTheDocument();
 expect(hubGetAll).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Department *'),{target:{value:'Sound'}});
 expect(await screen.findByRole('checkbox',{name:/In Scope/})).toBeInTheDocument();
 expect(screen.queryByRole('checkbox',{name:/Outside Scope/})).not.toBeInTheDocument();
 await waitFor(()=>expect(hubGetAll).toHaveBeenCalledWith('/workers',expect.objectContaining({department:'Sound'})));
});
