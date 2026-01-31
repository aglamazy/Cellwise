"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, UserRole } from "@/types/user";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  setRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "cellwise_user_role";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem(STORAGE_KEY) as UserRole | null;
    setUser({
      id: "default-user",
      name: "User",
      role: savedRole || "user",
    });
  }, []);

  const setRole = (role: UserRole) => {
    localStorage.setItem(STORAGE_KEY, role);
    setUser((prev) =>
      prev ? { ...prev, role } : { id: "default-user", name: "User", role }
    );
  };

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, isAdmin, setRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
