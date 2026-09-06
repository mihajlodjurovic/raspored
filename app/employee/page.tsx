import { requireRole } from "@/lib/session";
import { getArchivedShifts, getShifts } from "@/lib/store";
import { getWarnings } from "@/lib/users";
import ShiftCard, { formatDate } from "@/components/ShiftCard";

export const dynamic = "force-dynamic";

export default async function EmployeePage() {
  const session = await requireRole(["employee"]);
  const shifts = await getShifts();
  const archivedShifts = await getArchivedShifts();
  const warnings = await getWarnings();
  const myWarnings = warnings.filter((w) => w.username === session.username);

  const sorted = [...shifts].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
  );

  return (
    <div className="page">
      <div className="page-head">
        <h1>Available shifts</h1>
        <p className="muted">Find a shift that suits you and apply, or take a free day off.</p>
      </div>

      {myWarnings.length > 0 && (
        <div className="card warnings-card">
          <h2>
            My red points{" "}
            <span className={`red-points has-points`}>{myWarnings.length}</span>
          </h2>
          <p className="muted">
            You received these for cancelling shifts within 48 hours of the
            start time.
          </p>
          <ul className="warnings-list warnings-list-plain">
            {myWarnings.map((w) => (
              <li key={w.id}>
                Shift on {formatDate(w.shiftDate)} · cancelled within 48h
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="shifts-section">
        <h2>
          Upcoming schedule <span className="count">({sorted.length})</span>
        </h2>
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
      </section>

      <section className="shifts-section">
        <h2>
          Two-week archive <span className="count">({archivedShifts.length})</span>
        </h2>
        {archivedShifts.length === 0 ? (
          <div className="card">
            <p className="muted">Past shifts and free days remain here for 14 days.</p>
          </div>
        ) : (
          <div className="grid">
            {archivedShifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                view="employee"
                shift={shift}
                archived
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}