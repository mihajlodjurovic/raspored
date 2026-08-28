"use client";

import { useState, useActionState, useRef, useEffect } from "react";
import { applyToShift } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions";

export default function ApplyForm({ shiftId }: { shiftId: string }) {
  const [open, setOpen] = useState(false);

  const applyAction = async (
    _prev: ActionResult | undefined,
    formData: FormData
  ) => applyToShift(shiftId, formData);

  const [state, formAction, pending] = useActionState(applyAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setOpen(true)}
      >
        Apply
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="apply-form">
      <label className="field">
        <span>Name</span>
        <input type="text" name="name" placeholder="First name" required />
      </label>
      <label className="field">
        <span>Surname</span>
        <input type="text" name="surname" placeholder="Last name" required />
      </label>
      <label className="field">
        <span>Phone number</span>
        <input type="tel" name="phone" placeholder="+381…" required />
      </label>

      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Applying…" : "Confirm"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>

      {!state?.ok && state?.error && <p className="error">{state.error}</p>}
      {state?.ok && <p className="success">You&apos;re booked in!</p>}
    </form>
  );
}