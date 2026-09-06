import type { Shift } from "@/lib/types";

type Day = { iso: string; label: string; isToday: boolean };
type Week = { label: string; days: Day[] };

// Current and next week (Monday → Sunday), using UTC dates to match the rest
// of the app (shift dates are plain YYYY-MM-DD strings).
function weeks(): Week[] {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const mondayOffset = (now.getUTCDay() + 6) % 7; // days since Monday
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset)
  );
  return [0, 7].map((weekOffset, weekIndex) => {
    const weekStart = new Date(monday);
    weekStart.setUTCDate(monday.getUTCDate() + weekOffset);
    return {
      label: weekIndex === 0 ? "This week" : "Next week",
      days: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setUTCDate(weekStart.getUTCDate() + i);
        const iso = d.toISOString().slice(0, 10);
        return {
          iso,
          label: d.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
          }),
          isToday: iso === todayIso,
        };
      }),
    };
  });
}

function workerNames(shift: Shift): string {
  return shift.applicants.map((a) => `${a.name} ${a.surname}`).join(", ");
}

function WeekList({ week, shifts }: { week: Week; shifts: Shift[] }) {
  return (
    <div className="week-group">
      <h3 className="week-heading">{week.label}</h3>
      <div className="week-days">
        {week.days.map((day) => {
          const entries = shifts.filter((s) => s.date === day.iso);
          return (
            <div key={day.iso} className={`week-day ${day.isToday ? "is-today" : ""}`}>
              <div className="week-day-head">
                <span className="week-day-label">{day.label}</span>
                {day.isToday && <span className="badge badge-today">Today</span>}
              </div>
              {entries.length === 0 ? (
                <p className="week-empty">No schedule</p>
              ) : (
                <ul className="week-entries">
                  {entries.map((s) => (
                    <li
                      key={s.id}
                      className={`week-entry ${s.type === "freeDay" ? "week-entry-free" : ""}`}
                    >
                      {s.type === "freeDay" ? (
                        <>
                          <span className="week-entry-title">Free day</span>
                          <span className="week-entry-who">
                            {s.applicants.length > 0
                              ? `${workerNames(s)} off`
                              : "No one yet"}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="week-entry-title">
                            {s.startTime} – {s.endTime}
                          </span>
                          <span className="week-entry-who">
                            {s.applicants.length > 0
                              ? `${workerNames(s)} working`
                              : "No one assigned"}
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WeekSchedule({ shifts }: { shifts: Shift[] }) {
  const allWeeks = weeks();

  return (
    <aside className="card week-schedule">
      <h2>Schedule</h2>
      {allWeeks.map((week) => (
        <WeekList key={week.label} week={week} shifts={shifts} />
      ))}
    </aside>
  );
}