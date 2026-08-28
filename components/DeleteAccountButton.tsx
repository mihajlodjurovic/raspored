"use client";

import { useActionState } from "react";
import { deleteAccount } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions";

export default function DeleteAccountButton({
  accountId,
  username,
}: {
  accountId: string;
  username: string;
}) {
  const action = async (_prev: ActionResult | undefined) =>
    deleteAccount(accountId);

  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !confirm(
            `Delete account "${username}"? This also removes their red points.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="btn btn-danger" disabled={pending}>
        {pending ? "Deleting…" : "Delete"}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && state.message && <p className="success">{state.message}</p>}
    </form>
  );
}