"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/lib/types";

/** Every role logs into the same site now, so the nav has to change per
 * role rather than showing the admin's whole menu to everyone. Doctor,
 * technician and nurse links get filled in as those pages are built. */
const LINKS_BY_ROLE: Partial<Record<UserRole, { href: string; label: string }[]>> = {
  admin: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/patients", label: "Patients" },
    { href: "/users", label: "Staff" },
    { href: "/prescriptions", label: "Prescriptions & Deliveries" },
    { href: "/consultations", label: "Consultations" },
    { href: "/alerts", label: "Alerts" },
    { href: "/reports", label: "Reports" },
  ],
  patient: [
    { href: "/patient", label: "Home" },
    { href: "/patient/find-doctor", label: "Find a Doctor" },
    { href: "/patient/consultations", label: "My Consultations" },
  ],
  doctor: [{ href: "/doctor", label: "Consultations" }],
  technician: [{ href: "/technician", label: "Conveyor" }],
};

export function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;
  const links = LINKS_BY_ROLE[user.role] ?? [];

  return (
    <header className="border-b border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/30 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6 flex-wrap">
        <span className="font-semibold text-sm tracking-wide">MediDispense</span>
        <nav className="flex gap-1 flex-wrap text-sm">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "hover:bg-black/5 dark:hover:bg-white/10 text-black/70 dark:text-white/70"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-black/60 dark:text-white/60">{user.name}</span>
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-md border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
