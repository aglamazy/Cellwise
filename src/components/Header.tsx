"use client";

import { AdminToggle } from "./AdminToggle";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <AdminToggle />
    </div>
  );
}
