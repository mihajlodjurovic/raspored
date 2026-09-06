"use client";

import { useActionState } from "react";
import { withdrawApplication } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions";

export default function WithdrawButton({
  shiftId,
  applicantId,
  noun = "shift",
}: {
  shiftId: string;
  applicantId: string;
  noun?: string;
}) {
  const action = async (_prev: ActionResult | undefined) =>
    withdrawApplication(shiftId, applicantId);

  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Withdraw your application for this ${noun}?`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="btn btn-outline" disabled={pending}>
        {pending ? "Withdrawing…" : "Withdraw"}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && state.message && <p className="success">{state.message}</p>}
    </form>
  );
}