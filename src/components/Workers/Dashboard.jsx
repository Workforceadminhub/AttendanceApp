import DatePickerComponent from "./DatePickerComponent";
import Select from "./Select";

const stats = [
  { name: "Total strength", stat: "265" },
  { name: "Total present", stat: "102" },
  { name: "Total absent", stat: "103" },
  { name: "Total percentage", stat: "24.57%" },
];

export default function Dashboard() {
  const services = [
    { id: 1, name: "Sunday service" },
    { id: 2, name: "Wednesday service" },
  ];

  return (
    <div className="p-4">
      <h3 className="text-base font-semibold text-gray-900">Last 30 days</h3>
      <div className="flex flex-col space-y-4">
        <Select title="Assigned to" options={services} />
        <DatePickerComponent />
      </div>
      <dl className="mt-5 space-y-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="overflow-hidden rounded-lg border bg-white px-4 py-5 shadow sm:p-6"
          >
            <dt className="truncate text-sm font-medium text-gray-500">
              {item.name}
            </dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              {item.stat}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
