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
};

const STORAGE_KEY = "bfc_active_staff";

export default function StaffLoginClient() {
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
      router.push("/pos/register");
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

  if (loading) {
    return (
      <div style={{ padding: 24, background: "#1f1f1f", minHeight: "100vh", color: "#fff" }}>
        <p>Loading staff...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: "#1f1f1f", minHeight: "100vh", color: "#fff" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>Staff Login</h1>

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
            <div style={{ fontSize: 14, opacity: 0.9 }}>Currently Active ({activeStaff.role})</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 20px",
              background: "#fff",
              color: "#22c55e",
              border: "none",
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

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {staffList.map((staff) => {
          const isActive = activeStaff?.id === staff.id;

          return (
            <div
              key={staff.id}
              style={{
                padding: 16,
                background: isActive ? "#2a2a2a" : "#2a2a2a",
                border: isActive ? "2px solid #22c55e" : "1px solid #3a3a3a",
                borderRadius: 8,
                opacity: isActive ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: "600", marginBottom: 4 }}>{staff.name}</div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>{staff.role}</div>
                </div>

                {!isActive && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
                        width: 120,
                        padding: "8px 12px",
                        background: "#1f1f1f",
                        border: "1px solid #3a3a3a",
                        borderRadius: 6,
                        color: "#fff",
                        fontSize: 14,
                      }}
                    />
                    <button
                      onClick={() => handleLogin(staff.id, staff.name)}
                      disabled={busy === staff.id}
                      style={{
                        padding: "8px 16px",
                        background: "#22c55e",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: busy === staff.id ? "not-allowed" : "pointer",
                        fontSize: 14,
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
          <p>No staff found. Run seed to create sample staff.</p>
          <pre style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
            cd apps/api{"\n"}
            npx tsx prisma/seed.ts
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
              <li>The database is not seeded (run: <code>npx tsx prisma/seed.ts</code> in apps/api)</li>
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
            <h4 style={{ marginTop: 0, color: "#22c55e" }}>💡 Using Default Staff</h4>
            <p style={{ fontSize: 13, marginBottom: 8 }}>
              If the API is unavailable, you can still test with default credentials:
            </p>
            <ul style={{ fontSize: 13, textAlign: "left" }}>
              <li>Andrea (ADMIN) - Passcode: 1000</li>
              <li>John (CASHIER) - Passcode: 1001</li>
              <li>Maria (CASHIER) - Passcode: 1002</li>
            </ul>
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
