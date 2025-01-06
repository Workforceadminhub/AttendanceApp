const Login = () => {
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
              className="mt-1 block h-12 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
