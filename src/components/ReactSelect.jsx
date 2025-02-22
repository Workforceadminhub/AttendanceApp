import React from "react";
import Select from "react-select";

export default function ReactSelectDropdown({
  title,
  options,
  onChange,
  defaultValue,
  className = "sm:w-44 xs:w-40 md:w-52 lg:w-64 xl:w-64",
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
      borderRadius: "10px",
      backgroundColor: disabled ? "#fbfbfc" : "#ffffff",
      borderColor: state.isFocused ? "#3182ce" : base.borderColor,
      boxShadow: state.isFocused
        ? "0 0 0 2px rgba(66, 153, 225, 0.6)"
        : base.boxShadow,
      cursor: disabled ? "not-allowed" : "default",
    }),
    option: (base, { data, isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isSelected
        ? colorMap[data?.label]
        : isFocused
        ? "#edf2f7"
        : colorMap[data?.label],
      color: "#1a202c",
      width: isSelected ? "100%" : base.width,
      padding: "10px",
    }),
    singleValue: (base, { data }) => ({
      ...base,
      backgroundColor: colorMap[data?.label],
      borderRadius: "8px",
      padding: "4px 8px",
      color: "#1a202c",
    }),
  };

  // Default placeholder
  const placeholderOption = { value: null, label: title };

  return (
    <div className={className}>
      <Select
        options={[placeholderOption, ...options]}
        onChange={(selectedOption) => onChange(selectedOption)}
        defaultValue={
          defaultValue
            ? { value: defaultValue.value, label: defaultValue.label }
            : placeholderOption
        }
        isDisabled={disabled}
        placeholder={title}
        styles={customStyles}
        isClearable={true}
      />
    </div>
  );
}
