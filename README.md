# 🌿 Pekarangan - Aplikasi Pendataan Lahan & Aset Komunitas Warga NU

Aplikasi pendataan dan manajemen kemandirian pangan berbasis Android (Capacitor + Vue 3 + TypeScript + Vite) yang terintegrasi dengan **Turso (SQLite Serverless / libSQL)** untuk performa instan (<50ms) dan terhubung langsung ke **Mamasar** (Direktori UMKM Warga NU) untuk pemasaran surplus olahan pangan. Proyek ini juga menyediakan opsi fallback ke **Google Sheets** via Apps Script.

---

## 🚀 Fitur Utama

1. **Identitas Warga & Struktur Teritorial NU:**
   - Pencatatan nama lengkap, panggilan, nomor WhatsApp, alamat & RT/RW.
   - Pilihan MWC NU (24 Kecamatan se-Kabupaten Sumenep) & Ranting Desa terstruktur.
   - Deteksi Geolocation GPS akurat (Latitude, Longitude, & tautan Google Maps langsung).
   - Binding ID Perangkat warga untuk sinkronisasi otomatis.

2. **Kondisi Fisik Pekarangan & Kamera Kompresi:**
   - Status lahan, tipe permukaan tanah, estimasi luas, zonasi posisi, paparan sinar matahari, sumber air, dan fasilitas limbah.
   - **Client-Side Image Resizer:** Menggunakan Canvas API untuk mengompresi foto kamera HP beresolusi tinggi menjadi resolusi maksimal `1280x720` (< 800 KB) agar pengiriman instan tanpa lag.

3. **4 Pilar Resmi Ekonomi Pekarangan Warga NU:**
   - **Prinsip Utama:** Mengamankan konsumsi gizi dan memotong belanja dapur keluarga secara mandiri terlebih dahulu; yang dijual/dipasarkan hanyalah **surplus panen** yang tidak habis dikonsumsi sendiri.
   - **1. Rumah Pangan Mandiri (RPM):** Jangkar ketahanan pangan nabati harian keluarga (sayuran, cabai, buah, rempah, umbi-umbian) untuk konsumsi segar dan memotong belanja dapur.
   - **2. Kandang Keluarga Produktif:** Sumber protein hewani segar (telur, daging, susu, ikan) & modal hidup (*living bank* tabungan riil keluarga) serta pemasok pupuk kompos alami.
   - **3. Apotek Hidup (Farmasi Mini):** Kedaulatan kesehatan mandiri berbasis TOGA (jahe, kunyit, temulawak, kencur, serai, sirih, kumis kucing, lidah buaya) untuk imunitas dan obat herbal alami.
   - **4. Rumah Produksi Pekarangan (RPP):** Pabrik mini dapur: mengolah surplus panen kebun & ternak yang tidak habis dikonsumsi menjadi produk bernilai tambah tahan simpan (sambal kemasan, keripik, jamu instan, telur asin) yang langsung terhubung ke marketplace Mamasar.

4. **Integrasi Ekosistem Mamasar:**
   - Surplus panen dan produk olahan Pilar 4 (RPP) dapat langsung dipromosikan ke katalog Mamasar melalui endpoint bridge otomatis (`POST /api/pekarangan/sync`).

5. **Database Serverless Turso (<50ms Latency) & Offline Queue:**
   - Menggunakan libSQL web client untuk query SQL instan tanpa jeda cold-start 2-3 detik Google Sheets.
   - Gratis 5GB storage, 500 Juta baris baca/bulan, 10 Juta baris tulis/bulan.
   - Jika kader mendata di lokasi blank spot tanpa sinyal internet, data otomatis tersimpan di antrean offline lokal (`LocalStorage`) dan disinkronkan saat online kembali.

---

## 🛠️ Tech Stack

* **Frontend:** Vue 3 Composition API, TypeScript, Vite.
* **Mobile Runtime:** Capacitor 8 (Android WebView / Native APK).
* **Database Utama:** [Turso](https://turso.tech) (libSQL / SQLite Serverless).
* **Ekosistem Pasar:** [Mamasar](https://mamasar.com) (Astro SSR + Elysia Backend).
* **Database Sekunder / Fallback:** Google Sheets via Google Apps Script (GAS).

---

## ⚡ Setup Database Turso (Direkomendasikan)

1. **Daftar / Login ke Turso:**
   Kunjungi [turso.tech](https://turso.tech) (gratis 5GB & 100 database).

2. **Buat Database Baru:**
   ```bash
   turso db create pekarangan
   ```

3. **Inisialisasi Skema Tabel:**
   Anda dapat menginisialisasi skema dengan 2 cara:
   - **Cara 1 (CLI):**
     ```bash
     turso db shell pekarangan < scripts/schema.sql
     ```
   - **Cara 2 (In-App):**
     Masukkan URL & Token di menu **Profil > Database Cloud (Turso SQLite)**, lalu tekan tombol **🛠️ Buat Tabel**.

4. **Dapatkan URL dan Auth Token:**
   ```bash
   turso db show pekarangan --url
   turso db tokens create pekarangan
   ```

5. **Konfigurasikan di Aplikasi:**
   Buat file `.env.local`:
   ```env
   VITE_TURSO_DATABASE_URL=https://pekarangan-xxxx-yourname.turso.io
   VITE_TURSO_AUTH_TOKEN=your_token_here
   VITE_MAMASAR_URL=https://mamasar.com/api/pekarangan/sync
   ```
   Atau masukkan langsung via menu **Profil** di aplikasi.

---

## 📦 Menjalankan Aplikasi Secara Lokal (Web Dev)

```bash
# Install dependensi
npm install

# Jalankan development server
npm run dev
```

Buka `http://localhost:5173` di browser.

---

## 📱 Membuat File APK Android (Capacitor)

```bash
# Build APK Debug via CLI
npm run build:apk
```

File APK siap pakai berada di:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🌐 Progressive Web App (PWA) & Cloudflare Pages (Gratis)

Aplikasi **Pekarangan** mendukung penuh format **PWA (Progressive Web App)** dengan kemampuan offline 100% menggunakan Service Worker (Workbox). Pengguna dapat langsung membuka tautan web di browser HP dan menekan tombol **"Pasang di Layar Utama (PWA)"** tanpa perlu instalasi APK manual.

### Cara Deploy Gratis ke Cloudflare Pages:
1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Compute (Workers & Pages)** > **Create application** > **Pages** > **Connect to Git**.
2. Pilih repository: `crediblemark-official/pekarangan` (branch `main`).
3. Konfigurasi Build Settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Masukkan **Environment Variables** (Production):
   - `NODE_VERSION`: `22`
   - `VITE_TURSO_DATABASE_URL`: `https://pekarangan-rasyiqi.aws-ap-southeast-1.turso.io`
   - `VITE_TURSO_AUTH_TOKEN`: *(Auth token Turso Anda)*
   - `VITE_MAMASAR_URL`: `https://mamasar.id`
   - `VITE_GAS_URL`: *(URL Google Apps Script jika menggunakan fallback)*
5. Klik **Save and Deploy**. Web app dan PWA langsung aktif di URL `https://<project-name>.pages.dev` dengan SSL gratis, CDN global berkecepatan tinggi, dan otomatis diperbarui setiap kali ada `git push`.

---

## 🌐 Fallback Setup Backend Google Apps Script (Opsional)

Jika ingin tetap menghubungkan Google Sheets sebagai backup:
1. Salin script [`gas/Code.gs`](gas/Code.gs) ke editor Google Apps Script.
2. Deploy sebagai Web App (akses: *Anyone*).
3. Masukkan URL Web App ke `.env.local` sebagai `VITE_GAS_URL`.

Selamat mewujudkan kedaulatan pangan warga! 🌿
