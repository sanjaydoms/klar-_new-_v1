import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * A modal.
 *
 * Escape closes it and the backdrop click does not — a half-typed confirmation
 * phrase should not be lost to a stray click beside the dialog, but the
 * keyboard route out must always exist.
 */
export function Modal({
  title,
  description,
  onClose,
  children,
  width = "max-w-lg",
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6 backdrop-blur-sm">
      <div
        className={`mt-16 w-full ${width} rounded-xl border border-ink-800 bg-ink-900 shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-800 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink-50">{title}</h2>
            {description && (
              <p className="mt-1 text-[13px] text-ink-400">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-ink-400 hover:bg-ink-850 hover:text-ink-200"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
