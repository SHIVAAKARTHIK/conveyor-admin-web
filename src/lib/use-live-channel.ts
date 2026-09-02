"use client";

import { useEffect, useRef } from "react";

import { WS_BASE_URL } from "./api";

/**
 * Subscribes to a backend /ws/{channel} live-update socket for as long as
 * the component is mounted, calling `onMessage` with each parsed JSON
 * payload. Auto-reconnects with a short backoff if the socket drops.
 */
export function useLiveChannel(channel: string, onMessage: (payload: unknown) => void) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let closedByEffect = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      socket = new WebSocket(`${WS_BASE_URL}/ws/${channel}`);
      socket.onmessage = (event) => {
        try {
          handlerRef.current(JSON.parse(event.data));
        } catch {
          // ignore malformed payloads
        }
      };
      socket.onclose = () => {
        if (!closedByEffect) {
          retryTimer = setTimeout(connect, 2000);
        }
      };
      socket.onerror = () => {
        socket?.close();
      };
    }

    connect();

    return () => {
      closedByEffect = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [channel]);
}
