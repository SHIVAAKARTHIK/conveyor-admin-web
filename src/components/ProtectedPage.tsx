"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

/** Wrap any page's content in this to require an authenticated admin session. */
export function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-black/60 dark:text-white/60">Loading…</div>;
  }
  if (!user) return null;

  return <>{children}</>;
}
