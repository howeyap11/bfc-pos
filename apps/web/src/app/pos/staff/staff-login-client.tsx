"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Staff = {
  id: string;
  name: string;
  role: string;
};

type ActiveStaff = {
  id: string;
  name: string;
  role: string;
  staffKey: string;
  email?: string | null;
  staffCloudId?: string | null;
};

const STORAGE_KEY = "bfc_active_staff";

const ROLE_LABELS: Record<string, string> = {
  HEAD_BARISTA: "Head Barista",
  HEAD_CHEF: "Head Chef",
  BARISTA: "Barista",
  LEAD_BARISTA: "Lead Barista",
  MANAGER: "Manager",
  KITCHEN_STAFF: "Kitchen Staff",
  ADMIN: "Admin",
};
function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export default function StaffLoginClient({
  afterLoginRedirect = "/pos/register",
  largeTouch = false,
}: {
  afterLoginRedirect?: string;
  largeTouch?: boolean;
}) {
  const router = useRouter();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [activeStaff, setActiveStaff] = useState<ActiveStaff | null>(null);
  const [passcodes, setPasscodes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    loadStaff();
    loadActiveStaff();
  }, []);

  // Safe JSON fetch helper
  async function fetchJson(url: string, init?: RequestInit) {
    const res = await fetch(url, init);
    const text = await res.text();
    
    if (!res.ok) {
      throw new Error(`[${res.status}] ${res.statusText}: ${text.slice(0, 200)}`);
    }
    
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON from ${url}. First 120 chars: ${text.slice(0, 120)}`);
    }
  }

  async function loadStaff() {
    try {
      console.log("[Staff] Loading staff list from /api/staff");
      const data = await fetchJson("/api/staff", { cache: "no-store" });
      
      console.log("[Staff] Loaded", data.length, "staff members");
      
      if (!Array.isArray(data)) {
        throw new Error("Staff list is not an array");
      }

      setStaffList(data);
      setError(null); // Clear any previous errors
    } catch (e: any) {
      console.error("[Staff] Failed to load staff:", e.message || e);
      setError(e?.message ?? String(e));
      
      // Set empty list on error
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  }

  function loadActiveStaff() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const staff = JSON.parse(stored);
        setActiveStaff(staff);
      }
    } catch (e) {
      console.error("[Staff] Failed to load active staff from localStorage", e);
    }
  }

  function saveActiveStaff(staff: ActiveStaff | null) {
    try {
      if (staff) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      setActiveStaff(staff);
    } catch (e) {
      console.error("[Staff] Failed to save active staff to localStorage", e);
    }
  }

  async function handleLogin(staffId: string, staffName: string) {
    const passcode = passcodes[staffId] || "";

    if (!passcode) {
      setError("Please enter passcode");
      return;
    }

    setBusy(staffId);
    setError(null);

    try {
      console.log("[Staff] Attempting login for:", staffName);
      
      const data = await fetchJson("/api/staff/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ staffId, passcode }),
      });

      console.log("[Staff] Login response:", data);

      if (data.error) {
        if (data.error === "INVALID_PASSCODE") {
          setError("Invalid passcode");
        } else {
          setError(data.error || "Login failed");
        }
        return;
      }

      // Validate that we received a key
      if (!data.key) {
        console.error("[Staff] Login response missing key field!", data);
        setError("Server error: missing authentication key");
        return;
      }

      // Save active staff (map 'key' to 'staffKey' for consistency)
      saveActiveStaff({
        id: data.id,
        name: data.name,
        role: data.role,
        staffKey: data.key,
        email: data.email ?? null,
        staffCloudId: data.cloudId ?? null,
      });

      console.log("[Staff] Saved staff with key:", {
        name: data.name,
        hasKey: !!data.key,
        keyPreview: data.key?.slice(0, 10),
      });

      // Clear passcode input
      setPasscodes((prev) => ({ ...prev, [staffId]: "" }));

      console.log("[Staff] Login successful, navigating to register");
      
      // Navigate back to register
      router.push(afterLoginRedirect);
    } catch (e: any) {
      console.error("[Staff] Login error:", e.message || e);
      setError(e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  function handleLogout() {
    saveActiveStaff(null);
    setError(null);
  }

  const pad = largeTouch ? 28 : 24;
  const titleFs = largeTouch ? 32 : 24;
  const rowFs = largeTouch ? 20 : 16;
  const inputPad = largeTouch ? "14px 16px" : "8px 12px";
  const btnPad = largeTouch ? "14px 22px" : "8px 16px";

  if (loading) {
    return (
      <div style={{ padding: pad, background: "#0a0a0a", minHeight: "100%", color: "#fff" }}>
        <p style={{ fontSize: rowFs }}>Loading staff...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: pad, background: "#0a0a0a", minHeight: "100%", color: "#fff" }}>
      <h1 style={{ fontSize: titleFs, fontWeight: "bold", marginBottom: largeTouch ? 28 : 24 }}>Staff Login</h1>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "#7f1d1d",
            border: "1px solid #ef4444",
            borderRadius: 6,
            color: "#fca5a5",
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      )}

      {activeStaff && (
        <div
          style={{
            padding: 16,
            background: "#22c55e",
            color: "#fff",
            borderRadius: 8,
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: "bold" }}>{activeStaff.name}</div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>Currently Active ({roleLabel(activeStaff.role)})</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 20px",
              background: "rgba(0,0,0,0.35)",
              color: "#fff",
              border: "2px solid rgba(255,255,255,0.45)",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: "bold",
            }}
          >
            Logout
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: largeTouch ? 16 : 12 }}>
        {staffList.map((staff) => {
          const isActive = activeStaff?.id === staff.id;

          return (
            <div
              key={staff.id}
              style={{
                padding: largeTouch ? 22 : 16,
                background: isActive ? "#2a2a2a" : "#2a2a2a",
                border: isActive ? "2px solid #22c55e" : "1px solid #3a3a3a",
                borderRadius: largeTouch ? 12 : 8,
                opacity: isActive ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: rowFs, fontWeight: "600", marginBottom: 4 }}>{staff.name}</div>
                  <div style={{ fontSize: largeTouch ? 15 : 12, color: "#aaa" }}>{roleLabel(staff.role)}</div>
                </div>

                {!isActive && (
                  <div style={{ display: "flex", gap: largeTouch ? 12 : 8, alignItems: "center" }}>
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder="Passcode"
                      value={passcodes[staff.id] || ""}
                      onChange={(e) => setPasscodes((prev) => ({ ...prev, [staff.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleLogin(staff.id, staff.name);
                        }
                      }}
                      disabled={busy === staff.id}
                      style={{
                        width: largeTouch ? 160 : 120,
                        minHeight: largeTouch ? 52 : undefined,
                        padding: inputPad,
                        background: "#1f1f1f",
                        border: "1px solid #3a3a3a",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: largeTouch ? 18 : 14,
                      }}
                    />
                    <button
                      onClick={() => handleLogin(staff.id, staff.name)}
                      disabled={busy === staff.id}
                      style={{
                        padding: btnPad,
                        minHeight: largeTouch ? 52 : undefined,
                        background: "#22c55e",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: busy === staff.id ? "not-allowed" : "pointer",
                        fontSize: largeTouch ? 18 : 14,
                        fontWeight: "600",
                      }}
                    >
                      {busy === staff.id ? "..." : "Login"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {staffList.length === 0 && !error && (
        <div style={{ padding: 24, textAlign: "center", color: "#aaa" }}>
          <p>No staff found. Sync staff from Cloud Admin.</p>
          <pre style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
            Cloud Admin → Staff, then sync to this store
          </pre>
        </div>
      )}
      
      {staffList.length === 0 && error && (
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={{ padding: 16, background: "#2a1a1a", border: "2px solid #ef4444", borderRadius: 8, marginBottom: 16 }}>
            <h3 style={{ color: "#ef4444", marginTop: 0 }}>⚠ Unable to Load Staff</h3>
            <p style={{ color: "#fca5a5", fontSize: 14, marginBottom: 12 }}>
              The staff list could not be loaded. This usually means:
            </p>
            <ul style={{ color: "#fca5a5", fontSize: 13, textAlign: "left", marginBottom: 12 }}>
              <li>The API server is not running (start it with: <code>npm run dev</code> in apps/api)</li>
              <li>Staff has not been synced from Cloud Admin</li>
              <li>Network connection issue</li>
            </ul>
            <button
              onClick={() => {
                setError(null);
                loadStaff();
              }}
              style={{
                padding: "10px 20px",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Retry
            </button>
          </div>
          
          <div style={{ padding: 16, background: "#1a2a1a", border: "1px solid #22c55e", borderRadius: 8, color: "#86efac" }}>
            <h4 style={{ marginTop: 0, color: "#22c55e" }}>💡 Staff login</h4>
            <p style={{ fontSize: 13, marginBottom: 0 }}>
              Staff and PINs are managed in Cloud Admin and synced to this POS. Select your name and enter your PIN to log in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Export helper functions for use in other components
export function getActiveStaff(): ActiveStaff | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("[Staff] Failed to get active staff", e);
  }
  
  return null;
}

export function clearActiveStaff() {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("[Staff] Failed to clear active staff", e);
  }
}
