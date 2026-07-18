import { sql } from "./db";
import { User, UserRole } from "@/types/user";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "cellwise_session";
const SESSION_DURATION_DAYS = 30;

// Password hashing: PBKDF2-SHA256 with a per-user random salt.
//
// A bare SHA-256 digest — what this used to be — is unsalted and effectively
// free to compute, so a leaked users table could be reversed with off-the-shelf
// rainbow tables. Stored format is `pbkdf2$<iterations>$<salt>$<hash>`; the
// legacy 64-char hex digests are still accepted at login and transparently
// re-hashed to this format (see loginUser).
const PBKDF2_ITERATIONS = 210_000;

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt.buffer)}$${hash}`;
}

// Legacy unsalted SHA-256, kept only so existing accounts can still log in.
async function legacySha256(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

// Length-constant comparison — a plain === leaks how many leading characters
// matched via timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  if (stored.startsWith("pbkdf2$")) {
    const [, iterations, saltHex, expected] = stored.split("$");
    const salt = new Uint8Array(
      (saltHex.match(/.{2}/g) || []).map((byte) => parseInt(byte, 16))
    );
    const actual = await pbkdf2(password, salt, Number(iterations));
    return timingSafeEqual(actual, expected);
  }

  return timingSafeEqual(await legacySha256(password), stored);
}

// True for hashes still in the pre-PBKDF2 format, so login can upgrade them.
export function isLegacyHash(stored: string): boolean {
  return !stored.startsWith("pbkdf2$");
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

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Register a new user
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ user: User; sessionId: string } | { error: string }> {
  // Addresses are case-insensitive in practice; storing them verbatim would
  // let "A@x.com" and "a@x.com" become two accounts that each fail to log in
  // as the other.
  email = normalizeEmail(email);

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
    WHERE email = ${normalizeEmail(email)}
  `;

  if (rows.length === 0) {
    return { error: "Invalid email or password" };
  }

  const row = rows[0];
  const isValid = await verifyPassword(password, row.password_hash as string);

  if (!isValid) {
    return { error: "Invalid email or password" };
  }

  // Upgrade legacy unsalted hashes now that we have the plaintext in hand.
  if (isLegacyHash(row.password_hash as string)) {
    const upgraded = await hashPassword(password);
    await sql`
      UPDATE users SET password_hash = ${upgraded} WHERE id = ${row.id as string}
    `;
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
