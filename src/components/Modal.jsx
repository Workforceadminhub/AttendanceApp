import React from "react";
import GenericModal from "./GenericModal";

const fields = [
  ["reasonfordelete", "Reason for exit"],
  ["nameofrequester", "Name of requester"],
  ["roleofrequester", "Role of requester"],
];

const Modal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  confirmText,
  isLoading,
  confirmingText,
  formData,
  setFormData,
}) => {
  if (!isOpen) return null;

  return (
    <GenericModal isOpen={isOpen} onClose={onClose} title={title} size="small">
      <p className="text-sm text-ink-600">
        Add the required audit details before confirming this change.
      </p>

      <div className="space-y-4">
        {fields.map(([name, label]) => (
          <div key={name}>
            <label htmlFor={`exit-${name}`} className="qc-label text-ink-700">
              {label} <span className="text-brick" aria-hidden="true">*</span>
            </label>
            <input
              id={`exit-${name}`}
              name={name}
              type="text"
              required
              value={formData?.[name] || ""}
              className="qc-input"
              onChange={(event) =>
                setFormData({ ...formData, [name]: event.target.value })
              }
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-ink-200 pt-4 sm:flex-row sm:justify-end">
        <button type="button" className="qc-btn-secondary sm:min-w-24" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="qc-btn-danger sm:min-w-36"
          disabled={isLoading}
          onClick={onConfirm}
        >
          {isLoading ? confirmingText : confirmText}
        </button>
      </div>
    </GenericModal>
  );
};

export default Modal;
