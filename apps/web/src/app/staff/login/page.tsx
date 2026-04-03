"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveStaff, setActiveStaff } from "@/lib/staffAuth";

const STAFF_BG = "#1c1917";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getActiveStaff()) router.replace("/staff");
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/staff/login-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), passcode: pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || data.error || "Login failed");
        return;
      }
      if (!data.key) {
        setError("Server did not return a session key");
        return;
      }
      setActiveStaff({
        id: data.id,
        name: data.name,
        role: data.role,
        staffKey: data.key,
        email: data.email ?? null,
        staffCloudId: data.cloudId ?? null,
      });
      router.replace("/staff");
    } catch {
      setError("Could not reach local POS API");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="mx-auto flex min-h-[calc(100vh-0px)] max-w-md flex-col justify-center px-6 py-12 text-white"
      style={{ backgroundColor: STAFF_BG }}
    >
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">Staff sign in</h1>
      <p className="mb-8 text-sm text-white/60">
        Email and PIN from Cloud Admin. Verified locally against synced data (offline OK).
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/50">Email</label>
          <input
            type="email"
            autoComplete="username"
            className="w-full rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/50">PIN</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            className="w-full rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-emerald-600 py-3.5 font-semibold text-white shadow-lg disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
