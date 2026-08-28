import { requireRole } from "@/lib/session";
import { getShifts } from "@/lib/store";
import CreateShiftForm from "@/components/CreateShiftForm";
import ShiftCard from "@/components/ShiftCard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireRole(["admin"]);
  const shifts = await getShifts();

  const sorted = [...shifts].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
  );

  return (
    <div className="page">
      <div className="page-head">
        <h1>Admin panel</h1>
        <p className="muted">Welcome back, {session.username}. Create shifts and review applicants.</p>
      </div>

      <CreateShiftForm />

      <section className="shifts-section">
        <h2>
          Shifts <span className="count">({sorted.length})</span>
        </h2>
        {sorted.length === 0 ? (
          <div className="card">
            <p className="muted">No shifts yet. Create your first one above.</p>
          </div>
        ) : (
          <div className="grid">
            {sorted.map((shift) => (
              <ShiftCard key={shift.id} view="admin" shift={shift} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}