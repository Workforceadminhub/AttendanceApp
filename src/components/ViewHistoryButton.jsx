import React from "react";
import { useNavigate } from "react-router-dom";

function ViewHistoryButton({ link }) {
  const navigate = useNavigate();
  return (
    <button
      className="bg-blue-500 text-white rounded-lg p-2 hover:bg-blue-300"
      onClick={() => {
        navigate(link);
      }}
    >
      View History
    </button>
  );
}

export default ViewHistoryButton;
