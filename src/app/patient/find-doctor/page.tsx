"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProtectedPage } from "@/components/ProtectedPage";
import { api, apiErrorMessage } from "@/lib/api";
import type { DoctorOut } from "@/lib/types";

// Matches the specialities set up on the doctor side (User.department).
// Keep this list in sync with whatever the admin actually assigns doctors.
const SPECIALITIES = ["Cardiology", "Gastroenterology", "Nephrology", "Pulmonology"];

function FindDoctorContent() {
  const router = useRouter();
  const [speciality, setSpeciality] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorOut[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOut | null>(null);
  const [complaint, setComplaint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!speciality) return;
    setLoadingDoctors(true);
    setError(null);
    api
      .get<DoctorOut[]>("/doctors", { params: { speciality } })
      .then((res) => setDoctors(res.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoadingDoctors(false));
  }, [speciality]);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoctor) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/consultations", { doctor_id: selectedDoctor.id, complaint });
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-semibold">Request sent</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          {selectedDoctor?.name} has been notified. You'll see it update once they accept.
        </p>
        <button
          onClick={() => router.push("/patient/consultations")}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
        >
          View my consultations
        </button>
      </div>
    );
  }

  // Step 3: complaint form for the selected doctor
  if (selectedDoctor) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <button
          onClick={() => setSelectedDoctor(null)}
          className="text-sm text-black/50 dark:text-white/50 hover:underline mb-4"
        >
          ← Back to doctors
        </button>
        <h1 className="text-xl font-semibold mb-1">{selectedDoctor.name}</h1>
        <p className="text-sm text-black/50 dark:text-white/50 mb-6">{selectedDoctor.department}</p>

        <form onSubmit={handleRequest} className="space-y-3">
          <label className="block text-sm mb-1" htmlFor="complaint">
            What's going on?
          </label>
          <textarea
            id="complaint"
            required
            rows={4}
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            placeholder="e.g. stomach pain since 2 days"
            className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5"
          >
            {submitting ? "Sending…" : "Send request"}
          </button>
        </form>
      </div>
    );
  }

  // Step 2: doctor list for the chosen speciality
  if (speciality) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <button
          onClick={() => setSpeciality(null)}
          className="text-sm text-black/50 dark:text-white/50 hover:underline mb-4"
        >
          ← Back to specialities
        </button>
        <h1 className="text-xl font-semibold mb-6">{speciality}</h1>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
        {loadingDoctors && <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>}
        {!loadingDoctors && doctors.length === 0 && (
          <p className="text-sm text-black/50 dark:text-white/50">No doctors listed for this speciality yet.</p>
        )}

        <ul className="space-y-2">
          {doctors.map((doc) => (
            <li key={doc.id}>
              <button
                onClick={() => setSelectedDoctor(doc)}
                className="w-full flex items-center justify-between rounded-lg border border-black/10 dark:border-white/10 p-4 text-left hover:bg-black/5 dark:hover:bg-white/10"
              >
                <span className="font-medium text-sm">{doc.name}</span>
                <span className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${doc.is_available ? "bg-green-500" : "bg-gray-400"}`}
                  />
                  {doc.is_available ? "Available" : "Busy"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Step 1: speciality grid
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">Find a doctor</h1>
      <div className="grid grid-cols-2 gap-3">
        {SPECIALITIES.map((s) => (
          <button
            key={s}
            onClick={() => setSpeciality(s)}
            className="rounded-xl border border-black/10 dark:border-white/10 p-6 text-sm font-medium text-center hover:bg-black/5 dark:hover:bg-white/10"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FindDoctorPage() {
  return (
    <ProtectedPage roles={["patient"]}>
      <FindDoctorContent />
    </ProtectedPage>
  );
}
