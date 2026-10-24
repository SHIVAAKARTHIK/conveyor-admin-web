"use client";

import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Badge } from "@/components/Badge";
import { useAuth } from "@/lib/auth-context";
import { api, apiErrorMessage } from "@/lib/api";
import { useLiveChannel } from "@/lib/use-live-channel";
import type { ConsultationOut, DeliveryOut, MedicineCreate, PatientOut, UserOut } from "@/lib/types";

const EMPTY_MEDICINE: MedicineCreate = { name: "", dosage: "", form: "Tablet", qty: 1 };

function DoctorContent() {
  const { user } = useAuth();
  const [me, setMe] = useState<UserOut | null>(null);
  const [consultations, setConsultations] = useState<ConsultationOut[]>([]);
  const [patients, setPatients] = useState<PatientOut[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  // Which consultation is being accepted right now (disables just that button).
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // The prescribe modal - open only while a consultation is selected for it.
  const [prescribeFor, setPrescribeFor] = useState<ConsultationOut | null>(null);
  const [medicines, setMedicines] = useState<MedicineCreate[]>([EMPTY_MEDICINE]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    try {
      const [meRes, consultRes, patientsRes, deliveriesRes] = await Promise.all([
        api.get<UserOut>("/users/me"),
        api.get<ConsultationOut[]>("/consultations"),
        api.get<PatientOut[]>("/patients"),
        api.get<DeliveryOut[]>("/deliveries"),
      ]);
      setMe(meRes.data);
      setConsultations(consultRes.data);
      setPatients(patientsRes.data);
      setDeliveries(deliveriesRes.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  // The conveyor reports every step (dispatched, arrived, confirmed) on this
  // channel, so a prescription's delivery status updates here without a refresh.
  useLiveChannel("conveyor", () => {
    api.get<DeliveryOut[]>("/deliveries").then((r) => setDeliveries(r.data));
  });

  async function toggleAvailability() {
    if (!me) return;
    setTogglingAvailability(true);
    try {
      const res = await api.post<UserOut>("/users/me/availability", { is_available: !me.is_available });
      setMe(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setTogglingAvailability(false);
    }
  }

  async function acceptRequest(id: string) {
    setAcceptingId(id);
    setError(null);
    try {
      await api.post(`/consultations/${id}/accept`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setAcceptingId(null);
    }
  }

  function openPrescribe(c: ConsultationOut) {
    setPrescribeFor(c);
    setMedicines([EMPTY_MEDICINE]);
    setNotes("");
    setFormError(null);
  }

  function updateMedicine(i: number, patch: Partial<MedicineCreate>) {
    setMedicines((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  async function submitPrescription(e: React.FormEvent) {
    e.preventDefault();
    if (!prescribeFor) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post("/prescriptions", {
        patient_id: prescribeFor.patient_id,
        consultation_id: prescribeFor.id,
        notes: notes || null,
        medicines,
      });
      setPrescribeFor(null);
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const requested = consultations.filter((c) => c.status === "requested");
  const accepted = consultations.filter((c) => c.status === "accepted");
  const completed = consultations.filter((c) => c.status === "completed");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Hi, {user?.name}</h1>
          <p className="text-sm text-black/50 dark:text-white/50">
            {me?.department ? `${me.department} · ` : ""}Consultation requests and prescriptions.
          </p>
        </div>
        {me && (
          <button
            onClick={toggleAvailability}
            disabled={togglingAvailability}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${
              me.is_available
                ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                : "bg-gray-200 dark:bg-white/10 text-black/70 dark:text-white/70 border-black/15 dark:border-white/15"
            } disabled:opacity-50`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${me.is_available ? "bg-white" : "bg-gray-500"}`} />
            {me.is_available ? "Available" : "Busy"}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-4">Requested ({requested.length})</h2>
        {requested.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">No new requests.</p>
        ) : (
          <ul className="space-y-3">
            {requested.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-black/5 dark:border-white/10 p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {c.patient_name} — Bed {c.patient_bed_no}
                  </p>
                  <p className="text-sm text-black/60 dark:text-white/60">{c.complaint}</p>
                </div>
                <button
                  onClick={() => acceptRequest(c.id)}
                  disabled={acceptingId === c.id}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
                >
                  {acceptingId === c.id ? "Accepting…" : "Accept"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-4">Accepted — ready to prescribe ({accepted.length})</h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Nothing waiting on a prescription.</p>
        ) : (
          <ul className="space-y-3">
            {accepted.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-black/5 dark:border-white/10 p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {c.patient_name} — Bed {c.patient_bed_no}
                  </p>
                  <p className="text-sm text-black/60 dark:text-white/60">{c.complaint}</p>
                </div>
                <button
                  onClick={() => openPrescribe(c)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                >
                  Prescribe
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {completed.length > 0 && (
        <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
          <h2 className="font-medium mb-4">Completed ({completed.length})</h2>
          <ul className="space-y-2">
            {completed.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span>
                  {c.patient_name} — Bed {c.patient_bed_no}: {c.complaint}
                </span>
                <Badge value={c.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-1">Medicine deliveries</h2>
        <p className="text-sm text-black/50 dark:text-white/50 mb-4">
          Where each prescribed medicine is on its way to the bed. Updates live as the conveyor reports.
        </p>
        {deliveries.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">No deliveries yet.</p>
        ) : (
          <ul className="space-y-2">
            {deliveries.slice(0, 8).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 text-sm">
                <span>
                  {d.patient_name ?? "Patient"} — Bed {d.patient_bed_no ?? d.bed_no ?? "?"}
                  {d.medicines.length > 0 && (
                    <span className="text-black/50 dark:text-white/50">
                      {" "}
                      · {d.medicines.map((m) => m.name).join(", ")}
                    </span>
                  )}
                </span>
                <Badge value={d.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-4">Patients ({patients.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-black/50 dark:text-white/50">
              <tr>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Bed</th>
                <th className="pb-2 pr-4">Age</th>
                <th className="pb-2 pr-4">Gender</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-2 pr-4">{p.name}</td>
                  <td className="py-2 pr-4">{p.bed_no}</td>
                  <td className="py-2 pr-4">{p.age}</td>
                  <td className="py-2 pr-4">{p.gender}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {prescribeFor && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-20"
          onClick={() => setPrescribeFor(null)}
        >
          <form
            onSubmit={submitPrescription}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 p-6 shadow-sm max-h-[85vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold mb-1">Prescribe</h2>
            <p className="text-sm text-black/50 dark:text-white/50 mb-4">
              {prescribeFor.patient_name} — Bed {prescribeFor.patient_bed_no}
            </p>

            <div className="space-y-3 mb-3">
              {medicines.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    {i === 0 && <label className="block text-xs mb-1">Medicine</label>}
                    <input
                      required
                      value={m.name}
                      onChange={(e) => updateMedicine(i, { name: e.target.value })}
                      className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <label className="block text-xs mb-1">Dosage</label>}
                    <input
                      required
                      placeholder="650mg"
                      value={m.dosage}
                      onChange={(e) => updateMedicine(i, { dosage: e.target.value })}
                      className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <label className="block text-xs mb-1">Form</label>}
                    <select
                      value={m.form}
                      onChange={(e) => updateMedicine(i, { form: e.target.value })}
                      className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2 py-2 text-sm"
                    >
                      <option>Tablet</option>
                      <option>Capsule</option>
                      <option>Syrup</option>
                      <option>Injection</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    {i === 0 && <label className="block text-xs mb-1">Qty</label>}
                    <input
                      type="number"
                      min={1}
                      required
                      value={m.qty}
                      onChange={(e) => updateMedicine(i, { qty: Number(e.target.value) })}
                      className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-2 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-1">
                    {medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMedicines((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-red-600 dark:text-red-400 text-sm px-1"
                        aria-label="Remove medicine"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setMedicines((prev) => [...prev, { ...EMPTY_MEDICINE }])}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
            >
              + Add another medicine
            </button>

            <label className="block text-sm mb-1" htmlFor="notes">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mb-4 rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
            />

            {formError && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{formError}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPrescribeFor(null)}
                className="px-4 py-2 rounded-lg border border-black/15 dark:border-white/15 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
              >
                {submitting ? "Sending…" : "Send prescription"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function DoctorPage() {
  return (
    <ProtectedPage roles={["doctor"]}>
      <DoctorContent />
    </ProtectedPage>
  );
}
