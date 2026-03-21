"use client";

import { useEffect, useRef } from "react";
import { processSyncQueue, notifySyncQueueUpdated } from "@/lib/syncQueue";

/**
 * Global POS sync worker. Runs regardless of which POS page is active.
 * Must be mounted in pos/layout.tsx so sync continues when user navigates
 * to Transactions, Settings, etc.
 */
export default function SyncWorker() {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const runSync = async () => {
      if (!mountedRef.current) return;
      await processSyncQueue();
      if (mountedRef.current) notifySyncQueueUpdated();
    };

    runSync(); // app start
    const onOnline = () => runSync(); // reconnect
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(runSync, 15000); // periodic worker

    return () => {
      mountedRef.current = false;
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
