"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions";
import type { ActionResult } from "@/lib/actions";

export default function LoginForm() {
  const loginAction = async (
    _prev: ActionResult | undefined,
    formData: FormData
  ) => login(formData);

  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="card form">
      <h2>Sign in</h2>

      <label className="field">
        <span>Username</span>
        <input type="text" name="username" autoComplete="username" required autoFocus />
      </label>

      <label className="field">
        <span>Password</span>
        <input type="password" name="password" autoComplete="current-password" required />
      </label>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}