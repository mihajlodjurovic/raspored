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
  | { view: "admin"; shift: Shift; archived?: boolean }
  | {
      view: "employee";
      shift: Shift;
      myApplication?: Applicant; // this viewer's own application, if any
      archived?: boolean;
    };

function fullName(a: { name: string; surname: string }): string {
  return `${a.name} ${a.surname}`;
}

export default function ShiftCard(props: Props) {
  const { shift } = props;
  const isFreeDay = shift.type === "freeDay";
  const archived = props.archived === true;
  const spotsLeft = Math.max(0, shift.needed - shift.applicants.length);
  const isFull = shift.applicants.length >= shift.needed;

  return (
    <article className={`card shift-card ${isFull ? "is-full" : ""} ${isFreeDay ? "is-free-day" : ""} ${archived ? "is-archived" : ""}`}>
      <div className="shift-head">
        <div>
          <h3 className="shift-date">{formatDate(shift.date)}</h3>
          {!isFreeDay && (
            <p className="shift-time">
              {shift.startTime} – {shift.endTime}
            </p>
          )}
        </div>
        <span className={`badge ${archived ? "badge-archived" : isFull ? "badge-full" : isFreeDay ? "badge-free" : "badge-open"}`}>
          {archived ? "Archived" : isFull ? "Full" : isFreeDay ? "Free day" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
        </span>
      </div>

      {isFreeDay ? (
        <p className="shift-needed">
          No work scheduled this day. {shift.applicants.length} of {shift.needed} worker{shift.needed === 1 ? "" : "s"} can take it off.
        </p>
      ) : (
        <p className="shift-needed">
          Needed: <strong>{shift.needed}</strong> worker{shift.needed === 1 ? "" : "s"}
        </p>
      )}

      {props.view === "admin" ? (
        <>
          {shift.applicants.length === 0 ? (
            <p className="muted">{isFreeDay ? "No one has taken this free day yet." : "No applicants yet."}</p>
          ) : (
            <ul className="applicants">
              {shift.applicants.map((a) => (
                <li key={a.id} className="applicant">
                  <span>{fullName(a)}</span>
                  <span className="applicant-phone">{a.phone}</span>
                </li>
              ))}
            </ul>
          )}
          {!archived && (
            <div className="card-actions">
              <DeleteShiftButton shiftId={shift.id} label={isFreeDay ? "Delete free day" : "Delete shift"} />
            </div>
          )}
        </>
      ) : (
        <div className="card-actions">
          {archived ? (
            <span className="muted">Applications are closed.</span>
          ) : props.myApplication ? (
            <WithdrawButton
              shiftId={shift.id}
              applicantId={props.myApplication.id}
              noun={isFreeDay ? "free day" : "shift"}
            />
          ) : isFull ? (
            <span className="muted">This {isFreeDay ? "free day" : "shift"} is full.</span>
          ) : (
            <ApplyForm shiftId={shift.id} noun={isFreeDay ? "free day" : "shift"} />
          )}
        </div>
      )}
    </article>
  );
}