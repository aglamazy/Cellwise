export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface GameResult {
  id: string;
  puzzleId: string;
  userId: string;
  timeSeconds: number;
  completedAt: Date;
}
