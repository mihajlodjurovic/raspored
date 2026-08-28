import { requireRole } from "@/lib/session";
import { getShifts } from "@/lib/store";
import { getUsers, getWarnings } from "@/lib/users";
import CreateShiftForm from "@/components/CreateShiftForm";
import ShiftCard from "@/components/ShiftCard";
import CreateAccountForm from "@/components/CreateAccountForm";
import EditAccountForm from "@/components/EditAccountForm";
import DeleteAccountButton from "@/components/DeleteAccountButton";
import RemoveWarningButton from "@/components/RemoveWarningButton";
import { formatDate } from "@/components/ShiftCard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireRole(["admin"]);
  const shifts = await getShifts();
  const users = await getUsers();
  const warnings = await getWarnings();

  const sorted = [...shifts].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
  );

  const warningsByUser = new Map<string, typeof warnings>();
  for (const w of warnings) {
    const list = warningsByUser.get(w.username) ?? [];
    list.push(w);
    warningsByUser.set(w.username, list);
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Admin panel</h1>
        <p className="muted">Welcome back, {session.username}. Create shifts, review applicants and manage accounts.</p>
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

      <section className="shifts-section">
        <h2>
          Accounts <span className="count">({users.length})</span>
        </h2>

        <CreateAccountForm />

        <div className="card accounts-card">
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Red points</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const userWarnings = warningsByUser.get(user.username) ?? [];
                const isSelf = user.username === session.username;
                return (
                  <tr key={user.id}>
                    <td className="cell-username">
                      <strong>{user.username}</strong>
                      {isSelf && <span className="badge badge-self">you</span>}
                    </td>
                    <td>{user.role}</td>
                    <td>
                      {user.name} {user.surname}
                    </td>
                    <td className="muted">{user.phone}</td>
                    <td>
                      <span className={`red-points ${userWarnings.length > 0 ? "has-points" : ""}`}>
                        {userWarnings.length}
                      </span>
                      {userWarnings.length > 0 && (
                        <ul className="warnings-list">
                          {userWarnings.map((w) => (
                            <li key={w.id}>
                              <span>
                                {formatDate(w.shiftDate)}
                                <RemoveWarningButton warningId={w.id} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="cell-actions">
                      <EditAccountForm
                        accountId={user.id}
                        username={user.username}
                        role={user.role}
                        name={user.name}
                        surname={user.surname}
                        phone={user.phone}
                      />
                      {!isSelf && (
                        <DeleteAccountButton
                          accountId={user.id}
                          username={user.username}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}