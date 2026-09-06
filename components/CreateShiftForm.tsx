"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createShift } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions";

// Time slots every 30 minutes across the day: 00:00 … 23:30
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ["00", "30"]) {
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${m}`);
  }
}

export default function CreateShiftForm() {
  const [isFreeDay, setIsFreeDay] = useState(false);
  const createAction = async (
    _prev: ActionResult | undefined,
    formData: FormData
  ) => {
    const result = await createShift(formData);
    if (result.ok) setIsFreeDay(false);
    return result;
  };

  const [state, formAction, pending] = useActionState(createAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="card form">
      <h2>Create a new schedule entry</h2>

      <label className="field">
        <span>Date</span>
        <input type="date" name="date" min={today} required />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Start time</span>
          <select name="startTime" defaultValue="08:00" required>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>End time</span>
          <select name="endTime" defaultValue="16:00" required>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="checkbox-field">
        <input
          type="checkbox"
          name="type"
          value="freeDay"
          checked={isFreeDay}
          onChange={(event) => setIsFreeDay(event.target.checked)}
        />
        <span>This is a free day (no workers needed)</span>
      </label>

      {!isFreeDay && (
        <label className="field">
          <span>Number of workers needed</span>
          <input type="number" name="needed" min={1} defaultValue={1} required />
        </label>
      )}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Creating…" : isFreeDay ? "Create free day" : "Create shift"}
      </button>

      {!state?.ok && state?.error && <p className="error">{state.error}</p>}
      {state?.ok && <p className="success">{state.message}</p>}
    </form>
  );
}