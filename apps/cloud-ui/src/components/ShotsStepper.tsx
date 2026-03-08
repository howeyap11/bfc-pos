"use client";

/**
 * POS-style plus/minus stepper for shot counts.
 * Used in ItemForm for default shots and optional min/max.
 */
export function ShotsStepper({
  value,
  onChange,
  min,
  max,
  label,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number | null;
  max?: number | null;
  label?: string;
  disabled?: boolean;
}) {
  const lo = min ?? 0;
  const hi = max ?? 20;
  const clamped = Math.max(lo, Math.min(hi, value));

  const dec = () => onChange(Math.max(lo, value - 1));
  const inc = () => onChange(Math.min(hi, value + 1));

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          disabled={disabled || value <= lo}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-lg font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          −
        </button>
        <span className="min-w-[3rem] text-center text-lg font-semibold text-gray-800">
          {clamped}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={disabled || value >= hi}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-lg font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>
  );
}
