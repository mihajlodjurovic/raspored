import { requireRole } from "@/lib/session";
import { getShifts } from "@/lib/store";
import ShiftCard from "@/components/ShiftCard";

export const dynamic = "force-dynamic";

export default async function EmployeePage() {
  const session = await requireRole(["employee"]);
  const shifts = await getShifts();

  const sorted = [...shifts].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
  );

  return (
    <div className="page">
      <div className="page-head">
        <h1>Available shifts</h1>
        <p className="muted">Find a shift that suits you and apply.</p>
      </div>

      {sorted.length === 0 ? (
        <div className="card">
          <p className="muted">No shifts have been posted yet. Check back later.</p>
        </div>
      ) : (
        <div className="grid">
          {sorted.map((shift) => {
            const myApp = shift.applicants.find(
              (a) => a.username === session.username
            );
            return (
              <ShiftCard
                key={shift.id}
                view="employee"
                shift={shift}
                myApplication={myApp}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}