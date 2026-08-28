"use client";

import { logout } from "@/lib/actions";
import { useActionState } from "react";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="btn btn-ghost">
        Log out
      </button>
    </form>
  );
}