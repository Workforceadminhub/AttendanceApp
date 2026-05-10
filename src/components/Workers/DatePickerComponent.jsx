import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function DatePickerComponent() {
  const [startDate, setStartDate] = useState(new Date());
  return (
      <DatePicker
        selected={startDate}
        onChange={(date) => setStartDate(date)}
        className="border-2 w-full max-w-md border-ink-300 rounded-md p-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink-900"
        placeholderText="Select date"
        showIcon
      />
  );
}
