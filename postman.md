# Panduan Menggunakan API di Postman

Panduan lengkap untuk menguji sistem autentikasi dan dashboard menggunakan Postman.

Base URL: `http://localhost:3000`

---

## 1. Persiapan Awal

1. Pastikan server aplikasi sudah berjalan:
   ```bash
   npm run dev
   ```
2. Pastikan fitur **Cookie Jar** aktif di Postman (secara default sudah aktif). Token session JWT disimpan di cookie HTTP-only bernama `session`.

---

## 2. Koleksi Endpoint

### A. Register Akun Baru

- **Method:** `POST`
- **URL:** `http://localhost:3000/api/auth/register`
- **Headers:**
  - `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  {
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "password": "password123"
  }
  ```
- **Response Sukses (201 Created):**
  ```json
  {
    "user": {
      "id": "uuid-user-baru",
      "email": "budi@example.com",
      "name": "Budi Santoso"
    }
  }
  ```
- Cookie `session` langsung tersimpan otomatis di Postman.

---

### B. Login Akun

- **Method:** `POST`
- **URL:** `http://localhost:3000/api/auth/login`
- **Headers:**
  - `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  {
    "email": "budi@example.com",
    "password": "password123"
  }
  ```
- **Response Sukses (200 OK):**
  ```json
  {
    "user": {
      "id": "uuid-user",
      "email": "budi@example.com",
      "name": "Budi Santoso"
    }
  }
  ```
- Cookie `session` tersimpan di cookie jar Postman.

---

### C. Akses Dashboard & Summary Kabel

Dashboard menggunakan SSR (Server Side Rendering) menghasilkan dokumen HTML.

- **Method:** `GET`
- **URL:** `http://localhost:3000/dashboard`
- **Headers:** Tidak perlu set khusus (cookie dikirim otomatis).
- **Cara Lihat Hasil di Postman:**
  - Klik tab **Preview** di jendela response bawah untuk melihat visual tabel ringkasan summary per area.

---

### D. Akses Detail Survey (1 Tabel Grouping & Urutan Titik)

Mengambil detail titik survey untuk area tertentu:

- **Method:** `GET`
- **URL:** 
  ```
  http://localhost:3000/dashboard?area=SUMBAGUT&type=surveyed
  ```
- **Query Params:**
  - `area`: Nama area (contoh: `SUMBAGUT`, `JABOTABEK-BANTEN`, dsb.)
  - `type`: Tipe status (`surveyed`, `in_progress`, `open`, `open_belum_survey`, `open_expired`, `open_cancelled`, `total`)
- **Tampilan Output di Postman (tab Preview):**
  - Data detail sudah digabung jadi **1 tabel grouping per Segment ID**.
  - Urutan titik terurut: `start` -> `intermediate` -> `end` -> `datetime`.

---

### E. Logout

- **Method:** `POST`
- **URL:** `http://localhost:3000/api/auth/logout`
- **Response Sukses (200 OK):**
  ```json
  {
    "message": "Logout berhasil"
  }
  ```
- Cookie `session` dihapus dari cookie jar.
