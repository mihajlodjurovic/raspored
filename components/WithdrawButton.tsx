"use client";

import { useActionState } from "react";
import { withdrawApplication } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions";

export default function WithdrawButton({
  shiftId,
  applicantId,
  within48h,
}: {
  shiftId: string;
  applicantId: string;
  within48h: boolean;
}) {
  const action = async (_prev: ActionResult | undefined) =>
    withdrawApplication(shiftId, applicantId);

  const [state, formAction, pending] = useActionState(action, undefined);

  const confirmMsg = within48h
    ? "Withdraw? This shift starts within 48 hours — you'll receive a red point."
    : "Withdraw your application for this shift?";

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(confirmMsg)) e.preventDefault();
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