"use client";

import { useState, useEffect } from "react";
import {
  api,
  type ItemsSoldRow,
} from "@/lib/api";
import { formatDateRangeLabel } from "./DateRangeFilter";

type ItemsSoldTableProps = {
  startDate: string;
  endDate: string;
  initialRows: ItemsSoldRow[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  initialSortBy: "qty" | "amount" | "profit";
  initialOrder: "asc" | "desc";
};

function formatPesos(cents: number): string {
  return `₱${(cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ItemsSoldTable({
  startDate,
  endDate,
  initialRows,
  initialTotal,
  initialPage,
  initialPageSize,
  initialSortBy,
  initialOrder,
}: ItemsSoldTableProps) {
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortBy, setSortBy] = useState<"qty" | "amount" | "profit">(initialSortBy);
  const [order, setOrder] = useState<"asc" | "desc">(initialOrder);
  const [loading, setLoading] = useState(false);

  // Sync from parent when date range changes and parent has loaded new data
  useEffect(() => {
    setRows(initialRows);
    setTotal(initialTotal);
    setPage(initialPage);
    setSortBy(initialSortBy);
    setOrder(initialOrder);
  }, [startDate, endDate]);

  useEffect(() => {
    if (page === 1 && sortBy === initialSortBy && order === initialOrder) {
      setRows(initialRows);
      setTotal(initialTotal);
    }
  }, [initialRows, initialTotal, page, sortBy, order, initialSortBy, initialOrder]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const end = Math.min(start + rows.length, total);

  async function refresh(sort: "qty" | "amount" | "profit", dir: "asc" | "desc", p: number, size: number) {
    setLoading(true);
    try {
      const res = await api.getDashboardItemsSold({
        startDate,
        endDate,
        sortBy: sort,
        order: dir,
        page: p,
        pageSize: size,
      });
      setRows(res.rows);
      setTotal(res.total);
      setPage(res.page);
      setPageSize(res.pageSize);
    } finally {
      setLoading(false);
    }
  }

  function handleSort(col: "qty" | "amount" | "profit") {
    const nextOrder = sortBy === col && order === "desc" ? "asc" : "desc";
    setSortBy(col);
    setOrder(nextOrder);
    refresh(col, nextOrder, 1, pageSize);
  }

  function handlePageChange(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages) return;
    refresh(sortBy, order, nextPage, pageSize);
  }

  function handlePageSizeChange(size: number) {
    refresh(sortBy, order, 1, size);
  }

  const rangeLabel = formatDateRangeLabel(startDate, endDate);

  return (
    <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800">List of Items</h3>
      <p className="mb-4 text-sm text-gray-500">{rangeLabel}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Rank</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Sub-category</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Item</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">
                <button
                  type="button"
                  onClick={() => handleSort("qty")}
                  className="hover:text-teal-600"
                >
                  Qty {sortBy === "qty" ? (order === "desc" ? "↓" : "↑") : ""}
                </button>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">
                <button
                  type="button"
                  onClick={() => handleSort("amount")}
                  className="hover:text-teal-600"
                >
                  Amount {sortBy === "amount" ? (order === "desc" ? "↓" : "↑") : ""}
                </button>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">
                <button
                  type="button"
                  onClick={() => handleSort("profit")}
                  className="hover:text-teal-600"
                >
                  Profit {sortBy === "profit" ? (order === "desc" ? "↓" : "↑") : ""}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No items sold in this range
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.subCategory}-${r.item}-${r.rank}`} className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-600">{r.rank}</td>
                  <td className="px-4 py-3 text-gray-800">{r.subCategory}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.item}</td>
                  <td className="px-4 py-3 text-right text-gray-800">{r.qty}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    {formatPesos(r.amountCents)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800">
                    {formatPesos(r.profitCents)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 text-gray-800"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-600">
          {start + 1}-{end} of {total}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
