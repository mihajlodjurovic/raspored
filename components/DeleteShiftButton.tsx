"use client";

import { removeShift } from "@/lib/actions";

export default function DeleteShiftButton({ shiftId }: { shiftId: string }) {
  const action = async () => {
    await removeShift(shiftId);
  };

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Delete this shift? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="btn btn-danger">
        Delete
      </button>
    </form>
  );
}