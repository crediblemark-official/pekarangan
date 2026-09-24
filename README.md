# 🌿 Pekarangan - Aplikasi Pendataan Lahan & Aset Komunitas

Aplikasi pendataan berbasis Android (Capacitor + Vue 3 + TypeScript + Vite) yang terhubung langsung ke **Google Sheets** via **Google Apps Script (GAS) Web App** dan **Google Drive** untuk penyimpanan foto lahan terstruktur.

---

## 🚀 Fitur Utama

1. **Identitas Warga:**
   - Pencatatan nama lengkap, panggilan, nomor WhatsApp (format `08...`), catatan alamat.
   - Pilihan RT/RW dengan fitur *Auto-Fill* preferensi kader.
   - Deteksi Geolocation GPS akurat (Latitude, Longitude, & tautan Google Maps langsung).

2. **Kondisi Fisik Pekarangan & Kamera Kompresi:**
   - Status lahan, tipe permukaan tanah (multi-select), estimasi luas, zonasi posisi, paparan sinar matahari, sumber air, dan fasilitas limbah.
   - **Client-Side Image Resizer:** Menggunakan Canvas API untuk mengompresi foto kamera HP beresolusi tinggi (hingga 50 MP) menjadi resolusi maksimal `1280x720` (< 800 KB) agar pengiriman instan dan tidak membebani kuota API.

3. **4 Pilar Resmi Aset Produksi:**
   - **Pilar 1: Rumah Pangan Mandiri (RPM):** Jangkar ketahanan pangan harian keluarga (sayuran, cabai, buah, umbi-umbian) untuk konsumsi segar dan memotong belanja pasar.
   - **Pilar 2: Kandang Keluarga Produktif:** Sumber protein hewani & modal hidup (*living capital accumulation* / bank hidup darurat): ternak ayam, itik, entok, puyuh, kelinci, kambing (telur/daging + pupuk kandang).
   - **Pilar 3: Apotik Hidup:** Kedaulatan kesehatan mandiri berbasis TOGA (jahe, kunyit, temulawak, kencur, serai, sirih, lengkuas) untuk obat herbal keluarga & jamu ketahanan ternak.
   - **Pilar 4: Rumah Produksi (Pabrik Mini):** Unit pascapanen dapur & integrator rantai nilai mikro: mengolah surplus hasil panen & ternak menjadi produk bernilai tambah (sambal kemasan, keripik, jamu herbal, telur asin).
   - Preset 1-tap chip, input komoditas/produk olahan kustom, jumlah estimasi, media/fasilitas (*Tanah*, *Polybag/Pot*, *Vertikultur*, *Kandang*, *Dapur Pengolahan*), dan catatan kapasitas produksi harian/bulanan.

4. **Mode Offline & Antrean Sinkronisasi (Blank Spot Safe):**
   - Jika kader mendata di pekarangan belakang tanpa koneksi internet, data otomatis disimpan ke antrean offline lokal (`LocalStorage`).
   - Tombol **"Sinkronkan Data"** otomatis muncul ketika koneksi internet kembali pulih.

---

## 🛠️ Tech Stack

* **Frontend:** Vue 3, TypeScript, Vite, Vanilla Modern CSS.
* **Mobile Runtime:** Capacitor 8 (Android Native / WebView).
* **Backend:** Google Apps Script (`doPost` & `doGet`).
* **Database:** Google Sheets (Relasional 3 Sheet: `tbl_anggota`, `tbl_pekarangan`, `tbl_aset_produksi`).
* **Storage Foto:** Google Drive (`Pekarangan_DB/RT_RW_{xx}/{member_id}`).

---

## 📦 Menjalankan Aplikasi Secara Lokal (Web Dev)

```bash
# Install dependensi (jika belum)
npm install

# Jalankan development server
npm run dev
```

Buka URL lokal yang muncul di terminal (misal: `http://localhost:5173`) pada browser Anda atau inspect dari browser HP.

---

## 📱 Membuat File APK Android (Capacitor)

Proyek ini sudah dikonfigurasi lengkap dengan platform native Android:

### Opsi 1: Build APK Debug Langsung via CLI

```bash
npm run build:apk
```

File APK siap pakai akan otomatis berada di:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Opsi 2: Buka di Android Studio

```bash
npm run android
```

Lalu tekan tombol **Run** atau **Build > Build Bundle(s) / APK(s) > Build APK(s)** di Android Studio.

---

## 🌐 Setup Backend Google Apps Script (Database Sheets & Drive)

1. Buka [Google Sheets](https://sheets.new) baru di browser Anda.
2. Beri nama Spreadsheet, misalnya: `Database Pekarangan RT`.
3. Salin **Spreadsheet ID** dari URL browser Anda:
   `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
4. Di Google Sheets, buka menu **Extensions (Ekstensi) > Apps Script**.
5. Salin seluruh isi berkas [`gas/Code.gs`](gas/Code.gs) dan tempel ke editor Apps Script.
6. Pada baris `SPREADSHEET_ID: ""`, isi dengan ID Spreadsheet Anda (atau biarkan kosong jika script terikat langsung).
7. Klik **Deploy (Terapkan) > New deployment (Penerapan baru)**:
   - **Select type:** *Web App*.
   - **Description:** *Pekarangan API v1*.
   - **Execute as:** *Me (email akun Anda)*.
   - **Who has access:** *Anyone (Siapa saja)*.
8. Klik **Deploy**, berikan izin otorisasi Google Drive & Sheets.
9. Salin **Web App URL** yang didapat (berformat `https://script.google.com/macros/s/.../exec`).
10. Buka aplikasi Pekarangan, tekan ikon **⚙️ (Pengaturan)** di pojok kanan atas, tempel URL Web App tersebut, lalu klik **Tes Koneksi** & **Simpan**.

Selamat mendata! 🌿
