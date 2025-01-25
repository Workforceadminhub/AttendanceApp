import React from "react";
import Select from "react-select";

export default function ReactSelectDropdown({
  title,
  options,
  onChange,
  defaultValue,
  disabled = false,
}) {
  // Map for assigning background colors to options
  const colorMap = {
    Present: "#c6f6d5",
    Absent: "#fed7d7",
    Online: "#bee3f8",
    "Out of town/travelled": "#fefcbf",
    Work: "#fbd38d",
    Sick: "#c4f1f9",
    "Family issue": "#fbb6ce",
    "School exam": "#d6bcfa",
    "Not reachable": "#e2e8f0",
    Inactive: "#e2e2e2",
  };

  // Customize the styles for react-select
  const customStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: disabled ? "#e2e8f0" : "#ffffff",
      borderColor: state.isFocused ? "#3182ce" : base.borderColor,
      boxShadow: state.isFocused ? "0 0 0 2px rgba(66, 153, 225, 0.6)" : base.boxShadow,
      cursor: disabled ? "not-allowed" : "default",
    }),
    option: (base, { data, isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isSelected
        ? colorMap[data.label]
        : isFocused
        ? "#edf2f7"
        : "#ffffff",
      backgroundColor: isSelected
        ? colorMap[data.label]
        : isFocused
        ? "#edf2f7"
        : colorMap[data.label],
      color: "#1a202c",
      padding: "10px",
    }),
    singleValue: (base, { data }) => ({
      ...base,
      backgroundColor: colorMap[data.label],
      borderRadius: "4px",
      padding: "4px 8px",
      color: "#1a202c",
    }),
  };

  // Prepare options for react-select


  // Default placeholder
  const placeholderOption = { value: null, label: title };

  return (
    <div className="w-72">
      <Select
        options={[placeholderOption, ...options]}
        onChange={(selectedOption) => onChange(selectedOption)}
        defaultValue={defaultValue ? { value: defaultValue.id, label: defaultValue.name } : placeholderOption}
        isDisabled={disabled}
        placeholder={title}
        styles={customStyles}
        isClearable={true}
      />
    </div>
  );
}