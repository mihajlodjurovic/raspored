"use client";

import { removeWorkerFromShift } from "@/lib/actions";

export default function RemoveApplicantButton({
  shiftId,
  applicantId,
}: {
  shiftId: string;
  applicantId: string;
}) {
  const action = async () => {
    await removeWorkerFromShift(shiftId, applicantId);
  };

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Remove this worker from the schedule entry?")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="btn btn-outline btn-sm">
        Remove
      </button>
    </form>
  );
}