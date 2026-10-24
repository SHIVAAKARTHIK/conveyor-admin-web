"use client";

import { useCallback, useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { StatTile } from "@/components/StatTile";
import { Badge } from "@/components/Badge";
import { HardwareControl } from "@/components/HardwareControl";
import { api, apiErrorMessage } from "@/lib/api";
import { useLiveChannel } from "@/lib/use-live-channel";
import type { AlertOut, ConveyorStatusOut, DeliveryOut, MotorStatus } from "@/lib/types";

const ACTIVE_STATUSES = ["preparing", "verifying", "in_transit", "arrived"];

function DashboardContent() {
  const [deliveries, setDeliveries] = useState<DeliveryOut[]>([]);
  const [alerts, setAlerts] = useState<AlertOut[]>([]);
  const [conveyor, setConveyor] = useState<ConveyorStatusOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [d, a, c] = await Promise.all([
        api.get<DeliveryOut[]>("/deliveries"),
        api.get<AlertOut[]>("/alerts"),
        api.get<ConveyorStatusOut>("/conveyor/status"),
      ]);
      setDeliveries(d.data);
      setAlerts(a.data);
      setConveyor(c.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Live updates: re-pull the relevant slice whenever the backend broadcasts an event.
  useLiveChannel("conveyor", () => {
    api.get<ConveyorStatusOut>("/conveyor/status").then((r) => setConveyor(r.data));
    api.get<DeliveryOut[]>("/deliveries").then((r) => setDeliveries(r.data));
  });
  useLiveChannel("alerts", () => {
    api.get<AlertOut[]>("/alerts").then((r) => setAlerts(r.data));
  });
  useLiveChannel("prescriptions", () => {
    api.get<DeliveryOut[]>("/deliveries").then((r) => setDeliveries(r.data));
  });

  async function simulate(motor_status: MotorStatus) {
    setSimulating(true);
    setSimError(null);
    try {
      await api.post("/conveyor/simulate", { motor_status, position: "ward-corridor", speed: motor_status === "running" ? 1.0 : 0 });
    } catch (err) {
      setSimError(apiErrorMessage(err));
    } finally {
      setSimulating(false);
    }
  }

  const activeDeliveries = deliveries.filter((d) => ACTIVE_STATUSES.includes(d.status));
  const openAlerts = alerts.filter((a) => a.status !== "resolved");
  const todayCount = deliveries.filter((d) => new Date(d.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          Live view of active deliveries, alerts, and conveyor status.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Active deliveries" value={activeDeliveries.length} />
        <StatTile label="Open alerts" value={openAlerts.length} hint={openAlerts.length > 0 ? "Needs attention" : "All clear"} />
        <StatTile
          label="Conveyor status"
          value={conveyor ? <Badge value={conveyor.motor_status} /> : "—"}
          hint={conveyor?.position ?? undefined}
        />
        <StatTile label="Deliveries today" value={todayCount} />
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-1">Conveyor simulator</h2>
        <p className="text-sm text-black/50 dark:text-white/50 mb-4">
          Dev-only panel standing in for the real ESP32 hardware. Buttons call the same{" "}
          <code className="text-xs bg-black/5 dark:bg-white/10 px-1 rounded">/conveyor/simulate</code> endpoint the
          firmware will call once it&apos;s wired up.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => simulate("running")} disabled={simulating} className="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-50">
            Start conveyor
          </button>
          <button onClick={() => simulate("idle")} disabled={simulating} className="px-3 py-1.5 rounded-md bg-gray-500 hover:bg-gray-600 text-white text-sm disabled:opacity-50">
            Set idle
          </button>
          <button onClick={() => simulate("jammed")} disabled={simulating} className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50">
            Simulate jam
          </button>
          <button onClick={() => simulate("failed")} disabled={simulating} className="px-3 py-1.5 rounded-md bg-red-800 hover:bg-red-900 text-white text-sm disabled:opacity-50">
            Simulate motor failure
          </button>
        </div>
        {simError && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{simError}</p>}
      </section>

      <HardwareControl />

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-4">Active deliveries</h2>
        {activeDeliveries.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Nothing in progress right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-black/50 dark:text-white/50">
                <tr>
                  <th className="pb-2 pr-4">Delivery</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {activeDeliveries.map((d) => (
                  <tr key={d.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2 pr-4 font-mono text-xs">{d.id.slice(0, 10)}…</td>
                    <td className="py-2 pr-4">
                      <Badge value={d.status} />
                    </td>
                    <td className="py-2 pr-4 text-black/60 dark:text-white/60">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <DashboardContent />
    </ProtectedPage>
  );
}
