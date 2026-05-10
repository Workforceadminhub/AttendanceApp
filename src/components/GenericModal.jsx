import React from "react";

const GenericModal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "medium"
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    small: "w-96 max-w-[90vw]",
    medium: "w-[500px] max-w-[90vw]",
    large: "w-[700px] max-w-[90vw]"
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className={`bg-white p-6 rounded-lg shadow-xl ${sizeClasses[size]} max-h-[90vh] overflow-visible`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4 overflow-visible">
          {children}
        </div>
      </div>
    </div>
  );
};

export default GenericModal;
