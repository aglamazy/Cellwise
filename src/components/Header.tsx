"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  // The current section renders as plain text. Linking a page to itself is a
  // dead control, and it was half the reason /my-puzzles felt like a trap.
  if (isActive) {
    return (
      <span aria-current="page" className="text-white font-medium">
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="text-gray-400 hover:text-white transition-colors"
    >
      {label}
    </Link>
  );
}

export function Header() {
  const { user, isLoading, logout, isAdmin } = useAuth();

  return (
    <header className="border-b border-gray-800 mb-6">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:gap-6">
        {/* The brand is always "CellWise" and always points home. It used to
            render the page title instead, which disguised the only way out of
            a page as a heading. */}
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity shrink-0"
        >
          CellWise
        </Link>

        <nav className="flex items-center gap-3 text-sm sm:gap-4">
          <NavLink href="/" label="All Puzzles" />
          {user && <NavLink href="/my-puzzles" label="My Puzzles" />}
        </nav>

        <div className="flex items-center gap-2 text-sm sm:gap-3 shrink-0">
          {isLoading ? (
            <span className="text-gray-500">…</span>
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
              <button
                onClick={logout}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded transition-colors hidden sm:inline-block"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
