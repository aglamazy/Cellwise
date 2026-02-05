import { sql } from "./db";
import { User, UserRole } from "@/types/user";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "cellwise_session";
const SESSION_DURATION_DAYS = 30;

// Simple password hashing using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Generate a random session ID
export function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generate a random user ID
export function generateUserId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Create a new session for a user
export async function createSession(userId: string): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await sql`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${sessionId}, ${userId}, ${expiresAt.toISOString()})
  `;

  return sessionId;
}

// Set the session cookie
export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

// Get the current session from cookies
export async function getSessionFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

// Delete the session cookie
export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Get the current user from session
export async function getCurrentUser(): Promise<User | null> {
  const sessionId = await getSessionFromCookie();
  if (!sessionId) return null;

  const rows = await sql`
    SELECT u.id, u.email, u.name, u.role
    FROM users u
    JOIN sessions s ON s.user_id = u.id
    WHERE s.id = ${sessionId} AND s.expires_at > NOW()
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    role: row.role as UserRole,
  };
}

// Register a new user
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ user: User; sessionId: string } | { error: string }> {
  // Check if email already exists
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return { error: "Email already registered" };
  }

  const userId = generateUserId();
  const passwordHash = await hashPassword(password);

  await sql`
    INSERT INTO users (id, email, password_hash, name, role)
    VALUES (${userId}, ${email}, ${passwordHash}, ${name}, 'user')
  `;

  const sessionId = await createSession(userId);

  return {
    user: { id: userId, email, name, role: "user" },
    sessionId,
  };
}

// Login user
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; sessionId: string } | { error: string }> {
  const rows = await sql`
    SELECT id, email, password_hash, name, role
    FROM users
    WHERE email = ${email}
  `;

  if (rows.length === 0) {
    return { error: "Invalid email or password" };
  }

  const row = rows[0];
  const isValid = await verifyPassword(password, row.password_hash as string);

  if (!isValid) {
    return { error: "Invalid email or password" };
  }

  const sessionId = await createSession(row.id as string);

  return {
    user: {
      id: row.id as string,
      email: row.email as string,
      name: row.name as string,
      role: row.role as UserRole,
    },
    sessionId,
  };
}

// Logout user
export async function logoutUser(sessionId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

// Delete expired sessions
export async function cleanupExpiredSessions(): Promise<void> {
  await sql`DELETE FROM sessions WHERE expires_at < NOW()`;
}
