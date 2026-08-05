import { useNavigate } from "react-router-dom";
import { workerRoles } from "../utils/teams";
import { getEffectiveRouteList } from "../utils/routeObject";
import BirthDatePicker from "./BirthDatePicker";

const Form = ({ formData, setFormData, handleSubmit, isActive, isLoading }) => {
 setFormData({ ...formData, workerrole: e.target.value })
 }
 >
 <option value="">Select Role</option>
 {workerRoles.map((role) => (
 <option key={role} value={role}>
 {role}
 </option>
 ))}
 </select>
 </div>
 </div>
 <div className="flex">
 <label className="text-lg text-brick mt-2 mr-2">*</label>
 <select
 className="border p-3 w-full rounded-md"
 value={formData.gender || ""}
 onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
 >
 <option value="">Select Gender</option>
 <option value="Male">Male</option>
 <option value="Female">Female</option>
 </select>
 </div>
 {/* Marital Status (Updated) */}
 <div className="flex">
 <label className="text-lg text-brick mt-2 mr-2">*</label>
 <select
 className="border p-3 w-full rounded-md"
 value={formData.maritalstatus || ""}
 onChange={(e) =>
 setFormData({ ...formData, maritalstatus: e.target.value })
 }
 >
 <option value="">Select Marital Status</option>
 <option value="Single">Single</option>
 <option value="Married">Married</option>
 </select>
 </div>
 {/* Date of Birth */}
 <div className="flex">
 <label className="text-lg text-brick mt-2 mr-2">*</label>
 <BirthDatePicker
 value={formData.birthdate || ""}
 onChange={(value) => setFormData({ ...formData, birthdate: value })}
 placeholder="Select birth date (e.g. 12th January)"
 className="w-full"
 />
 </div>
 {/* Age Range */}
 <div className="flex">
 <label className="text-lg text-brick mt-2 mr-2">*</label>
 <select
 className="border p-3 w-full rounded-md"
 value={formData.agerange || ""}
 onChange={(e) =>
 setFormData({ ...formData, agerange: e.target.value })
 }
 >
 <option value="">Select Age Range</option>
 <option value="18-25">18-25</option>
 <option value="26-30">26-30</option>
 <option value="31-35">31-35</option>
 <option value="36-40">36-40</option>
 <option value="41-45">41-45</option>
 <option value="46-50">46-50</option>
 <option value="51 & Above">51 & Above</option>
 </select>
 </div>
 {/* Employment */}
 <div className="flex">
 <label className="text-lg text-brick mt-2 mr-2">*</label>
 <select
 className="border p-3 w-full rounded-md"
 value={formData.employment || ""}
 onChange={(e) =>
 setFormData({ ...formData, employment: e.target.value })
 }
 >
 <option value="">Select Employment Status</option>
 <option value="Employed">Employed</option>
 <option value="Self-employed">Self-employed</option>
 <option value="Student">Student</option>
 <option value="Unemployed">Unemployed</option>
 </select>
 </div>
 <div className="flex justify-between space-x-3">
 <label className="text-lg text-transparent invisible mt-2">*</label>
 <button
 className="bg-brick text-white p-4 mt-4 w-full rounded-md hover:bg-brick/80"
 onClick={() => navigate("/")}
 >
 Cancel
 </button>
 <button
 className="bg-ink-900 text-white p-4 mt-4 w-full rounded-md hover:bg-blue-400"
 onClick={handleSubmit}
 >
 {isLoading ? "Adding..." : "Add New Worker"}
 </button>
 </div>
 </div>
 );
};

export default Form;
