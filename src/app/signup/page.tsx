"use client";

import { useState } from "react";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";
import { apiErrorMessage } from "@/lib/api";

export default function SignupPage() {
  const { signup } = useAuth();
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    bed_no: "1",
    email: "",
    password: "",
    phone: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        bed_no: form.bed_no,
        email: form.email,
        password: form.password,
        phone: form.phone || null,
      });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-8 shadow-sm"
      >
        <h1 className="text-lg font-semibold mb-1">Check in</h1>
        <p className="text-sm text-black/50 dark:text-white/50 mb-6">
          Create your account and pick your bed — no staff needed to get started.
        </p>

        <label className="block text-sm mb-1" htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full mb-4 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="age">
              Age
            </label>
            <input
              id="age"
              type="number"
              min={0}
              required
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="gender">
              Gender
            </label>
            <select
              id="gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <label className="block text-sm mb-1" htmlFor="bed">
          Bed
        </label>
        <select
          id="bed"
          value={form.bed_no}
          onChange={(e) => setForm({ ...form, bed_no: e.target.value })}
          className="w-full mb-4 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        >
          <option value="1">Bed 1</option>
          <option value="2">Bed 2</option>
        </select>

        <label className="block text-sm mb-1" htmlFor="phone">
          Phone (optional)
        </label>
        <input
          id="phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full mb-4 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        />

        <label className="block text-sm mb-1" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full mb-4 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        />

        <label className="block text-sm mb-1" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full mb-4 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        />

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5"
        >
          {submitting ? "Creating your account…" : "Check in"}
        </button>

        <p className="text-sm text-center text-black/60 dark:text-white/60 mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
