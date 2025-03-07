import React from "react";
import { useNavigate } from "react-router-dom";

function ViewHistoryButton({ link, label, color = "bg-blue-500" }) {
  const navigate = useNavigate();
  return (
    <button
      className={`${color} text-white rounded-lg p-2 hover:bg-blue-300`}
      onClick={() => {
        navigate(link);
      }}
    >
      {label}
    </button>
  );
}

export default ViewHistoryButton;
