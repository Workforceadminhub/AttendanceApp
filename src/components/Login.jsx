import { useState } from "react";
import loginService from "../services/login";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      // Query the database to check if the code exists
      const data = await loginService(code);

      if (error) {
        setError("Invalid code");
        return;
      }
      console.log(data);
      if (data) {
        setMessage("Login successful!");
        console.log("user...");
        setError("");
        sessionStorage.setItem("authUser", JSON.stringify(data));
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Something went wrong, please try again.");
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
            <label for="id" className="block text-sm font-medium text-gray-700">
              ID
            </label>
            <input
              type="text"
              id="id"
              name="id"
              placeholder="Enter your ID"
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block h-12 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <button
            onClick={handleLogin}
            className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
          >
            Login
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
          {message && <p style={{ color: "green" }}>{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default Login;
