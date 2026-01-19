import { useNavigate } from "react-router-dom";
import { teamsAndDepartments, workerRoles } from "../utils/teams";
import BirthDatePicker from "./BirthDatePicker";

const Form = ({ formData, setFormData, handleSubmit, isActive, isLoading }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col space-y-4 pb-8">
      <h2 className="font-bold text-center text-xl">Add New Worker</h2>
      <div className="flex">
        <label className="text-lg text-red-500 mt-2 mr-2">*</label>
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
        <label className="text-lg text-red-500 mt-2 mr-2">*</label>
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
        <label className="text-lg text-red-500 mt-2 mr-2">*</label>
        <input
          type="email"
          placeholder="Email"
          className="border p-3 w-full rounded-md"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <div className="flex">
        <label className="text-lg text-red-500 mt-2 mr-2">*</label>
        <input
          type="tel"
          placeholder="Phone Number"
          className="border p-3 w-full rounded-md"
          value={formData.phonenumber}
          onChange={(e) =>
            setFormData({ ...formData, phonenumber: e.target.value })
          }
        />
      </div>
      <div className="flex">
        <label className="text-lg text-red-500 mt-2 mr-2">*</label>
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
      {/* {!isActive && ( */}
        <div className="flex flex-col space-y-5">
          <div className="flex">
            <label className="text-lg text-red-500 mt-2 mr-2">*</label>
            <select
              className="border p-3 w-full rounded-md bg-gray-100"
              value={formData.team}
              onChange={(e) =>
                setFormData({ ...formData, team: e.target.value })
              }
            >
              <option value="">Select team</option>
              {teamsAndDepartments.map((item) => (
                <option key={item.team} value={item.team}>
                  {item.team}
                </option>
              ))}
            </select>
          </div>
          <div className="flex">
            <label className="text-lg text-red-500 mt-2 mr-2">*</label>
            <select
              className="border p-3 w-full bg-gray-100 rounded-md"
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
            >
              <option value="">Select department</option>
              {teamsAndDepartments
                .find((item) => item.team === formData.team)
                ?.department.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex">
          <label className="text-lg text-red-500 mt-2 mr-2">*</label>
            <select
              className="border p-3 w-full bg-gray-100 rounded-md"
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
        <label className="text-lg text-red-500 mt-2 mr-2">*</label>
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
        <label className="text-lg text-red-500 mt-2 mr-2">*</label>
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
        <label className="text-lg text-red-500 mt-2 mr-2">*</label>
        <BirthDatePicker
          value={formData.birthdate || ""}
          onChange={(value) => setFormData({ ...formData, birthdate: value })}
          placeholder="Select birth date (e.g. 12th January)"
          className="w-full"
        />
      </div>
      {/* Age Range */}
      <div className="flex">
        <label className="text-lg text-red-500 mt-2 mr-2">*</label>
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
        <label className="text-lg text-red-500 mt-2 mr-2">*</label>
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
          className="bg-red-500 text-white p-4 mt-4 w-full rounded-md hover:bg-red-400"
          onClick={() => navigate("/")}
        >
          Cancel
        </button>
        <button
          className="bg-blue-500 text-white p-4 mt-4 w-full rounded-md hover:bg-blue-400"
          onClick={handleSubmit}
        >
          {isLoading ? "Adding..." : "Add New Worker"}
        </button>
      </div>
    </div>
  );
};

export default Form;
