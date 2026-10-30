# Alur Pengerjaan Project Auth1 (Monitoring Survey Kabel Mitratel)

Dokumen ini memuat alur pengerjaan proyek dari tahap inisialisasi hingga siap pakai, serta diagram alur logika runtime aplikasi.

---

## I. Tahapan Pengerjaan (Development Roadmap)

### Fase 1: Inisialisasi & Konfigurasi Basis
1. **Setup Project**:
   - Inisialisasi Next.js 16 (App Router), TypeScript, dan Tailwind CSS 4.
   - Konfigurasi runtime package manager (`bun` / `npm`).
2. **Koneksi Database (`lib/db.ts`)**:
   - Pasang driver `pg`.
   - Buat pool singleton (`globalThis._pgPool`) untuk cegah connection leak saat hot reload.
   - Setup variabel lingkungan di `.env.local` (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `AUTH_SECRET`).

### Fase 2: Sistem Autentikasi Hibrida & Sesi
1. **Penyimpanan Kredensial**:
   - Buat skema fallback file lokal `data/users.json` untuk testing cepat tanpa DB.
   - Hubungkan ke tabel `users` PostgreSQL untuk akun operasional.
2. **Klien SSO Diginav (`lib/sso.ts`)**:
   - Implementasi request POST URL-encoded ke endpoint SSO Telkom/Mitratel.
3. **Manajemen Sesi JWT (`lib/session.ts`)**:
   - Buat token HS256 via library `jose` (kompatibel Edge runtime).
   - Simpan token di HTTP-Only Cookie (`session`, lax, max-age 7 hari).
4. **Proteksi Akses (Two-Layer Security)**:
   - **Layer 1**: `middleware.ts` memeriksa token di semua route `/dashboard/:path*`.
   - **Layer 2**: `getCurrentUser()` di Server Component validasi ulang user ke DB/file.
5. **UI & Server Actions**:
   - `app/login/page.tsx` + `app/login/actions.ts`: toggle login SSO vs Lokal.
   - `app/register/page.tsx`: form pendaftaran akun lokal baru.
   - `app/api/auth/*`: endpoint REST untuk login, register, logout via Postman.

### Fase 3: Integrasi Data & Optimasi Query
1. **Query Agregasi Summary Kabel (`getCableSummary`)**:
   - Agregasi status kabel per area (`SUMBAGUT`, `JABOTABEK-BANTEN`, dll.).
   - Kategorisasi status: `Surveyed`, `In Progress`, `Open` (Belum Survey, Expired, Cancelled).
2. **Query Detail Segmen & Titik Fisik (`getCableDetails`)**:
   - Join tabel `mitratel_cable_relation`, `mitratel_visits`, `mitratel_visit_reports`, dan `mitratel_report_points`.
   - Ambil data titik: urutan (`start`, `intermediate`, `end`), GPS, material tiang, kondisi kabel, potensi gangguan.

### Fase 4: Tampilan Dashboard & UX Data
1. **Server Component (`app/dashboard/page.tsx`)**:
   - Fetch data summary dan detail langsung di server via PostgreSQL pool.
   - Parsing parameter URL filter (`area`, `status`).
2. **Client Component Interaktif (`app/dashboard/DetailTable.tsx`)**:
   - **Segment-Preserving Pagination**: pagination memotong berbasis Segment ID, titik kabel dalam 1 segmen tidak terpisah antar halaman.
   - **Live Client Search**: filter data memori instan tanpa reload browser.
   - **State Viewer**: tombol toggle detail titik per segmen.

### Fase 5: Pengujian & Akses Multi-Device
1. **Uji Endpoint API**:
   - Jalankan collection Postman untuk rute SSO, login lokal, registrasi, dan proteksi cookie.
2. **Akses Jaringan Lokal (LAN)**:
   - Konfigurasi `allowedDevOrigins` di `next.config.ts`.
   - Jalankan server binding host `0.0.0.0` agar dashboard dapat diakses perangkat teknisi lain dalam 1 Wi-Fi.

---

## II. Alur Runtime Aplikasi (System Architecture Flow)

### 1. Alur Autentikasi Pengguna
```text
User Input (Form Login)
        │
        ├── Pilihan: Akun SSO
        │       ├── 1. POST NIK & Password -> API SSO Diginav
        │       ├── 2. Jika valid -> Cek tabel `users` di PostgreSQL
        │       └── 3. User terdaftar & aktif -> Generate JWT
        │
        └── Pilihan: Akun Lokal
                ├── 1. Baca data/users.json
                ├── 2. Validasi password dengan bcrypt.compare()
                └── 3. Kredensial cocok -> Generate JWT
        │
        ▼
Simpan JWT ke HTTP-Only Cookie (`session`)
        │
        ▼
Redirect ke /dashboard
```

### 2. Alur Proteksi Route (`/dashboard`)
```text
Request Masuk (/dashboard)
        │
        ▼
[Edge Middleware] Ada cookie 'session' valid?
        ├── Tidak -> Redirect ke /login
        └── Ya    -> Lanjut ke Server Component
                        │
                        ▼
            [Dashboard Page Server]
            Validasi ID user via getCurrentUser()
                        ├── User tidak valid -> Redirect ke /login
                        └── User valid       -> Eksekusi Query SQL & Render Halaman
```

### 3. Alur Data & Filter Dashboard
```text
Dashboard Render
        │
        ├── 1. Eksekusi getCableSummary() -> Render Tabel Rekapitulasi Area
        │
        └── 2. User klik filter status/area -> Update Search Params (?area=...&status=...)
                │
                ▼
           Eksekusi getCableDetails(area, status)
                │
                ▼
           Kirim Data ke <DetailTable />
                ├── Grouping baris per Segment ID
                ├── Live Filter via search keyword
                └── Paginate per segmen (titik start-end tetap utuh)
```

---

## III. Checklist Deployment & Eksekusi

1. **Install Dependensi**:
   ```bash
   bun install
   # atau
   npm install
   ```
2. **Verifikasi Lingkungan**:
   - Pastikan PostgreSQL menyala dan skema tabel tersedia.
   - Isi file `.env.local`:
     ```env
     PGHOST=localhost
     PGPORT=5432
     PGUSER=postgres
     PGPASSWORD=your_password
     PGDATABASE=lensa_one_db
     AUTH_SECRET=your_jwt_secret_min_32_chars
     ```
3. **Jalankan Aplikasi**:
   - Mode dev lokal: `npm run dev` / `bun run dev`
   - Mode jaringan LAN: `npm run dev -- -H 0.0.0.0`
4. **Build Produksi**:
   ```bash
   npm run build && npm run start
   ```
