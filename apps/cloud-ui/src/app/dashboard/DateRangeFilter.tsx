"use client";

type DateRangeFilterProps = {
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  disabled?: boolean;
};

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled,
}: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        disabled={disabled}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm"
      />
      <span className="text-gray-500">–</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        disabled={disabled}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm"
      />
    </div>
  );
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
