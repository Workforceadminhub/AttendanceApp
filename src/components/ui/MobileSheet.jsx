import { Dialog, DialogPanel } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

/**
 * MobileSheet - bottom sheet for filters, dropdowns, and modals on mobile.
 *
 * Slide-up animation. Respects safe-area-inset-bottom.
 * Use this in place of centered modals on small screens, or as the mobile
 * presentation of GenericModal.
 *
 * Above `md:` breakpoint, callers can render their desktop UI separately;
 * this component is intentionally mobile-first.
 */
export default function MobileSheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-ink-900/40 backdrop-blur-[2px] animate-fade-in"
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 bottom-0 flex justify-center">
        <DialogPanel
          className={clsx(
            "w-full max-w-2xl bg-cream border-t border-ink-200 rounded-t-xl",
            "animate-sheet-up flex flex-col max-h-[90vh]",
            className
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* Grab handle */}
          <div className="pt-2.5 pb-1 flex justify-center">
            <span className="block w-10 h-1 rounded-full bg-ink-200" />
          </div>

          {title && (
            <div className="px-5 pb-3 pt-1 flex items-center justify-between border-b border-ink-200">
              <h2 className="text-base font-semibold text-ink-900">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2 -mr-2 text-ink-500 hover:text-ink-900 rounded-md hover:bg-cream-200 min-h-touch min-w-touch flex items-center justify-center"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer && (
            <div className="px-5 py-3 border-t border-ink-200 bg-white">
              {footer}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
