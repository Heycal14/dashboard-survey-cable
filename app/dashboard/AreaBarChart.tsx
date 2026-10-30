"use client";

import { useMemo, useState } from "react";

type CableSummary = {
  area: string;
  total: string;
  surveyed: string;
  in_progress: string;
  open: string;
  open_belum_survey: string;
  open_expired: string;
  open_cancelled: string;
};

export default function AreaBarChart({ data }: { data: CableSummary[] }) {
  const [selectedMetric, setSelectedMetric] = useState<
    "all" | "surveyed" | "in_progress" | "open"
  >("all");

  const parsedData = useMemo(() => {
    return data.map((d) => ({
      area: d.area,
      total: Number(d.total) || 0,
      surveyed: Number(d.surveyed) || 0,
      in_progress: Number(d.in_progress) || 0,
      open: Number(d.open) || 0,
    }));
  }, [data]);

  const maxTotal = useMemo(() => {
    if (parsedData.length === 0) return 1;
    return Math.max(...parsedData.map((d) => d.total), 1);
  }, [parsedData]);

  if (parsedData.length === 0) return null;

  return (
    <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-5 shadow-2xs dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Grafik Progres Survey Kabel per Area
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Visualisasi perbandingan volume segmen kabel di setiap wilayah regional
          </p>
        </div>

        {/* Filter Metric Toggle */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => setSelectedMetric("all")}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              selectedMetric === "all"
                ? "bg-white text-neutral-900 shadow-2xs dark:bg-neutral-900 dark:text-neutral-100"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            Stacked Progres
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric("surveyed")}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              selectedMetric === "surveyed"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            Surveyed Saja
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric("in_progress")}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              selectedMetric === "in_progress"
                ? "bg-sky-600 text-white shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            In Progress Saja
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric("open")}
            className={`rounded-md px-2.5 py-1 font-medium transition ${
              selectedMetric === "open"
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            Open Saja
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400 border-b border-neutral-100 pb-3 dark:border-neutral-800">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-emerald-500 inline-block" />
          Surveyed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-sky-500 inline-block" />
          In Progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-amber-500 inline-block" />
          Open
        </span>
        <span className="ml-auto text-[11px] text-neutral-400 font-mono">
          Skala Max: {maxTotal.toLocaleString("id-ID")} segmen
        </span>
      </div>

      {/* Horizontal Bar Chart List */}
      <div className="space-y-3">
        {parsedData.map((item) => {
          const surveyedWidth = (item.surveyed / maxTotal) * 100;
          const inProgressWidth = (item.in_progress / maxTotal) * 100;
          const openWidth = (item.open / maxTotal) * 100;
          const pct = item.total > 0 ? ((item.surveyed / item.total) * 100).toFixed(0) : "0";

          return (
            <div key={item.area} className="group">
              <div className="mb-1 flex items-center justify-between text-xs font-medium">
                <span className="text-neutral-800 dark:text-neutral-200">
                  {item.area}
                </span>
                <span className="font-mono text-neutral-500 dark:text-neutral-400 text-[11px]">
                  {item.surveyed.toLocaleString("id-ID")} / {item.total.toLocaleString("id-ID")} segmen ({pct}%)
                </span>
              </div>

              {/* Progress Bar Container */}
              <div className="relative h-5 w-full overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800 flex">
                {selectedMetric === "all" ? (
                  <>
                    <div
                      style={{ width: `${surveyedWidth}%` }}
                      className="h-full bg-emerald-500 transition-all duration-300 hover:brightness-110"
                      title={`Surveyed: ${item.surveyed}`}
                    />
                    <div
                      style={{ width: `${inProgressWidth}%` }}
                      className="h-full bg-sky-500 transition-all duration-300 hover:brightness-110"
                      title={`In Progress: ${item.in_progress}`}
                    />
                    <div
                      style={{ width: `${openWidth}%` }}
                      className="h-full bg-amber-500 transition-all duration-300 hover:brightness-110"
                      title={`Open: ${item.open}`}
                    />
                  </>
                ) : selectedMetric === "surveyed" ? (
                  <div
                    style={{ width: `${surveyedWidth}%` }}
                    className="h-full bg-emerald-500 transition-all duration-300"
                    title={`Surveyed: ${item.surveyed}`}
                  />
                ) : selectedMetric === "in_progress" ? (
                  <div
                    style={{ width: `${inProgressWidth}%` }}
                    className="h-full bg-sky-500 transition-all duration-300"
                    title={`In Progress: ${item.in_progress}`}
                  />
                ) : (
                  <div
                    style={{ width: `${openWidth}%` }}
                    className="h-full bg-amber-500 transition-all duration-300"
                    title={`Open: ${item.open}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
