import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
const query = connectionString
  ? (neon(connectionString) as NeonQueryFunction<false, false>)
  : null;

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function db(): NeonQueryFunction<false, false> {
  if (!query) {
    throw new Error("DATABASE_URL is not set.");
  }
  return query;
}

let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = db()`
      CREATE TABLE IF NOT EXISTS login_attempts (
        username    TEXT PRIMARY KEY,
        failures    INTEGER NOT NULL,
        unlocked_at TEXT NOT NULL DEFAULT ''
      )
    `.then(() => undefined);
  }
  return tableReady;
}

type AttemptRow = { failures: number; unlocked_at: string };

async function readAttempt(username: string): Promise<AttemptRow> {
  await ensureTable();
  const rows = (await db()`
    SELECT failures, unlocked_at FROM login_attempts WHERE username = ${username}
  `) as unknown as AttemptRow[];
  return rows.length ? rows[0] : { failures: 0, unlocked_at: "" };
}

/** Remaining lockout ms for a username, or 0 if it can try. */
export async function getLockoutMs(username: string): Promise<number> {
  const row = await readAttempt(username);
  if (!row.unlocked_at) return 0;
  const remaining = new Date(row.unlocked_at).getTime() - Date.now();
  return remaining > 0 ? remaining : 0;
}

/** Record a failed login, locking the username after MAX_FAILURES. */
export async function recordLoginFailure(username: string): Promise<void> {
  await ensureTable();
  const row = await readAttempt(username);

  // An active lockout must not be extended by further guesses.
  if (row.unlocked_at && new Date(row.unlocked_at).getTime() > Date.now()) {
    return;
  }

  const failures = row.failures + 1;
  const unlockedAt =
    failures >= MAX_FAILURES
      ? new Date(Date.now() + LOCKOUT_MS).toISOString()
      : "";

  await db()`
    INSERT INTO login_attempts (username, failures, unlocked_at)
    VALUES (${username}, ${failures}, ${unlockedAt})
    ON CONFLICT (username) DO UPDATE
      SET failures = EXCLUDED.failures,
          unlocked_at = EXCLUDED.unlocked_at
  `;
}

/** Reset on a successful login. */
export async function clearLoginFailures(username: string): Promise<void> {
  await ensureTable();
  await db()`DELETE FROM login_attempts WHERE username = ${username}`;
}

/* ---------------- Per-IP fail-safe (in-memory, per server instance) ------ */

type IpEntry = { failures: number; blockedUntil: number };
const ipMap = new Map<string, IpEntry>();
const IP_MAX = 30;
const IP_LOCKOUT_MS = 15 * 60 * 1000;

export function ipBlocked(ip: string): boolean {
  const entry = ipMap.get(ip);
  return !!(entry && entry.blockedUntil > Date.now());
}

export function recordIpFailure(ip: string): void {
  const entry = ipMap.get(ip) ?? { failures: 0, blockedUntil: 0 };
  entry.failures += 1;
  if (entry.failures >= IP_MAX && Date.now() > entry.blockedUntil) {
    entry.blockedUntil = Date.now() + IP_LOCKOUT_MS;
    entry.failures = 0;
  }
  ipMap.set(ip, entry);
}

export function clearIpFailures(ip: string): void {
  ipMap.delete(ip);
}