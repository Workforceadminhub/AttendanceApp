import { useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import { getEffectiveRouteList, getDepartmentNameFromRoute, getDepartmentRoute } from "../utils/routeObject";
import { normalizeWorkerRole } from "../utils/teams";
import { getUserRole, canAccessDepartment } from "../utils/getUserRole";
import { addNewWorker } from "../services/workers";
import { getUser } from "../utils/getUser";
import WorkerFormErrorSummary from "../components/WorkerFormErrorSummary";
import { useAddWorkerForm } from "../hooks/useAddWorkerForm";
import WorkerFormFields from "../components/Workers/WorkerFormFields";

const HOD_VALIDATION = {
 includePlacement: false,
 requireOccupation: true,
 requireDistrictSubTeam: false,
};

export default function HODAddWorker() {
 const navigate = useNavigate();
 const { departmentRoute: routeParam } = useParams();
 const decodedParam = decodeURIComponent(routeParam || "");
 const decodedDepartment = getDepartmentNameFromRoute(decodedParam) || decodedParam;

 const departmentInfo = getEffectiveRouteList().find((r) => r.department === decodedDepartment);
 const team = departmentInfo?.team || "";

 const { isSuperAdmin, isChurchAdmin, isHOD, isTeamAdmin, isSubTeamAdmin } = getUserRole();
 const canAddWorkers =
 (isSuperAdmin || isChurchAdmin || isHOD || isTeamAdmin || isSubTeamAdmin) &&
 canAccessDepartment(decodedDepartment);

 useEffect(() => {
 if (!decodedDepartment || !canAddWorkers) {
 toast.error("Access denied. You cannot add workers to this department.");
 navigate("/summary");
 }
 }, [decodedDepartment, canAddWorkers, navigate]);

 const {
 worker,
 setWorker,
 visibleErrors: formErrors,
 submitError,
 isSubmitting: isLoading,
 handleSubmit,
 } = useAddWorkerForm({
 validationOptions: HOD_VALIDATION,
 send: async (values) => {
 const authUser = getUser();
 // The department is fixed by the page, so only the district cluster field is sent.
 const { cluster: _cluster, ...fields } = values;
 await addNewWorker({
 ...fields,
 email: values.email.trim(),
 phonenumber: (values.phonenumber || "").replace(/\D/g, ""),
 department: decodedDepartment,
 team,
 workerrole: normalizeWorkerRole(values.workerrole),
 nameofrequester: authUser?.fullname || authUser?.name || authUser?.email || authUser?.department || "Requester",
 });
 toast.success(
 "Worker addition request submitted. The request has been sent to your subteam head and team lead for approval. Once approved, the request would be effected."
 );
 navigate(`/department/${getDepartmentRoute(decodedDepartment) || encodeURIComponent(decodedDepartment)}/workers`);
 },
 });

 const departmentUrl = `/department/${getDepartmentRoute(decodedDepartment) || encodeURIComponent(decodedDepartment)}`;
 const workersUrl = `${departmentUrl}/workers`;

 if (!canAddWorkers) return null;

 return (
 <div className="px-4 sm:px-6 lg:px-8 py-8">
 <Layout>
 <div className="max-w-4xl mx-auto">
 <div className="mb-6">
 <div className="flex items-center gap-2 text-sm text-ink-500 mb-1">
 <Link to="/summary" className="hover:underline">
 Summary
 </Link>
 <span>/</span>
 <Link to={departmentUrl} className="hover:underline">
 {decodedDepartment}
 </Link>
 <span>/</span>
 <Link to={workersUrl} className="hover:underline">
 Workers
 </Link>
 <span>/</span>
 <span className="font-semibold text-ink-900">Add Worker</span>
 </div>
 </div>

 <div className="bg-white rounded-lg shadow border p-6">
 <h1 className="text-2xl font-bold text-ink-900 mb-6">Add Worker</h1>

 <form onSubmit={handleSubmit} noValidate className="worker-form space-y-6">
 <WorkerFormErrorSummary errors={formErrors} submitError={submitError} />
 <WorkerFormFields
 worker={worker}
 onChange={setWorker}
 errors={formErrors}
 team={team}
 occupationRequired
 />

 <div className="flex justify-end gap-3 pt-4 border-t border-ink-200">
 <Link
 to={workersUrl}
 className="inline-flex items-center justify-center min-w-[140px] px-6 py-2.5 rounded-lg text-sm font-medium text-ink-700 bg-white border border-ink-300 hover:bg-cream"
 >
 Cancel
 </Link>
 <button
 type="submit"
 disabled={isLoading}
 className="inline-flex items-center justify-center min-w-[140px] px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-forest hover:bg-forest/80 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isLoading ? "Adding..." : "Add Worker"}
 </button>
 </div>
 </form>
 </div>
 </div>
 </Layout>
 </div>
 );
}
