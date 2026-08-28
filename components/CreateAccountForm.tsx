"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createAccount } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions";

export default function CreateAccountForm() {
  const action = async (
    _prev: ActionResult | undefined,
    formData: FormData
  ) => createAccount(formData);

  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [showPw, setShowPw] = useState(false);

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
          <div className="password-wrap">
            <input
              type={showPw ? "text" : "password"}
              name="password"
              minLength={6}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
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