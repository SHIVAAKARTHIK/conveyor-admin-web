"use client";

import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Badge } from "@/components/Badge";
import { api, apiErrorMessage } from "@/lib/api";
import type { UserOut, UserRole } from "@/lib/types";

// Nurse and pharmacist are still valid roles in the backend (kept, not
// deleted, when the delivery flow was simplified to no-scan) but this
// project's flow never creates an account for either — trimmed from the
// picker so the demo doesn't invite "what's this for?" in the viva.
const ROLES: UserRole[] = ["doctor", "technician", "admin"];

function UsersContent() {
  const [users, setUsers] = useState<UserOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "doctor" as UserRole, phone: "", department: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get<UserOut[]>("/users");
      setUsers(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post("/users", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        phone: form.phone || null,
        department: form.department || null,
      });
      setForm({ name: "", email: "", password: "", role: "doctor", phone: "", department: "" });
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this staff account? This cannot be undone.")) return;
    try {
      await api.delete(`/users/${id}`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Staff accounts</h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          Create login accounts for doctors, and the technician account the conveyor station itself uses — this is who
          signs into the Android app (or, for technician, what the firmware authenticates as).
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-4">Add staff member</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs mb-1">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs mb-1">Email</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Temp password</label>
            <input required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs mb-1">Phone (optional)</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs mb-1">Department (optional)</label>
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-6">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium">
              {submitting ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
        {formError && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{formError}</p>}
      </section>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-4">All staff ({users.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-black/50 dark:text-white/50">
              <tr>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2 pr-4">Department</th>
                <th className="pb-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-2 pr-4">{u.name}</td>
                  <td className="py-2 pr-4">{u.email}</td>
                  <td className="py-2 pr-4">
                    <Badge value={u.role} />
                  </td>
                  <td className="py-2 pr-4">{u.department ?? "—"}</td>
                  <td className="py-2 pr-4 text-right">
                    <button onClick={() => handleDelete(u.id)} className="text-red-600 dark:text-red-400 hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedPage>
      <UsersContent />
    </ProtectedPage>
  );
}
