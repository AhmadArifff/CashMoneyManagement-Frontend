# 💸 CashMoney Management

![Banner](./public/asset/image/tampilan-website/landingpage(herosection).png)

CashMoney Management adalah platform manajemen keuangan modern dan profesional yang dirancang untuk membantu Anda melacak, merencanakan, dan menganalisis arus kas dengan cerdas. Dibangun dengan fokus pada **UI/UX yang responsif**, **Keamanan**, dan **Performa Optimal**.

## 🌟 Fitur Utama & Tampilan

### 1. Landing Page & Interaksi Pengguna
Menyajikan informasi yang jelas dengan fitur kalkulator keuangan interaktif untuk estimasi awal.
<p align="center">
  <img src="./public/asset/image/tampilan-website/landingpage(Kalkulator Keuangan Interaktifsection).png" width="48%">
  <img src="./public/asset/image/tampilan-website/landingpage(Fitur Dirancang Untuk Hasil Nyatasection).png" width="48%">
</p>

### 2. Autentikasi & Keamanan (Login)
Sistem login yang dilindungi dengan JWT dan otorisasi berbasis peran (RBAC) untuk menjaga kerahasiaan data finansial pengguna.
![Login](./public/asset/image/tampilan-website/loginpage.png)

### 3. Dashboard Analitik
Ringkasan finansial komprehensif yang menyajikan wawasan pemasukan, pengeluaran, dan saldo secara real-time.
![Dashboard](./public/asset/image/tampilan-website/dashboardpage.png)

### 4. Manajemen Pemasukan & Pengeluaran
Pencatatan transaksi yang mudah dan terperinci, didukung dengan validasi *Guard Clause* untuk menghindari input yang tidak valid.
<p align="center">
  <img src="./public/asset/image/tampilan-website/pemasukanpage.png" width="48%">
  <img src="./public/asset/image/tampilan-website/pengeluaranpage.png" width="48%">
</p>
<p align="center">
  <img src="./public/asset/image/tampilan-website/pemasukanpage(form catat pemasukan).png" width="48%">
  <img src="./public/asset/image/tampilan-website/pengeluaranpage(form catat pengeluaran).png" width="48%">
</p>

### 5. Perencanaan Estimasi Pengeluaran
Fitur proaktif untuk merencanakan dan mengkalkulasi estimasi pengeluaran bulanan.
![Estimasi](./public/asset/image/tampilan-website/pengeluaranpage(form Perencanaan & Kalkulator Estimasi Pengeluaran Bulanan).png)

### 6. Alokasi Dana
Pisahkan dana Anda untuk berbagai kebutuhan khusus dengan mudah.
<p align="center">
  <img src="./public/asset/image/tampilan-website/danaalokasipage.png" width="48%">
  <img src="./public/asset/image/tampilan-website/danaalokasipage(form catat danalokasi).png" width="48%">
</p>

### 7. Laporan & Notifikasi
Dapatkan laporan mutasi yang dapat diekspor dan notifikasi sistem untuk setiap aktivitas penting.
<p align="center">
  <img src="./public/asset/image/tampilan-website/laporanpage.png" width="48%">
  <img src="./public/asset/image/tampilan-website/notifikasipage.png" width="48%">
</p>

---

## 🏗️ Arsitektur & Tech Stack (PM & Engineering View)

Proyek ini menggunakan pemisahan *frontend* dan *backend* yang jelas, menerapkan standar *Clean Architecture* dan *UI/UX Pro Max Intelligence*:

- **Frontend**: Next.js, Tailwind CSS (Mobile-first, Accesibility-ready).
- **Backend**: Node.js + Express.js dengan pola *Result Pattern* dan *Guard Clauses* untuk *safe logic flow*.
- **Database**: Supabase PostgreSQL dengan *Dynamic Master Data* (Zero Hardcode Policy).
- **Quality Assurance**: 
  - *Shift-left testing* (QA terintegrasi di fase desain).
  - *Zero Hardcode Audit*: Semua data kategori bersifat dinamis dari API.
  - Implementasi *Global Exception Handler* di backend agar aplikasi tidak *crash* tak terkendali.

---

## ⚙️ Cara Setup & Instalasi (Lokal Development)

Untuk memudahkan pengembangan, berikut adalah cara menjalankan aplikasi secara lokal dengan Supabase Local.

### 1. Persyaratan Sistem
- [Node.js](https://nodejs.org/) (v18+)
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) (Wajib untuk menjalankan Supabase Local)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)

### 2. Setup Database Lokal (Supabase CLI)
Daripada menggunakan Supabase Cloud untuk development, sangat disarankan menggunakan Supabase Lokal untuk *testing* dan pengembangan yang lebih cepat.

1. Buka terminal di folder root backend (`CashMoneyManagement-Backend-Express`).
2. Jalankan inisialisasi supabase:
   ```bash
   supabase init
   ```
3. Mulai *local instance* Supabase (Docker harus berjalan):
   ```bash
   supabase start
   ```
4. Setelah selesai, terminal akan menampilkan kredensial lokal seperti:
   - `API URL`: `http://127.0.0.1:54321`
   - `anon key`: `eyJhb...`
   - `service_role key`: `eyJhb...`
   - `DB URL`: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

### 3. Konfigurasi Environment Variables (`.env`)

Kami telah menyediakan file `.env.example.local` di root folder. Salin nilainya ke masing-masing proyek.

**A. Setup Backend (`CashMoneyManagement-Backend-Express`)**
1. Masuk ke direktori backend: `cd CashMoneyManagement-Backend-Express`
2. Copy env: `cp .env.example .env`
3. Sesuaikan isi `.env` dengan kredensial lokal dari `supabase start`:
   ```env
   PORT=8000
   NODE_ENV=development
   JWT_SECRET=super_secret_jwt_key_for_local_dev
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_ANON_KEY=YOUR_LOCAL_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_LOCAL_SERVICE_ROLE_KEY
   FRONTEND_URL=http://localhost:3000
   ```
4. Install dependensi & jalankan:
   ```bash
   npm install
   npm run dev
   ```

**B. Setup Frontend (`CashMoneyManagement-Frontend`)**
1. Masuk ke direktori frontend: `cd ../CashMoneyManagement-Frontend`
2. Copy env: `cp .env.example .env`
3. Sesuaikan isi `.env`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_LOCAL_ANON_KEY
   ```
4. Install dependensi & jalankan:
   ```bash
   npm install
   npm run dev
   ```

### 4. Menghentikan Database Lokal
Jika sudah selesai mengembangkan, hentikan Supabase lokal dengan perintah:
```bash
supabase stop
```

---

## 🤝 Kolaborasi & Git Workflow

- **Branching**: Selalu buat *branch* fitur dari `dev`. (`git checkout -b feature/nama-fitur`)
- **PR Review**: QA akan memeriksa potensi bug (*Guard Clause*, keamanan token) sebelum merge ke `main`.
