"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Badge } from "@/components/Badge";
import { api, apiErrorMessage } from "@/lib/api";
import type { DeliveryOut, PatientOut } from "@/lib/types";

/** Friendlier phrasing than the raw status for what a patient actually cares
 * about — the admin/staff pages show the raw status since it's precise and
 * they know what it means; a patient just wants plain words. */
const STATUS_MESSAGE: Record<DeliveryOut["status"], string> = {
  preparing: "Being prepared",
  verifying: "Being checked",
  in_transit: "On the way",
  arrived: "Arrived at your bed",
  confirmed: "Delivered",
  failed: "There was a problem — a staff member has been notified",
};

function PatientHomeContent() {
  const [patient, setPatient] = useState<PatientOut | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryOut[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [meRes, deliveriesRes] = await Promise.all([
        api.get<PatientOut>("/patients/me"),
        api.get<DeliveryOut[]>("/deliveries"),
      ]);
      setPatient(meRes.data);
      setDeliveries(deliveriesRes.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000); // simple live-ish refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {patient ? `Hi, ${patient.name}` : "Welcome"}
        </h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          {patient ? `Bed ${patient.bed_no}` : "Loading your details…"}
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Your deliveries</h2>
          <button
            onClick={load}
            className="text-sm px-3 py-1.5 rounded-lg border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
        {deliveries.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            No deliveries yet — once a doctor prescribes something for you, it shows up here.
          </p>
        ) : (
          <ul className="space-y-3">
            {deliveries.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-black/5 dark:border-white/10 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{STATUS_MESSAGE[d.status]}</p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    {d.medicines.map((m) => m.name).join(", ") || "Medicine details pending"}
                  </p>
                </div>
                <Badge value={d.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
        <h2 className="font-medium mb-2">Need to see a doctor?</h2>
        <p className="text-sm text-black/50 dark:text-white/50 mb-4">
          Browse by speciality and send a request — they'll accept it and prescribe from there.
        </p>
        <Link
          href="/patient/find-doctor"
          className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
        >
          Find a doctor
        </Link>
      </section>
    </div>
  );
}

export default function PatientHomePage() {
  return (
    <ProtectedPage roles={["patient"]}>
      <PatientHomeContent />
    </ProtectedPage>
  );
}
