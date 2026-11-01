"use client";

import { useEffect, useRef, useState } from "react";

import { ProtectedPage } from "@/components/ProtectedPage";

/** Installs the conveyor firmware onto an ESP32 straight from the browser (Web Serial + esptool-js).
 *
 * The firmware files are built by `flash.ps1 -Export` in the firmware repo and live in
 * /public/firmware (bootloader, partition table, boot_app0 and the app, with their flash addresses in
 * manifest.json). They are built from the placeholder config, so they carry no WiFi password: the board's
 * own setup page asks for the WiFi afterwards. Web Serial only exists in Chrome and Edge on a computer,
 * and only on https or localhost. */

interface ManifestFile {
  path: string;
  address: number;
  size: number;
}
interface Manifest {
  name: string;
  chip: string;
  version: string;
  files: ManifestFile[];
}

type Phase = "idle" | "connecting" | "flashing" | "done" | "error";

function friendlyError(err: unknown): string {
  if (err instanceof DOMException && err.name === "NotFoundError") {
    return "No board was chosen. Press the button again and pick the board's COM port in the popup.";
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (/failed to open|already open|in use|networkerror/i.test(msg)) {
    return "The board's port could not be opened. Close anything else using it (Arduino IDE, a serial monitor, another browser tab) and try again.";
  }
  if (/connect|sync|timeout|wrong boot mode|no serial data/i.test(msg)) {
    return "Could not talk to the board. Hold the BOOT button on the board while you press the install button, release it when the log says it is writing, and try again. Also check the USB cable carries data.";
  }
  return msg;
}

function FlasherContent() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [keepSettings, setKeepSettings] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [chip, setChip] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    // Both of these depend on the browser, so they are read after mount.
    const id = setTimeout(() => {
      setSupported(typeof navigator !== "undefined" && "serial" in navigator);
    }, 0);
    fetch("/firmware/manifest.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Manifest>;
      })
      .then(setManifest)
      .catch(() =>
        setManifestError(
          "The firmware files are missing. In the firmware folder run:  powershell -ExecutionPolicy Bypass -File .\\flash.ps1 -Export ..\\admin-web\\public\\firmware",
        ),
      );
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  function log(text: string) {
    setLines((l) => [...l.slice(-200), text]);
  }

  async function install() {
    if (!manifest) return;
    setError(null);
    setLines([]);
    setProgress(0);
    setChip(null);
    setPhase("connecting");

    let transport: { disconnect: () => Promise<void> } | null = null;
    try {
      const { ESPLoader, Transport } = await import("esptool-js");

      // Fetch the files first so a missing file fails before the board is touched.
      const images: { data: Uint8Array; address: number }[] = [];
      for (const f of manifest.files) {
        const res = await fetch(`/firmware/${f.path}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Could not load ${f.path} (HTTP ${res.status})`);
        const data = new Uint8Array(await res.arrayBuffer());
        if (data.length !== f.size) throw new Error(`${f.path} has the wrong size (${data.length}, expected ${f.size})`);
        images.push({ data, address: f.address });
      }
      log(`Loaded ${images.length} firmware files (${manifest.version}).`);

      log("Choose the board's COM port in the popup...");
      const port = await navigator.serial.requestPort();
      const t = new Transport(port, false);
      transport = t;
      const terminal = {
        clean: () => setLines([]),
        writeLine: (d: string) => log(d),
        write: (d: string) => log(d),
      };
      const loader = new ESPLoader({ transport: t, baudrate: 460800, romBaudrate: 115200, terminal });
      const description = await loader.main();
      setChip(description);
      log(`Connected: ${description}`);

      setPhase("flashing");
      const total = images.reduce((n, i) => n + i.data.length, 0);
      const done: number[] = images.map(() => 0);
      await loader.writeFlash({
        fileArray: images,
        flashMode: "keep",
        flashFreq: "keep",
        flashSize: "keep",
        eraseAll: !keepSettings,
        compress: true,
        reportProgress: (index, written, size) => {
          done[index] = Math.min(written, size);
          const sum = done.reduce((a, b) => a + b, 0);
          setProgress(Math.min(100, Math.round((sum / total) * 100)));
        },
      });
      setProgress(100);
      log("Written. Restarting the board...");
      await loader.after();
      await t.disconnect();
      transport = null;
      setPhase("done");
    } catch (err) {
      log(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setError(friendlyError(err));
      setPhase("error");
      try {
        await transport?.disconnect();
      } catch {
        /* the port may already be closed */
      }
    }
  }

  const busy = phase === "connecting" || phase === "flashing";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Install the conveyor firmware</h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          Put the firmware on a new or updated ESP32 board straight from this page. No command line needed.
        </p>
      </div>

      {supported === false && (
        <div className="rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 text-sm">
          <p className="font-medium mb-1">This browser cannot talk to the board</p>
          <p>
            Installing from the browser needs <b>Chrome or Edge on a computer</b>, opened at <code>http://localhost:3000</code>{" "}
            or over https. Firefox and Safari do not support it. You can still install with the flash script in the
            firmware folder: <code>powershell -ExecutionPolicy Bypass -File .\flash.ps1</code>
          </p>
        </div>
      )}

      {manifestError && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
          {manifestError}
        </div>
      )}

      <section className="rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-white/5 space-y-4">
        <ol className="list-decimal pl-5 space-y-1.5 text-sm">
          <li>Plug the ESP32 into this computer with a USB cable that carries data.</li>
          <li>Close anything else that uses the board (Arduino IDE, a serial monitor).</li>
          <li>
            Press <b>Connect and install</b>, then pick the board in the popup (it is usually listed as{" "}
            <i>CP210x USB to UART Bridge</i> or <i>USB-SERIAL</i>).
          </li>
          <li>Wait about a minute. If it stalls at &quot;Connecting&quot;, hold the <b>BOOT</b> button on the board and try again.</li>
        </ol>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={keepSettings}
            onChange={(e) => setKeepSettings(e.target.checked)}
            disabled={busy}
            className="mt-0.5"
          />
          <span>
            <b>Keep the board&apos;s saved WiFi and login</b> (recommended for an update).
            <span className="block text-black/50 dark:text-white/50">
              Untick for a brand-new board or to wipe it: the whole flash is erased and the board opens its setup page again.
            </span>
          </span>
        </label>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={install}
            disabled={busy || supported === false || !manifest}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium"
          >
            {busy ? "Working..." : phase === "done" ? "Install again" : "Connect and install"}
          </button>
          {manifest && (
            <span className="text-xs text-black/50 dark:text-white/50">
              Firmware {manifest.version} for {manifest.chip}
            </span>
          )}
        </div>

        {(busy || phase === "done") && (
          <div>
            <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-black/50 dark:text-white/50 mt-1">
              {phase === "connecting" ? "Connecting to the board..." : `${progress}%`}
              {chip ? ` · ${chip}` : ""}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>

      {phase === "done" && (
        <section className="rounded-xl border border-green-300 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-5 text-sm space-y-2">
          <p className="font-medium">Installed. The board is restarting.</p>
          {keepSettings ? (
            <p>
              It keeps its saved WiFi and login, so within about 15 seconds it should show <b>Conveyor online</b> on the
              Conveyor page.
            </p>
          ) : (
            <>
              <p>It has no WiFi yet, so its LED blinks fast and it opens its own WiFi network. To finish:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  On a phone or laptop, join the WiFi <b>MediDispense-Setup</b> (password <code>medidispense</code>).
                </li>
                <li>
                  Open <b>http://192.168.4.1</b>, choose your WiFi, enter the backend computer&apos;s name and the
                  conveyor&apos;s login, then press Save.
                </li>
                <li>Reconnect to your normal WiFi. The Conveyor page should now show <b>Conveyor online</b>.</li>
              </ol>
            </>
          )}
        </section>
      )}

      {lines.length > 0 && (
        <details open={phase === "error"} className="text-sm">
          <summary className="cursor-pointer text-black/60 dark:text-white/60">Log</summary>
          <pre
            ref={logRef}
            className="mt-2 max-h-64 overflow-auto rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 text-xs whitespace-pre-wrap"
          >
            {lines.join("\n")}
          </pre>
        </details>
      )}
    </div>
  );
}

export default function FlasherPage() {
  return (
    <ProtectedPage roles={["technician", "admin"]}>
      <FlasherContent />
    </ProtectedPage>
  );
}
