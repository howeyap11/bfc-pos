"use client";

import { useEffect, useState } from "react";
import { api, type CloudStaffRow, STAFF_ROLES, STAFF_ROLE_LABELS } from "@/lib/api";
import { COLORS } from "@/lib/theme";

export default function StaffPage() {
  const [list, setList] = useState<CloudStaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPin, setFormPin] = useState("");
  const [formRole, setFormRole] = useState("BARISTA");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    setLoading(true);
    setError("");
    api
      .getStaff()
      .then((r) => {
        setList(r.staff ?? []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load staff");
        setList([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function startAdd() {
    setShowAdd(true);
    setEditingId(null);
    setFormName("");
    setFormEmail("");
    setFormPin("");
    setFormRole("BARISTA");
    setFormActive(true);
  }

  function startEdit(row: CloudStaffRow) {
    setShowAdd(false);
    setEditingId(row.id);
    setFormName(row.name);
    setFormEmail(row.email ?? "");
    setFormPin("");
    setFormRole(STAFF_ROLES.includes(row.role as any) ? row.role : "BARISTA");
    setFormActive(row.isActive);
  }

  function cancelForm() {
    setEditingId(null);
    setShowAdd(false);
    setFormName("");
    setFormEmail("");
    setFormPin("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const name = formName.trim();
    const email = formEmail.trim() || undefined;
    const pin = formPin.replace(/\D/g, "");
    if (!name) {
      setError("Name is required");
      return;
    }
    if (pin.length < 4 || pin.length > 20) {
      setError("PIN must be 4–20 digits");
      return;
    }
    setSaving(true);
    try {
      await api.createStaff({ name, email, passcode: pin, role: formRole, isActive: formActive });
      load();
      cancelForm();
    } catch (err: unknown) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed to create"));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError("");
    const name = formName.trim();
    const email = formEmail.trim() || null;
    const pin = formPin.replace(/\D/g, "");
    if (!name) {
      setError("Name is required");
      return;
    }
    if (formPin && (pin.length < 4 || pin.length > 20)) {
      setError("PIN must be 4–20 digits");
      return;
    }
    setSaving(true);
    try {
      const body: { name: string; email?: string | null; passcode?: string; role: string; isActive: boolean } = {
        name,
        email,
        role: formRole,
        isActive: formActive,
      };
      if (pin) body.passcode = pin;
      await api.patchStaff(editingId, body);
      load();
      cancelForm();
    } catch (err: unknown) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed to update"));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = "w-full rounded border px-3 py-2 text-sm text-white placeholder:text-white/40";
  const inputBg = { background: COLORS.bgPanel, borderColor: COLORS.borderLight };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold text-white">Staff (POS Login)</h1>
      <p className="mb-6 text-sm text-white/60">
        Manage staff names and PINs. These sync to the POS for cashier login. Only active staff can log in on the POS.
      </p>

      {error && (
        <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : (
        <>
          <div
            className="mb-6 rounded-lg border p-6"
            style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Staff list</h2>
              <button
                type="button"
                onClick={startAdd}
                className="rounded px-3 py-1.5 text-sm font-medium text-black"
                style={{ background: COLORS.primary }}
              >
                Add staff
              </button>
            </div>

            {list.length === 0 && !showAdd && !editingId ? (
              <p className="text-sm text-white/50">No staff yet. Add staff to sync to POS.</p>
            ) : (
              <ul className="space-y-2">
                {list.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between rounded border py-2 px-3"
                    style={{ borderColor: COLORS.borderLight }}
                  >
                    <div>
                      <span className="font-medium text-white">{row.name}</span>
                      {row.email && (
                        <span className="ml-2 text-xs text-white/50">{row.email}</span>
                      )}
                      <span className="ml-2 text-xs text-white/50">
                        {STAFF_ROLE_LABELS[row.role] ?? row.role}
                      </span>
                      {!row.isActive && (
                        <span className="ml-2 text-xs text-amber-400">(inactive)</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="text-sm text-white/70 hover:text-white"
                    >
                      Edit
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(showAdd || editingId) && (
            <div
              className="rounded-lg border p-6"
              style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
            >
              <h2 className="mb-4 text-sm font-semibold text-white">
                {showAdd ? "Add staff" : "Edit staff"}
              </h2>
              <form onSubmit={showAdd ? handleCreate : handleUpdate} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-white/80">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Andrea"
                    className={inputStyle}
                    style={inputBg}
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/80">Email (optional)</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. andrea@cafe.com"
                    className={inputStyle}
                    style={inputBg}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/80">
                    PIN {editingId && "(leave blank to keep current)"}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value.replace(/\D/g, "").slice(0, 20))}
                    placeholder="••••"
                    className={inputStyle}
                    style={inputBg}
                    autoComplete="off"
                  />
                  <p className="mt-1 text-xs text-white/50">4–20 digits only. Used for POS login.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/80">Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className={inputStyle}
                    style={inputBg}
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {STAFF_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="formActive"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-500"
                  />
                  <label htmlFor="formActive" className="text-sm text-white/80">
                    Active (can log in on POS)
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving || !formName.trim() || (showAdd && formPin.length < 4)}
                    className="rounded px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                    style={{ background: COLORS.primary }}
                  >
                    {saving ? "Saving…" : showAdd ? "Create" : "Update"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="rounded border px-4 py-2 text-sm font-medium text-white/80"
                    style={{ borderColor: COLORS.borderLight }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
