"use client";

import { useState, useRef, useEffect } from "react";

type DateRangeFilterProps = {
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  disabled?: boolean;
};

type QuickPreset = "today" | "yesterday" | "this_month" | "last_month" | "custom";

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPresetRange(preset: QuickPreset): { startDate: string; endDate: string } {
  const n = new Date();
  switch (preset) {
    case "today": {
      const d = toYYYYMMDD(n);
      return { startDate: d, endDate: d };
    }
    case "yesterday": {
      const y = new Date(n);
      y.setDate(y.getDate() - 1);
      const d = toYYYYMMDD(y);
      return { startDate: d, endDate: d };
    }
    case "this_month": {
      const first = new Date(n.getFullYear(), n.getMonth(), 1);
      const last = new Date(n.getFullYear(), n.getMonth() + 1, 0);
      return { startDate: toYYYYMMDD(first), endDate: toYYYYMMDD(last) };
    }
    case "last_month": {
      const first = new Date(n.getFullYear(), n.getMonth() - 1, 1);
      const last = new Date(n.getFullYear(), n.getMonth(), 0);
      return { startDate: toYYYYMMDD(first), endDate: toYYYYMMDD(last) };
    }
    default:
      return { startDate: "", endDate: "" };
  }
}

export function formatDateRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T23:59:59");
  const sameDay = startDate === endDate;
  if (sameDay) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, 12:00am – 11:59pm`;
  }
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function whichPreset(startDate: string, endDate: string): QuickPreset {
  const today = getPresetRange("today");
  const yesterday = getPresetRange("yesterday");
  const thisMonth = getPresetRange("this_month");
  const lastMonth = getPresetRange("last_month");
  if (startDate === today.startDate && endDate === today.endDate) return "today";
  if (startDate === yesterday.startDate && endDate === yesterday.endDate) return "yesterday";
  if (startDate === thisMonth.startDate && endDate === thisMonth.endDate) return "this_month";
  if (startDate === lastMonth.startDate && endDate === lastMonth.endDate) return "last_month";
  return "custom";
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [quick, setQuick] = useState<QuickPreset>(() => whichPreset(startDate, endDate));
  const [fromInput, setFromInput] = useState(startDate);
  const [toInput, setToInput] = useState(endDate);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFromInput(startDate);
    setToInput(endDate);
    setQuick(whichPreset(startDate, endDate));
  }, [startDate, endDate]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const displayLabel = formatDateRangeLabel(startDate, endDate);

  function applyPreset(preset: QuickPreset) {
    if (preset === "custom") return;
    const { startDate: s, endDate: e } = getPresetRange(preset);
    onStartDateChange(s);
    onEndDateChange(e);
    setQuick(preset);
    setFromInput(s);
    setToInput(e);
    setOpen(false);
  }

  function applyCustom() {
    const from = fromInput.trim();
    const to = toInput.trim();
    if (from && to) {
      onStartDateChange(from);
      onEndDateChange(to);
      setQuick("custom");
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="flex min-w-[280px] items-center justify-between gap-2 rounded-lg border border-teal-500/60 bg-white px-3 py-2.5 text-left text-sm text-gray-800 shadow-sm transition-colors hover:border-teal-500 disabled:opacity-50"
      >
        <span className="pointer-events-none absolute left-3 -top-2.5 bg-white px-1.5 text-xs font-medium text-teal-700">
          Date Filter
        </span>
        <span className="mt-1 truncate text-gray-700">{displayLabel}</span>
        <svg
          className="h-4 w-4 shrink-0 text-teal-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Date Filter</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "today" as const, label: "Today" },
                { id: "yesterday" as const, label: "Yesterday" },
                { id: "this_month" as const, label: "This Month" },
                { id: "last_month" as const, label: "Last Month" },
              ] as const
            ).map(({ id, label }) => (
              <label
                key={id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                  quick === id ? "border-teal-500 bg-teal-50/50 text-teal-800" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="date-preset"
                  checked={quick === id}
                  onChange={() => applyPreset(id)}
                  className="h-4 w-4 border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>

          <div className="my-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="rounded-full bg-gray-300 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-white">
              Or
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">From:</label>
              <input
                type="date"
                value={fromInput}
                onChange={(e) => {
                  setFromInput(e.target.value);
                  setQuick("custom");
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">To:</label>
              <input
                type="date"
                value={toInput}
                onChange={(e) => {
                  setToInput(e.target.value);
                  setQuick("custom");
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              />
            </div>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={applyCustom}
              className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
