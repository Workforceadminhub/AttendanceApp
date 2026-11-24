import { createContext, useCallback, useContext, useRef, useState } from "react";
import GenericModal from "../GenericModal";

const ConfirmContext = createContext(null);

/**
 * Accessible replacement for window.confirm / window.prompt.
 *   const confirm = useConfirm();
 *   if (await confirm({ title, message, confirmLabel, danger, requireText })) { ... }
 * `requireText` makes the user type that exact phrase before the confirm button enables.
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    resolver.current?.(false);
    setTyped("");
    setRequest(options);
    setOpen(true);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpen(false);
  };

  const blocked = Boolean(request?.requireText) && typed !== request.requireText;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <GenericModal isOpen={open} onClose={() => settle(false)} title={request?.title ?? "Confirm"} size="small">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!blocked) settle(true);
          }}
        >
          {request?.message && <p className="text-sm text-ink-700">{request.message}</p>}
          {request?.requireText && (
            <div>
              <label htmlFor="confirm-phrase" className="qc-label text-ink-700">
                Type {request.requireText} to confirm
              </label>
              <input
                id="confirm-phrase"
                name="confirm-phrase"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                data-autofocus
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                className="qc-input"
              />
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="qc-btn-secondary" data-autofocus={request?.requireText ? undefined : true} onClick={() => settle(false)}>
              Cancel
            </button>
            <button type="submit" disabled={blocked} className={request?.danger ? "qc-btn-danger" : "qc-btn-primary"}>
              {request?.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </form>
      </GenericModal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside ConfirmProvider");
  return confirm;
}
