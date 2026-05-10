import React from "react";

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
 <div className="fixed inset-0 flex items-center justify-center backdrop-blur-xl opacity-95 z-10">
 <div className="bg-white p-6 rounded-lg shadow-lg w-96 h-96">
 <h2 className="text-xl font-bold text-center mb-4">{title}</h2>
 <div className="flex py-4">
 <label className="text-lg text-brick mt-2 mr-2">*</label>
 <input
 type="text"
 placeholder="Reason for exit"
 className="border p-3 w-full rounded-md"
 onChange={(e) =>
 setFormData({ ...formData, reasonfordelete: e.target.value })
 }
 />
 </div>
 <div className="flex py-4">
 <label className="text-lg text-brick mt-2 mr-2">*</label>
 <input
 type="text"
 placeholder="Name of requester"
 className="border p-3 w-full rounded-md"
 onChange={(e) =>
 setFormData({ ...formData, nameofrequester: e.target.value })
 }
 />
 </div>
 <div className="flex py-4">
 <label className="text-lg text-brick mt-2 mr-2">*</label>
 <input
 type="text"
 placeholder="Role of requester"
 className="border p-3 w-full rounded-md"
 onChange={(e) =>
 setFormData({ ...formData, roleofrequester: e.target.value })
 }
 />
 </div>
 <div className="flex justify-between">
 <button
 className="bg-ink-300 text-black px-4 py-2 rounded-md hover:bg-ink-400 w-full mr-2"
 onClick={onClose}
 >
 Cancel
 </button>
 <button
 className="bg-brick text-white px-4 py-2 rounded-md hover:bg-brick/80 w-full ml-2"
 onClick={onConfirm}
 >
 {isLoading ? confirmingText : confirmText}
 </button>
 </div>
 </div>
 </div>
 );
};

export default Modal;
