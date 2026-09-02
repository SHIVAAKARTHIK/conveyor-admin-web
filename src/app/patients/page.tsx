"use client";

import { useEffect, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";
import { api, apiErrorMessage } from "@/lib/api";
import type { PatientOut } from "@/lib/types";

function PatientsContent() {
  const [patients, setPatients] = useState<PatientOut[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [qrPatient, setQrPatient] = useState<{ name: string; image: string } | null>(null);

  const [form, setForm] = useState({ name: "", age: "", gender: "Male", bed_no: "", medical_history_notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get<PatientOut[]>("/patients");
      setPatients(res.data);
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
      await api.post("/patients", {
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        bed_no: form.bed_no,
        medical_history_notes: form.medical_history_notes || null,
      });
      setForm({ name: "", age: "", gender: "Male", bed_no: "", medical_history_notes: "" });
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function showQr(patient: PatientOut) {
    try {
      const res = await api.get(`/patients/${patient.id}/qr`);
      setQrPatient({ name: patient.name, image: res.data.qr_image_base64 });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Patients</h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          Register patients and print their wristband QR codes. (Note: patient registration normally happens from the
          Doctor role in the Android app; this form is here so admins can also do it directly.)
        </p>
      </div>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-4">Register new patient</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs mb-1">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Age</label>
            <input required type="number" min={0} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs mb-1">Gender</label>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm">
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1">Bed no.</label>
            <input required value={form.bed_no} onChange={(e) => setForm({ ...form, bed_no: e.target.value })} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-5">
            <label className="block text-xs mb-1">Medical history notes (optional)</label>
            <input value={form.medical_history_notes} onChange={(e) => setForm({ ...form, medical_history_notes: e.target.value })} className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-5">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium">
              {submitting ? "Registering…" : "Register patient"}
            </button>
          </div>
        </form>
        {formError && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{formError}</p>}
      </section>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-4">All patients ({patients.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-black/50 dark:text-white/50">
              <tr>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Age</th>
                <th className="pb-2 pr-4">Gender</th>
                <th className="pb-2 pr-4">Bed</th>
                <th className="pb-2 pr-4">Account</th>
                <th className="pb-2 pr-4">QR</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-2 pr-4">{p.name}</td>
                  <td className="py-2 pr-4">{p.age}</td>
                  <td className="py-2 pr-4">{p.gender}</td>
                  <td className="py-2 pr-4">{p.bed_no}</td>
                  <td className="py-2 pr-4">
                    {p.has_account ? (
                      <span className="text-green-700 dark:text-green-400">Self-registered</span>
                    ) : (
                      <span className="text-black/40 dark:text-white/40">Staff-registered</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <button onClick={() => showQr(p)} className="text-blue-600 dark:text-blue-400 hover:underline">
                      View QR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {qrPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-20" onClick={() => setQrPatient(null)}>
          <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="font-medium mb-3">{qrPatient.name}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrPatient.image} alt={`QR code for ${qrPatient.name}`} className="w-48 h-48 mx-auto" />
            <button onClick={() => setQrPatient(null)} className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientsPage() {
  return (
    <ProtectedPage>
      <PatientsContent />
    </ProtectedPage>
  );
}
