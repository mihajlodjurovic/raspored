import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, SessionPayload } from "./types";

const COOKIE_NAME = "session";

// Prefer a stable secret from env; fall back to a generated one (local dev).
function getSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    "local-dev-insecure-secret-change-me-0000000000-local-dev";
  return new TextEncoder().encode(secret);
}

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createSession(payload: {
  username: string;
  role: Role;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const token = await new SignJWT({ role: payload.role, username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.username === "string" &&
      (payload.role === "admin" || payload.role === "employee") &&
      typeof payload.exp === "number"
    ) {
      return {
        username: payload.username,
        role: payload.role,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function requireRole(roles: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!roles.includes(session.role)) {
    redirect("/");
  }
  return session;
}

export async function deleteSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
