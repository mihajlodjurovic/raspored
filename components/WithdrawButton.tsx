"use client";

import { withdrawApplication } from "@/lib/actions";

export default function WithdrawButton({
  shiftId,
  applicantId,
}: {
  shiftId: string;
  applicantId: string;
}) {
  const action = async () => {
    await withdrawApplication(shiftId, applicantId);
  };

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Withdraw your application for this shift?")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="btn btn-outline">
        Withdraw
      </button>
    </form>
  );
}