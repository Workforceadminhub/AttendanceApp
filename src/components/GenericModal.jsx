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
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4 sm:p-6">
      <div className={`bg-white p-6 rounded-lg shadow-xl ${sizeClasses[size]} max-h-[90vh] flex flex-col my-auto`}>
        <div className="flex justify-between items-center pb-3 border-b border-ink-100 mb-4 shrink-0">
          <h2 className="text-xl font-bold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            type="button"
            className="text-ink-400 hover:text-ink-600 transition-colors p-1 rounded-md hover:bg-cream-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default GenericModal;
