const Summary = () => {
  const members = [
    {
      name: "Mary Precious",
      phone: "8027502020",
      birthday: "July 25",
      status: "Present",
    },
    { name: "Alex Goodnews", phone: "8130126159", status: "School/Exam" },
    { name: "Adeniran", phone: "8143124282", status: "Not Reachable" },
  ];

  return (
    <div className="p-4 bg-white rounded shadow-md max-w-lg mx-auto">
      <h2 className="text-xl font-semibold mb-4">Leadership Effectiveness</h2>
      <p className="text-gray-600 mb-2">Total Members: 3</p>
      <p className="text-gray-600 mb-4">Present: 1 (33.33%) | Absent: 2</p>
      {members.map((member, index) => (
        <div key={index} className="border-b py-2">
          <h3 className="font-medium text-gray-800">{member.name}</h3>
          <p className="text-gray-600">Phone: {member.phone}</p>
          {member.birthday && (
            <p className="text-gray-600">Birthday: {member.birthday}</p>
          )}
          <p className="text-gray-600">Status: {member.status}</p>
        </div>
      ))}
    </div>
  );
};

export default Summary;
