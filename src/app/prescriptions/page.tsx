"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Badge } from "@/components/Badge";
import { api, apiErrorMessage } from "@/lib/api";
import { useLiveChannel } from "@/lib/use-live-channel";
import type { DeliveryOut, PatientOut, PrescriptionOut } from "@/lib/types";

const STAGES: { key: keyof DeliveryOut; label: string }[] = [
  { key: "created_at", label: "Prescription created" },
  { key: "prepared_at", label: "Prepared by pharmacist" },
  { key: "verified_at", label: "Verified & dispatched by nurse" },
  { key: "arrived_at", label: "Arrived at bedside" },
  { key: "confirmed_at", label: "Delivery confirmed" },
];

function PrescriptionsContent() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionOut[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryOut[]>([]);
  const [patients, setPatients] = useState<PatientOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ label: string; image: string; code: string } | null>(null);

  async function load() {
    try {
      const [rx, dv, pt] = await Promise.all([
        api.get<PrescriptionOut[]>("/prescriptions"),
        api.get<DeliveryOut[]>("/deliveries"),
        api.get<PatientOut[]>("/patients"),
      ]);
      setPrescriptions(rx.data);
      setDeliveries(dv.data);
      setPatients(pt.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  useLiveChannel("conveyor", load);
  useLiveChannel("alerts", load);
  useLiveChannel("prescriptions", load);

  const patientById = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const deliveryByRx = useMemo(() => new Map(deliveries.map((d) => [d.prescription_id, d])), [deliveries]);

  const rows = useMemo(() => {
    return prescriptions
      .map((rx) => ({ rx, patient: patientById.get(rx.patient_id), delivery: deliveryByRx.get(rx.id) }))
      .filter(({ patient }) => !search || patient?.name.toLowerCase().includes(search.toLowerCase()));
  }, [prescriptions, patientById, deliveryByRx, search]);

  async function showPatientQr(patientId: string, label: string) {
    try {
      const res = await api.get(`/patients/${patientId}/qr`);
      setQrModal({ label, image: res.data.qr_image_base64, code: res.data.qr_code });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function showMedicineQr(medicineId: string, label: string) {
    try {
      const res = await api.get(`/prescriptions/medicines/${medicineId}/qr`);
      setQrModal({ label, image: res.data.qr_image_base64, code: res.data.medicine_code });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Prescriptions & Deliveries</h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          Every prescription and its delivery pipeline: preparing → verifying → in transit → arrived → confirmed.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <input
        placeholder="Search by patient name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
      />

      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-black/50 dark:text-white/50 bg-black/[0.02] dark:bg-white/[0.03]">
            <tr>
              <th className="p-3">Patient</th>
              <th className="p-3">Bed</th>
              <th className="p-3">Medicines</th>
              <th className="p-3">Prescription status</th>
              <th className="p-3">Delivery status</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ rx, patient, delivery }) => (
              <Fragment key={rx.id}>
                <tr
                  onClick={() => setExpanded(expanded === rx.id ? null : rx.id)}
                  className="border-t border-black/5 dark:border-white/10 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                >
                  <td className="p-3">{patient?.name ?? "—"}</td>
                  <td className="p-3">{patient?.bed_no ?? "—"}</td>
                  <td className="p-3">{rx.medicines.map((m) => m.name).join(", ")}</td>
                  <td className="p-3">
                    <Badge value={rx.status} />
                  </td>
                  <td className="p-3">{delivery ? <Badge value={delivery.status} /> : "—"}</td>
                  <td className="p-3 text-black/60 dark:text-white/60">{new Date(rx.created_at).toLocaleString()}</td>
                </tr>
                {expanded === rx.id && (
                  <tr className="border-t border-black/5 dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02]">
                    <td colSpan={6} className="p-4">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40 mb-2">
                            Medicines - scan these for the nurse&apos;s verify step
                          </p>
                          {patient && (
                            <button
                              onClick={() => showPatientQr(patient.id, `${patient.name} (patient wristband)`)}
                              className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-2 block"
                            >
                              View patient QR
                            </button>
                          )}
                          <ul className="text-sm space-y-1">
                            {rx.medicines.map((m) => (
                              <li key={m.id} className="flex items-center gap-2">
                                <span>
                                  {m.name} — {m.dosage}, {m.form} x{m.qty}
                                </span>
                                <button
                                  onClick={() => showMedicineQr(m.id, `${m.name} (${m.dosage})`)}
                                  className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                >
                                  View QR
                                </button>
                              </li>
                            ))}
                          </ul>
                          {rx.notes && <p className="text-sm mt-3 text-black/60 dark:text-white/60">Notes: {rx.notes}</p>}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40 mb-2">Delivery timeline</p>
                          {delivery ? (
                            <ol className="text-sm space-y-1">
                              {STAGES.map((s) => {
                                const value = delivery[s.key] as string | null;
                                return (
                                  <li key={s.key} className={value ? "" : "text-black/30 dark:text-white/30"}>
                                    {value ? "✅" : "⬜"} {s.label}
                                    {value ? ` — ${new Date(value).toLocaleString()}` : ""}
                                  </li>
                                );
                              })}
                            </ol>
                          ) : (
                            <p className="text-sm text-black/50 dark:text-white/50">No delivery record.</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-sm text-black/50 dark:text-white/50">No prescriptions yet.</p>}
      </div>

      {qrModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-20" onClick={() => setQrModal(null)}>
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium mb-1">{qrModal.label}</p>
            <p className="text-xs text-black/40 dark:text-white/40 mb-3">{qrModal.code}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrModal.image} alt={`QR code for ${qrModal.label}`} className="w-56 h-56 mx-auto" />
            <button onClick={() => setQrModal(null)} className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrescriptionsPage() {
  return (
    <ProtectedPage>
      <PrescriptionsContent />
    </ProtectedPage>
  );
}
