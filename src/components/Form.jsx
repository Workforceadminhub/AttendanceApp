import { useNavigate } from "react-router-dom";
import { teamsAndDepartments, workerRoles } from "../utils/teams";

const Form = ({ formData, setFormData, handleSubmit, isActive, isLoading }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col space-y-4 pb-8">
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
        <label className="text-lg text-transparent invisible mt-2 mr-2">
          *
        </label>
        <input
          type="text"
          placeholder="Marital Status"
          className="border p-3 w-full rounded-md"
          value={formData.maritalstatus}
          onChange={(e) =>
            setFormData({ ...formData, maritalstatus: e.target.value })
          }
        />
      </div>

      {!isActive && (
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
            <label className="text-lg text-transparent invisible mt-2 mr-2">
              *
            </label>
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
      )}
      <div className="flex">
        <label className="text-lg text-red-500 mt-2 mr-3">*</label>
        <input
          type="checkbox"
          id="nlp"
          className="mr-4 size-4 mt-2"
          checked={formData.nlp}
          onChange={(e) => setFormData({ ...formData, nlp: e.target.checked })}
        />
        <label htmlFor="nlp" className="text-lg">Sign up to serve at NLP Conference Lagos 2025</label>
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
          {isLoading ? "Registering..." : "Register"}
        </button>
      </div>
    </div>
  );
};

export default Form;
