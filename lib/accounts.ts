import { randomUUID } from "crypto";
import type { Applicant, Role } from "./types";

export type Account = {
  username: string;
  password: string;
  role: Role;
  label: string;
};

// The two fixed accounts.
export const ACCOUNTS: Account[] = [
  {
    username: "VUKAS",
    password: "gocamiaiva",
    role: "admin",
    label: "VUKAS (Admin)",
  },
  {
    username: "employee",
    password: "vukasr123",
    role: "employee",
    label: "Employee",
  },
];

export function verifyCredentials(username: string, password: string): Account | null {
  const match = ACCOUNTS.find(
    (a) => a.username.toLowerCase() === username.trim().toLowerCase()
  );
  if (match && match.password === password) {
    return match;
  }
  return null;
}

export function newId(): string {
  return randomUUID();
}