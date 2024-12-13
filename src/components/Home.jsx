const Dashboard = () => {
  return (
    <div className="p-4 bg-white rounded shadow-md max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Sunday Service Attendance Summary</h2>
      <p className="text-gray-600">Date: 05/12/2024</p>
      <p className="text-gray-600">Total Strength: 265</p>
      <p className="text-gray-600">Total Present: 162</p>
      <p className="text-gray-600">Total Absent: 103</p>
      <p className="text-gray-600">Attendance Percentage: 61.13%</p>
    </div>
  );
};

export default Dashboard;