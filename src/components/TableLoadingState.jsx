import React from "react";

function TableLoadingState({ length }) {
  return (
    <tbody className="divide-y divide-gray-200 space-y-4 h-[32rem]">
      {[...Array(length)].map((_, index) => (
        <tr key={index} className="mb-4">
          {[...Array(length)].map((_, index) => (
            <td className="text-sm animate-pulse bg-gray-200 sm:pl-0 mb-4" key={index}></td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export default TableLoadingState;
