"use client";

import { removeShift } from "@/lib/actions";

export default function DeleteShiftButton({
  shiftId,
  label = "Delete shift",
}: {
  shiftId: string;
  label?: string;
}) {
  const action = async () => {
    await removeShift(shiftId);
  };

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Delete this schedule entry? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="btn btn-danger">
        {label}
      </button>
    </form>
  );
}