"use client";

import { useActionState } from "react";
import { addWorkerToShift } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions";

export default function AddWorkerForm({
  shiftId,
  employees,
}: {
  shiftId: string;
  employees: { username: string; label: string }[];
}) {
  const addAction = async (
    _prev: ActionResult | undefined,
    formData: FormData
  ) => {
    const username = String(formData.get("username") ?? "");
    return addWorkerToShift(shiftId, username);
  };

  const [state, formAction, pending] = useActionState(addAction, undefined);

  return (
    <form action={formAction} className="add-worker-form">
      <select name="username" defaultValue={employees[0]?.username} required>
        {employees.map((e) => (
          <option key={e.username} value={e.username}>
            {e.label}
          </option>
        ))}
      </select>
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "Adding…" : "Add worker"}
      </button>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && state.message && <p className="success">{state.message}</p>}
    </form>
  );
}