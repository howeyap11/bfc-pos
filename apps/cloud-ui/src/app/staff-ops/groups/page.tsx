"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type CloudStaffGroupRow, type CloudStaffRow, STAFF_ROLE_LABELS } from "@/lib/api";
import { COLORS } from "@/lib/theme";

export default function StaffOpsGroupsPage() {
  const [groups, setGroups] = useState<CloudStaffGroupRow[]>([]);
  const [staff, setStaff] = useState<CloudStaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [g, s] = await Promise.all([api.getStaffGroups(), api.getStaff()]);
      setGroups(g.groups ?? []);
      setStaff(s.staff ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setGroups([]);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setError("Group name is required");
      return;
    }
    setSavingGroup(true);
    setError("");
    try {
      await api.createStaffGroup({
        name,
        description: newDesc.trim() || null,
      });
      setNewName("");
      setNewDesc("");
      await load();
    } catch (err: unknown) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed to create group"));
    } finally {
      setSavingGroup(false);
    }
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm("Delete this group? Only allowed when no staff are assigned.")) return;
    setError("");
    try {
      await api.deleteStaffGroup(id);
      await load();
    } catch (err: unknown) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Cannot delete group"));
    }
  }

  async function handleAssignStaff(staffId: string, groupId: string | "") {
    setAssigningId(staffId);
    setError("");
    try {
      await api.patchStaff(staffId, { groupId: groupId === "" ? null : groupId });
      await load();
    } catch (err: unknown) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? (err instanceof Error ? err.message : "Failed to update staff"));
    } finally {
      setAssigningId(null);
    }
  }

  const inputStyle = "w-full rounded border px-3 py-2 text-sm text-white placeholder:text-white/40";
  const inputBg = { background: COLORS.bgPanel, borderColor: COLORS.borderLight };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/staff-ops" className="text-sm text-white/55 hover:text-white">
          ← Work Log
        </Link>
      </div>
      <h1 className="mb-1 text-2xl font-semibold text-white">Groups</h1>
      <p className="mb-6 text-sm text-white/60">
        Groups help organize staff for SOP and schedule assignment. Each person can be in one group for now.
      </p>

      {error && (
        <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : (
        <>
          <section
            className="mb-8 rounded-lg border p-5"
            style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
          >
            <h2 className="mb-3 text-sm font-semibold text-white">Create group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-white/55">Name</label>
                <input
                  className={inputStyle}
                  style={inputBg}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Opening shift"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/55">Description (optional)</label>
                <input
                  className={inputStyle}
                  style={inputBg}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Short note for managers"
                  maxLength={500}
                />
              </div>
              <button
                type="submit"
                disabled={savingGroup}
                className="rounded px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                style={{ background: COLORS.primary }}
              >
                {savingGroup ? "Saving…" : "Create group"}
              </button>
            </form>
          </section>

          <section
            className="mb-8 rounded-lg border p-5"
            style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}
          >
            <h2 className="mb-1 text-sm font-semibold text-white">Your groups</h2>
            <p className="mb-3 text-xs text-white/45">Names are unique per store. Delete only when member count is zero.</p>
            {groups.length === 0 ? (
              <p className="text-sm text-white/50">No groups yet. Create one above.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {groups.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0">
                    <div>
                      <span className="font-medium text-white">{g.name}</span>
                      {!g.isActive && <span className="ml-2 text-xs text-amber-400">(inactive)</span>}
                      <span className="ml-2 text-xs text-white/45">
                        {g._count.staff} staff
                      </span>
                      {g.description ? (
                        <p className="mt-0.5 text-xs text-white/50">{g.description}</p>
                      ) : null}
                    </div>
                    {g._count.staff === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(g.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border p-5" style={{ background: COLORS.bgPanel, borderColor: COLORS.borderLight }}>
            <h2 className="mb-1 text-sm font-semibold text-white">Assign staff to a group</h2>
            <p className="mb-4 text-xs text-white/45">PINs and roles are still managed under Settings → Staff (POS Login).</p>
            {staff.length === 0 ? (
              <p className="text-sm text-white/50">No staff. Add people in Settings first.</p>
            ) : (
              <ul className="space-y-2">
                {staff.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 rounded border py-2.5 px-3 sm:flex-row sm:items-center sm:justify-between"
                    style={{ borderColor: COLORS.borderLight }}
                  >
                    <div>
                      <span className="font-medium text-white">{row.name}</span>
                      <span className="ml-2 text-xs text-white/50">{STAFF_ROLE_LABELS[row.role] ?? row.role}</span>
                      {row.staffGroup ? (
                        <span className="ml-2 text-xs text-white/45">· {row.staffGroup.name}</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className={`${inputStyle} max-w-[220px]`}
                        style={inputBg}
                        value={row.groupId ?? ""}
                        disabled={assigningId === row.id}
                        onChange={(e) => handleAssignStaff(row.id, e.target.value)}
                        aria-label={`Group for ${row.name}`}
                      >
                        <option value="">No group</option>
                        {groups
                          .filter((g) => g.isActive || g.id === row.groupId)
                          .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}{!g.isActive ? " (inactive)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
