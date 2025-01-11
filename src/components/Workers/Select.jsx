import { Select } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";

export default function SelectDropdown({ options, onChange }) {
  return (
    <div>
      <div className="relative">
        <Select
          onChange={onChange}
          className={clsx(
            "block w-full border-2 rounded-lg border-slate-600 bg-white/5 py-1.5 px-3 text-sm/6",
            "focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25",
            // Make the text of each option black on Windows
            "*:text-black border-slate-900"
          )}
        >
          <option value={""}>Mark attendance</option>
          {options.map((option) => (
            <option key={option.id} value={option.id} className="bg-green-300">{option.name}</option>
          ))}
        </Select>
        <ChevronDownIcon
          className="group pointer-events-none absolute top-2.5 right-2.5 size-4 fill-white/60"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
