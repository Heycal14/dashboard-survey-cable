"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { SegmentMapData } from "./SegmentMapModal";

const SegmentMapModal = dynamic(() => import("./SegmentMapModal"), {
  ssr: false,
});

type CableDetail = {
  id: string;
  swl_id: string | null;
  area: string;
  status: string;
  point_type?: string | null;
  material_point_name?: string | null;
  lokasi_kabel?: string | null;
  kondisi_kabel?: string | null;
  kondisi_tiang_fiber?: string | null;
  material_type?: string | null;
  labelling_material?: string | null;
  kondisi_box_material?: string | null;
  potensi_gangguan?: boolean | null;
  potensi_gangguan_desc?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  created_at?: string | null;
};

type SegmentGroup = {
  id: string;
  swl_id: string | null;
  area: string;
  status: string;
  points: CableDetail[];
};

function formatDatetime(val: string | null | undefined) {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function PointBadge({ type }: { type: string | null | undefined }) {
  if (!type) return <span>-</span>;
  const t = type.toLowerCase();
  const styles =
    t === "start"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
      : t === "end"
      ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
      : "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles}`}
    >
      {type}
    </span>
  );
}

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export default function DetailTable({
  isSurveyed,
  groupedDetails,
  flatDetails,
  selectedLabel,
  selectedArea,
}: {
  isSurveyed: boolean;
  groupedDetails: SegmentGroup[];
  flatDetails: CableDetail[];
  selectedLabel: string;
  selectedArea: string;
}) {
  const [search, setSearch] = useState("");
  const [hazardOnly, setHazardOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [activeMapSegment, setActiveMapSegment] = useState<SegmentMapData | null>(null);

  const toggleGroup = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter Grouped Data (Surveyed) - searching matches segment id, swl_id, or point info + hazard toggle
  const filteredGroups = useMemo(() => {
    if (!isSurveyed) return [];
    let list = groupedDetails;

    if (hazardOnly) {
      list = list.filter((g) => g.points.some((p) => Boolean(p.potensi_gangguan)));
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter((g) => {
      if (g.id.toLowerCase().includes(q)) return true;
      if (g.swl_id && g.swl_id.toLowerCase().includes(q)) return true;
      if (g.area.toLowerCase().includes(q)) return true;
      // Search inside points
      return g.points.some(
        (p) =>
          (p.point_type && p.point_type.toLowerCase().includes(q)) ||
          (p.material_point_name &&
            p.material_point_name.toLowerCase().includes(q)) ||
          (p.lokasi_kabel && p.lokasi_kabel.toLowerCase().includes(q)) ||
          (p.material_type && p.material_type.toLowerCase().includes(q)),
      );
    });
  }, [groupedDetails, search, hazardOnly, isSurveyed]);

  // Filter Flat Data (Non-surveyed)
  const filteredFlat = useMemo(() => {
    if (isSurveyed) return [];
    const q = search.trim().toLowerCase();
    if (!q) return flatDetails;

    return flatDetails.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        (item.swl_id && item.swl_id.toLowerCase().includes(q)) ||
        item.area.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q),
    );
  }, [flatDetails, search, isSurveyed]);

  // Total items (unit pagination adalah GROUP segment untuk surveyed agar tidak terpotong)
  const totalItems = isSurveyed ? filteredGroups.length : filteredFlat.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  // Slice per page
  const pagedGroups = useMemo(() => {
    if (!isSurveyed) return [];
    const start = (currentPage - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, currentPage, pageSize, isSurveyed]);

  const pagedFlat = useMemo(() => {
    if (isSurveyed) return [];
    const start = (currentPage - 1) * pageSize;
    return filteredFlat.slice(start, start + pageSize);
  }, [filteredFlat, currentPage, pageSize, isSurveyed]);

  const handleExportCsv = () => {
    const rows: string[] = [];
    if (isSurveyed) {
      rows.push(
        [
          "Segment ID",
          "SWL ID",
          "Area",
          "Point #",
          "Point Type",
          "Datetime",
          "Material Point",
          "Lokasi",
          "Kondisi Kabel",
          "Kondisi Tiang",
          "Material Type",
          "Labelling",
          "Kondisi Box",
          "Potensi Gangguan",
          "Deskripsi Gangguan",
          "Latitude",
          "Longitude",
        ].map(escapeCsv).join(",")
      );

      filteredGroups.forEach((g) => {
        if (g.points.length === 0) {
          rows.push(
            [
              g.id,
              g.swl_id ?? "",
              g.area,
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ].map(escapeCsv).join(",")
          );
        } else {
          g.points.forEach((pt, idx) => {
            rows.push(
              [
                g.id,
                g.swl_id ?? "",
                g.area,
                idx + 1,
                pt.point_type ?? "",
                pt.created_at ?? "",
                pt.material_point_name ?? "",
                pt.lokasi_kabel ?? "",
                pt.kondisi_kabel ?? "",
                pt.kondisi_tiang_fiber ?? "",
                pt.material_type ?? "",
                pt.labelling_material ?? "",
                pt.kondisi_box_material ?? "",
                pt.potensi_gangguan ? "Ya" : "Tidak",
                pt.potensi_gangguan_desc ?? "",
                pt.latitude ?? "",
                pt.longitude ?? "",
              ].map(escapeCsv).join(",")
            );
          });
        }
      });
    } else {
      rows.push(["Segment ID", "SWL ID", "Area", "Status"].map(escapeCsv).join(","));
      filteredFlat.forEach((item) => {
        rows.push([item.id, item.swl_id ?? "", item.area, item.status].map(escapeCsv).join(","));
      });
    }

    const csvContent = "\uFEFF" + rows.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeArea = selectedArea.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeLabel = selectedLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `cable_${safeArea}_${safeLabel}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header + Search bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Detail {selectedLabel} - {selectedArea}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Total {totalItems} {isSurveyed ? "segment" : "baris"}
            {search || hazardOnly
              ? ` (difilter dari ${isSurveyed ? groupedDetails.length : flatDetails.length})`
              : ""}
            {isSurveyed && pagedGroups.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const allExpanded = pagedGroups.every((g) => expandedIds[g.id]);
                  const next: Record<string, boolean> = {};
                  pagedGroups.forEach((g) => {
                    next[g.id] = !allExpanded;
                  });
                  setExpandedIds((prev) => ({ ...prev, ...next }));
                }}
                className="ml-2 font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {pagedGroups.every((g) => expandedIds[g.id]) ? "Tutup Semua" : "Buka Semua"}
              </button>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSurveyed && (
            <label className="flex items-center gap-1.5 rounded-md border border-neutral-300 bg-neutral-50 px-2.5 py-1.5 text-xs font-medium text-neutral-700 cursor-pointer select-none hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-750">
              <input
                type="checkbox"
                checked={hazardOnly}
                onChange={(e) => {
                  setHazardOnly(e.target.checked);
                  setPage(1);
                }}
                className="h-3.5 w-3.5 rounded accent-orange-600"
              />
              <span>⚠️ Ada Gangguan</span>
            </label>
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari ID, SWL, Lokasi..."
            className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-1.5 text-xs text-neutral-900 transition focus:border-blue-600 focus:outline-none dark:border-neutral-700 dark:text-neutral-100 sm:w-64"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={totalItems === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-emerald-700 disabled:opacity-50 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            title="Download data tabel ke format CSV"
          >
            <span>↓</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="w-full overflow-x-auto">
        {isSurveyed ? (
          <table className="w-full text-left text-xs text-neutral-700 dark:text-neutral-300">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-100">
              <tr>
                <th className="px-2 py-2 font-semibold">#</th>
                <th className="px-2 py-2 font-semibold">Point Type</th>
                <th className="px-2 py-2 font-semibold">Datetime</th>
                <th className="px-2 py-2 font-semibold">Material Point</th>
                <th className="px-2 py-2 font-semibold">Lokasi</th>
                <th className="px-2 py-2 font-semibold">Kondisi Kabel</th>
                <th className="px-2 py-2 font-semibold">Kondisi Tiang</th>
                <th className="px-2 py-2 font-semibold">Material Type</th>
                <th className="px-2 py-2 font-semibold">Labelling</th>
                <th className="px-2 py-2 font-semibold">Kondisi Box</th>
                <th className="px-2 py-2 font-semibold">Potensi Gangguan</th>
                <th className="px-2 py-2 font-semibold">Koordinat</th>
              </tr>
            </thead>
            {pagedGroups.length > 0 ? (
              // ponytail: expand state in client memory; upgrade to query param if URL sharing needed
              pagedGroups.map((group) => {
                const isExpanded = !!expandedIds[group.id];
                return (
                  <tbody
                    key={group.id}
                    className="divide-y divide-neutral-100 border-b-2 border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800"
                  >
                    <tr
                      onClick={() => toggleGroup(group.id)}
                      className="cursor-pointer select-none bg-neutral-100/90 font-medium text-neutral-900 transition hover:bg-neutral-200/80 dark:bg-neutral-800/70 dark:text-neutral-100 dark:hover:bg-neutral-700/60"
                      title="Klik untuk buka/tutup detail point"
                    >
                      <td colSpan={12} className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="text-neutral-400 font-mono text-xs">
                            {isExpanded ? "▼" : "▶"}
                          </span>
                          <span>
                            Segment ID:{" "}
                            <span className="font-mono font-semibold">
                              {group.id}
                            </span>
                          </span>
                          <span>
                            SWL ID:{" "}
                            <span className="font-semibold">
                              {group.swl_id ?? "-"}
                            </span>
                          </span>
                          <span>
                            Area:{" "}
                            <span className="font-semibold">{group.area}</span>
                          </span>
                          <span className="text-neutral-500 dark:text-neutral-400">
                            ({group.points.length} point
                            {group.points.length === 1 ? "" : "s"})
                          </span>
                          {group.points.some((p) => p.latitude && p.longitude) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMapSegment(group);
                              }}
                              className="rounded bg-blue-600 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                            >
                              Lihat Peta
                            </button>
                          )}
                          <span className="ml-auto text-[11px] text-neutral-400">
                            {isExpanded ? "sembunyikan" : "tampilkan detail"}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      group.points.length > 0 ? (
                        group.points.map((pt, pIdx) => (
                          <tr
                            key={`${group.id}-${pIdx}`}
                            className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                          >
                            <td className="px-2 py-2 font-mono text-neutral-400">
                              {pIdx + 1}
                            </td>
                            <td className="px-2 py-2">
                              <PointBadge type={pt.point_type} />
                            </td>
                            <td className="px-2 py-2 font-mono whitespace-nowrap">
                              {formatDatetime(pt.created_at)}
                            </td>
                            <td className="px-2 py-2 break-words">
                              {pt.material_point_name ?? "-"}
                            </td>
                            <td className="px-2 py-2 break-words">
                              {pt.lokasi_kabel ?? "-"}
                            </td>
                            <td className="px-2 py-2">{pt.kondisi_kabel ?? "-"}</td>
                            <td className="px-2 py-2">
                              {pt.kondisi_tiang_fiber ?? "-"}
                            </td>
                            <td className="px-2 py-2">{pt.material_type ?? "-"}</td>
                            <td className="px-2 py-2">
                              {pt.labelling_material ?? "-"}
                            </td>
                            <td className="px-2 py-2">
                              {pt.kondisi_box_material ?? "-"}
                            </td>
                            <td className="px-2 py-2 break-words">
                              {pt.potensi_gangguan === null ||
                              pt.potensi_gangguan === undefined
                                ? "-"
                                : pt.potensi_gangguan
                                ? pt.potensi_gangguan_desc || "Ya"
                                : "Tidak"}
                            </td>
                            <td className="px-2 py-2 font-mono tabular-nums break-all">
                              {pt.latitude && pt.longitude ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveMapSegment(group)}
                                  className="text-left font-medium text-blue-600 hover:underline dark:text-blue-400"
                                  title="Lihat di peta"
                                >
                                  {pt.latitude}, {pt.longitude}
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={12}
                            className="px-3 py-2 italic text-neutral-400"
                          >
                            Tidak ada data point survey
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                );
              })
            ) : (
              <tbody>
                <tr>
                  <td colSpan={12} className="px-2 py-3 text-center">
                    Data tidak ditemukan
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        ) : (
          <table className="w-full text-left text-xs text-neutral-700 dark:text-neutral-300">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-100">
              <tr>
                <th className="px-2 py-2 font-semibold">ID</th>
                <th className="px-2 py-2 font-semibold">SWL ID</th>
                <th className="px-2 py-2 font-semibold">Area</th>
                <th className="px-2 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {pagedFlat.length > 0 ? (
                pagedFlat.map((item, idx) => (
                  <tr
                    key={`${item.id}-${idx}`}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                  >
                    <td className="px-2 py-2 font-mono break-all">{item.id}</td>
                    <td className="px-2 py-2 break-all">{item.swl_id ?? "-"}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{item.area}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{item.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-2 py-3 text-center" colSpan={4}>
                    Data tidak ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-neutral-200 pt-3 dark:border-neutral-800 sm:flex-row">
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span>Tampilkan per halaman:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-xs dark:border-neutral-700"
          >
            <option value={5} className="dark:bg-neutral-900">5 {isSurveyed ? "segment" : "baris"}</option>
            <option value={10} className="dark:bg-neutral-900">10 {isSurveyed ? "segment" : "baris"}</option>
            <option value={20} className="dark:bg-neutral-900">20 {isSurveyed ? "segment" : "baris"}</option>
            <option value={50} className="dark:bg-neutral-900">50 {isSurveyed ? "segment" : "baris"}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="rounded border border-neutral-300 px-2.5 py-1 text-xs font-medium transition hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="rounded border border-neutral-300 px-2.5 py-1 text-xs font-medium transition hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Next
          </button>
        </div>
      </div>

      {activeMapSegment && (
        <SegmentMapModal
          segment={activeMapSegment}
          onClose={() => setActiveMapSegment(null)}
        />
      )}
    </div>
  );
}
