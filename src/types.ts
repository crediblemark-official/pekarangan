/**
 * ============================================================================
 * PEKARANGAN - TYPESCRIPT DATA MODELS & INTERFACES (4 PILAR RESMI BAKU)
 * ============================================================================
 */

export interface MemberData {
  member_id?: string;
  nama_lengkap: string;
  nama_panggilan: string;
  nomor_wa: string;
  mwc_zone?: string;
  ranting?: string;
  rt_rw: string;
  alamat_catatan: string;
  gps_lat_long: string;
  status_verifikasi: "DRAFT" | "VERIFIED";
}

export interface CommunityMemberItem {
  id: string;
  name: string;
  phone: string;
  mwcZone?: string;
  ranting?: string;
  rtRw: string;
  statusLahan: string;
  estimasiLuas: string;
  zonasi: string[];
  komoditas: { name: string; icon: string; category?: string }[];
  joinedDate: string;
  bio: string;
  yardName?: string;
  isDeviceOwner?: boolean;
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
 * 4 PILAR RESMI EKONOMI PEKARANGAN WARGA NU:
 * 1. Rumah Pangan Mandiri (RPM) - Jangkar ketahanan nabati harian keluarga
 * 2. Kandang Keluarga Produktif - Protein hewani, pupuk organik & tabungan riil (Living Bank)
 * 3. Apotek Hidup (Farmasi Mini) - TOGA & kedaulatan kesehatan herbal alami
 * 4. Rumah Produksi Pekarangan (RPP) - Pabrik mini hilirisasi dapur & penyelamatan surplus
 */
export type PilarKategori = 
  | "1. Rumah Pangan Mandiri (RPM)" 
  | "2. Kandang Keluarga Produktif" 
  | "3. Apotek Hidup (Farmasi Mini)" 
  | "4. Rumah Produksi Pekarangan (RPP)";

export function normalizePilarKategori(cat: string): PilarKategori {
  if (!cat) return "1. Rumah Pangan Mandiri (RPM)";
  if (cat.includes("Rumah Pangan") || cat.includes("RPM") || cat.startsWith("1.")) {
    return "1. Rumah Pangan Mandiri (RPM)";
  }
  if (cat.includes("Kandang") || cat.startsWith("2.")) {
    return "2. Kandang Keluarga Produktif";
  }
  if (cat.includes("Apotek") || cat.includes("Apotik") || cat.includes("Farmasi") || cat.startsWith("3.")) {
    return "3. Apotek Hidup (Farmasi Mini)";
  }
  if (cat.includes("Rumah Produksi") || cat.includes("RPP") || cat.startsWith("4.")) {
    return "4. Rumah Produksi Pekarangan (RPP)";
  }
  return "1. Rumah Pangan Mandiri (RPM)";
}

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
  publish_to_mamasar?: boolean; // Opsi promosi surplus RPP ke Mamasar
}

export interface SurveyPayload {
  member_data: MemberData;
  yard_data: YardData;
  assets_data: AssetItem[];
  image_base64: string;
}

export interface AppSettings {
  gasUrl: string;
  tursoUrl?: string;
  tursoAuthToken?: string;
  mwcZone?: string;
  ranting?: string;
  defaultRtRw: string;
  cadreName?: string;
  ownerName: string; // Nama Pemilik / Keluarga (Milik Siapa)
  yardName: string; // Nama Pekarangan (Objek/Apa)
  phone: string; // Nomor WhatsApp Kontak
  addressDetail: string; // Alamat / No. Rumah
  landStatus: string; // Status Lahan (Milik Sendiri / Sewa)
  landArea: string; // Estimasi Luas Lahan
  theme: "dark" | "light";
  deviceId?: string;
}

export type SyncOperationType = 'survey' | 'plant' | 'livestock' | 'update_phase' | 'egg_log' | 'harvest' | 'consume' | 'option' | 'register_account';

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
  plantedDate: string; // ISO YYYY-MM-DD or readable string
  plantedTimestamp?: number;
  hst: number;
  targetHst: number;
  phase: string;
  icon: string;
  progressPercent: number;
  isHarvested?: boolean;
  ownerDeviceId?: string;
}

export interface LivestockItem {
  id: string;
  type: string;
  name: string;
  qty: string;
  housing: string;
  todayYield: number;
  weekYield: number;
  lastYieldDate?: string; // YYYY-MM-DD for daily automatic reset
  icon: string;
  note: string;
  ownerDeviceId?: string;
}

export interface HarvestRecordItem {
  id: string;
  plantId: string;
  plantName: string;
  qty: string;
  unit: string;
  estimatedValue: number;
  allocation: 'konsumsi' | 'sedekah' | 'barter' | 'olahan_rpp' | 'jual_surplus';
  consumedQty?: number;
  surplusQty?: number;
  date: string;
  note: string;
  ownerDeviceId?: string;
}

export interface ActivityLogItem {
  id: string;
  title: string;
  type: 'panen' | 'ternak' | 'rawat' | 'tanam';
  date: string;
  note: string;
  value?: number;
  ownerDeviceId?: string;
}

export interface KasLogItem {
  id: string;
  item: string;
  meal: string;
  note: string;
  date: string;
  savedValue: number;
  qty?: number;
  pricePerUnit?: number;
  ownerDeviceId?: string;
}

export interface MasterOptions {
  rt_rw: string[];
  lokasi_tanam: string[];
  komoditas_konsumsi: { label: string; value: string; unit: string; price: number; icon: string }[];
  jenis_makan: string[];
  media_tanam: string[];
}
