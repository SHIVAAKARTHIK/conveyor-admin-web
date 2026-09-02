"use client";

import { useEffect, useMemo, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Badge } from "@/components/Badge";
import { api, apiErrorMessage } from "@/lib/api";
import type { ConsultationOut, ConsultationStatus } from "@/lib/types";

const FILTERS: { value: ConsultationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "requested", label: "Requested" },
  { value: "accepted", label: "Accepted" },
  { value: "completed", label: "Completed" },
];

function ConsultationsContent() {
  const [consultations, setConsultations] = useState<ConsultationOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ConsultationStatus | "all">("all");
  const [search, setSearch] = useState("");

  async function load() {
    try {
      const res = await api.get<ConsultationOut[]>("/consultations");
      setConsultations(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    return consultations
      .filter((c) => filter === "all" || c.status === filter)
      .filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (c.patient_name ?? "").toLowerCase().includes(q) ||
          (c.doctor_name ?? "").toLowerCase().includes(q) ||
          c.complaint.toLowerCase().includes(q)
        );
      });
  }, [consultations, filter, search]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = { requested: 0, accepted: 0, completed: 0 };
    for (const c of consultations) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    return byStatus;
  }, [consultations]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Consultations</h1>
          <p className="text-sm text-black/50 dark:text-white/50">
            Every patient consultation request: requested → accepted → completed (auto-completed once the doctor
            writes a prescription against it).
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg border border-black/15 dark:border-white/15 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              filter === f.value
                ? "bg-blue-600 text-white border-blue-600"
                : "border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {f.label}
            {f.value !== "all" && <span className="ml-1.5 opacity-70">({counts[f.value] ?? 0})</span>}
          </button>
        ))}
        <input
          placeholder="Search patient, doctor, or complaint…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto w-full max-w-xs rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-black/50 dark:text-white/50 bg-black/[0.02] dark:bg-white/[0.03]">
            <tr>
              <th className="p-3">Patient</th>
              <th className="p-3">Bed</th>
              <th className="p-3">Doctor</th>
              <th className="p-3">Complaint</th>
              <th className="p-3">Status</th>
              <th className="p-3">Requested</th>
              <th className="p-3">Accepted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-black/5 dark:border-white/10">
                <td className="p-3">{c.patient_name ?? "—"}</td>
                <td className="p-3">{c.patient_bed_no ?? "—"}</td>
                <td className="p-3">{c.doctor_name ?? "—"}</td>
                <td className="p-3 max-w-xs truncate" title={c.complaint}>
                  {c.complaint}
                </td>
                <td className="p-3">
                  <Badge value={c.status} />
                </td>
                <td className="p-3 text-black/60 dark:text-white/60">{new Date(c.created_at).toLocaleString()}</td>
                <td className="p-3 text-black/60 dark:text-white/60">
                  {c.accepted_at ? new Date(c.accepted_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-4 text-sm text-black/50 dark:text-white/50">
            {consultations.length === 0 ? "No consultations yet." : "No consultations match this filter."}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ConsultationsPage() {
  return (
    <ProtectedPage>
      <ConsultationsContent />
    </ProtectedPage>
  );
}
