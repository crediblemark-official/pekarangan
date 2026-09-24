/**
 * ============================================================================
 * PEKARANGAN - TYPESCRIPT DATA MODELS & INTERFACES (4 PILAR RESMI)
 * ============================================================================
 */

export interface MemberData {
  member_id?: string;
  nama_lengkap: string;
  nama_panggilan: string;
  nomor_wa: string;
  rt_rw: string;
  alamat_catatan: string;
  gps_lat_long: string;
  status_verifikasi: "DRAFT" | "VERIFIED";
}

export type StatusLahan = "Milik Sendiri" | "Sewa/Kontrak" | "Lahan Tidur/Fasum";
export type EstimasiLuas = "<10 m²" | "10-30 m²" | "30-50 m²" | ">50 m²";
export type PaparanSinar = "Penuh (>6 jam)" | "Sebagian (3-6 jam)" | "Teduh (<3 jam)";
export type SumberAir = "Sumur" | "PDAM" | "Air Hujan" | "Aliran Sungai/Selokan";

export interface YardData {
  yard_id?: string;
  member_id?: string;
  status_lahan: StatusLahan;
  tipe_permukaan: string[]; // Multi-select: Tanah Terbuka, Paving/Semen, Bebatuan
  estimasi_luas: EstimasiLuas;
  zonasi_posisi: string[]; // Multi-select: Depan, Samping, Belakang
  paparan_sinar: PaparanSinar;
  sumber_air: SumberAir;
  fasilitas_limbah: string[]; // Multi-select: Komposter Ember, Biopori, Kandang Maggot, Lubang Sampah, Nihil
  drive_foto_url?: string;
}

/**
 * 4 PILAR RESMI PEKARANGAN:
 * 1. Rumah Pangan Mandiri (RPM) - Ketahanan pangan sayur & karbohidrat
 * 2. Kandang Keluarga Produktif - Protein hewani & modal hidup (bank hidup)
 * 3. Apotik Hidup - TOGA & kedaulatan herbal alami
 * 4. Rumah Produksi (Pabrik Mini) - Integrator nilai tambah & hilirisasi dapur
 */
export type PilarKategori = 
  | "1. Rumah Pangan Mandiri" 
  | "2. Kandang Keluarga Produktif" 
  | "3. Apotik Hidup" 
  | "4. Rumah Produksi";

export type MediaTanamWadah = 
  | "Langsung di Tanah" 
  | "Polybag/Pot" 
  | "Vertikultur" 
  | "Kandang" 
  | "Dapur Pengolahan";

export interface AssetItem {
  asset_id?: string;
  yard_id?: string;
  pilar_kategori: PilarKategori;
  nama_komoditas: string;
  jumlah_estimasi: number;
  media_tanam: MediaTanamWadah;
  catatan_produksi?: string;
}

export interface SurveyPayload {
  member_data: MemberData;
  yard_data: YardData;
  assets_data: AssetItem[];
  image_base64: string;
}

export interface AppSettings {
  gasUrl: string;
  defaultRtRw: string;
  cadreName: string;
  theme: "dark" | "light";
}

export type SyncOperationType = 'survey' | 'plant' | 'update_phase' | 'egg_log' | 'harvest' | 'consume' | 'option';

export interface SyncQueueItem {
  queueId: string;
  createdAt: string;
  status: "PENDING" | "SYNCING" | "FAILED";
  retryCount: number;
  lastError?: string;
  type?: SyncOperationType;
  title?: string;
  payload: any;
}

export interface TeaserFeature {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  tag: string;
  isLocked: boolean;
  currentCount: number;
  targetCount: number;
  targetUnit: string;
  points: string[];
  whyLocked: string;
  shareMessage: string;
}

export interface SedekahLog {
  id: string;
  title: string;
  date: string;
  note: string;
}

export interface PlantItem {
  id: string;
  name: string;
  variety: string;
  location: string;
  qty: string;
  plantedDate: string;
  hst: number;
  targetHst: number;
  phase: string;
  icon: string;
  progressPercent: number;
}

export interface LivestockItem {
  id: string;
  type: string;
  name: string;
  qty: string;
  housing: string;
  todayYield: number;
  weekYield: number;
  icon: string;
  note: string;
}

export interface ActivityLogItem {
  id: string;
  title: string;
  type: 'panen' | 'ternak' | 'rawat' | 'tanam';
  date: string;
  note: string;
}

export interface KasLogItem {
  id: string;
  item: string;
  meal: string;
  note: string;
  date: string;
  savedValue: number;
}

export interface MasterOptions {
  rt_rw: string[];
  lokasi_tanam: string[];
  komoditas_konsumsi: { label: string; value: string; unit: string; price: number; icon: string }[];
  jenis_makan: string[];
  media_tanam: string[];
}


