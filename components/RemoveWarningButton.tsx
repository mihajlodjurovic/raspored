"use client";

import { useActionState } from "react";
import { removeRedPoint } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions";

export default function RemoveWarningButton({ warningId }: { warningId: string }) {
  const action = async (_prev: ActionResult | undefined) =>
    removeRedPoint(warningId);

  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction}>
      <button
        type="submit"
        className="btn btn-ghost btn-sm"
        disabled={pending}
        title="Remove this red point"
      >
        Remove
      </button>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}