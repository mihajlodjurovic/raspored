"use client";

import { useState, useActionState } from "react";
import { updateAccount } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions";

type EditProps = {
  accountId: string;
  username: string;
  role: "admin" | "employee";
  name: string;
  surname: string;
  phone: string;
};

export default function EditAccountForm({ accountId, username, role, name, surname, phone }: EditProps) {
  const [open, setOpen] = useState(false);

  const action = async (
    _prev: ActionResult | undefined,
    formData: FormData
  ) => updateAccount(accountId, formData);

  const [state, formAction, pending] = useActionState(action, undefined);

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        Edit
      </button>
    );
  }

  return (
    <form action={formAction} className="account-form">
      <label className="field">
        <span>Username</span>
        <input type="text" name="username" defaultValue={username} required />
      </label>
      <label className="field">
        <span>Password (leave blank to keep current)</span>
        <input type="text" name="password" />
      </label>
      <div className="field-row">
        <label className="field">
          <span>First name</span>
          <input type="text" name="name" defaultValue={name} required />
        </label>
        <label className="field">
          <span>Surname</span>
          <input type="text" name="surname" defaultValue={surname} required />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span>Phone</span>
          <input type="tel" name="phone" defaultValue={phone} required />
        </label>
        <label className="field">
          <span>Role</span>
          <select name="role" defaultValue={role}>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>
      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && state.message && <p className="success">{state.message}</p>}
    </form>
  );
}