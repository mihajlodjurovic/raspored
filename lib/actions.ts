"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyCredentials, newId } from "./accounts";
import { createSession, deleteSession, requireRole } from "./session";
import { addShift, deleteShift, getShift, updateShift } from "./store";
import type { Applicant } from "./types";

export type ActionResult = { ok: boolean; error?: string };

/* ------------------------------- Auth ---------------------------------- */

export async function login(formData: FormData): Promise<ActionResult> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { ok: false, error: "Please enter your username and password." };
  }

  const account = verifyCredentials(username, password);
  if (!account) {
    return { ok: false, error: "Invalid username or password." };
  }

  await createSession({ username: account.username, role: account.role });
  revalidatePath("/", "layout");
  redirect(account.role === "admin" ? "/admin" : "/employee");
}

export async function logout(): Promise<void> {
  await deleteSession();
  revalidatePath("/", "layout");
  redirect("/login");
}

/* ------------------------------ Admin ---------------------------------- */

export async function createShift(formData: FormData): Promise<ActionResult> {
  const session = await requireRole(["admin"]);

  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const needed = Number(formData.get("needed") ?? NaN);

  if (!date) return { ok: false, error: "Please pick a date." };
  if (!startTime || !endTime) return { ok: false, error: "Please pick the start and end times." };
  if (startTime >= endTime) return { ok: false, error: "End time must be after the start time." };
  if (!Number.isFinite(needed) || needed < 1) {
    return { ok: false, error: "Number of workers must be at least 1." };
  }

  await addShift({
    id: newId(),
    date,
    startTime,
    endTime,
    needed: Math.floor(needed),
    applicants: [],
  });

  revalidatePath("/admin");
  return { ok: true };
}

export async function removeShift(shiftId: string): Promise<ActionResult> {
  const session = await requireRole(["admin"]);
  await deleteShift(shiftId);
  revalidatePath("/admin");
  return { ok: true };
}

/* ----------------------------- Employee -------------------------------- */

export async function applyToShift(shiftId: string, formData: FormData): Promise<ActionResult> {
  const session = await requireRole(["employee"]);

  const name = String(formData.get("name") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (name.length < 2) return { ok: false, error: "Please enter your name." };
  if (surname.length < 2) return { ok: false, error: "Please enter your surname." };
  if (!/^[+\d][\d\s\-()]{5,}$/.test(phone)) {
    return { ok: false, error: "Please enter a valid phone number." };
  }

  const shift = await getShift(shiftId);
  if (!shift) return { ok: false, error: "This shift no longer exists." };

  if (shift.applicants.length >= shift.needed) {
    return { ok: false, error: "Sorry, this shift is already full." };
  }

  const applicant: Applicant = {
    id: newId(),
    username: session.username,
    name,
    surname,
    phone,
    appliedAt: new Date().toISOString(),
  };

  await updateShift(shiftId, (s) => ({
    ...s,
    applicants: [...s.applicants, applicant],
  }));

  revalidatePath("/employee");
  revalidatePath("/admin");
  return { ok: true };
}

export async function withdrawApplication(shiftId: string, applicantId: string): Promise<ActionResult> {
  const session = await requireRole(["employee"]);

  await updateShift(shiftId, (s) => ({
    ...s,
    applicants: s.applicants.filter((a) => a.id !== applicantId),
  }));

  revalidatePath("/employee");
  revalidatePath("/admin");
  return { ok: true };
}