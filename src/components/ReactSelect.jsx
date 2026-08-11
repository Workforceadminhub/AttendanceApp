import React from "react";
import Select from "react-select";

export default function ReactSelectDropdown({
  title,
  options,
  onChange,
  defaultValue,
  value,
  placeholder,
  className = "w-full min-w-0 sm:w-44 md:w-52 lg:w-64 xl:w-64",
  disabled = false,
  isClearable = true,
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
    menu: (base) => ({
      ...base,
      zIndex: 999999,
      maxHeight: "220px",
      overflowY: "auto",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 999999,
    }),
    menuList: (base) => ({
      ...base,
      maxHeight: "200px",
      overflowY: "auto",
      padding: "4px",
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
      borderRadius: "4px",
      margin: "2px 0",
      cursor: "pointer",
    }),
    singleValue: (base, { data }) => ({
      ...base,
      backgroundColor: colorMap[data?.label],
      borderRadius: "8px",
      padding: "4px 8px",
      color: "#1a202c",
    }),
  };

  return (
    <div className={className}>
      <Select
        options={options}
        onChange={(selectedOption) => onChange(selectedOption)}
        value={value}
        defaultValue={defaultValue}
        isDisabled={disabled}
        placeholder={placeholder || title}
        styles={customStyles}
        isClearable={isClearable}
        menuPlacement="auto"
        menuPosition="fixed"
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        maxMenuHeight={220}
      />
    </div>
  );
}
