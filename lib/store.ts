import "server-only";

// Simple JSON-file storage.
// In local development this persists between runs to ./data/db.json.
// NOTE: On Vercel the serverless filesystem is ephemeral/read-only, so writes
// here will NOT survive cold starts. See README for migrating to a real DB.

import { promises as fs } from "fs";
import path from "path";
import type { Db, Shift } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

async function readDb(): Promise<Db> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Db;
    return { shifts: Array.isArray(parsed?.shifts) ? parsed.shifts : [] };
  } catch {
    // File missing or corrupt -> start empty.
    return { shifts: [] };
  }
}

async function writeDb(db: Db): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export async function getShifts(): Promise<Shift[]> {
  const db = await readDb();
  return db.shifts;
}

export async function getShift(id: string): Promise<Shift | undefined> {
  const db = await readDb();
  return db.shifts.find((s) => s.id === id);
}

export async function addShift(shift: Shift): Promise<void> {
  const db = await readDb();
  db.shifts.push(shift);
  await writeDb(db);
}

export async function updateShift(
  id: string,
  update: (shift: Shift) => Shift
): Promise<void> {
  const db = await readDb();
  const idx = db.shifts.findIndex((s) => s.id === id);
  if (idx === -1) return;
  db.shifts[idx] = update({ ...db.shifts[idx] });
  await writeDb(db);
}

export async function deleteShift(id: string): Promise<void> {
  const db = await readDb();
  db.shifts = db.shifts.filter((s) => s.id !== id);
  await writeDb(db);
}