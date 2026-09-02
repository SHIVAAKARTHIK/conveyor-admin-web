"use client";

import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Badge } from "@/components/Badge";
import { api, apiErrorMessage } from "@/lib/api";
import { useLiveChannel } from "@/lib/use-live-channel";
import type { AlertOut } from "@/lib/types";

function AlertsContent() {
  const [alerts, setAlerts] = useState<AlertOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get<AlertOut[]>("/alerts");
      setAlerts(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  useLiveChannel("alerts", load);

  async function resolve(id: string) {
    setBusyId(id);
    try {
      await api.post(`/alerts/${id}/resolve`, { resolution_note: "Resolved from admin dashboard" });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function acknowledge(id: string) {
    setBusyId(id);
    try {
      await api.post(`/alerts/${id}/acknowledge`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const open = alerts.filter((a) => a.status !== "resolved");
  const resolved = alerts.filter((a) => a.status === "resolved");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Alerts</h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          Medicine mismatches and conveyor/motor failures, live from the delivery pipeline.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-4">Open ({open.length})</h2>
        {open.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">No open alerts. All clear.</p>
        ) : (
          <ul className="space-y-3">
            {open.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 border-b border-black/5 dark:border-white/10 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge value={a.type} />
                    <Badge value={a.status} />
                    <span className="text-xs text-black/40 dark:text-white/40">for {a.target_role}</span>
                  </div>
                  <p className="text-sm">{a.message}</p>
                  <p className="text-xs text-black/40 dark:text-white/40 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {a.status === "open" && (
                    <button
                      disabled={busyId === a.id}
                      onClick={() => acknowledge(a.id)}
                      className="px-3 py-1.5 rounded-md border border-black/15 dark:border-white/20 text-xs hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    disabled={busyId === a.id}
                    onClick={() => resolve(a.id)}
                    className="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-xs disabled:opacity-50"
                  >
                    Resolve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-4">Resolved ({resolved.length})</h2>
        <ul className="space-y-2 text-sm">
          {resolved.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-black/60 dark:text-white/60">
              <Badge value={a.type} />
              <span>{a.message}</span>
              <span className="text-xs text-black/40 dark:text-white/40">
                resolved {a.resolved_at ? new Date(a.resolved_at).toLocaleString() : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <ProtectedPage>
      <AlertsContent />
    </ProtectedPage>
  );
}
