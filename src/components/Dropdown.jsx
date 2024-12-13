import React, { forwardRef } from "react";
import clsx from "clsx";

const Select = forwardRef(
  ({
    onChange = () => {},
    value,
    className,
    inputClassName,
    label,
    secondaryLabel,
    hasErrors = false,
    error,
    disabled,
    readOnly,
    options,
    showBorder = true,
    ...rest
  }) => {
    return (
      <div className={clsx(className)}>
        {label && (
          <label className="text-sm mb-2 block text-dark/80">{label}</label>
        )}
        {secondaryLabel && (
          <label className="text-xs mb-2 block text-dark/80">
            {secondaryLabel}
          </label>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx(
            { "border border-gray-200": showBorder },
            inputClassName,
            { "!bg-gray-50 cursor-not-allowed": disabled },
            "inline-block w-full py-2 px-4 rounded-md shadow-sm bg-white focus:ring-0 focus:outline-0 h-max min-h-[44px]"
          )}
          disabled={disabled || readOnly}
          {...rest}
        >
          {options.map((option) => (
            <option
              className="whitespace-break-spaces text-wrap w-16 truncate"
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
