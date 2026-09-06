import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Applicant, ScheduleEntryType, Shift } from "./types";

// Postgres (Neon) storage. Works on Vercel serverless functions.
// Requires the DATABASE_URL env var (Neon connection string).
const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

type QueryFn = NeonQueryFunction<false, false>;

type ShiftRow = {
  id: string;
  type: ScheduleEntryType | null;
  date: string;
  start_time: string;
  end_time: string;
  needed: number;
  applicants: unknown;
};

function toApplicants(raw: unknown): Applicant[] {
  if (Array.isArray(raw)) return raw as Applicant[];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Applicant[];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    type: row.type === "freeDay" ? "freeDay" : "shift",
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    needed: row.needed,
    applicants: toApplicants(row.applicants),
  };
}

function db(): QueryFn {
  if (!sql) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon connection string to .env.local (or to Vercel project env vars)."
    );
  }
  return sql;
}

let schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = db()
      `CREATE TABLE IF NOT EXISTS shifts (
        id         TEXT PRIMARY KEY,
        type       TEXT NOT NULL DEFAULT 'shift',
        date       TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time   TEXT NOT NULL,
        needed     INTEGER NOT NULL,
        applicants JSONB NOT NULL DEFAULT '[]'::jsonb
      )`
      .then(async () => {
        // These ALTER statements keep existing installations compatible.
        await db() `ALTER TABLE shifts ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'shift'`;
        await db() `
          CREATE TABLE IF NOT EXISTS archived_shifts (
            id         TEXT PRIMARY KEY,
            type       TEXT NOT NULL DEFAULT 'shift',
            date       TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time   TEXT NOT NULL,
            needed     INTEGER NOT NULL,
            applicants JSONB NOT NULL DEFAULT '[]'::jsonb,
            archived_at TEXT NOT NULL
          )
        `;
        await db() `ALTER TABLE archived_shifts ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'shift'`;
      });
  }
  return schemaReady;
}

const ARCHIVE_RETENTION_DAYS = 14;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function archiveCutoffTimestamp(): string {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - ARCHIVE_RETENTION_DAYS);
  return cutoff.toISOString();
}

async function maintainArchive(): Promise<void> {
  await ensureSchema();

  // Remove archived entries after 14 days, then move all past entries once.
  await db() `DELETE FROM archived_shifts WHERE archived_at < ${archiveCutoffTimestamp()}`;
  await db() `
    INSERT INTO archived_shifts (id, type, date, start_time, end_time, needed, applicants, archived_at)
    SELECT id, type, date, start_time, end_time, needed, applicants, ${new Date().toISOString()}
    FROM shifts
    WHERE date < ${todayUtc()}
    ON CONFLICT (id) DO NOTHING
  `;
  await db() `DELETE FROM shifts WHERE date < ${todayUtc()}`;
}

export async function getShifts(): Promise<Shift[]> {
  await maintainArchive();
  const rows = (await db() `
    SELECT id, type, date, start_time, end_time, needed, applicants
    FROM shifts
    ORDER BY date, start_time
  `) as unknown as ShiftRow[];
  return rows.map(rowToShift);
}

export async function getArchivedShifts(): Promise<Shift[]> {
  await maintainArchive();
  const rows = (await db() `
    SELECT id, type, date, start_time, end_time, needed, applicants
    FROM archived_shifts
    ORDER BY date DESC, start_time DESC
  `) as unknown as ShiftRow[];
  return rows.map(rowToShift);
}

export async function getShift(id: string): Promise<Shift | undefined> {
  await maintainArchive();
  const rows = (await db() `
    SELECT id, type, date, start_time, end_time, needed, applicants
    FROM shifts
    WHERE id = ${id}
  `) as unknown as ShiftRow[];
  return rows.length ? rowToShift(rows[0]) : undefined;
}

export async function addShift(shift: Shift): Promise<void> {
  await ensureSchema();
  await db() `
    INSERT INTO shifts (id, type, date, start_time, end_time, needed, applicants)
    VALUES (${shift.id}, ${shift.type}, ${shift.date}, ${shift.startTime}, ${shift.endTime}, ${shift.needed}, ${JSON.stringify(
      shift.applicants
    )}::jsonb)
  `;
}

export async function updateShift(
  id: string,
  update: (shift: Shift) => Shift
): Promise<void> {
  await ensureSchema();
  const existing = await getShift(id);
  if (!existing) return;
  const next = update({ ...existing });
  await db() `
    UPDATE shifts
    SET type = ${next.type},
        date = ${next.date},
        start_time = ${next.startTime},
        end_time = ${next.endTime},
        needed = ${next.needed},
        applicants = ${JSON.stringify(next.applicants)}::jsonb
    WHERE id = ${id}
  `;
}

export async function deleteShift(id: string): Promise<void> {
  await ensureSchema();
  await db() `DELETE FROM shifts WHERE id = ${id}`;
  await db() `DELETE FROM archived_shifts WHERE id = ${id}`;
}
