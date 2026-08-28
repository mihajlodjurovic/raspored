import type { Applicant, Shift } from "@/lib/types";
import ApplyForm from "./ApplyForm";
import DeleteShiftButton from "./DeleteShiftButton";
import WithdrawButton from "./WithdrawButton";

export function formatDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(t: string): string {
  return t;
}

type Props =
  | { view: "admin"; shift: Shift }
  | {
      view: "employee";
      shift: Shift;
      myApplication?: Applicant; // this viewer's own application, if any
    };

function fullName(a: { name: string; surname: string }): string {
  return `${a.name} ${a.surname}`;
}

export default function ShiftCard(props: Props) {
  const { shift } = props;
  const spotsLeft = Math.max(0, shift.needed - shift.applicants.length);
  const isFull = shift.applicants.length >= shift.needed;

  return (
    <article className={`card shift-card ${isFull ? "is-full" : ""}`}>
      <div className="shift-head">
        <div>
          <h3 className="shift-date">{formatDate(shift.date)}</h3>
          <p className="shift-time">
            {shift.startTime} – {shift.endTime}
          </p>
        </div>
        <span className={`badge ${isFull ? "badge-full" : "badge-open"}`}>
          {isFull ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
        </span>
      </div>

      <p className="shift-needed">
        Needed: <strong>{shift.needed}</strong> worker{shift.needed === 1 ? "" : "s"}
      </p>

      {props.view === "admin" ? (
        <>
          {shift.applicants.length === 0 ? (
            <p className="muted">No applicants yet.</p>
          ) : (
            <ul className="applicants">
              {shift.applicants.map((a) => (
                <li key={a.id} className="applicant">
                  <span>
                    {a.name} {a.surname}
                  </span>
                  <span className="applicant-phone">{a.phone}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="card-actions">
            <DeleteShiftButton shiftId={shift.id} />
          </div>
        </>
      ) : (
        <div className="card-actions">
          {props.myApplication ? (
            <WithdrawButton
              shiftId={shift.id}
              applicantId={props.myApplication.id}
            />
          ) : isFull ? (
            <span className="muted">This shift is full.</span>
          ) : (
            <ApplyForm shiftId={shift.id} />
          )}
        </div>
      )}
    </article>
  );
}