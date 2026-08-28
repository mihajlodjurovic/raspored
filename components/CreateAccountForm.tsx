"use client";

import { useActionState, useEffect, useRef } from "react";
import { createAccount } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions";

export default function CreateAccountForm() {
  const action = async (
    _prev: ActionResult | undefined,
    formData: FormData
  ) => createAccount(formData);

  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="card form account-form">
      <h2>Create account</h2>

      <div className="field-row">
        <label className="field">
          <span>Username</span>
          <input type="text" name="username" autoComplete="off" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="text" name="password" minLength={6} required />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>First name</span>
          <input type="text" name="name" required />
        </label>
        <label className="field">
          <span>Surname</span>
          <input type="text" name="surname" required />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Phone</span>
          <input type="tel" name="phone" required />
        </label>
        <label className="field">
          <span>Role</span>
          <select name="role" defaultValue="employee">
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </button>

      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && state.message && <p className="success">{state.message}</p>}
    </form>
  );
}