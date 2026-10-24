"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Direct control of the ESP32 conveyor over the local network.
 *
 * The browser talks to the board's own small HTTP server (see the firmware's
 * webServerSetup). This does not go through the backend, so it only works
 * from a machine on the same WiFi as the conveyor, and the page must be served
 * over plain http (an https page is not allowed to call an http device). */

const DEFAULT_URL = "http://conveyor.local";
const STORAGE_KEY = "medidispense_conveyor_url";
const POLL_MS = 1500;

interface DeviceStatus {
  belt_running: boolean;
  belt_speed: number;
  ir1: "HIGH" | "LOW";
  ir2: "HIGH" | "LOW";
  servo1_deg: number;
  servo2_deg: number;
  wifi_rssi: number;
  ip: string;
  // Added by the H6 firmware; absent on older builds, so all optional.
  mode?: "delivery" | "bench" | "manual";
  h6_state?: "idle" | "loading" | "running";
  job_bed?: number;
}

const MODE_TEXT: Record<string, string> = {
  delivery: "Delivery mode",
  bench: "Bench test mode",
  manual: "Manual mode",
};

function jobSummary(s: DeviceStatus): string | null {
  if (s.mode !== "delivery" || !s.h6_state) return null;
  if (s.h6_state === "idle") return "Waiting for a prescription.";
  if (s.h6_state === "loading") return `A box for Bed ${s.job_bed} is waiting. Load it and press the machine's button.`;
  return `Delivering to Bed ${s.job_bed}…`;
}

async function callDevice<T>(base: string, path: string, method: "GET" | "POST", timeoutMs: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, { method, signal: ctrl.signal });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.error ? `Device refused: ${body.error}` : `Device replied ${res.status}`);
    }
    return body as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("The conveyor did not answer in time.");
    }
    if (err instanceof TypeError) {
      throw new Error("Cannot reach the conveyor. Check it is powered, on the same WiFi, and the address is right.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function readSavedUrl(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
  } catch {
    return DEFAULT_URL;
  }
}

export function HardwareControl() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_URL);
  const [draftUrl, setDraftUrl] = useState(DEFAULT_URL);
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const pollingPaused = useRef(false);

  useEffect(() => {
    // Read the saved address after mount (it lives in the browser, so it cannot
    // be part of the server-rendered first paint).
    const id = setTimeout(() => {
      const saved = readSavedUrl();
      setBaseUrl(saved);
      setDraftUrl(saved);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const refresh = useCallback(async () => {
    if (pollingPaused.current) return;
    try {
      const s = await callDevice<DeviceStatus>(baseUrl, "/status", "GET", 4000);
      setStatus(s);
      setReachable(true);
    } catch {
      setReachable(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const id = setInterval(refresh, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [refresh]);

  async function send(label: string, path: string) {
    setBusy(label);
    setError(null);
    setMessage(null);
    // A push blocks the board for about a second; pause polling so the status
    // request does not pile up behind it.
    pollingPaused.current = true;
    try {
      await callDevice(baseUrl, path, "POST", 8000);
      setMessage(`${label}: sent`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      pollingPaused.current = false;
      setBusy(null);
      refresh();
    }
  }

  function saveUrl() {
    const cleaned = draftUrl.trim().replace(/\/+$/, "");
    if (!/^http:\/\/[^\s/]+$/.test(cleaned)) {
      setError("Enter the address like http://conveyor.local or http://192.168.68.103");
      return;
    }
    setError(null);
    try {
      window.localStorage.setItem(STORAGE_KEY, cleaned);
    } catch {
      /* saving the address is a convenience only */
    }
    setBaseUrl(cleaned);
  }

  const disabled = busy !== null || reachable === false;
  const boxA = status?.ir1 === "LOW";
  const boxB = status?.ir2 === "LOW";

  return (
    <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
        <h2 className="font-medium">Live hardware control</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full border ${
            reachable === null
              ? "border-black/15 dark:border-white/15 text-black/50 dark:text-white/50"
              : reachable
                ? "border-green-600 text-green-700 dark:text-green-400"
                : "border-red-600 text-red-700 dark:text-red-400"
          }`}
        >
          {reachable === null ? "Checking…" : reachable ? "Conveyor online" : "Conveyor not reachable"}
        </span>
      </div>
      <p className="text-sm text-black/50 dark:text-white/50 mb-4">
        Sends commands straight to the conveyor over your WiFi. Works from a computer on the same network.
      </p>

      {status && reachable && status.mode && (
        <p className="text-sm mb-3">
          <span className="font-medium">{MODE_TEXT[status.mode] ?? status.mode}</span>
          {jobSummary(status) && (
            <span className="text-black/60 dark:text-white/60"> — {jobSummary(status)}</span>
          )}
        </p>
      )}

      {status && reachable && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
          <div className="rounded-lg border border-black/10 dark:border-white/10 p-3">
            <div className="text-black/50 dark:text-white/50 text-xs">Belt</div>
            <div className="font-medium">{status.belt_running ? "Running" : "Stopped"}</div>
            <div className="text-xs text-black/40 dark:text-white/40">speed {status.belt_speed}/255</div>
          </div>
          <div className="rounded-lg border border-black/10 dark:border-white/10 p-3">
            <div className="text-black/50 dark:text-white/50 text-xs">Sensor A (Bed 1)</div>
            <div className={`font-medium ${boxA ? "text-red-600 dark:text-red-400" : ""}`}>
              {boxA ? "Box seen" : "Clear"}
            </div>
          </div>
          <div className="rounded-lg border border-black/10 dark:border-white/10 p-3">
            <div className="text-black/50 dark:text-white/50 text-xs">Sensor B (Bed 2)</div>
            <div className={`font-medium ${boxB ? "text-red-600 dark:text-red-400" : ""}`}>
              {boxB ? "Box seen" : "Clear"}
            </div>
          </div>
          <div className="rounded-lg border border-black/10 dark:border-white/10 p-3">
            <div className="text-black/50 dark:text-white/50 text-xs">WiFi</div>
            <div className="font-medium">{status.wifi_rssi} dBm</div>
            <div className="text-xs text-black/40 dark:text-white/40">{status.ip}</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => send("Start belt", "/start")}
          disabled={disabled}
          className="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-50"
        >
          Start belt
        </button>
        <button
          onClick={() => send("Stop belt", "/stop")}
          disabled={busy !== null}
          className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50"
        >
          Stop belt
        </button>
        <button
          onClick={() => send("Push Bed 1", "/push?bed=1")}
          disabled={disabled}
          className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
        >
          Push Bed 1
        </button>
        <button
          onClick={() => send("Push Bed 2", "/push?bed=2")}
          disabled={disabled}
          className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
        >
          Push Bed 2
        </button>
        <button
          onClick={() => send("Beep", "/beep")}
          disabled={disabled}
          className="px-3 py-1.5 rounded-md bg-gray-500 hover:bg-gray-600 text-white text-sm disabled:opacity-50"
        >
          Beep
        </button>
      </div>

      {busy && <p className="text-sm text-black/50 dark:text-white/50 mt-3">Sending: {busy}…</p>}
      {message && !busy && <p className="text-sm text-green-700 dark:text-green-400 mt-3">{message}</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-black/60 dark:text-white/60">Conveyor address</summary>
        <div className="flex gap-2 mt-2 flex-wrap items-center">
          <input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-black/15 dark:border-white/15 bg-transparent text-sm w-64"
            aria-label="Conveyor address"
          />
          <button
            onClick={saveUrl}
            className="px-3 py-1.5 rounded-md border border-black/15 dark:border-white/15 text-sm"
          >
            Save
          </button>
          <span className="text-xs text-black/40 dark:text-white/40">
            If conveyor.local stops working, enter the IP address shown above, like http://192.168.68.103
          </span>
        </div>
      </details>
    </section>
  );
}
