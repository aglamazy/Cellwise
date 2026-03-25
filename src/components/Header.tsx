"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user, isLoading, logout, isAdmin } = useAuth();

  return (
    <header className="flex justify-between items-center mb-6 p-4 sm:p-0">
      <Link href="/" className="text-2xl sm:text-3xl font-semibold tracking-tight hover:opacity-80 transition-opacity">
        {title || "CellWise"}
      </Link>

      <div className="flex items-center gap-4">
        {isLoading ? (
          <span className="text-gray-400">Loading...</span>
        ) : user ? (
          <>
            <span className="text-gray-300 hidden sm:inline">
              {user.name}
              {isAdmin && (
                <span className="ml-2 text-xs bg-yellow-600 px-2 py-0.5 rounded">
                  Admin
                </span>
              )}
            </span>
            <Link
              href="/my-puzzles"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              My Puzzles
            </Link>
            <button
              onClick={logout}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded transition-colors text-sm"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
