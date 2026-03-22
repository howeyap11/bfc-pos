/**
 * Lightweight connectivity check for cloud sync.
 * Detects connectivity (network reachable), not endpoint correctness.
 */

const CLOUD_URL = process.env.CLOUD_URL ?? "";
const TIMEOUT_MS = 2500;

/** Fallback when CLOUD_URL fails: lightweight connectivity check. */
const FALLBACK_URL = "https://connectivitycheck.gstatic.com/generate_204";

/**
 * HTTP 200-499 (and 5xx) = server responded = connectivity.
 * Only network error, timeout, or DNS failure count as offline.
 */
function gotResponse(res: Response): boolean {
  return res.status >= 200 && res.status < 600;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    return res;
  } catch {
    clearTimeout(timeout);
    throw new Error("NETWORK_ERROR");
  }
}

/**
 * Check if the cloud (or internet) is reachable.
 * - Any HTTP response (200-599): ONLINE (server reachable; endpoint correctness ignored)
 * - Network error, timeout, DNS failure: try fallback; if fallback fails, OFFLINE
 */
export async function isOnline(): Promise<boolean> {
  if (!CLOUD_URL?.trim()) return false;

  try {
    const url = `${CLOUD_URL.replace(/\/$/, "")}/health`;
    const res = await fetchWithTimeout(url);
    if (gotResponse(res)) return true;
  } catch {
    // Primary failed: network error, timeout, or DNS
  }

  // Fallback: general internet connectivity
  try {
    const res = await fetchWithTimeout(FALLBACK_URL);
    return gotResponse(res);
  } catch {
    return false;
  }
}
