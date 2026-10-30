# Dokumentasi Lengkap Query SQL - Database Lensa One (`lensa_one_db`)

Dokumen ini menjelaskan secara rinci seluruh struktur query SQL yang digunakan dalam project ini, meliputi:
1. **Query Ringkasan Agregasi (`getCableSummary`)** di `app/dashboard/page.tsx`
2. **Query Detail Data Survey & Segmen (`getCableDetails`)** di `app/dashboard/page.tsx`
3. **Query Hak Akses Akun SSO (`findUserInDatabase` & `findUserById`)** di `lib/users.ts`

---

## 1. Skema Tabel PostgreSQL yang Digunakan

| Nama Tabel | Peran Utama | Kolom Kunci yang Digunakan |
|---|---|---|
| `users` | Master data user & hak akses sistem | `id` (UUID), `username` (NIK), `email`, `full_name`, `password_hash`, `role`, `status` |
| `mitratel_cable_relation` | Master data segmen bentangan kabel | `id` (PK, string segment), `swl_id`, `area` |
| `mitratel_visits` | Riwayat izin kunjungan fisik lapangan | `id`, `segment_id`, `status` (`completed`, `active`, `expired`, `cancelled`), `visit_end` |
| `mitratel_visit_requests` | Riwayat tiket permohonan kunjungan | `id`, `segment_id`, `status` (`pending`, `cancelled`) |
| `mitratel_visit_reports` | Laporan hasil survey kunjungan selesai | `id`, `visit_id` |
| `mitratel_report_points` | Titik-titik fisik penarikan rute kabel | `id`, `report_id`, `point_type`, `material_point_name`, `lokasi_kabel`, `kondisi_kabel`, `kondisi_tiang_fiber`, `material_type`, `labelling_material`, `kondisi_box_material`, `potensi_gangguan`, `potensi_gangguan_desc`, `latitude`, `longitude`, `created_at` |

---

## 2. Query 1: Ringkasan Status Kabel per Area (`getCableSummary`)

### Lokasi Kode:
Fungsi `getCableSummary()` di `app/dashboard/page.tsx`.

### Tujuan:
Menghitung matriks status segmen kabel secara agregat, dikelompokkan berdasarkan wilayah operasional (`area`).

### Syntax SQL Lengkap:
```sql
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
```

### Penjelasan Mendalam per Bagian:

#### A. CTE `visit_flags`
- Satu segmen kabel dapat memiliki **banyak riwayat kunjungan** di tabel `mitratel_visits`.
- Fungsi agregasi `BOOL_OR(...)` digunakan untuk mengecek keberadaan kondisi:
  - `has_completed`: Bernilai `true` jika setidaknya ada 1 baris kunjungan yang berhasil selesai (`status = 'completed'`).
  - `has_active`: Bernilai `true` jika kunjungan masih berjalan dan belum melewati batas waktu kunjungan (`status = 'active' AND visit_end >= NOW()`).
  - `has_expired`: Bernilai `true` jika ada status eksplisit `'expired'` **ATAU** status masih tertulis `'active'` tetapi waktunya sudah terlewati (`visit_end < NOW()`).
  - `has_cancelled`: Bernilai `true` jika riwayat kunjungan pernah dibatalkan.

#### B. CTE `request_flags`
- Mengelompokkan tabel permohonan kunjungan (`mitratel_visit_requests`):
  - `has_pending`: Ada tiket pengajuan survey yang belum dieksekusi (`status = 'pending'`).
  - `has_cancelled`: Ada tiket pengajuan yang dibatalkan.

#### C. CTE `segment_state`
- Menghubungkan master kabel `mitratel_cable_relation` dengan `visit_flags` dan `request_flags` menggunakan `LEFT JOIN`.
- Membersihkan kolom `area`: Jika kosong, hanya spasi, atau `NULL`, dipetakan menjadi `'NON AREA'` via `COALESCE(NULLIF(TRIM(cr.area), ''), 'NON AREA')`.
- Nilai `NULL` dari hasil `LEFT JOIN` dinormalisasi menjadi boolean `false` dengan `COALESCE(..., false)`.

#### D. Bagian `SELECT` Utama & Logika Filter Agregasi
Menggunakan klausa canggih PostgreSQL `COUNT(*) FILTER (WHERE ...)`:
- **`total`**: Jumlah semua baris segmen kabel dalam area tersebut.
- **`surveyed`**: Segmen yang sudah memiliki kunjungan selesai (`has_completed`).
- **`in_progress`**: Belum berstatus selesai, tetapi sedang berjalan atau memiliki permohonan pending (`NOT has_completed AND (has_pending OR has_active)`).
- **`open`**: Segmen yang sama sekali belum selesai dan tidak sedang dikerjakan (`NOT has_completed AND NOT has_pending AND NOT has_active`).
- **`open_belum_survey`**: Segmen murni belum tersentuh (tidak pernah expired dan tidak pernah cancelled).
- **`open_expired`**: Segmen open yang jadwal kunjungannya pernah hangus/kedaluwarsa (`has_expired`).
- **`open_cancelled`**: Segmen open yang tidak expired tetapi pernah dibatalkan (`NOT has_expired AND has_cancelled`).

---

## 3. Query 2: Detail Data Kabel Lapangan (`getCableDetails`)

### Lokasi Kode:
Fungsi `getCableDetails(area, type)` di `app/dashboard/page.tsx`.

### Pola Parameterized Query:
Nama area dikirim menggunakan placeholder `$1` untuk menjamin keamanan dari serangan **SQL Injection**.

### Skenario A: Saat `type === 'surveyed'` (Memuat Titik-Titik Fisik Rute)
Jika pengguna mengklik angka **Surveyed**, query melakukan join multi-tabel sampai ke tingkat titik koordinat fisik (`mitratel_report_points`).

```sql
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
```

#### Mekanisme Pengurutan Titik (*Custom Sorting*):
Klausa `ORDER BY` menjamin rute kabel terurut secara logis:
1. `cr.id`: Mengelompokkan seluruh titik milik segmen yang sama.
2. `CASE rp.point_type`:
   - Prioritas 1: Titik Awal (`start`)
   - Prioritas 2: Titik Tengah / Tiang Sambungan (`intermediate`)
   - Prioritas 3: Titik Akhir (`end`)
3. `rp.created_at ASC`: Jika terdapat beberapa titik `intermediate`, diurutkan sesuai kronologi teknisi merekam titik tersebut di lapangan.

---

### Skenario B: Saat `type !== 'surveyed'` (Menampilkan Daftar Segmen Non-Survey)
Menampilkan segmen individual berstatus `In Progress`, `Open`, `Open Belum Survey`, `Open Expired`, atau `Open Cancelled`:

```sql
WITH visit_flags AS (
  -- Logika CTE sama dengan getCableSummary
  ...
),
request_flags AS (
  -- Logika CTE sama dengan getCableSummary
  ...
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
```

#### Pemetaan Nilai Variabel `${detailFilters[type]}`:
| Type Parameter | Ekspresi SQL yang Diinjeksikan |
|---|---|
| `total` | `TRUE` |
| `in_progress` | `NOT has_completed AND (has_pending OR has_active)` |
| `open` | `NOT has_completed AND NOT has_pending AND NOT has_active` |
| `open_belum_survey` | `NOT has_completed AND NOT has_pending AND NOT has_active AND NOT has_expired AND NOT has_cancelled` |
| `open_expired` | `NOT has_completed AND NOT has_pending AND NOT has_active AND has_expired` |
| `open_cancelled` | `NOT has_completed AND NOT has_pending AND NOT has_active AND NOT has_expired AND has_cancelled` |

---

## 4. Query 3: Hak Akses Akun SSO & Profil Pengguna

### Lokasi Kode:
Fungsi `findUserInDatabase` dan `findUserById` di file `lib/users.ts`.

### A. Validasi NIK saat Login SSO:
Setelah API eksternal Diginav memverifikasi NIK dan password (`auth === "Yes"`), sistem menjalankan query ini untuk memeriksa apakah pemilik NIK terdaftar di sistem:

```sql
SELECT id, username, email, full_name, password_hash, role, status
FROM users
WHERE (username = $1 OR email = $1)
LIMIT 1;
```
- **Parameter `$1`**: NIK atau email yang diinput pada formulir login.
- **Logika Keputusan**:
  - Jika hasil query barisnya kosong (`rows.length === 0`), akses langsung ditolak dengan status **403 Forbidden** (pesan: *"Akun SSO valid, tapi tidak memiliki hak akses"*).
  - Jika kolom `status !== 'active'`, akses ditolak (pesan: *"Status akun anda di sistem tidak aktif"*).

### B. Validasi Sesi Pengguna Berjalan:
Ketika user membuka halaman atau merefresh dashboard, middleware atau Server Component mengambil ID dari token cookie lalu memverifikasinya ke tabel `users`:

```sql
SELECT id, username, email, full_name, role, status
FROM users
WHERE id = $1
LIMIT 1;
```
- **Parameter `$1`**: UUID user yang tersimpan di dalam payload JWT.

---

## 5. Ringkasan Praktik Keamanan & Performa Query

1. **Anti SQL-Injection**: Seluruh input dinamis (`$1`) selalu diteruskan sebagai array parameter terpisah ke driver `pg.query(text, params)`, bukan dengan penggabungan string mentah (*string concatenation*).
2. **Efisiensi CTE (Common Table Expressions)**: Agregasi perizinan dan kunjungan dilakukan terlebih dahulu pada sub-query sebelum digabungkan ke master kabel, mencegah duplikasi baris (*Cartesian Product*).
3. **Pemberian Limit Terukur**: Query detail dibatasi `LIMIT 2000` baris agar konsumsi RAM server dan jaringan browser klien tetap ringan.
