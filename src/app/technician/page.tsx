"use client";

import { useCallback, useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { StatTile } from "@/components/StatTile";
import { Badge } from "@/components/Badge";
import { HardwareControl } from "@/components/HardwareControl";
import { api, apiErrorMessage } from "@/lib/api";
import { useLiveChannel } from "@/lib/use-live-channel";
import type { AlertOut, ConveyorStatusOut, MotorStatus } from "@/lib/types";

function TechnicianContent() {
  const [conveyor, setConveyor] = useState<ConveyorStatusOut | null>(null);
  const [alerts, setAlerts] = useState<AlertOut[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  // Which alert has an action (acknowledge/resolve) in flight - disables
  // just that alert's buttons rather than the whole list.
  const [busyAlertId, setBusyAlertId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([
        api.get<ConveyorStatusOut>("/conveyor/status"),
        api.get<AlertOut[]>("/alerts"),
      ]);
      setConveyor(c.data);
      setAlerts(a.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Live updates over the same WebSocket channels the dashboard uses - a
  // jam reported from anywhere shows up here within the same second.
  useLiveChannel("conveyor", () => {
    api.get<ConveyorStatusOut>("/conveyor/status").then((r) => setConveyor(r.data));
  });
  useLiveChannel("alerts", () => {
    api.get<AlertOut[]>("/alerts").then((r) => setAlerts(r.data));
  });

  async function simulate(motor_status: MotorStatus) {
    setSimulating(true);
    setSimError(null);
    try {
      await api.post("/conveyor/simulate", {
        motor_status,
        position: "ward-corridor",
        speed: motor_status === "running" ? 1.0 : 0,
      });
    } catch (err) {
      setSimError(apiErrorMessage(err));
    } finally {
      setSimulating(false);
    }
  }

  async function acknowledge(id: string) {
    setBusyAlertId(id);
    try {
      await api.post(`/alerts/${id}/acknowledge`);
      await loadAll();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyAlertId(null);
    }
  }

  async function resolve(id: string) {
    setBusyAlertId(id);
    try {
      await api.post(`/alerts/${id}/resolve`, {});
      await loadAll();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyAlertId(null);
    }
  }

  const openAlerts = alerts.filter((a) => a.status === "open");
  const acknowledgedAlerts = alerts.filter((a) => a.status === "acknowledged");
  const resolvedAlerts = alerts.filter((a) => a.status === "resolved");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Conveyor status</h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          Live machine state and alerts routed to you.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatTile
          label="Conveyor status"
          value={conveyor ? <Badge value={conveyor.motor_status} /> : "—"}
          hint={conveyor?.position ?? undefined}
        />
        <StatTile label="Belt speed" value={conveyor ? conveyor.speed.toFixed(1) : "—"} />
        <StatTile
          label="Open alerts"
          value={openAlerts.length}
          hint={openAlerts.length > 0 ? "Needs attention" : "All clear"}
        />
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-1">Software simulator</h2>
        <p className="text-sm text-black/50 dark:text-white/50 mb-4">
          Drives the status shown above without touching real hardware — the same fallback the admin dashboard uses,
          for when the physical belt isn&apos;t available to demo.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => simulate("running")}
            disabled={simulating}
            className="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-50"
          >
            Start conveyor
          </button>
          <button
            onClick={() => simulate("idle")}
            disabled={simulating}
            className="px-3 py-1.5 rounded-md bg-gray-500 hover:bg-gray-600 text-white text-sm disabled:opacity-50"
          >
            Set idle
          </button>
          <button
            onClick={() => simulate("jammed")}
            disabled={simulating}
            className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50"
          >
            Simulate jam
          </button>
          <button
            onClick={() => simulate("failed")}
            disabled={simulating}
            className="px-3 py-1.5 rounded-md bg-red-800 hover:bg-red-900 text-white text-sm disabled:opacity-50"
          >
            Simulate motor failure
          </button>
        </div>
        {simError && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{simError}</p>}
      </section>

      <HardwareControl />

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-4">Open ({openAlerts.length})</h2>
        {openAlerts.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Nothing open.</p>
        ) : (
          <ul className="space-y-3">
            {openAlerts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge value={a.type} />
                    <span className="text-xs text-black/40 dark:text-white/40">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{a.message}</p>
                </div>
                <div className="shrink-0 flex gap-2">
                  <button
                    onClick={() => acknowledge(a.id)}
                    disabled={busyAlertId === a.id}
                    className="px-3 py-1.5 rounded-lg border border-black/15 dark:border-white/15 text-sm disabled:opacity-50"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => resolve(a.id)}
                    disabled={busyAlertId === a.id}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
                  >
                    Resolve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {acknowledgedAlerts.length > 0 && (
        <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
          <h2 className="font-medium mb-4">Acknowledged ({acknowledgedAlerts.length})</h2>
          <ul className="space-y-3">
            {acknowledgedAlerts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 rounded-lg border border-black/5 dark:border-white/10 p-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge value={a.type} />
                  </div>
                  <p className="text-sm">{a.message}</p>
                </div>
                <button
                  onClick={() => resolve(a.id)}
                  disabled={busyAlertId === a.id}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
                >
                  Resolve
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resolvedAlerts.length > 0 && (
        <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
          <h2 className="font-medium mb-4">Resolved ({resolvedAlerts.length})</h2>
          <ul className="space-y-2">
            {resolvedAlerts.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm text-black/60 dark:text-white/60">
                <span>{a.message}</span>
                <Badge value={a.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function TechnicianPage() {
  return (
    <ProtectedPage roles={["technician"]}>
      <TechnicianContent />
    </ProtectedPage>
  );
}
