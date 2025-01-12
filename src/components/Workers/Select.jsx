import { Fragment, useState } from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";

export default function SelectDropdown({ title, options, onChange, defaultValue }) {
  const placeholder = { id: null, name: title };
  const [selected, setSelected] = useState(defaultValue || placeholder);

  const spanColorMap = {
    Present: "bg-green-200",
    Absent: "bg-red-200",
    Online: "bg-blue-200",
    "Out of town/travelled": "bg-yellow-200",
    Work: "bg-orange-200",
    Sick: "bg-cyan-200",
    "Family issue": "bg-pink-200",
    "School exam": "bg-purple-200",
    "Not reachable": "bg-gray-200",
    Inactive: "bg-gray-300",
  };

  return (
    <div className="w-72">
      <Listbox
        value={selected}
        onChange={(value) => {
          setSelected(value);
          onChange(value);
        }}
      >
        <div className="relative mt-1">
          <ListboxButton
            className={`relative md:w-48 sm:w-48 xs:w-48 lg:w-56 cursor-default rounded-lg py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm px-2 ${
              spanColorMap[selected.name]
            }`}
          >
            <span
              className={`block truncate ${
                selected.id === null ? "text-gray-400" : ""
              }`}
            >
              {selected.name}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </ListboxButton>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions className="z-50 absolute mt-1 max-h-100 md:w-48 sm:w-48 xs:w-48 lg:w-56 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
              {[placeholder, ...options].map((option, optionIdx) => (
                <ListboxOption
                  key={optionIdx}
                  className={({ selected }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      selected ? "bg-gray-100 text-gray-900" : "text-gray-900"
                    }`
                  }
                  value={option}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate ${
                          option.id !== null ? spanColorMap[option.name] : ""
                        } rounded-2xl w-32 pl-2 py-1 ${
                          selected ? "font-medium" : "font-normal"
                        }`}
                      >
                        {option.name}
                      </span>
                      {selected && option.id !== null ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}
