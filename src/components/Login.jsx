import { useState, useEffect } from "react";
import loginService from "../services/login";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

const Login = () => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("session") === "expired") {
      toast.warn("Your session has expired. Please log in again.");
    }
  }, [searchParams]);

  const handleKeyPress = (event) => {
    // look for the `Enter` keyCode
    if (event.keyCode === 13 || event.which === 13) {
      handleLogin()
    }
  }

  const handleLogin = async () => {
    try {
      // Query the database to check if the code exists (always trim spaces)
      setIsLoading(true);
      const data = await loginService(code.trim());
      if (data.accessToken) {
        // Phase 7: Store permissionLevel and assignedDepartments (from user or top-level response)
        const authUser = {
          ...data.user,
          permissionLevel: data.permissionLevel ?? data.user?.permissionLevel,
          assignedDepartments: data.assignedDepartments ?? data.user?.assignedDepartments ?? [],
        };
        sessionStorage.setItem("authUser", JSON.stringify(authUser));
        sessionStorage.setItem("accessToken", data.accessToken);
        // Redirect users based on role/department
        const isSuperAdmin =
          authUser.department === "Super Admin" ||
          authUser.permissionLevel === "SUPER_ADMIN";
        const isChurchAdmin =
          authUser.department === "Church Admin" ||
          authUser.permissionLevel === "CHURCH_ADMIN";

        if (isSuperAdmin) {
          navigate("/overview/super-admin");
        } else if (isChurchAdmin) {
          // Church Admin uses shared attendance dashboard as home
          navigate("/attendance/dashboard");
        } else if (authUser.route) {
          navigate(`/dashboard${authUser.route}`);
        } else {
          navigate("/attendance/dashboard");
        }
      }
      setIsLoading(false);
    } catch (err) {
      toast.error(err.message || "Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 w-[700px] h-[250px]">
        <h1 className="text-2xl font-bold text-center mb-6">
          Login to Mark Attendance
        </h1>
        <div>
          <div className="mb-4">
            <label htmlFor="id" className="block text-sm font-medium text-gray-700">
              ID
            </label>
            <input
              type="text"
              id="id"
              name="id"
              placeholder="Enter your ID"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onBlur={() => setCode((c) => c.trimEnd())}
              onKeyDown={handleKeyPress}
              className="mt-1 pl-2 block h-12 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleLogin}
            onKeyDown={handleKeyPress}
            className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
