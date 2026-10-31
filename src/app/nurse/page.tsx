"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/Badge";
import { ProtectedPage } from "@/components/ProtectedPage";
import { StatTile } from "@/components/StatTile";
import { api, apiErrorMessage } from "@/lib/api";
import { useLiveChannel } from "@/lib/use-live-channel";
import type { DeliveryOut, PatientOut, PrescriptionOut } from "@/lib/types";

function NurseContent() {
  const [deliveries, setDeliveries] = useState<DeliveryOut[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadDeliveries = useCallback(async () => {
    try {
      const res = await api.get<DeliveryOut[]>("/deliveries");
      setDeliveries(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadDeliveries();
    const interval = setInterval(loadDeliveries, 8000);
    return () => clearInterval(interval);
  }, [loadDeliveries]);

  // The conveyor reports arrival over the same channel, so a box that has just
  // landed in a bed chute shows up here without a refresh.
  useLiveChannel("conveyor", loadDeliveries);

  // Demo helper for a bench without a barcode scanner: looks the wristband code
  // up from the patient record. A real USB/phone scanner types the same code
  // into the field, so the confirm step below is unchanged either way.
  async function fillFromRecord(d: DeliveryOut) {
    setError(null);
    try {
      const rx = await api.get<PrescriptionOut>(`/prescriptions/${d.prescription_id}`);
      const patient = await api.get<PatientOut>(`/patients/${rx.data.patient_id}`);
      setCodes((c) => ({ ...c, [d.id]: patient.data.qr_code }));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function confirm(d: DeliveryOut) {
    const code = (codes[d.id] ?? "").trim();
    if (!code) {
      setError("Scan or enter the patient's wristband code first.");
      return;
    }
    setBusyId(d.id);
    setError(null);
    setNotice(null);
    try {
      await api.post(`/deliveries/${d.id}/confirm`, { delivery_id: d.id, scanned_patient_qr: code });
      setNotice(`Delivery to ${d.patient_name ?? "the patient"} (Bed ${d.patient_bed_no ?? d.bed_no ?? "?"}) confirmed.`);
      setCodes((c) => ({ ...c, [d.id]: "" }));
      await loadDeliveries();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const arrived = deliveries.filter((d) => d.status === "arrived");
  const onTheWay = deliveries.filter((d) => d.status === "preparing" || d.status === "verifying" || d.status === "in_transit");
  const recent = deliveries
    .filter((d) => d.status === "confirmed")
    .sort((a, b) => (b.confirmed_at ?? "").localeCompare(a.confirmed_at ?? ""))
    .slice(0, 5);

  const label = (d: DeliveryOut) => `${d.patient_name ?? "Patient"} — Bed ${d.patient_bed_no ?? d.bed_no ?? "?"}`;
  const meds = (d: DeliveryOut) => d.medicines.map((m) => `${m.name} ${m.dosage} ×${m.qty}`).join(", ") || "Medicine details pending";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Bedside confirmation</h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          When a box lands at a bed, check the wristband and confirm it here. This closes the delivery and marks the
          prescription as delivered.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {notice && <p className="text-sm text-green-700 dark:text-green-400">{notice}</p>}

      <div className="grid grid-cols-3 gap-4">
        <StatTile label="Ready to confirm" value={arrived.length} hint={arrived.length > 0 ? "At the bed now" : "None waiting"} />
        <StatTile label="On the way" value={onTheWay.length} />
        <StatTile label="Confirmed (latest)" value={recent.length} />
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-1">Ready to confirm ({arrived.length})</h2>
        <p className="text-sm text-black/50 dark:text-white/50 mb-4">
          Scan the patient&apos;s wristband QR (a scanner types its code into the box), then press Confirm. The code
          must match the patient this delivery was prescribed for.
        </p>
        {arrived.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Nothing has arrived yet.</p>
        ) : (
          <ul className="space-y-3">
            {arrived.map((d) => (
              <li key={d.id} className="rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/30 p-3 space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge value={d.status} />
                    <span className="text-sm font-medium">{label(d)}</span>
                  </div>
                  <p className="text-xs text-black/50 dark:text-white/50">{meds(d)}</p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <input
                    value={codes[d.id] ?? ""}
                    onChange={(e) => setCodes((c) => ({ ...c, [d.id]: e.target.value }))}
                    placeholder="Patient wristband code"
                    aria-label={`Wristband code for ${label(d)}`}
                    className="flex-1 min-w-48 rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-black/30 px-3 py-1.5 text-sm font-mono"
                  />
                  <button
                    onClick={() => fillFromRecord(d)}
                    className="px-3 py-1.5 rounded-lg border border-black/15 dark:border-white/15 text-sm"
                    title="For a bench without a scanner: reads the code from the patient record"
                  >
                    Fill from record (demo)
                  </button>
                  <button
                    onClick={() => confirm(d)}
                    disabled={busyId === d.id}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
                  >
                    Confirm delivery
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-4">On the way ({onTheWay.length})</h2>
        {onTheWay.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Nothing in progress.</p>
        ) : (
          <ul className="space-y-3">
            {onTheWay.map((d) => (
              <li key={d.id} className="rounded-lg border border-black/5 dark:border-white/10 p-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge value={d.status} />
                  <span className="text-sm">{label(d)}</span>
                </div>
                <p className="text-xs text-black/50 dark:text-white/50">{meds(d)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-4">Recently confirmed</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">No confirmed deliveries yet.</p>
        ) : (
          <ul className="space-y-3">
            {recent.map((d) => (
              <li key={d.id} className="rounded-lg border border-black/5 dark:border-white/10 p-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge value={d.status} />
                  <span className="text-sm">{label(d)}</span>
                  <span className="text-xs text-black/40 dark:text-white/40 ml-auto">
                    {d.confirmed_at ? new Date(d.confirmed_at).toLocaleString() : ""}
                  </span>
                </div>
                <p className="text-xs text-black/50 dark:text-white/50">{meds(d)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function NursePage() {
  return (
    <ProtectedPage roles={["nurse", "admin"]}>
      <NurseContent />
    </ProtectedPage>
  );
}
