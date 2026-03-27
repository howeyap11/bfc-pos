"use client";

import { useEffect, useState } from "react";
import { getActiveStaff, withStaffAuthHeaders } from "@/lib/staffAuth";
import { InventoryCountForm } from "@/components/staff/InventoryCountForm";

export default function StaffClient() {
  const [staff, setStaff] = useState<ReturnType<typeof getActiveStaff>>(null);
  const [imageBase64, setImageBase64] = useState("");
  const [message, setMessage] = useState("");
  const [overview, setOverview] = useState<any>(null);

  const role = (staff?.role ?? "").toUpperCase();
  const canManagerView = role === "MANAGER" || role === "ADMIN" || role === "AUDITOR" || role === "OWNER";

  useEffect(() => {
    setStaff(getActiveStaff());
  }, []);

  async function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });
  }

  async function submitAttendance(type: "time-in" | "time-out") {
    if (!imageBase64) {
      setMessage("Selfie image is required.");
      return;
    }
    const res = await fetch(`/api/staffops/staff/attendance/${type}`, {
      method: "POST",
      headers: withStaffAuthHeaders(),
      body: JSON.stringify({ imageBase64 }),
    });
    const txt = await res.text();
    setMessage(res.ok ? `${type === "time-in" ? "Time in" : "Time out"} saved locally.` : txt || "Request failed");
  }

  async function loadManagerOverview() {
    const res = await fetch("/api/staffops/staff/manager/overview", {
      headers: withStaffAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return;
    setOverview(await res.json());
  }

  useEffect(() => {
    if (canManagerView) void loadManagerOverview();
  }, [canManagerView]);

  return (
    <main className="min-h-screen bg-[#111] p-4 text-white md:p-6">
      <h1 className="mb-1 text-2xl font-bold">Staff Operations</h1>
      <p className="mb-5 text-sm text-white/70">
        Local-first operations. Works offline; sync uploads when connected.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-3 text-lg font-semibold">Attendance</h2>
          <p className="mb-3 text-sm text-white/70">Take a selfie then tap Time In / Time Out.</p>
          <input
            type="file"
            accept="image/*"
            capture="user"
            className="mb-3 block w-full text-sm"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImageBase64(await toBase64(file));
            }}
          />
          <div className="flex gap-2">
            <button onClick={() => submitAttendance("time-in")} className="rounded-md bg-emerald-600 px-4 py-2 text-white">
              Time In
            </button>
            <button onClick={() => submitAttendance("time-out")} className="rounded-md bg-blue-600 px-4 py-2 text-white">
              Time Out
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-3 text-lg font-semibold">Waste Report</h2>
          <WasteForm onDone={setMessage} />
        </section>
      </div>

      <div className="mt-4">
        <InventoryCountForm source="STAFF_UI" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SimpleListCard title="My Incentives" endpoint="/api/staffops/staff/incentives/me" />
        <SimpleListCard title="My Shifts" endpoint="/api/staffops/staff/shifts/me" />
      </div>

      {canManagerView && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-2 text-lg font-semibold">Manager / Auditor Overview</h2>
          <pre className="overflow-auto rounded bg-black/20 p-3 text-xs">{JSON.stringify(overview, null, 2)}</pre>
        </div>
      )}

      {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}
    </main>
  );
}

function WasteForm({ onDone }: { onDone: (msg: string) => void }) {
  const [form, setForm] = useState({
    itemType: "INVENTORY_ITEM",
    inventoryItemCloudId: "",
    inventoryItemName: "",
    quantity: "",
    unit: "",
    reason: "",
    notes: "",
    imageBase64: "",
  });
  async function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });
  }
  async function submit() {
    const res = await fetch("/api/staffops/staff/waste-reports", {
      method: "POST",
      headers: withStaffAuthHeaders(),
      body: JSON.stringify(form),
    });
    const txt = await res.text();
    onDone(res.ok ? "Waste report saved locally." : txt || "Waste submit failed");
  }
  return (
    <div className="space-y-2">
      <input placeholder="Inventory Item Cloud ID" className="w-full rounded bg-black/20 px-3 py-2" value={form.inventoryItemCloudId} onChange={(e) => setForm((p) => ({ ...p, inventoryItemCloudId: e.target.value }))} />
      <input placeholder="Item Name" className="w-full rounded bg-black/20 px-3 py-2" value={form.inventoryItemName} onChange={(e) => setForm((p) => ({ ...p, inventoryItemName: e.target.value }))} />
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Quantity" className="rounded bg-black/20 px-3 py-2" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
        <input placeholder="Unit" className="rounded bg-black/20 px-3 py-2" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} />
      </div>
      <input placeholder="Reason" className="w-full rounded bg-black/20 px-3 py-2" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
      <textarea placeholder="Notes (optional)" className="w-full rounded bg-black/20 px-3 py-2" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="block w-full text-sm"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const encoded = await toBase64(file);
          setForm((p) => ({ ...p, imageBase64: encoded }));
        }}
      />
      <button onClick={submit} className="rounded-md bg-amber-600 px-4 py-2 text-white">Submit Waste Report</button>
    </div>
  );
}

function SimpleListCard({ title, endpoint }: { title: string; endpoint: string }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    fetch(endpoint, { headers: withStaffAuthHeaders(), cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, [endpoint]);
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <pre className="overflow-auto rounded bg-black/20 p-3 text-xs">{JSON.stringify(rows.slice(0, 10), null, 2)}</pre>
    </section>
  );
}
