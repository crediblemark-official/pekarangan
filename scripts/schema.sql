-- ============================================================================
-- PEKARANGAN - SKEMA DATABASE RELASIONAL TURSO (libSQL / SQLite Serverless)
-- ============================================================================
-- Skema tabel untuk kedaulatan pangan Pekarangan Warga NU.
-- Jalankan di Turso CLI: turso db shell <nama-db> < scripts/schema.sql
-- atau otomatis dibuat saat aplikasi Pekarangan pertama kali terhubung.

-- 1. IDENTITAS WARGA
CREATE TABLE IF NOT EXISTS tbl_anggota (
  member_id TEXT PRIMARY KEY,
  nama_lengkap TEXT NOT NULL,
  nama_panggilan TEXT,
  nomor_wa TEXT NOT NULL,
  mwc_zone TEXT,
  ranting TEXT,
  rt_rw TEXT NOT NULL,
  alamat_catatan TEXT,
  gps_lat_long TEXT,
  status_verifikasi TEXT DEFAULT 'VERIFIED',
  device_id TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_anggota_wa ON tbl_anggota(nomor_wa);
CREATE INDEX IF NOT EXISTS idx_anggota_zone ON tbl_anggota(mwc_zone, ranting);

-- 2. KARAKTERISTIK LAHAN PEKARANGAN
CREATE TABLE IF NOT EXISTS tbl_pekarangan (
  yard_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES tbl_anggota(member_id) ON DELETE CASCADE,
  status_lahan TEXT NOT NULL,
  tipe_permukaan TEXT,
  estimasi_luas TEXT,
  zonasi_posisi TEXT,
  paparan_sinar TEXT,
  sumber_air TEXT,
  fasilitas_limbah TEXT,
  drive_foto_url TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_pekarangan_member ON tbl_pekarangan(member_id);

-- 3. 4 PILAR RESMI ASET PRODUKSI
-- (RPM, Kandang Keluarga Produktif, Apotek Hidup / Farmasi Mini, RPP)
CREATE TABLE IF NOT EXISTS tbl_aset_produksi (
  asset_id TEXT PRIMARY KEY,
  yard_id TEXT NOT NULL REFERENCES tbl_pekarangan(yard_id) ON DELETE CASCADE,
  pilar_kategori TEXT NOT NULL,
  nama_komoditas TEXT NOT NULL,
  jumlah_estimasi REAL NOT NULL,
  media_tanam TEXT NOT NULL,
  catatan_produksi TEXT,
  publish_to_mamasar INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_aset_yard ON tbl_aset_produksi(yard_id);
CREATE INDEX IF NOT EXISTS idx_aset_pilar ON tbl_aset_produksi(pilar_kategori);

-- 4. PEMANTAUAN TANAMAN AKTIF (HST & Fase)
CREATE TABLE IF NOT EXISTS tbl_tanaman (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  variety TEXT,
  location TEXT,
  qty TEXT,
  planted_date TEXT,
  target_hst INTEGER DEFAULT 60,
  phase TEXT,
  icon TEXT,
  progress_percent INTEGER DEFAULT 0,
  is_harvested INTEGER DEFAULT 0,
  owner_device_id TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 5. KELOMPOK TERNAK PRODUKTIF & BANK HIDUP
CREATE TABLE IF NOT EXISTS tbl_ternak (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  qty TEXT,
  housing TEXT,
  today_yield INTEGER DEFAULT 0,
  week_yield INTEGER DEFAULT 0,
  last_yield_date TEXT,
  icon TEXT,
  note TEXT,
  owner_device_id TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 6. JURNAL PANEN & ALOKASI SURPLUS
CREATE TABLE IF NOT EXISTS tbl_panen (
  id TEXT PRIMARY KEY,
  plant_id TEXT,
  plant_name TEXT NOT NULL,
  qty TEXT NOT NULL,
  unit TEXT,
  estimated_value REAL,
  allocation TEXT NOT NULL,
  consumed_qty REAL,
  surplus_qty REAL,
  date TEXT,
  note TEXT,
  owner_device_id TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 7. REKOR PENGHEMATAN BELANJA DAPUR RIIL
CREATE TABLE IF NOT EXISTS tbl_penghematan (
  id TEXT PRIMARY KEY,
  item TEXT NOT NULL,
  meal TEXT,
  note TEXT,
  date TEXT,
  saved_value REAL NOT NULL,
  qty REAL,
  price_per_unit REAL,
  owner_device_id TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 8. JURNAL LOG AKTIVITAS
CREATE TABLE IF NOT EXISTS tbl_log_aktivitas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT,
  note TEXT,
  value REAL,
  owner_device_id TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 9. MASTER PILIHAN DINAMIS
CREATE TABLE IF NOT EXISTS tbl_master_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  extra TEXT,
  UNIQUE(category, value)
);

-- 10. POSTINGAN SOSIAL: APA KABAR PEKARANGANMU?
CREATE TABLE IF NOT EXISTS tbl_kabar_pekarangan (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_phone TEXT,
  yard_name TEXT,
  ranting TEXT,
  mwc_zone TEXT,
  category TEXT NOT NULL, -- 'panen', 'tanam', 'ternak', 'dapur', 'apotek', 'sedekah', 'rpp'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  photo_url TEXT,
  metric_badge TEXT,
  reactions_data TEXT DEFAULT '{"berkah":0,"masyaallah":0,"seger":0,"semangat":0}',
  is_mamasar_product INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_kabar_zone ON tbl_kabar_pekarangan(mwc_zone, ranting);
CREATE INDEX IF NOT EXISTS idx_kabar_author ON tbl_kabar_pekarangan(author_id);

-- 11. REAKSI DOA SOSIAL (BERKAH, MASYAALLAH, SEGER, SEMANGAT)
CREATE TABLE IF NOT EXISTS tbl_kabar_reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES tbl_kabar_pekarangan(id) ON DELETE CASCADE,
  user_phone TEXT NOT NULL,
  reaction_type TEXT NOT NULL, -- 'berkah', 'masyaallah', 'seger', 'semangat'
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  UNIQUE(post_id, user_phone)
);

CREATE INDEX IF NOT EXISTS idx_reaction_post ON tbl_kabar_reactions(post_id);
