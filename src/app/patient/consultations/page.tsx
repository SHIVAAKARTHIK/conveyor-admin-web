"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Badge } from "@/components/Badge";
import { api, apiErrorMessage } from "@/lib/api";
import type { ConsultationOut } from "@/lib/types";

function MyConsultationsContent() {
  const [consultations, setConsultations] = useState<ConsultationOut[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My consultations</h1>
        <button
          onClick={load}
          className="text-sm px-3 py-1.5 rounded-lg border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {consultations.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-black/50 dark:text-white/50 mb-4">You haven't requested a consultation yet.</p>
          <Link href="/patient/find-doctor" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
            Find a doctor
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {consultations.map((c) => (
            <li key={c.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4 bg-white/60 dark:bg-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{c.doctor_name ?? "Doctor"}</span>
                <Badge value={c.status} />
              </div>
              <p className="text-sm text-black/60 dark:text-white/60">{c.complaint}</p>
              <p className="text-xs text-black/40 dark:text-white/40 mt-2">
                Requested {new Date(c.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MyConsultationsPage() {
  return (
    <ProtectedPage roles={["patient"]}>
      <MyConsultationsContent />
    </ProtectedPage>
  );
}
