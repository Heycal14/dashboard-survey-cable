import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
import DetailTable from "./DetailTable";
import { pool } from "@/lib/db";

export const instant = false;

type SummaryKey =
  | "total"
  | "surveyed"
  | "in_progress"
  | "open"
  | "open_belum_survey"
  | "open_expired"
  | "open_cancelled";

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

const detailFilters: Record<SummaryKey, string> = {
  total: "TRUE",
  surveyed: "has_completed",
  in_progress: "NOT has_completed AND (has_pending OR has_active)",
  open: "NOT has_completed AND NOT has_pending AND NOT has_active",
  open_belum_survey:
    "NOT has_completed AND NOT has_pending AND NOT has_active AND NOT has_expired AND NOT has_cancelled",
  open_expired:
    "NOT has_completed AND NOT has_pending AND NOT has_active AND has_expired",
  open_cancelled:
    "NOT has_completed AND NOT has_pending AND NOT has_active AND NOT has_expired AND has_cancelled",
};

const detailLabels: Record<SummaryKey, string> = {
  total: "Total",
  surveyed: "Surveyed",
  in_progress: "In Progress",
  open: "Open",
  open_belum_survey: "Open Belum Survey",
  open_expired: "Open Expired",
  open_cancelled: "Open Cancelled",
};

function detailHref(area: string, type: SummaryKey) {
  return `/dashboard?area=${encodeURIComponent(area)}&type=${type}`;
}

async function getCableSummary(): Promise<CableSummary[]> {
  try {
    const res = await pool.query(`
      WITH visit_flags AS (
        SELECT
          segment_id,
          BOOL_OR(status = 'completed') AS has_completed,
          BOOL_OR(
            status = 'active'
            AND visit_end >= NOW()
          ) AS has_active,
          BOOL_OR(status = 'expired')
            OR BOOL_OR(
              status = 'active'
              AND visit_end < NOW()
            ) AS has_expired,
          BOOL_OR(status = 'cancelled') AS has_cancelled
        FROM mitratel_visits
        WHERE segment_id IS NOT NULL
        GROUP BY segment_id
      ),
      request_flags AS (
        SELECT
          segment_id,
          BOOL_OR(status = 'pending') AS has_pending,
          BOOL_OR(status = 'cancelled') AS has_cancelled
        FROM mitratel_visit_requests
        WHERE segment_id IS NOT NULL
        GROUP BY segment_id
      ),
      segment_state AS (
        SELECT
          COALESCE(NULLIF(TRIM(cr.area), ''), 'NON AREA') AS area,
          COALESCE(vf.has_completed, false) AS has_completed,
          COALESCE(vf.has_active, false) AS has_active,
          COALESCE(rf.has_pending, false) AS has_pending,
          COALESCE(vf.has_expired, false) AS has_expired,
          COALESCE(vf.has_cancelled, false)
            OR COALESCE(rf.has_cancelled, false) AS has_cancelled
        FROM mitratel_cable_relation cr
        LEFT JOIN visit_flags vf ON vf.segment_id = cr.id
        LEFT JOIN request_flags rf ON rf.segment_id = cr.id
      )
      SELECT
        area,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE has_completed) AS surveyed,
        COUNT(*) FILTER (
          WHERE NOT has_completed AND (has_pending OR has_active)
        ) AS in_progress,
        COUNT(*) FILTER (
          WHERE NOT has_completed AND NOT has_pending AND NOT has_active
        ) AS open,
        COUNT(*) FILTER (
          WHERE NOT has_completed AND NOT has_pending AND NOT has_active
            AND NOT has_expired AND NOT has_cancelled
        ) AS open_belum_survey,
        COUNT(*) FILTER (
          WHERE NOT has_completed AND NOT has_pending AND NOT has_active
            AND has_expired
        ) AS open_expired,
        COUNT(*) FILTER (
          WHERE NOT has_completed AND NOT has_pending AND NOT has_active
            AND NOT has_expired AND has_cancelled
        ) AS open_cancelled
      FROM segment_state
      GROUP BY area
      ORDER BY area;
    `);
    return res.rows;
  } catch (error) {
    console.error("Failed to query cable summary:", error);
    return [];
  }
}

async function getCableDetails(
  area: string,
  type: SummaryKey,
): Promise<CableDetail[]> {
  try {
    if (type === "surveyed") {
      const res = await pool.query(
        `
          SELECT
            cr.id::text AS id,
            cr.swl_id::text AS swl_id,
            COALESCE(NULLIF(TRIM(cr.area), ''), 'NON AREA') AS area,
            'Surveyed' AS status,
            rp.point_type,
            rp.material_point_name,
            rp.lokasi_kabel,
            rp.kondisi_kabel,
            rp.kondisi_tiang_fiber,
            rp.material_type,
            rp.labelling_material,
            rp.kondisi_box_material,
            rp.potensi_gangguan,
            rp.potensi_gangguan_desc,
            rp.latitude::text,
            rp.longitude::text,
            rp.created_at::text AS created_at
          FROM mitratel_cable_relation cr
          INNER JOIN mitratel_visits v
            ON v.segment_id = cr.id AND v.status = 'completed'
          LEFT JOIN mitratel_visit_reports vr
            ON vr.visit_id = v.id
          LEFT JOIN mitratel_report_points rp
            ON rp.report_id = vr.id
          WHERE COALESCE(NULLIF(TRIM(cr.area), ''), 'NON AREA') = $1
          ORDER BY
            cr.id,
            CASE rp.point_type
              WHEN 'start' THEN 1
              WHEN 'intermediate' THEN 2
              WHEN 'end' THEN 3
              ELSE 4
            END,
            rp.created_at ASC
          LIMIT 2000;
        `,
        [area],
      );
      return res.rows;
    }

    const res = await pool.query(
      `
        WITH visit_flags AS (
          SELECT
            segment_id,
            BOOL_OR(status = 'completed') AS has_completed,
            BOOL_OR(
              status = 'active'
              AND visit_end >= NOW()
            ) AS has_active,
            BOOL_OR(status = 'expired')
              OR BOOL_OR(
                status = 'active'
                AND visit_end < NOW()
              ) AS has_expired,
            BOOL_OR(status = 'cancelled') AS has_cancelled
          FROM mitratel_visits
          WHERE segment_id IS NOT NULL
          GROUP BY segment_id
        ),
        request_flags AS (
          SELECT
            segment_id,
            BOOL_OR(status = 'pending') AS has_pending,
            BOOL_OR(status = 'cancelled') AS has_cancelled
          FROM mitratel_visit_requests
          WHERE segment_id IS NOT NULL
          GROUP BY segment_id
        ),
        segment_state AS (
          SELECT
            cr.id::text AS id,
            cr.swl_id::text AS swl_id,
            COALESCE(NULLIF(TRIM(cr.area), ''), 'NON AREA') AS area,
            COALESCE(vf.has_completed, false) AS has_completed,
            COALESCE(vf.has_active, false) AS has_active,
            COALESCE(rf.has_pending, false) AS has_pending,
            COALESCE(vf.has_expired, false) AS has_expired,
            COALESCE(vf.has_cancelled, false)
              OR COALESCE(rf.has_cancelled, false) AS has_cancelled
          FROM mitratel_cable_relation cr
          LEFT JOIN visit_flags vf ON vf.segment_id = cr.id
          LEFT JOIN request_flags rf ON rf.segment_id = cr.id
        )
        SELECT
          id,
          swl_id,
          area,
          CASE
            WHEN has_completed THEN 'Surveyed'
            WHEN has_pending OR has_active THEN 'In Progress'
            WHEN has_expired THEN 'Open Expired'
            WHEN has_cancelled THEN 'Open Cancelled'
            ELSE 'Open Belum Survey'
          END AS status
        FROM segment_state
        WHERE area = $1 AND ${detailFilters[type]}
        ORDER BY id
        LIMIT 2000;
      `,
      [area],
    );
    return res.rows;
  } catch (error) {
    console.error("Failed to query cable detail:", error);
    return [];
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ area?: string; type?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const selectedArea = params?.area;
  const selectedType = params?.type as SummaryKey | undefined;
  const selectedLabel = selectedType ? detailLabels[selectedType] : undefined;
  const isSurveyed = selectedType === "surveyed";
  const details =
    selectedArea && selectedType && selectedType in detailFilters
      ? await getCableDetails(selectedArea, selectedType)
      : [];
  const summaries = await getCableSummary();

  const pointOrder: Record<string, number> = {
    start: 1,
    intermediate: 2,
    end: 3,
  };

  const groupedDetails: SegmentGroup[] = [];
  if (isSurveyed) {
    for (const item of details) {
      let g = groupedDetails.find((group) => group.id === item.id);
      if (!g) {
        g = {
          id: item.id,
          swl_id: item.swl_id,
          area: item.area,
          status: item.status,
          points: [],
        };
        groupedDetails.push(g);
      }
      if (item.point_type || item.material_point_name) {
        g.points.push(item);
      }
    }

    for (const g of groupedDetails) {
      g.points.sort((a, b) => {
        const orderA = pointOrder[a.point_type?.toLowerCase() ?? ""] ?? 4;
        const orderB = pointOrder[b.point_type?.toLowerCase() ?? ""] ?? 4;
        if (orderA !== orderB) return orderA - orderB;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });
    }
  }

  return (
    <div className="w-full px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Monitoring Survey Kabel Fiber Optik Mitratel
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Dashboard progres survey fisik rute kabel per area regional &bull; Halo, {user.name} ({user.email})
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Summary Cable per Area
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-700 dark:text-neutral-300">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-100">
              <tr>
                <th className="px-4 py-3 font-semibold">Area</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Surveyed</th>
                <th className="px-4 py-3 text-right font-semibold">
                  In Progress
                </th>
                <th className="px-4 py-3 text-right font-semibold">Open</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Open Belum Survey
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Open Expired
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Open Cancelled
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {summaries.map((item) => (
                <tr
                  key={item.area}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                >
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {item.area}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      className="font-medium text-white-600 hover:underline"
                      href={detailHref(item.area, "total")}
                    >
                      {item.total}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      className="font-medium text-white-600 hover:underline"
                      href={detailHref(item.area, "surveyed")}
                    >
                      {item.surveyed}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      className="font-medium text-white-600 hover:underline"
                      href={detailHref(item.area, "in_progress")}
                    >
                      {item.in_progress}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      className="font-medium text-white-600 hover:underline"
                      href={detailHref(item.area, "open")}
                    >
                      {item.open}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      className="font-medium text-white-600 hover:underline"
                      href={detailHref(item.area, "open_belum_survey")}
                    >
                      {item.open_belum_survey}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      className="font-medium text-white-600 hover:underline"
                      href={detailHref(item.area, "open_expired")}
                    >
                      {item.open_expired}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      className="font-medium text-white-600 hover:underline"
                      href={detailHref(item.area, "open_cancelled")}
                    >
                      {item.open_cancelled}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedArea && selectedLabel ? (
        <DetailTable
          isSurveyed={isSurveyed}
          groupedDetails={groupedDetails}
          flatDetails={details}
          selectedLabel={selectedLabel}
          selectedArea={selectedArea}
        />
      ) : null}
    </div>
  );
}
