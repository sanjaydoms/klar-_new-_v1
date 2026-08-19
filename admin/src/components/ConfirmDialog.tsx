import { useState } from "react";
import type { ReactNode } from "react";

import { Button, ErrorNotice } from "./Primitives";
import { Field, TextInput } from "./Fields";
import { Modal } from "./Modal";

/**
 * The dialog for an action that changes what customers can buy (§51).
 *
 * A reason is always required. `phrase` additionally demands the words be
 * typed — reserved for the actions that take KLAR off-sale, so that the
 * awkwardness stays meaningful. Making every confirmation this laborious
 * trains people to type through them without reading.
 *
 * The backend enforces both independently. This dialog is where it is
 * pleasant, not where it is true.
 */
export function ConfirmDialog({
  title,
  description,
  phrase,
  confirmLabel,
  variant = "danger",
  busy,
  error,
  children,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  /** When set, the caller must type this exactly before confirming. */
  phrase?: string;
  confirmLabel: string;
  variant?: "danger" | "primary";
  busy?: boolean;
  error?: string | null;
  /** Impact summary, shown above the inputs. */
  children?: ReactNode;
  onConfirm: (reason: string, typed: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");

  const phraseOk = !phrase || typed.trim().toUpperCase() === phrase.toUpperCase();
  const ready = reason.trim().length > 0 && phraseOk && !busy;

  return (
    <Modal title={title} description={description} onClose={onClose}>
      {children}

      <div className="mt-4 space-y-3">
        <Field label="Reason" hint="Recorded in the audit trail.">
          <TextInput
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you doing this?"
            autoFocus
          />
        </Field>

        {phrase && (
          <Field
            label={`Type ${phrase} to confirm`}
            hint="Deliberately awkward — this changes what customers can buy."
          >
            <TextInput
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={phrase}
              spellCheck={false}
            />
          </Field>
        )}

        {error && <ErrorNotice message={error} />}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={variant}
            disabled={!ready}
            onClick={() => onConfirm(reason.trim(), typed.trim())}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
