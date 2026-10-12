import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import { useDepartmentsContext, useEffectiveRouteList } from "../contexts/DepartmentsContext";
import { canAccessDepartment, getUserRole } from "../utils/getUserRole";
import { getDepartmentRoute, isDepartmentActive, isSameDepartment } from "../utils/routeObject";

export default function TeamWorkerPlacement({ bulk = false }) {
  const { teamRoute } = useParams();
  const { isTeamAdmin, user } = getUserRole();
  const routes = useEffectiveRouteList();
  const { departments: liveDepartments } = useDepartmentsContext();
  const navigate = useNavigate();
  const [department, setDepartment] = useState("");
  const team = typeof user?.team === "string" ? user.team : user?.team?.name;
  const teamSlug = String(team || "").toLowerCase().replaceAll(" ", "");
  const allowed = isTeamAdmin && teamRoute?.toLowerCase() === teamSlug;
  const available = liveDepartments.length ? liveDepartments.filter(isDepartmentActive).map((entry) => ({
    department: entry.name || entry.department,
    team: entry.team,
    route: `/${String(entry.route || getDepartmentRoute(entry.name || entry.department) || "").replace(/^\//, "")}`,
  })) : routes;
  const departments = Array.from(new Map(available.filter((entry) =>
    isSameDepartment(entry.team, team) &&
    !isSameDepartment(entry.department, team) &&
    /^\/[^/]+$/.test(entry.route) && canAccessDepartment(entry.department)
  ).map((entry) => [entry.department.toLowerCase().trim(), entry])).values())
    .sort((a, b) => a.department.localeCompare(b.department));
  const selected = departments.find((entry) => entry.route === department);
  const title = bulk ? "Bulk Add Workers" : "Add Worker";

  return <Layout>
    <div className="max-w-lg mx-auto qc-card p-6 space-y-4">
      <h1 className="text-2xl font-medium">{title}</h1>
      {allowed ? <>
        <p>Choose a department in {team} to continue.</p>
        <label htmlFor="worker-placement" className="block text-sm font-medium">Department</label>
        <select id="worker-placement" className="qc-input w-full" value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="">Select a department</option>
          {departments.map((entry) => <option key={entry.route} value={entry.route}>{entry.department}</option>)}
        </select>
        <button type="button" disabled={!selected} className="qc-btn-primary disabled:opacity-50" onClick={() => {
          if (selected) navigate(`/department${selected.route}/${bulk ? "bulk-add" : "add-worker"}`);
        }}>Continue to {title}</button>
      </> : <p role="alert">You cannot add workers to this team.</p>}
      <Link className="block underline" to={`/department/${encodeURIComponent(teamSlug)}/workers`}>Back to Workers</Link>
    </div>
  </Layout>;
}
