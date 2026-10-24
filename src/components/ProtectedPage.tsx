"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ROLE_HOME, useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/lib/types";

/**
 * Wrap any page's content in this to require an authenticated session.
 *
 * Defaults to admin-only - that was the *effective* behaviour of every
 * existing page already, back when login() rejected every role except
 * admin. Now that doctors/technicians/patients can hold a valid token on
 * this same site, pages that should stay admin-only need this default to
 * keep working exactly as before with zero changes at their call sites.
 *
 * Pass `roles` to allow specific other roles instead - e.g.
 * `<ProtectedPage roles={["patient"]}>` for a patient-only page. A signed-in
 * user whose role isn't allowed is sent to their own home page, not bounced
 * to /login - they ARE signed in, just not allowed on this particular page.
 */
export function ProtectedPage({
  children,
  roles = ["admin"],
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!roles.includes(user.role)) {
      router.replace(ROLE_HOME[user.role] ?? "/login");
    }
    // roles is a fresh array on every render by design (default param) -
    // deliberately excluded so this doesn't loop; it's static per call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, router]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-black/60 dark:text-white/60">Loading…</div>;
  }
  if (!user || !roles.includes(user.role)) return null;

  return <>{children}</>;
}
