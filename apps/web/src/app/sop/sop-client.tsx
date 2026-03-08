"use client";

import { useEffect, useState } from "react";

type SopTemplate = {
  id: string;
  name: string;
  isActive: boolean;
  sort: number;
  tasks: SopTask[];
};

type SopTask = {
  id: string;
  templateId: string;
  title: string;
  requiresPhoto: boolean;
  sort: number;
};

type SopCompletion = {
  id: string;
  templateId: string;
  taskId: string;
  completedAt: string;
  completedBy?: string | null;
  note?: string | null;
  photoPath?: string | null;
  task: SopTask;
  template: SopTemplate;
};

export default function SopClient() {
  const [templates, setTemplates] = useState<SopTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SopTemplate | null>(null);
  const [completions, setCompletions] = useState<SopCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Completion form
  const [completingTask, setCompletingTask] = useState<SopTask | null>(null);
  const [completedBy, setCompletedBy] = useState("");
  const [note, setNote] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      const res = await fetch("/api/sop/templates", { cache: "no-store" });
      const data = await res.json();
      setTemplates(data);
      if (data.length > 0) {
        setSelectedTemplate(data[0]);
        await loadCompletions(data[0].id);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadCompletions(templateId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = today.toISOString();

      const res = await fetch(`/api/sop/completions?templateId=${templateId}&startDate=${startDate}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setCompletions(data);
    } catch (e: any) {
      console.error("Failed to load completions:", e);
    }
  }

  function openCompletionForm(task: SopTask) {
    setCompletingTask(task);
    setCompletedBy("");
    setNote("");
    setPhotoFile(null);
  }

  async function handleSubmitCompletion(e: React.FormEvent) {
    e.preventDefault();
    if (!completingTask || !selectedTemplate) return;

    if (completingTask.requiresPhoto && !photoFile) {
      setError("Photo is required for this task");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("templateId", selectedTemplate.id);
      formData.append("taskId", completingTask.id);
      if (completedBy.trim()) formData.append("completedBy", completedBy.trim());
      if (note.trim()) formData.append("note", note.trim());
      if (photoFile) formData.append("photo", photoFile);

      const res = await fetch("/api/sop/completions", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit completion");
        return;
      }

      setCompletingTask(null);
      await loadCompletions(selectedTemplate.id);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  function isTaskCompletedToday(taskId: string) {
    return completions.some((c) => c.taskId === taskId);
  }

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <h1>SOP - Standard Operating Procedures</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>SOP - Standard Operating Procedures</h1>

      {error && (
        <div style={{ padding: 12, marginBottom: 16, background: "#fee", border: "1px solid #c00", borderRadius: 4 }}>
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 12 }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Template Tabs */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                setSelectedTemplate(template);
                loadCompletions(template.id);
              }}
              style={{
                padding: "10px 20px",
                fontSize: 16,
                fontWeight: selectedTemplate?.id === template.id ? "bold" : "normal",
                background: selectedTemplate?.id === template.id ? "#007bff" : "#fff",
                color: selectedTemplate?.id === template.id ? "#fff" : "#000",
                border: "1px solid #ccc",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      {selectedTemplate && (
        <div>
          <h2>{selectedTemplate.name}</h2>
          <p style={{ color: "#666", marginBottom: 16 }}>
            Completed today: {completions.length} / {selectedTemplate.tasks.length}
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            {selectedTemplate.tasks.map((task) => {
              const completed = isTaskCompletedToday(task.id);
              return (
                <div
                  key={task.id}
                  style={{
                    padding: 16,
                    border: `2px solid ${completed ? "#28a745" : "#ddd"}`,
                    borderRadius: 8,
                    background: completed ? "#f0fff0" : "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                      {completed && "✓ "}
                      {task.title}
                    </div>
                    {task.requiresPhoto && (
                      <div style={{ fontSize: 12, color: "#666" }}>📷 Photo required</div>
                    )}
                  </div>
                  <button
                    onClick={() => openCompletionForm(task)}
                    disabled={completed}
                    style={{
                      padding: "8px 16px",
                      background: completed ? "#ccc" : "#007bff",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: completed ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {completed ? "Done" : "Mark Complete"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Completion History */}
          {completions.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <h3>Today's Completions</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {completions.map((completion) => (
                  <div
                    key={completion.id}
                    style={{ padding: 12, border: "1px solid #ddd", borderRadius: 4, background: "#f9f9f9" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <strong>{completion.task.title}</strong>
                      <span style={{ fontSize: 13, color: "#666" }}>
                        {new Date(completion.completedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {completion.completedBy && (
                      <div style={{ fontSize: 13, color: "#666" }}>By: {completion.completedBy}</div>
                    )}
                    {completion.note && (
                      <div style={{ fontSize: 13, color: "#666", fontStyle: "italic" }}>Note: {completion.note}</div>
                    )}
                    {completion.photoPath && (
                      <div style={{ marginTop: 8 }}>
                        <a
                          href={`http://127.0.0.1:3000/${completion.photoPath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#007bff", fontSize: 13 }}
                        >
                          📷 View Photo
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completion Form Modal */}
      {completingTask && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
          onClick={() => setCompletingTask(null)}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              minWidth: 400,
              maxWidth: 500,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>Complete Task</h2>
            <p style={{ marginBottom: 16, fontWeight: "bold" }}>{completingTask.title}</p>

            <form onSubmit={handleSubmitCompletion}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  <strong>Completed By (optional):</strong>
                </label>
                <input
                  type="text"
                  value={completedBy}
                  onChange={(e) => setCompletedBy(e.target.value)}
                  placeholder="Your name"
                  style={{ width: "100%", padding: 8, fontSize: 14 }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  <strong>Note (optional):</strong>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Additional details..."
                  rows={3}
                  style={{ width: "100%", padding: 8, fontSize: 14, fontFamily: "inherit" }}
                />
              </div>

              {completingTask.requiresPhoto && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 4 }}>
                    <strong>Photo (required):</strong>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    required
                    style={{ width: "100%", padding: 8, fontSize: 14 }}
                  />
                  {photoFile && (
                    <div style={{ marginTop: 8, fontSize: 13, color: "#28a745" }}>
                      ✓ {photoFile.name} selected
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    fontSize: 14,
                    fontWeight: "bold",
                    background: "#28a745",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  {busy ? "Submitting..." : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    fontSize: 14,
                    background: "#ccc",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
