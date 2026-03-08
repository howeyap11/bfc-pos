"use client";

import { useEffect, useState } from "react";
import { COLORS } from "@/lib/theme";

type PaymentMethod = "CASH" | "CARD" | "GCASH" | "FOODPANDA" | "GRABFOOD" | "BFCAPP";

type StoreConfig = {
  storeId: string;
  enabledPaymentMethods: PaymentMethod[];
  splitPaymentEnabled: boolean;
  paymentMethodOrder: PaymentMethod[] | null;
};

const ADMIN_PIN = "1234"; // TODO: Move to env or secure storage

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; description: string }> = [
  { value: "CASH", label: "Cash", description: "Cash payments at register" },
  { value: "CARD", label: "Card", description: "Credit/Debit card payments" },
  { value: "GCASH", label: "GCash", description: "GCash mobile payments" },
  { value: "FOODPANDA", label: "Foodpanda", description: "Foodpanda delivery orders" },
  { value: "GRABFOOD", label: "GrabFood", description: "GrabFood delivery orders" },
  { value: "BFCAPP", label: "BFC App", description: "BFC mobile app orders" },
];

export default function SettingsClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [enabledMethods, setEnabledMethods] = useState<PaymentMethod[]>([]);
  const [splitEnabled, setSplitEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadConfig();
    }
  }, [isAuthenticated]);

  async function loadConfig() {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch("/api/store-config", { cache: "no-store" });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to load config");
      }
      
      setConfig(data);
      setEnabledMethods(data.enabledPaymentMethods || []);
      setSplitEnabled(data.splitPaymentEnabled ?? true);
    } catch (e: any) {
      setError(e.message || String(e));
      console.error("[Settings] Failed to load config:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const res = await fetch("/api/store-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabledPaymentMethods: enabledMethods,
          splitPaymentEnabled: splitEnabled,
          paymentMethodOrder: null, // Keep existing order or null for default
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to save config");
      }
      
      setConfig(data);
      setSuccess("Payment modes saved successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || String(e));
      console.error("[Settings] Failed to save config:", e);
    } finally {
      setSaving(false);
    }
  }

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true);
      setPinInput("");
    } else {
      alert("Incorrect PIN");
      setPinInput("");
    }
  }

  function toggleMethod(method: PaymentMethod) {
    if (enabledMethods.includes(method)) {
      // Disable (but keep at least one method enabled)
      if (enabledMethods.length > 1) {
        setEnabledMethods(enabledMethods.filter((m) => m !== method));
      } else {
        alert("At least one payment method must be enabled");
      }
    } else {
      // Enable
      setEnabledMethods([...enabledMethods, method]);
    }
  }

  // PIN Gate
  if (!isAuthenticated) {
    return (
      <div style={{ padding: 24, maxWidth: 400, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 16 }}>Settings</h1>
        <p style={{ color: "#666", marginBottom: 24 }}>Enter Admin PIN to access settings.</p>
        
        <form onSubmit={handlePinSubmit}>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Enter Admin PIN"
            style={{
              width: "100%",
              padding: 12,
              fontSize: 16,
              border: "1px solid #ccc",
              borderRadius: 4,
              marginBottom: 12,
            }}
            autoFocus
          />
          <button
            type="submit"
            style={{
              width: "100%",
              padding: 12,
              fontSize: 16,
              fontWeight: "bold",
              background: COLORS.primary,
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  // Main Settings UI
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Settings</h1>
        <button
          onClick={() => setIsAuthenticated(false)}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Lock
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: 4,
            color: "#c00",
          }}
        >
          {error}
        </div>
      )}
      
      {success && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: "#efe",
            border: "1px solid #cfc",
            borderRadius: 4,
            color: "#060",
          }}
        >
          {success}
        </div>
      )}

      {/* Payment Modes Section */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Payment Modes</h2>
        <p style={{ color: "#666", marginBottom: 24 }}>
          Configure which payment methods are available at the POS register.
        </p>

        {loading ? (
          <p>Loading configuration...</p>
        ) : (
          <>
            {/* Payment Method Toggles */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Enabled Payment Methods</h3>
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: 12,
                    marginBottom: 8,
                    background: enabledMethods.includes(method.value) ? COLORS.primaryLight : "#f9f9f9",
                    border: `2px solid ${enabledMethods.includes(method.value) ? COLORS.primary : "#ddd"}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!enabledMethods.includes(method.value)) {
                      e.currentTarget.style.background = "#f5f5f5";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!enabledMethods.includes(method.value)) {
                      e.currentTarget.style.background = "#f9f9f9";
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={enabledMethods.includes(method.value)}
                    onChange={() => toggleMethod(method.value)}
                    style={{
                      width: 20,
                      height: 20,
                      marginRight: 12,
                      cursor: "pointer",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", marginBottom: 2 }}>{method.label}</div>
                    <div style={{ fontSize: 13, color: "#666" }}>{method.description}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Split Payment Toggle */}
            <div style={{ marginBottom: 24, paddingTop: 24, borderTop: "1px solid #ddd" }}>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Split Payment</h3>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: 12,
                  background: splitEnabled ? COLORS.primaryLight : "#f9f9f9",
                  border: `2px solid ${splitEnabled ? COLORS.primary : "#ddd"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={splitEnabled}
                  onChange={(e) => setSplitEnabled(e.target.checked)}
                  style={{
                    width: 20,
                    height: 20,
                    marginRight: 12,
                    cursor: "pointer",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", marginBottom: 2 }}>Enable Split Payment</div>
                  <div style={{ fontSize: 13, color: "#666" }}>
                    Allow customers to pay using multiple payment methods
                  </div>
                </div>
              </label>
            </div>

            {/* Save Button */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: 16,
                  fontSize: 16,
                  fontWeight: "bold",
                  background: saving ? "#ccc" : "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              
              <button
                onClick={loadConfig}
                disabled={loading || saving}
                style={{
                  padding: 16,
                  fontSize: 16,
                  background: "#6b7280",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: loading || saving ? "not-allowed" : "pointer",
                }}
              >
                Reset
              </button>
            </div>

            {/* Current Config Info */}
            {config && (
              <div
                style={{
                  marginTop: 24,
                  padding: 12,
                  background: "#f9f9f9",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 13,
                  color: "#666",
                }}
              >
                <strong>Current Configuration:</strong>
                <br />
                Store ID: {config.storeId}
                <br />
                Enabled Methods: {enabledMethods.join(", ")}
                <br />
                Split Payment: {splitEnabled ? "Enabled" : "Disabled"}
              </div>
            )}
          </>
        )}
      </div>

      {/* Future Settings Sections */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Other Settings</h2>
        <p style={{ color: "#999", fontSize: 14 }}>Additional settings will be added here.</p>
      </div>
    </div>
  );
}
