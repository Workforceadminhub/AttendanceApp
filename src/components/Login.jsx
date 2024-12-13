const Login = () => {
  return (
    <div className="p-4 bg-white rounded shadow-md max-w-sm mx-auto">
      <h2 className="text-xl font-semibold mb-4">Login to Mark Attendance</h2>
      <input
        type="text"
        placeholder="Enter your ID"
        className="w-full p-2 border rounded mb-4"
      />
      <button className="w-full bg-blue-600 text-white py-2 rounded">
        Login
      </button>
    </div>
  );
};

export default Login;