# Dokumentasi Lengkap Project Auth1 (Monitoring Survey Kabel Mitratel)

---

## 1. Tentang Project Ini

Project ini adalah **aplikasi web dashboard internal berbasis Next.js 16 (App Router)** yang digunakan untuk memonitor progres pelaksanaan survei fisik segmen kabel fiber optik milik **Mitratel** di berbagai area regional di Indonesia.

Aplikasi ini memiliki dua pilar utama:
1. **Sistem Autentikasi Hibrida (Dual-Mode)**:
   - **Mode SSO Telkom/Mitratel**: Validasi kredensial (NIK & Password) ke API SSO eksternal Diginav, lalu diverifikasi hak aksesnya ke tabel master `users` di database PostgreSQL.
   - **Mode Akun Lokal**: Autentikasi mandiri berbasis password hash `bcrypt` dan file penyimpanan `data/users.json`.
   - **Manajemen Sesi**: Berbasis token JWT standar industri (`jose`) yang disimpan aman di HTTP-Only Cookie dengan proteksi dua lapis (Edge Middleware + Server Component).
2. **Dashboard Visualisasi Data Operasional**:
   - Menampilkan tabel ringkasan agregasi (*Summary*) status kabel per area operasional dari PostgreSQL (`lensa_one_db`).
   - Menyajikan data detail rute kabel beserta titik-titik fisik (`start`, `intermediate`, `end`), kondisi kabel/tiang, potensi gangguan, dan koordinat GPS.
   - Dilengkapi fitur **Pencarian Real-Time** dan **Pagination Terproteksi** (titik-titik dalam 1 segmen dijamin tidak terpotong antar halaman).

---

## 2. Tech Stack & Arsitektur

| Komponen | Teknologi | Alasan Pemilihan |
|---|---|---|
| **Framework** | **Next.js 16.4.0** | App Router, Server Components untuk keamanan data DB langsung di server, Server Actions untuk form handling tanpa REST boilerplate. |
| **UI Library** | **React 19.3.0** | Fitur modern `useActionState` untuk form state dan Progressive Enhancement. |
| **Bahasa** | **TypeScript 5** | Type safety end-to-end (struktur user, response query PostgreSQL, parameter filter). |
| **Styling** | **Tailwind CSS 4** | Utilitas CSS modern dan ringan, sudah mendukung dark mode secara native. |
| **Database Server** | **PostgreSQL (v8 driver via `pg`)** | Menyimpan data master jaringan kabel, kunjungan lapangan teknisi, laporan titik fisik, dan tabel hak akses user. |
| **Penyimpanan Lokal** | **Flat File JSON (`data/users.json`)** | Penyimpanan akun lokal fallback untuk kebutuhan pengujian, testing lokal, dan testing API Postman. |
| **Kriptografi & Sesi** | **`jose` & `bcryptjs`** | `jose` mendukung runtime Edge/Middleware untuk verifikasi JWT HS256; `bcryptjs` untuk enkripsi password akun lokal. |
| **Runtime & Tooling** | **Bun / Node.js** | Kompatibel penuh dengan Bun dan Node.js modern. |

---

## 3. Struktur Direktori dan Peran File

```text
auth1/
├── app/
│   ├── layout.tsx                    # Root layout: font Geist, tema Tailwind, metadata
│   ├── page.tsx                      # Halaman depan (home)
│   ├── globals.css                   # Tailwind v4 directives & root CSS variables
│   │
│   ├── login/                        # Modul Login
│   │   ├── page.tsx                  # UI form login: toggle tab SSO vs Lokal, kartu responsif
│   │   └── actions.ts                # Server Action: verifikasi SSO, validasi DB users, pembuatan JWT
│   │
│   ├── register/                     # Modul Register (Akun Lokal)
│   │   └── page.tsx                  # UI form pendaftaran akun lokal baru
│   │
│   ├── dashboard/                    # Modul Dashboard Utama (Protected Route)
│   │   ├── page.tsx                  # Server Component: validasi sesi, query SQL summary & detail
│   │   ├── DetailTable.tsx           # Client Component: UI tabel detail, live search & pagination
│   │   ├── LogoutButton.tsx          # Server Component: form trigger Server Action logout
│   │   └── actions.ts                # Server Action: pembersihan cookie sesi & redirect
│   │
│   └── api/auth/                     # Endpoint API REST (Dukungan Postman & Integrasi Luar)
│       ├── login/route.ts            # POST /api/auth/login (menerima loginType sso atau local)
│       ├── register/route.ts         # POST /api/auth/register (daftar user baru)
│       └── logout/route.ts           # POST /api/auth/logout (hapus session cookie)
│
├── lib/                              # Logic Layer Terpusat
│   ├── auth.ts                       # Helper getCurrentUser() (lookup ID ke JSON & PostgreSQL)
│   ├── db.ts                         # Konfigurasi koneksi PostgreSQL singleton (pg.Pool)
│   ├── session.ts                    # Logika enkripsi JWT, baca-tulis-hapus cookie session
│   ├── sso.ts                        # HTTP client penghubung ke API SSO eksternal Diginav
│   └── users.ts                      # Repository pencarian akun (JSON lokal & tabel users SQL)
│
├── data/
│   └── users.json                    # Flat file penyimpanan akun lokal terdaftar
│
├── middleware.ts                      # Lapisan keamanan Edge: proteksi route /dashboard/:path*
├── next.config.ts                    # Konfigurasi Next.js (allowedDevOrigins, Turbopack)
├── .env.local                        # Environment variables (secret key & koneksi PostgreSQL)
├── package.json                      # Daftar dependency dan script project
└── tsconfig.json                     # Konfigurasi compiler TypeScript
```

---

## 4. Penjelasan Mendalam Modul Penting

### A. Lapisan Database & Koneksi (`lib/db.ts`)
Mengatur koneksi terpusat ke database PostgreSQL:
- **Pola Singleton (`globalThis._pgPool`)**: Saat mode *development*, Next.js sering melakukan *hot reload*. Pola ini menjaga agar koneksi database yang sudah terbuka dipakai kembali, mencegah penumpukan koneksi (*connection leak*).
- **Konfigurasi Lingkungan**: Membaca variabel `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, dan `PGDATABASE`.

### B. Lapisan Manajemen Sesi & Token (`lib/session.ts`)
- **`createToken(userId)`**: Membungkus `userId` ke dalam format JSON Web Token (JWT) yang ditandatangani secara kriptografis menggunakan algoritma HS256 dan kunci rahasia `AUTH_SECRET`. Masa berlaku diatur 7 hari.
- **`setSessionCookie(token)`**: Menanamkan token ke cookie browser bernama `session`. Mengaktifkan flag `httpOnly: true` (tidak bisa dicuri script JavaScript browser) dan `sameSite: "lax"`.
- **`clearSessionCookie()`**: Menghapus sesi dengan memaksa cookie kedaluwarsa (`maxAge: 0`, `expires: 1970`, `path: "/"`) sekaligus memanggil fungsi `delete()`.

### C. Lapisan SSO Diginav & Hak Akses (`lib/sso.ts` & `lib/users.ts`)
- **Verifikasi SSO**: Fungsi `verifySSOCredentials` mengirimkan NIK dan password ke endpoint Diginav (`https://mtt.diginav.id/mtt_react/api/sso-api-container`) dengan format form URL-encoded.
- **Validasi Hak Akses Lokal**: Keberhasilan login di SSO **tidak serta merta** mengizinkan user masuk. Sistem akan melakukan query SQL:
  ```sql
  SELECT id, username, email, full_name, role, status 
  FROM users 
  WHERE username = $1 OR email = $1;
  ```
  Hanya user yang terdaftar di tabel `users` dan berstatus `active` yang diizinkan melanjutkan ke dashboard.

### D. Keamanan Berlapis (Two-Layer Security)
1. **Lapisan 1 - Edge Middleware (`middleware.ts`)**:
   Berjalan di pintu gerbang server sebelum request mencapai halaman. Jika cookie `session` tidak ada atau token rusak/dipalsukan, request langsung dibelokkan ke `/login`.
2. **Lapisan 2 - Server Component Verification (`app/dashboard/page.tsx`)**:
   Halaman memanggil `getCurrentUser()`. Sistem memverifikasi kembali ID user ke database. Jika profil tidak ditemukan, user diarahkan keluar.

---

## 5. Pemahaman Data Bisnis di Dashboard

Data di halaman dashboard bersumber dari relasi tabel operasional kabel Mitratel pada database PostgreSQL:

### A. Tabel Ringkasan (*Summary Cable per Area*)
Menghitung segmentasi kabel (`mitratel_cable_relation`) berdasarkan status kunjungan teknisi:
- **Area**: Nama area regional (contoh: `SUMBAGUT`, `JABOTABEK-BANTEN`, `JAWA TENGAH`, dll).
- **Total**: Jumlah total segmen kabel yang terdaftar.
- **Surveyed**: Segmen yang kunjungannya telah selesai (`mitratel_visits.status = 'completed'`).
- **In Progress**: Segmen yang sedang aktif berjalan (`status = 'active'`) atau permohonan survey masih menunggu (`mitratel_visit_requests.status = 'pending'`).
- **Open**: Segmen yang belum disurvei, dirinci menjadi:
  - **Open Belum Survey**: Belum pernah ada pengajuan atau kunjungan.
  - **Open Expired**: Pernah diajukan tapi batas waktu izin kunjungan terlewati sebelum selesai.
  - **Open Cancelled**: Kunjungan atau request dibatalkan.

### B. Tabel Detail Titik Fisik (*Detail Segment & Point*)
Ketika salah satu angka di tabel ringkasan diklik, sistem menampilkan detail rute segmen kabel:
- **Grouping Segment ID**: Menyatukan seluruh titik milik satu bentangan kabel (menampilkan nomor Segment ID, SWL ID, Area, dan total titik).
- **Point Type & Urutan**:
  - `start`: Titik awal kabel (misal dari sentral / OTB).
  - `intermediate`: Titik tiang atau sambungan tengah jalur kabel.
  - `end`: Titik akhir penarikan kabel.
- **Kondisi Lapangan**: Menampilkan material titik, kondisi kabel, kondisi tiang, jenis material kabel, labelling fisik, kondisi kotak pelindung, indikasi potensi gangguan (seperti galian tanah atau ranting pohon), dan koordinat GPS (`latitude, longitude`).

---

## 6. Fitur Search dan Pagination (`app/dashboard/DetailTable.tsx`)

Fitur ini dirancang khusus untuk kenyamanan membaca data teknis tanpa memecah integritas data:

1. **Prinsip Pagination "Grouping Tetap Utuh"**:
   - Jika pagination biasa memotong data per baris, maka dalam data survei kabel, titik `start` bisa berada di halaman 1 dan titik `end` berada di halaman 2.
   - Solusi pada project ini: **Pagination memotong per Segment Group**. Seluruh titik dalam satu ID kabel selalu berkumpul bersama di satu halaman yang sama.
2. **Fitur Live Search Tanpa Reload**:
   - Berjalan langsung di memori browser pengguna (`useMemo`).
   - Mampu mencari ke berbagai level data sekaligus: nomor ID Segmen, SWL ID, nama area, lokasi tiang, jenis material, hingga status gangguan.
3. **Pilihan Ukuran Halaman**:
   - Pengguna dapat memilih menampilkan `5`, `10`, `20`, atau `50` segmen per halaman.

---

## 7. Cara Menjalankan Project

### A. Menjalankan di Komputer Lokal
```bash
# Menggunakan Bun:
bun run dev

# Atau menggunakan NPM:
npm run dev
```
Buka browser di: `http://localhost:3000`

### B. Menjalankan Agar Bisa Diakses di Komputer Lain (Satu Jaringan LAN / Wi-Fi)
Jalankan server dengan parameter host `0.0.0.0`:
```bash
bun run dev -- -H 0.0.0.0
# atau
npm run dev -- -H 0.0.0.0
```
Akses dari browser komputer lain menggunakan alamat IP host (contoh):
```text
http://192.168.19.148:3000
```
*(Host IP ini telah diizinkan pada properti `allowedDevOrigins` di file `next.config.ts`)*.

---

## 8. Panduan Akun untuk Pengujian

1. **Jalur SSO Telkom/Mitratel**:
   - Masukkan NIK resmi Anda dan password SSO.
   - Akun harus terdaftar di tabel master `users` PostgreSQL agar diizinkan masuk.
2. **Jalur Akun Lokal (Fallback / Demo)**:
   - Email: `postman@test.com` | Password: `password123`
   - Email: `budi@mail.com` | Password: `password123`
   - Atau buat akun baru melalui halaman **Daftar Akun** (`/register`).
