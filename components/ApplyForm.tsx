"use client";

import { useActionState } from "react";
import { applyToShift } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions";

export default function ApplyForm({ shiftId }: { shiftId: string }) {
  const applyAction = async (_prev: ActionResult | undefined) =>
    applyToShift(shiftId);

  const [state, formAction, pending] = useActionState(applyAction, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Apply for this shift?")) e.preventDefault();
      }}
    >
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Applying…" : "Apply"}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && state.message && <p className="success">{state.message}</p>}
    </form>
  );
}