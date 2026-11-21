import type { PilarKategori, MediaTanamWadah } from '../types';

export interface PresetItem {
  nama: string;
  defaultMedia: MediaTanamWadah;
  defaultQty: number;
  defaultNote?: string;
}

export const pillarDetails: Record<PilarKategori, { title: string; subtitle: string; desc: string; icon: string; badge: string }> = {
  '1. Rumah Pangan Mandiri (RPM)': {
    title: 'Rumah Pangan Mandiri (RPM)',
    subtitle: 'Jangkar Ketahanan Pangan Harian',
    desc: 'Menempatkan rumah tangga sebagai pusat produksi pangan aktif: sayuran, buah, cabai, rempah, dan umbi-umbian untuk konsumsi harian keluarga dan memotong belanja pasar.',
    icon: '🥦',
    badge: 'RPM'
  },
  '2. Kandang Keluarga Produktif': {
    title: 'Kandang Keluarga Produktif',
    subtitle: 'Protein Hewani & Bank Hidup (Living Bank)',
    desc: 'Sistem pemeliharaan ternak & ikan skala rumah tangga (ayam, itik, kambing, kelinci, ikan). Menyediakan protein hewani segar, pupuk organik, dan aset tabungan riil.',
    icon: '🐔',
    badge: 'Kandang'
  },
  '3. Apotek Hidup (Farmasi Mini)': {
    title: 'Apotek Hidup (Farmasi Mini)',
    subtitle: 'Kedaulatan Kesehatan Mandiri Berbasis TOGA',
    desc: 'Budidaya Tanaman Obat Keluarga (TOGA): jahe, kunyit, temulawak, serai, kumis kucing, lidah buaya, dan daun sirih untuk imunitas dan kedaulatan kesehatan herbal alami.',
    icon: '🌿',
    badge: 'Apotek'
  },
  '4. Rumah Produksi Pekarangan (RPP)': {
    title: 'Rumah Produksi Pekarangan (RPP)',
    subtitle: 'Pabrik Mini Dapur & Penyelamatan Surplus',
    desc: 'Unit pengolahan pascapanen dapur: mengolah surplus panen kebun dan kandang yang tidak habis dikonsumsi menjadi produk bernilai tambah tahan simpan (sambal kemasan, keripik, telur asin, jamu instan).',
    icon: '🍯',
    badge: 'RPP'
  }
};

export const presets: Record<PilarKategori, PresetItem[]> = {
  '1. Rumah Pangan Mandiri (RPM)': [
    { nama: 'Cabai Rawit', defaultMedia: 'Polybag/Pot', defaultQty: 5 },
    { nama: 'Tomat', defaultMedia: 'Polybag/Pot', defaultQty: 3 },
    { nama: 'Terong', defaultMedia: 'Polybag/Pot', defaultQty: 3 },
    { nama: 'Kangkung', defaultMedia: 'Polybag/Pot', defaultQty: 10 },
    { nama: 'Sawi / Pakcoy', defaultMedia: 'Polybag/Pot', defaultQty: 8 },
    { nama: 'Bayam', defaultMedia: 'Polybag/Pot', defaultQty: 10 },
    { nama: 'Singkong / Ubi', defaultMedia: 'Langsung di Tanah', defaultQty: 4 },
    { nama: 'Pisang', defaultMedia: 'Langsung di Tanah', defaultQty: 2 },
    { nama: 'Pepaya', defaultMedia: 'Langsung di Tanah', defaultQty: 2 }
  ],
  '2. Kandang Keluarga Produktif': [
    { nama: 'Ayam Kampung', defaultMedia: 'Kandang', defaultQty: 4, defaultNote: 'Telur & daging keluarga' },
    { nama: 'Itik / Bebek', defaultMedia: 'Kandang', defaultQty: 3, defaultNote: 'Produksi telur harian' },
    { nama: 'Entok', defaultMedia: 'Kandang', defaultQty: 2, defaultNote: 'Ternak pedaging' },
    { nama: 'Burung Puyuh', defaultMedia: 'Kandang', defaultQty: 12, defaultNote: 'Telur puyuh harian' },
    { nama: 'Kelinci', defaultMedia: 'Kandang', defaultQty: 2, defaultNote: 'Ternak hias / pedaging' },
    { nama: 'Kambing', defaultMedia: 'Kandang', defaultQty: 1, defaultNote: 'Tabungan hidup darurat (Living Bank)' },
    { nama: 'Ikan Lele Kolam Terpal', defaultMedia: 'Kandang', defaultQty: 50, defaultNote: 'Protein hewani berkala' }
  ],
  '3. Apotek Hidup (Farmasi Mini)': [
    { nama: 'Jahe Merah', defaultMedia: 'Polybag/Pot', defaultQty: 3, defaultNote: 'Rumpun aktif' },
    { nama: 'Kunyit', defaultMedia: 'Polybag/Pot', defaultQty: 3, defaultNote: 'Rumpun aktif' },
    { nama: 'Temulawak', defaultMedia: 'Polybag/Pot', defaultQty: 2, defaultNote: 'Rumpun aktif' },
    { nama: 'Kencur', defaultMedia: 'Polybag/Pot', defaultQty: 2, defaultNote: 'Pot kecil' },
    { nama: 'Serai Wangi', defaultMedia: 'Langsung di Tanah', defaultQty: 3, defaultNote: 'Rumpun' },
    { nama: 'Daun Sirih', defaultMedia: 'Langsung di Tanah', defaultQty: 1, defaultNote: 'Rambatan' },
    { nama: 'Lengkuas', defaultMedia: 'Langsung di Tanah', defaultQty: 2, defaultNote: 'Rumpun' },
    { nama: 'Kumis Kucing', defaultMedia: 'Polybag/Pot', defaultQty: 2, defaultNote: 'Herbal ginjal & detoks' },
    { nama: 'Lidah Buaya', defaultMedia: 'Polybag/Pot', defaultQty: 2, defaultNote: 'Kesehatan kulit & pencernaan' }
  ],
  '4. Rumah Produksi Pekarangan (RPP)': [
    { nama: 'Sambal Kemasan (Botol/Pouch)', defaultMedia: 'Dapur Pengolahan', defaultQty: 1, defaultNote: 'Olahan surplus cabai RPM' },
    { nama: 'Keripik Pisang / Singkong', defaultMedia: 'Dapur Pengolahan', defaultQty: 1, defaultNote: 'Olahan umbi/buah tahan simpan' },
    { nama: 'Jamu Instan / Bubuk Herbal', defaultMedia: 'Dapur Pengolahan', defaultQty: 1, defaultNote: 'Olahan TOGA Apotek Hidup' },
    { nama: 'Telur Asin', defaultMedia: 'Dapur Pengolahan', defaultQty: 1, defaultNote: 'Olahan surplus telur itik kandang' },
    { nama: 'Olahan Tepung / Kue Basah', defaultMedia: 'Dapur Pengolahan', defaultQty: 1, defaultNote: 'Olahan dapur pangan lokal' }
  ]
};
