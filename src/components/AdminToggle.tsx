"use client";

import { useAuth } from "@/contexts/AuthContext";

export function AdminToggle() {
  const { isAdmin, setRole } = useAuth();

  const handleToggle = () => {
    setRole(isAdmin ? "user" : "admin");
  };

  return (
    <button
      onClick={handleToggle}
      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
        isAdmin
          ? "bg-yellow-600 hover:bg-yellow-500 text-white"
          : "bg-gray-700 hover:bg-gray-600 text-gray-300"
      }`}
    >
      {isAdmin ? "Admin" : "User"}
    </button>
  );
}
