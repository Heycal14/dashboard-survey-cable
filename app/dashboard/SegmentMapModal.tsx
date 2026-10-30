"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type CablePoint = {
  point_type?: string | null;
  material_point_name?: string | null;
  lokasi_kabel?: string | null;
  kondisi_kabel?: string | null;
  kondisi_tiang_fiber?: string | null;
  potensi_gangguan?: boolean | null;
  potensi_gangguan_desc?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

export type SegmentMapData = {
  id: string;
  swl_id: string | null;
  area: string;
  points: CablePoint[];
};

function createMarkerIcon(type: string | null | undefined, hasHazard: boolean) {
  const t = (type || "").toLowerCase();
  let bg = "#0284c7"; // sky-600 intermediate
  let text = "M";

  if (t === "start") {
    bg = "#16a34a"; // green-600
    text = "S";
  } else if (t === "end") {
    bg = "#dc2626"; // red-600
    text = "E";
  }

  const border = hasHazard ? "3px solid #f97316" : "2px solid #ffffff";

  return L.divIcon({
    className: "custom-map-pin",
    html: `<div style="
      background-color: ${bg};
      width: 26px;
      height: 26px;
      border-radius: 9999px;
      border: ${border};
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      color: white;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
    ">${text}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

export default function SegmentMapModal({
  segment,
  onClose,
}: {
  segment: SegmentMapData;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const validPoints = segment.points
    .map((p, idx) => {
      const lat = parseFloat(p.latitude || "");
      const lng = parseFloat(p.longitude || "");
      return { ...p, lat, lng, origIndex: idx + 1 };
    })
    .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default center Indonesia or first valid point
    const initialCenter: [number, number] =
      validPoints.length > 0
        ? [validPoints[0].lat, validPoints[0].lng]
        : [-2.5489, 118.0149];

    const map = L.map(containerRef.current).setView(
      initialCenter,
      validPoints.length > 0 ? 15 : 5,
    );
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    if (validPoints.length > 0) {
      const latLngs: [number, number][] = [];

      validPoints.forEach((pt) => {
        const coords: [number, number] = [pt.lat, pt.lng];
        latLngs.push(coords);

        const isHazard = Boolean(pt.potensi_gangguan);
        const icon = createMarkerIcon(pt.point_type, isHazard);

        const popupContent = `
          <div style="font-size: 12px; font-family: sans-serif; line-height: 1.4; min-width: 180px;">
            <div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px;">
              Point #${pt.origIndex} (${(pt.point_type || "point").toUpperCase()})
            </div>
            <div><b>Material:</b> ${pt.material_point_name || "-"}</div>
            <div><b>Lokasi:</b> ${pt.lokasi_kabel || "-"}</div>
            <div><b>Kondisi Kabel:</b> ${pt.kondisi_kabel || "-"}</div>
            <div><b>Kondisi Tiang:</b> ${pt.kondisi_tiang_fiber || "-"}</div>
            <div><b>Koordinat:</b> ${pt.lat.toFixed(6)}, ${pt.lng.toFixed(6)}</div>
            ${
              isHazard
                ? `<div style="color: #ea580c; font-weight: bold; margin-top: 4px;">⚠️ Potensi Gangguan: ${pt.potensi_gangguan_desc || "Ya"}</div>`
                : ""
            }
          </div>
        `;

        L.marker(coords, { icon }).bindPopup(popupContent).addTo(map);
      });

      // Draw route line
      if (latLngs.length > 1) {
        L.polyline(latLngs, {
          color: "#2563eb",
          weight: 4,
          opacity: 0.85,
          dashArray: "6, 6",
        }).addTo(map);
      }

      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [validPoints]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div className="relative flex h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-neutral-200 bg-white shadow-2xl overflow-hidden dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>Peta Rute Kabel</span>
              <span className="font-mono text-xs font-normal text-neutral-500">
                Segment #{segment.id}
              </span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              SWL: {segment.swl_id || "-"} &bull; Area: {segment.area} &bull;{" "}
              {validPoints.length} titik koordinat GPS
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Tutup (Esc)
          </button>
        </div>

        {/* Map Canvas */}
        <div className="relative flex-1">
          {validPoints.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-100/90 text-sm font-medium text-neutral-600 dark:bg-neutral-900/90 dark:text-neutral-400">
              Tidak ada data koordinat latitude/longitude valid pada segmen ini.
            </div>
          )}
          <div ref={containerRef} className="h-full w-full" />
        </div>

        {/* Legend Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-green-600 inline-block" />
              Titik Start (S)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-sky-600 inline-block" />
              Intermediate (M)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-600 inline-block" />
              Titik End (E)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-orange-500 bg-neutral-400 inline-block" />
              Potensi Gangguan
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">
            Klik pin marker untuk lihat detail kondisi tiang & kabel
          </span>
        </div>
      </div>
    </div>
  );
}
