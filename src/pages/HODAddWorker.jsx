import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Layout from "../components/Layout";
import { toast } from "react-toastify";
import BirthDatePicker from "../components/BirthDatePicker";
import { getEffectiveRouteList, getDepartmentNameFromRoute, getDepartmentRoute } from "../utils/routeObject";
import { normalizeWorkerRole } from "../utils/teams";
import { getUserRole, canAccessDepartment } from "../utils/getUserRole";
import { addNewWorker } from "../services/workers";
import { getUser } from "../utils/getUser";
import { DROPDOWN_OPTIONS } from "../utils/sampleWorkersExcel";
import WorkerFormErrorSummary from "../components/WorkerFormErrorSummary";
import {
 focusFirstWorkerError,
 validateAuthenticatedWorker,
 workerErrorProps,
} from "../utils/workerFormValidation";

const initialWorker = {
 firstname: "",
 lastname: "",
 othername: "",
 email: "",
 phonenumber: "",
 gender: "",
 workerrole: "",
 birthdate: "",
 maritalstatus: "",
 agerange: "",
 employment: "",
 occupation: "",
 address: "",
 district_sub_team: "",
};

export default function HODAddWorker() {
 const navigate = useNavigate();
 const { departmentRoute: routeParam } = useParams();
 const decodedParam = decodeURIComponent(routeParam || "");
 const decodedDepartment = getDepartmentNameFromRoute(decodedParam) || decodedParam;

 const [worker, setWorker] = useState(initialWorker);
 const [isLoading, setIsLoading] = useState(false);
 const [formErrors, setFormErrors] = useState({});
 const [submitError, setSubmitError] = useState("");

 const departmentInfo = getEffectiveRouteList().find((r) => r.department === decodedDepartment);
 const team = departmentInfo?.team || "";

 const { isSuperAdmin, isChurchAdmin, isHOD, isTeamAdmin, isSubTeamAdmin } = getUserRole();
 const canAddWorkers =
 (isSuperAdmin || isChurchAdmin || isHOD || isTeamAdmin || isSubTeamAdmin) &&
 canAccessDepartment(decodedDepartment);

 useEffect(() => {
 setFormErrors((current) => {
 if (Object.keys(current).length === 0) return current;
 const latestErrors = validateAuthenticatedWorker(worker, {
 includePlacement: false,
 requireOccupation: true,
 requireDistrictSubTeam: ["District", "Districts"].includes(team),
 });
 return Object.fromEntries(
 Object.entries(current).filter(([field]) => latestErrors[field])
 );
 });
 setSubmitError("");
 }, [worker, team]);

 useEffect(() => {
 if (!decodedDepartment || !canAddWorkers) {
 toast.error("Access denied. You cannot add workers to this department.");
 navigate("/summary");
 }
 }, [decodedDepartment, canAddWorkers, navigate]);

 const handleSubmit = async (e) => {
 e.preventDefault();
 const nextErrors = validateAuthenticatedWorker(worker, {
 includePlacement: false,
 requireOccupation: true,
 requireDistrictSubTeam: ["District", "Districts"].includes(team),
 });
 setFormErrors(nextErrors);
 setSubmitError("");
 if (Object.keys(nextErrors).length > 0) {
 focusFirstWorkerError(nextErrors);
 return;
 }

 const phoneDigits = (worker.phonenumber || "").replace(/\D/g, "");

 setIsLoading(true);
 try {
 const authUser = getUser();
 const payload = {
 ...worker,
 email: worker.email.trim(),
 phonenumber: phoneDigits,
 department: decodedDepartment,
 team,
 workerrole: normalizeWorkerRole(worker.workerrole),
 nameofrequester: authUser?.fullname || authUser?.name || authUser?.code || "Requester",
 };
 await addNewWorker(payload);
 toast.success(
 "Worker addition request submitted. The request has been sent to your subteam head and team lead for approval. Once approved, the request would be effected."
 );
 setWorker(initialWorker);
 setFormErrors({});
 setSubmitError("");
 navigate(`/department/${getDepartmentRoute(decodedDepartment) || encodeURIComponent(decodedDepartment)}/workers`);
  } catch (err) {
    const rawMsg = err?.message || "";
    const msg = /worker\s+already\s+exist/i.test(rawMsg)
      ? "Worker already belongs to another department"
      : err?.message || "Failed to add worker.";
    setSubmitError(msg);
    toast.error(msg);
  } finally {
 setIsLoading(false);
 }
 };

 const departmentUrl = `/department/${getDepartmentRoute(decodedDepartment) || encodeURIComponent(decodedDepartment)}`;
 const workersUrl = `${departmentUrl}/workers`;

 if (!canAddWorkers) return null;

 return (
 <div className="px-4 sm:px-6 lg:px-8 py-8">
 <Header />
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
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 First Name <span className="text-brick">*</span>
 </label>
 <input
 {...workerErrorProps(formErrors, "firstname")}
 type="text"
 value={worker.firstname}
 onChange={(e) => setWorker({ ...worker, firstname: e.target.value })}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="Enter first name"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Last Name <span className="text-brick">*</span>
 </label>
 <input
 {...workerErrorProps(formErrors, "lastname")}
 type="text"
 value={worker.lastname}
 onChange={(e) => setWorker({ ...worker, lastname: e.target.value })}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="Enter last name"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">Other Name</label>
 <input
 type="text"
 value={worker.othername}
 onChange={(e) => setWorker({ ...worker, othername: e.target.value })}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="Optional"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Gender <span className="text-brick">*</span>
 </label>
 <select
 {...workerErrorProps(formErrors, "gender")}
 value={worker.gender}
 onChange={(e) => setWorker({ ...worker, gender: e.target.value })}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Gender</option>
 {DROPDOWN_OPTIONS.Gender.map((opt) => (
 <option key={opt} value={opt}>{opt}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Phone Number <span className="text-brick">*</span>
 </label>
 <input
 {...workerErrorProps(formErrors, "phonenumber")}
 type="tel"
 value={worker.phonenumber}
 onChange={(e) => {
 const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
 setWorker({ ...worker, phonenumber: digits });
 }}
 maxLength={11}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="11 digits"
 />
 </div>

  <div>
  <label className="block text-sm font-medium text-ink-700 mb-2">
  Email Address <span className="text-brick">*</span>
  </label>
  <input
  {...workerErrorProps(formErrors, "email")}
  type="email"
  value={worker.email}
  onChange={(e) => setWorker({ ...worker, email: e.target.value })}
  className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
  placeholder="Enter email address"
  />
  </div>

  {(team === "Districts" || team === "District") && (
  <div>
  <label className="block text-sm font-medium text-ink-700 mb-2">
  District/Sub-team <span className="text-brick">*</span>
  </label>
  <select
  {...workerErrorProps(formErrors, "district_sub_team")}
  value={worker.district_sub_team}
  onChange={(e) => setWorker({ ...worker, district_sub_team: e.target.value })}
  className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
  >
  <option value="">Select District/Sub-team</option>
  <option value="Pastor Biola Cluster">Pastor Biola Cluster</option>
  <option value="Pastor Isaac Cluster">Pastor Isaac Cluster</option>
  </select>
  </div>
  )}

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Worker Role <span className="text-brick">*</span>
 </label>
 <select
 {...workerErrorProps(formErrors, "workerrole")}
 value={worker.workerrole}
 onChange={(e) => setWorker({ ...worker, workerrole: e.target.value })}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Worker Role</option>
 {DROPDOWN_OPTIONS["Worker Role"].map((opt) => (
 <option key={opt} value={opt}>{opt}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Birth Date (day & month) <span className="text-brick">*</span>
 </label>
 <BirthDatePicker
 id="birthdate"
 ariaInvalid={Boolean(formErrors.birthdate)}
 ariaDescribedBy={formErrors.birthdate ? "birthdate-error" : undefined}
 value={worker.birthdate}
 onChange={(value) => setWorker({ ...worker, birthdate: value })}
 placeholder="e.g. 15th May"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Marital Status <span className="text-brick">*</span>
 </label>
 <select
 {...workerErrorProps(formErrors, "maritalstatus")}
 value={worker.maritalstatus}
 onChange={(e) => setWorker({ ...worker, maritalstatus: e.target.value })}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Marital Status</option>
 {DROPDOWN_OPTIONS["Marital Status"].map((opt) => (
 <option key={opt} value={opt}>{opt}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Age Range <span className="text-brick">*</span>
 </label>
 <select
 {...workerErrorProps(formErrors, "agerange")}
 value={worker.agerange}
 onChange={(e) => setWorker({ ...worker, agerange: e.target.value })}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Age Range</option>
 {DROPDOWN_OPTIONS["Age Range"].map((opt) => (
 <option key={opt} value={opt}>{opt}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Employment Status <span className="text-brick">*</span>
 </label>
 <select
 {...workerErrorProps(formErrors, "employment")}
 value={worker.employment}
 onChange={(e) => setWorker({ ...worker, employment: e.target.value })}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 >
 <option value="">Select Employment Status</option>
 {DROPDOWN_OPTIONS["Employment Status"].map((opt) => (
 <option key={opt} value={opt}>{opt}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Occupation <span className="text-brick">*</span>
 </label>
 <input
 {...workerErrorProps(formErrors, "occupation")}
 type="text"
 value={worker.occupation}
 onChange={(e) => setWorker({ ...worker, occupation: e.target.value })}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="Enter occupation"
 />
 </div>

 <div className="md:col-span-2">
 <label className="block text-sm font-medium text-ink-700 mb-2">
 Address <span className="text-brick">*</span>
 </label>
 <textarea
 {...workerErrorProps(formErrors, "address")}
 value={worker.address}
 onChange={(e) => setWorker({ ...worker, address: e.target.value })}
 className="w-full px-3 py-2 border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ink-900/10"
 placeholder="Enter address"
 rows={3}
 />
 </div>
 </div>

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
