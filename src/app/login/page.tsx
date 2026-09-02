"use client";

import { useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { apiErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@medidispense.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-8 shadow-sm"
      >
        <h1 className="text-lg font-semibold mb-1">MediDispense Admin</h1>
        <p className="text-sm text-black/50 dark:text-white/50 mb-6">
          Hospital admin sign-in for the smart medicine dispensing system.
        </p>

        <label className="block text-sm mb-1" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        />

        <label className="block text-sm mb-1" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        />

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-xs text-black/40 dark:text-white/40 mt-4">
          Default seed account: admin@medidispense.com / admin123 (change it after first login).
        </p>
      </form>
    </div>
  );
}
