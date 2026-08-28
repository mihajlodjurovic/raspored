import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import {
  randomBytes,
  randomUUID,
  scrypt as _scrypt,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";
import type { Role, User, Warning } from "./types";

const scrypt = promisify(_scrypt) as (
  password: string,
  salt: string,
  keylen: number
) => Promise<Buffer>;

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

type QueryFn = NeonQueryFunction<false, false>;

function db(): QueryFn {
  if (!sql) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon connection string to .env.local (or to Vercel project env vars)."
    );
  }
  return sql;
}

export function newId(): string {
  return randomUUID();
}

/* --------------------------- Password hashing --------------------------- */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = await scrypt(password, salt, 64);
  return `${salt}:${buf.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const buf = await scrypt(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return buf.length === expected.length && timingSafeEqual(buf, expected);
  } catch {
    return false;
  }
}

/* ------------------------------ Schema + seed --------------------------- */

let initPromise: Promise<void> | null = null;
async function initDb(): Promise<void> {  await db()`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL,
      name          TEXT NOT NULL DEFAULT '',
      surname       TEXT NOT NULL DEFAULT '',
      phone         TEXT NOT NULL DEFAULT '',
      created_at    TEXT NOT NULL
    )
  `;
  await db()`
    CREATE TABLE IF NOT EXISTS warnings (
      id         TEXT PRIMARY KEY,
      username   TEXT NOT NULL,
      shift_id   TEXT NOT NULL,
      shift_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `;

  const count = await db()`SELECT count(*)::int AS n FROM users`;
  if (count[0].n === 0) {
    const adminHash = await hashPassword("gocamiaiva");
    const empHash = await hashPassword("vukasr123");
    const now = new Date().toISOString();
    await db()`
      INSERT INTO users (id, username, password_hash, role, name, surname, phone, created_at)
      VALUES
        (${newId()}, 'VUKAS', ${adminHash}, 'admin', 'VUKAS', '', '', ${now}),
        (${newId()}, 'employee', ${empHash}, 'employee', 'Employee', 'User', '', ${now})
    `;
  }
}

function ensureInit(): Promise<void> {
  if (!initPromise) initPromise = initDb();
  return initPromise;
}

/* -------------------------------- Users --------------------------------- */

type UserRow = {
  id: string;
  username: string;
  role: Role;
  name: string;
  surname: string;
  phone: string;
  created_at: string;
};

export async function verifyCredentials(
  username: string,
  password: string
): Promise<{ username: string; role: Role } | null> {
  await ensureInit();
  const rows = (await db()`
    SELECT username, password_hash, role FROM users
    WHERE lower(username) = lower(${username.trim()})
  `) as unknown as { username: string; password_hash: string; role: Role }[];
  if (!rows.length) return null;
  const ok = await verifyPassword(password, rows[0].password_hash);
  if (!ok) return null;
  return { username: rows[0].username, role: rows[0].role };
}

export async function getUserByUsername(
  username: string
): Promise<{ username: string; role: Role; name: string; surname: string; phone: string } | undefined> {
  await ensureInit();
  const rows = (await db()`
    SELECT username, role, name, surname, phone FROM users
    WHERE lower(username) = lower(${username})
  `) as unknown as UserRow[];
  if (!rows.length) return undefined;
  const r = rows[0];
  return {
    username: r.username,
    role: r.role,
    name: r.name,
    surname: r.surname,
    phone: r.phone,
  };
}

export async function getUsers(): Promise<User[]> {
  await ensureInit();
  const rows = (await db()`
    SELECT id, username, role, name, surname, phone, created_at FROM users
    ORDER BY role, username
  `) as unknown as UserRow[];
  const warnings = await getWarnings();
  const counts = new Map<string, number>();
  for (const w of warnings) {
    counts.set(w.username, (counts.get(w.username) ?? 0) + 1);
  }
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    role: r.role,
    name: r.name,
    surname: r.surname,
    phone: r.phone,
    createdAt: r.created_at,
    redPoints: counts.get(r.username) ?? 0,
  }));
}

export async function getUserById(
  id: string
): Promise<{ id: string; username: string; role: Role } | undefined> {
  await ensureInit();
  const rows = (await db()
    `SELECT id, username, role FROM users WHERE id = ${id}`) as unknown as {
    id: string;
    username: string;
    role: Role;
  }[];
  return rows.length ? rows[0] : undefined;
}

export async function usernameTaken(username: string): Promise<boolean> {
  await ensureInit();
  const rows = await db()`SELECT 1 FROM users WHERE lower(username) = lower(${username})`;
  return rows.length > 0;
}

export async function createUser(input: {
  username: string;
  password: string;
  role: Role;
  name: string;
  surname: string;
  phone: string;
}): Promise<void> {
  await ensureInit();
  await db()`
    INSERT INTO users (id, username, password_hash, role, name, surname, phone, created_at)
    VALUES (${newId()}, ${input.username}, ${await hashPassword(input.password)}, ${input.role},
            ${input.name}, ${input.surname}, ${input.phone}, ${new Date().toISOString()})
  `;
}

export async function updateUser(
  id: string,
  input: {
    username?: string;
    password?: string; // undefined/empty = keep current
    role?: Role;
    name?: string;
    surname?: string;
    phone?: string;
  }
): Promise<void> {
  await ensureInit();
  const rows = (await db()`
    SELECT username FROM users WHERE id = ${id}
  `) as unknown as { username: string }[];
  if (!rows.length) return;
  const currentUsername = rows[0].username;

  const passwordHash =
    input.password && input.password.length > 0
      ? await hashPassword(input.password)
      : null;

  await db()`
    UPDATE users SET
      username = ${input.username ?? currentUsername},
      role = ${input.role ?? "employee"},
      name = ${input.name ?? ""},
      surname = ${input.surname ?? ""},
      phone = ${input.phone ?? ""},
      password_hash = COALESCE(${passwordHash}, password_hash)
    WHERE id = ${id}
  `;
}

export async function deleteUser(id: string): Promise<string | null> {
  await ensureInit();
  const rows = (await db()`
    SELECT username FROM users WHERE id = ${id}
  `) as unknown as { username: string }[];
  if (!rows.length) return null;
  const username = rows[0].username;
  await db()`DELETE FROM users WHERE id = ${id}`;
  await db()`DELETE FROM warnings WHERE username = ${username}`;
  return username;
}

/* ------------------------------- Warnings ------------------------------- */

export async function addWarning(input: {
  username: string;
  shiftId: string;
  shiftDate: string;
}): Promise<void> {
  await ensureInit();
  await db()`
    INSERT INTO warnings (id, username, shift_id, shift_date, created_at)
    VALUES (${newId()}, ${input.username}, ${input.shiftId}, ${input.shiftDate}, ${new Date().toISOString()})
  `;
}

export async function getWarnings(): Promise<Warning[]> {
  await ensureInit();
  const rows = (await db()`
    SELECT id, username, shift_id, shift_date, created_at FROM warnings
    ORDER BY created_at DESC
  `) as unknown as {
    id: string;
    username: string;
    shift_id: string;
    shift_date: string;
    created_at: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    shiftId: r.shift_id,
    shiftDate: r.shift_date,
    createdAt: r.created_at,
  }));
}

export async function deleteWarning(id: string): Promise<void> {
  await ensureInit();
  await db()`DELETE FROM warnings WHERE id = ${id}`;
}
