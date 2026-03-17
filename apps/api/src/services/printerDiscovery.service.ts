/**
 * Discovers printers installed on the system (Windows printer names, etc.).
 * Used to populate POS settings so staff can select receipt and sticker printers.
 * Lazy-loads @woovi/node-printer so the API can start even when the native addon is missing.
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);

/**
 * Returns the list of available printer names from the OS.
 * No filtering; frontend displays the full list for selection.
 * If the native printer module is missing or fails to load, returns [] so the API does not crash.
 */
export function getAvailablePrinters(): string[] {
  try {
    const printerModule = require("@woovi/node-printer") as {
      getPrinters: () => Array<{ name?: string }>;
    };
    const list = printerModule.getPrinters();
    // #region agent log
    fetch("http://127.0.0.1:7330/ingest/e360f4f2-ab8d-4cc6-b94b-f45235f7b95a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e0db05" },
      body: JSON.stringify({
        sessionId: "e0db05",
        location: "printerDiscovery.service.ts:getAvailablePrinters",
        message: "Driver loaded, getPrinters returned",
        data: { count: Array.isArray(list) ? list.length : 0, driver: "@woovi/node-printer" },
        hypothesisId: "H1",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!Array.isArray(list)) return [];
    return list
      .map((p) => (p && typeof p.name === "string" ? p.name.trim() : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}
