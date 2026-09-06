"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createUser,
  deleteUser,
  deleteWarning,
  getUserById,
  getUserByUsername,
  newId,
  addWarning,
  updateUser,
  usernameTaken,
  verifyCredentials,
} from "./users";
import { createSession, deleteSession, requireRole } from "./session";
import { addShift, deleteShift, getShift, updateShift } from "./store";
import {
  clearIpFailures,
  clearLoginFailures,
  ipBlocked,
  getLockoutMs,
  recordIpFailure,
  recordLoginFailure,
} from "./ratelimit";
import type { Applicant, Role } from "./types";

export type ActionResult = { ok: boolean; error?: string; message?: string };

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/* ------------------------------- Auth ---------------------------------- */

export async function login(formData: FormData): Promise<ActionResult> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { ok: false, error: "Please enter your username and password." };
  }

  // Brute-force protection.
  const h = await headers();
  const forwarded = h.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim() || "unknown";

  if (ipBlocked(ip)) {
    return {
      ok: false,
      error: "Too many attempts from this address. Try again in 15 minutes.",
    };
  }

  const lockoutMs = await getLockoutMs(username);
  if (lockoutMs > 0) {
    return {
      ok: false,
      error: `Too many failed attempts. Try again in ${Math.ceil(
        lockoutMs / 60000
      )} minute(s).`,
    };
  }

  const account = await verifyCredentials(username, password);
  if (!account) {
    await recordLoginFailure(username);
    recordIpFailure(ip);
    return { ok: false, error: "Invalid username or password." };
  }

  // Success: reset any counters.
  await clearLoginFailures(username);
  clearIpFailures(ip);

  await createSession({ username: account.username, role: account.role });
  revalidatePath("/", "layout");
  redirect(account.role === "admin" ? "/admin" : "/employee");
}

export async function logout(): Promise<void> {
  await deleteSession();
  revalidatePath("/", "layout");
  redirect("/login");
}

/* ------------------------------ Shifts --------------------------------- */

export async function createShift(formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const date = String(formData.get("date") ?? "");
  const type = formData.get("type") === "freeDay" ? "freeDay" : "shift";
  const needed = Number(formData.get("needed") ?? NaN);

  // Free days last the whole day, so they have no start/end time.
  const startTime = type === "freeDay" ? "" : String(formData.get("startTime") ?? "");
  const endTime = type === "freeDay" ? "" : String(formData.get("endTime") ?? "");

  if (!date) return { ok: false, error: "Please pick a date." };
  if (date < new Date().toISOString().slice(0, 10)) {
    return { ok: false, error: "Please choose today or a future date." };
  }
  if (type === "shift") {
    if (!startTime || !endTime) return { ok: false, error: "Please pick the start and end times." };
    // Overnight shifts are allowed (e.g. 16:00–00:00, 19:00–01:00), so the
    // end time only has to be different from the start time.
    if (startTime === endTime) return { ok: false, error: "End time must be different from the start time." };
  }
  if (!Number.isFinite(needed) || needed < 1) {
    return {
      ok: false,
      error:
        type === "freeDay"
          ? "Number of workers who can take the free day must be at least 1."
          : "Number of workers must be at least 1.",
    };
  }

  await addShift({
    id: newId(),
    type,
    date,
    startTime,
    endTime,
    needed: Math.floor(needed),
    applicants: [],
  });

  revalidatePath("/admin");
  revalidatePath("/employee");
  return {
    ok: true,
    message: type === "freeDay" ? "Free day created!" : "Shift created!",
  };
}

export async function removeShift(shiftId: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  await deleteShift(shiftId);
  revalidatePath("/admin");
  return { ok: true };
}

export async function addWorkerToShift(
  shiftId: string,
  username: string
): Promise<ActionResult> {
  await requireRole(["admin"]);

  const shift = await getShift(shiftId);
  if (!shift) return { ok: false, error: "This schedule entry no longer exists." };

  const user = await getUserByUsername(username);
  if (!user) return { ok: false, error: "No account with that username." };
  if (shift.applicants.some((a) => a.username === user.username)) {
    return { ok: false, error: "That worker is already on this entry." };
  }

  const applicant: Applicant = {
    id: newId(),
    username: user.username,
    name: user.name,
    surname: user.surname,
    phone: user.phone,
    appliedAt: new Date().toISOString(),
  };

  await updateShift(shiftId, (s) => ({
    ...s,
    applicants: [...s.applicants, applicant],
  }));

  revalidatePath("/admin");
  revalidatePath("/employee");
  return { ok: true, message: "Worker added." };
}

export async function removeWorkerFromShift(
  shiftId: string,
  applicantId: string
): Promise<ActionResult> {
  await requireRole(["admin"]);

  const shift = await getShift(shiftId);
  if (!shift) return { ok: false, error: "This schedule entry no longer exists." };
  if (!shift.applicants.some((a) => a.id === applicantId)) {
    return { ok: false, error: "Applicant not found." };
  }

  await updateShift(shiftId, (s) => ({
    ...s,
    applicants: s.applicants.filter((a) => a.id !== applicantId),
  }));

  revalidatePath("/admin");
  revalidatePath("/employee");
  return { ok: true, message: "Worker removed." };
}

/* ----------------------------- Applications ----------------------------- */

export async function applyToShift(shiftId: string): Promise<ActionResult> {
  const session = await requireRole(["employee"]);

  const user = await getUserByUsername(session.username);
  if (!user) return { ok: false, error: "Your account no longer exists." };

  const shift = await getShift(shiftId);
  if (!shift) return { ok: false, error: "This shift no longer exists." };
  if (shift.date < new Date().toISOString().slice(0, 10)) {
    return { ok: false, error: "Applications are closed for past entries." };
  }
  if (shift.applicants.length >= shift.needed) {
    return { ok: false, error: "Sorry, this shift is already full." };
  }

  const applicant: Applicant = {
    id: newId(),
    username: user.username,
    name: user.name,
    surname: user.surname,
    phone: user.phone,
    appliedAt: new Date().toISOString(),
  };

  await updateShift(shiftId, (s) => ({
    ...s,
    applicants: [...s.applicants, applicant],
  }));

  revalidatePath("/employee");
  revalidatePath("/admin");
  return { ok: true, message: "You're booked in!" };
}

export async function withdrawApplication(
  shiftId: string,
  applicantId: string
): Promise<ActionResult> {
  const session = await requireRole(["employee"]);

  const shift = await getShift(shiftId);
  if (!shift) return { ok: false, error: "This shift no longer exists." };

  const applicant = shift.applicants.find(
    (a) => a.id === applicantId && a.username === session.username
  );
  if (!applicant) return { ok: false, error: "Application not found." };

  await updateShift(shiftId, (s) => ({
    ...s,
    applicants: s.applicants.filter((a) => a.id !== applicantId),
  }));

  // Red-point rule: cancelling within 48h of the shift start earns a warning.
  // Free days have no start time, so they never earn a red point.
  const shiftStart = new Date(`${shift.date}T${shift.startTime}`).getTime();
  const within48h =
    shift.type === "shift" &&
    Number.isFinite(shiftStart) &&
    shiftStart - Date.now() < FORTY_EIGHT_HOURS_MS;

  if (within48h) {
    await addWarning({
      username: session.username,
      shiftId: shift.id,
      shiftDate: shift.date,
    });
  }

  revalidatePath("/employee");
  revalidatePath("/admin");
  return within48h
    ? {
        ok: true,
        message:
          "Application withdrawn. You received a red point — the shift was less than 48h away.",
      }
    : { ok: true, message: "Application withdrawn." };
}

/* --------------------------- Account management -------------------------- */

export async function createAccount(formData: FormData): Promise<ActionResult> {
  await requireRole(["admin"]);

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const name = String(formData.get("name") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (username.length < 2) return { ok: false, error: "Username must be at least 2 characters." };
  if (role !== "admin" && role !== "employee") return { ok: false, error: "Invalid role." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  if (name.length < 1) return { ok: false, error: "Please enter the employee's first name." };
  if (surname.length < 1) return { ok: false, error: "Please enter the employee's surname." };
  if (!/^[+\d][\d\s\-()]{5,}$/.test(phone)) {
    return { ok: false, error: "Please enter a valid phone number." };
  }
  if (await usernameTaken(username)) {
    return { ok: false, error: "That username is already taken." };
  }

  await createUser({ username, password, role, name, surname, phone });
  revalidatePath("/admin");
  return { ok: true, message: "Account created." };
}

export async function updateAccount(
  accountId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRole(["admin"]);

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const name = String(formData.get("name") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (username.length < 2) return { ok: false, error: "Username must be at least 2 characters." };
  if (role !== "admin" && role !== "employee") return { ok: false, error: "Invalid role." };
  if (password && password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  if (name.length < 1) return { ok: false, error: "Please enter the first name." };
  if (surname.length < 1) return { ok: false, error: "Please enter the surname." };
  if (!/^[+\d][\d\s\-()]{5,}$/.test(phone)) {
    return { ok: false, error: "Please enter a valid phone number." };
  }

  const existing = await getUserById(accountId);
  if (!existing) return { ok: false, error: "Account not found." };

  // Self-protection: don't allow locking yourself out.
  const isSelf = existing.username === session.username;
  if (isSelf && role !== "admin") {
    return { ok: false, error: "You can't change your own role." };
  }
  if (isSelf && username !== existing.username) {
    return { ok: false, error: "You can't rename your own account while signed in." };
  }
  if (!isSelf && username !== existing.username && (await usernameTaken(username))) {
    return { ok: false, error: "That username is already taken." };
  }

  await updateUser(accountId, { username, password, role, name, surname, phone });
  revalidatePath("/admin");
  return { ok: true, message: "Account updated." };
}

export async function deleteAccount(accountId: string): Promise<ActionResult> {
  const session = await requireRole(["admin"]);

  const existing = await getUserById(accountId);
  if (!existing) return { ok: false, error: "Account not found." };
  if (existing.username === session.username) {
    return { ok: false, error: "You can't delete the account you're signed in with." };
  }

  await deleteUser(accountId);
  revalidatePath("/admin");
  return { ok: true, message: "Account deleted." };
}

export async function removeRedPoint(warningId: string): Promise<ActionResult> {
  await requireRole(["admin"]);
  await deleteWarning(warningId);
  revalidatePath("/admin");
  return { ok: true, message: "Red point removed." };
}
