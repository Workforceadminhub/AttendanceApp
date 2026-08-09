import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { workerRoles, filterDepartmentsForDistrictSubTeam } from "../utils/teams";
import { getEffectiveRouteList } from "../utils/routeObject";
import { fetchTeamsAndDepartmentsForFilter } from "../services/departments";
import BirthDatePicker from "./BirthDatePicker";

const Form = ({ formData, setFormData, handleSubmit, isActive, isLoading }) => {
  const navigate = useNavigate();
  const [filterData, setFilterData] = useState({
    teams: [],
    departments: [],
    departmentsByTeam: {},
  });

  useEffect(() => {
    let isMounted = true;
    fetchTeamsAndDepartmentsForFilter()
      .then((data) => {
        if (isMounted) {
          setFilterData(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const routeList = getEffectiveRouteList();
  const apiTeamList = (filterData.teams || [])
    .filter((t) => t.value !== "All")
    .map((t) => t.value);
  const teamList =
    apiTeamList.length > 0
      ? apiTeamList
      : Array.from(new Set(routeList.map((item) => item.team).filter(Boolean))).sort();

  let departmentList = [];
  if (formData.team) {
    const depts =
      filterData.departmentsByTeam?.[formData.team] ||
      filterData.departmentsByTeam?.[formData.team === "Districts" ? "District" : formData.team] ||
      [];
    let source = depts;
    if (!source.length) {
      source = routeList
        .filter(
          (r) =>
            r.team === formData.team ||
            (formData.team === "Districts" && r.team === "District") ||
            (formData.team === "District" && r.team === "Districts")
        )
        .map((r) => r.department)
        .filter(Boolean);
    }
    departmentList = filterDepartmentsForDistrictSubTeam(
      source,
      formData.team,
      formData.district_sub_team
    );
    if (formData.department && !departmentList.includes(formData.department)) {
      departmentList = [formData.department, ...departmentList];
    }
  }


  return (
    <div className="flex flex-col space-y-4 pb-8">
      <h2 className="font-bold text-center text-xl">Add New Worker</h2>
      <div className="flex">
        <label className="text-lg text-brick mt-2 mr-2">*</label>
        <input
          type="text"
          placeholder="First Name"
          className="border p-3 w-full rounded-md"
          value={formData.firstname}
          onChange={(e) =>
            setFormData({ ...formData, firstname: e.target.value })
          }
        />
      </div>
      <div className="flex">
        <label className="text-lg text-transparent mt-2 mr-2">*</label>
        <input
          type="text"
          placeholder="Middle Name"
          className="border p-3 w-full rounded-md"
          value={formData.othername}
          onChange={(e) =>
            setFormData({ ...formData, othername: e.target.value })
          }
        />
      </div>
      <div className="flex">
        <label className="text-lg text-brick mt-2 mr-2">*</label>
        <input
          type="text"
          placeholder="Last Name"
          className="border p-3 w-full rounded-md"
          value={formData.lastname}
          onChange={(e) =>
            setFormData({ ...formData, lastname: e.target.value })
          }
        />
      </div>
      <div className="flex">
        <label className="text-lg text-brick mt-2 mr-2">*</label>
        <input
          type="email"
          placeholder="Email"
          className="border p-3 w-full rounded-md"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <div className="flex">
        <label className="text-lg text-brick mt-2 mr-2">*</label>
        <input
          type="tel"
          placeholder="Phone Number (11 digits)"
          className="border p-3 w-full rounded-md"
          value={formData.phonenumber}
          onChange={(e) =>
            setFormData({
              ...formData,
              phonenumber: e.target.value.replace(/\D/g, "").slice(0, 11),
            })
          }
          maxLength={11}
        />
      </div>
      <div className="flex">
        <label className="text-lg text-brick mt-2 mr-2">*</label>
        <input
          type="text"
          placeholder="Name of Requester"
          className="border p-3 w-full rounded-md"
          value={formData.nameofrequester}
          onChange={(e) =>
            setFormData({ ...formData, nameofrequester: e.target.value })
          }
        />
      </div>
      <div className="flex flex-col space-y-5">
        <div className="flex">
          <label className="text-lg text-brick mt-2 mr-2">*</label>
          <select
            className="border p-3 w-full rounded-md bg-cream-200"
            value={formData.team}
            onChange={(e) =>
              setFormData({ ...formData, team: e.target.value })
            }
          >
            <option value="">Select team</option>
            {teamList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex">
          <label className="text-lg text-brick mt-2 mr-2">*</label>
          <select
            className="border p-3 w-full bg-cream-200 rounded-md"
            value={formData.department}
            onChange={(e) =>
              setFormData({ ...formData, department: e.target.value })
            }
          >
            <option value="">Select department</option>
            {departmentList.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
        <div className="flex">
          <label className="text-lg text-brick mt-2 mr-2">*</label>
          <select
            className="border p-3 w-full bg-cream-200 rounded-md"
            value={formData.workerrole}
            onChange={(e) =>
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
      {/* Marital Status */}
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
