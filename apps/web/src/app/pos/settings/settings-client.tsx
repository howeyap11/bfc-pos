"use client";

import { useEffect, useState } from "react";
import { COLORS } from "@/lib/theme";
import { useOnScreenKeyboard, OnScreenKeyboard } from "@/lib/useOnScreenKeyboard";

type PaymentMethod = "CASH" | "CARD" | "GCASH" | "FOODPANDA" | "GRABFOOD" | "BFCAPP";

type StoreConfig = {
  storeId: string;
  enabledPaymentMethods: PaymentMethod[];
  splitPaymentEnabled: boolean;
  paymentMethodOrder: PaymentMethod[] | null;
};

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; description: string }> = [
  { value: "CASH", label: "Cash", description: "Cash payments at register" },
  { value: "CARD", label: "Card", description: "Credit/Debit card payments" },
  { value: "GCASH", label: "GCash", description: "GCash mobile payments" },
  { value: "FOODPANDA", label: "Foodpanda", description: "Foodpanda delivery orders" },
  { value: "GRABFOOD", label: "GrabFood", description: "GrabFood delivery orders" },
  { value: "BFCAPP", label: "BFC App", description: "BFC mobile app orders" },
];

export default function SettingsClient() {
  const keyboard = useOnScreenKeyboard();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
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
    } finally {
      setLoading(false);
    }
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch("/api/staff/verify-admin-pin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setIsAuthenticated(true);
        setPinError("");
        setPinInput("");
      } else {
        setPinError(data.message || "Invalid admin PIN");
        setPinInput("");
      }
    } catch (e: any) {
      setPinError("Verification failed: " + (e?.message || String(e)));
      setPinInput("");
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
          paymentMethodOrder: null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save config");
      }

      setConfig(data);
      setSuccess("Payment modes saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  function toggleMethod(method: PaymentMethod) {
    if (enabledMethods.includes(method)) {
      if (enabledMethods.length > 1) {
        setEnabledMethods(enabledMethods.filter((m) => m !== method));
      }
    } else {
      setEnabledMethods([...enabledMethods, method]);
    }
  }

  // PIN Gate - same pattern as Transactions
  if (!isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: 24,
          background: COLORS.bgDarkest,
        }}
      >
        <div
          style={{
            background: COLORS.bgDark,
            padding: 32,
            borderRadius: 12,
            border: `1px solid ${COLORS.borderLight}`,
            minWidth: 350,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 20, textAlign: "center", color: COLORS.textPrimary }}>
            Admin Access Required
          </h2>
          <p style={{ margin: "0 0 20px 0", color: COLORS.textSecondary, fontSize: 14 }}>
            Enter Admin PIN to access settings.
          </p>
          <form onSubmit={handlePinSubmit}>
            <input
              type="password"
              inputMode="none"
              readOnly
              value={pinInput}
              onClick={() => {
                keyboard.openKeyboard({
                  mode: "pin",
                  value: pinInput,
                  title: "Admin PIN",
                  onChange: setPinInput,
                  onDone: (val) => {
                    setPinInput(val);
                    keyboard.closeKeyboard();
                  },
                });
              }}
              placeholder="Tap to enter PIN"
              style={{
                width: "100%",
                padding: 14,
                fontSize: 18,
                textAlign: "center",
                border: `1px solid ${COLORS.borderLight}`,
                borderRadius: 6,
                marginBottom: 16,
                background: COLORS.bgPanel,
                color: COLORS.textPrimary,
                cursor: "pointer",
              }}
            />
            {pinError && (
              <div style={{ color: COLORS.error, marginBottom: 16, fontSize: 14, textAlign: "center" }}>
                {pinError}
              </div>
            )}
            <button
              type="submit"
              style={{
                width: "100%",
                padding: 14,
                fontSize: 16,
                fontWeight: "600",
                background: COLORS.primary,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Unlock
            </button>
          </form>
        </div>
        {keyboard.isOpen && (
          <OnScreenKeyboard
            isOpen={keyboard.isOpen}
            mode={keyboard.mode}
            value={keyboard.value}
            title={keyboard.title}
            onClose={keyboard.closeKeyboard}
            onValueChange={keyboard.updateValue}
            onDone={keyboard.handleDone}
          />
        )}
      </div>
    );
  }

  // Main Settings UI - dark styling to match other POS tabs
  return (
    <div
      style={{
        padding: 24,
        maxWidth: 800,
        margin: "0 auto",
        background: COLORS.bgDarkest,
        minHeight: "100%",
      }}
    >
      <div
        style={{
          background: COLORS.bgDark,
          borderRadius: 8,
          padding: 24,
          boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          border: `1px solid ${COLORS.borderLight}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: COLORS.textPrimary }}>
            Settings
          </h1>
          <button
            onClick={() => setIsAuthenticated(false)}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              background: COLORS.error,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Lock
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: 12,
              marginBottom: 16,
              background: "#7f1d1d",
              border: `1px solid ${COLORS.error}`,
              borderRadius: 6,
              color: "#fecaca",
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
              background: "rgba(34, 197, 94, 0.2)",
              border: `1px solid ${COLORS.success}`,
              borderRadius: 6,
              color: "#86efac",
            }}
          >
            {success}
          </div>
        )}

        <div
          style={{
            background: COLORS.bgPanel,
            borderRadius: 8,
            padding: 24,
            marginBottom: 24,
            border: `1px solid ${COLORS.borderLight}`,
          }}
        >
          <h2 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 600, color: COLORS.textPrimary }}>
            Payment Modes
          </h2>
          <p style={{ color: COLORS.textSecondary, marginBottom: 24, fontSize: 14 }}>
            Configure which payment methods are available at the POS register.
          </p>

          {loading ? (
            <p style={{ color: COLORS.textSecondary }}>Loading configuration...</p>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: COLORS.textSecondary }}>
                  Enabled Payment Methods
                </h3>
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: 12,
                      marginBottom: 8,
                      background: enabledMethods.includes(method.value)
                        ? COLORS.primaryLight
                        : COLORS.bgDark,
                      border: `2px solid ${
                        enabledMethods.includes(method.value) ? COLORS.primary : COLORS.borderLight
                      }`,
                      borderRadius: 6,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={enabledMethods.includes(method.value)}
                      onChange={() => toggleMethod(method.value)}
                      style={{ width: 20, height: 20, marginRight: 12, cursor: "pointer" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: "600",
                          marginBottom: 2,
                          color: COLORS.textPrimary,
                        }}
                      >
                        {method.label}
                      </div>
                      <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
                        {method.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ marginBottom: 24, paddingTop: 24, borderTop: `1px solid ${COLORS.borderLight}` }}>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: COLORS.textSecondary }}>
                  Split Payment
                </h3>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: 12,
                    background: splitEnabled ? COLORS.primaryLight : COLORS.bgDark,
                    border: `2px solid ${splitEnabled ? COLORS.primary : COLORS.borderLight}`,
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={splitEnabled}
                    onChange={(e) => setSplitEnabled(e.target.checked)}
                    style={{ width: 20, height: 20, marginRight: 12, cursor: "pointer" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", marginBottom: 2, color: COLORS.textPrimary }}>
                      Enable Split Payment
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
                      Allow customers to pay using multiple payment methods
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: 16,
                    fontSize: 16,
                    fontWeight: "600",
                    background: saving ? COLORS.bgDark : COLORS.success,
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
                    background: COLORS.bgDark,
                    color: COLORS.textPrimary,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: 6,
                    cursor: loading || saving ? "not-allowed" : "pointer",
                  }}
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
