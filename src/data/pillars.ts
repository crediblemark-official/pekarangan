import type { PilarKategori, MediaTanamWadah } from '../types';

export interface PresetItem {
  nama: string;
  defaultMedia: MediaTanamWadah;
  defaultQty: number;
  defaultNote?: string;
}

export const pillarDetails: Record<PilarKategori, { title: string; subtitle: string; desc: string; icon: string; badge: string }> = {
  '1. Rumah Pangan Mandiri': {
    title: 'Rumah Pangan Mandiri (RPM)',
    subtitle: 'Jangkar Ketahanan Pangan Harian',
    desc: 'Menanam sayuran, cabai, umbi-umbian & buah untuk konsumsi harian keluarga dan memotong ketergantungan belanja pasar.',
    icon: '🥦',
    badge: 'RPM'
  },
  '2. Kandang Keluarga Produktif': {
    title: 'Kandang Keluarga Produktif',
    subtitle: 'Sumber Protein Hewani & Modal Hidup (Bank Hidup)',
    desc: 'Pemeliharaan ternak penghasil telur/daging, tabungan likuid darurat, serta pemasok pupuk kandang organik.',
    icon: '🐔',
    badge: 'Kandang'
  },
  '3. Apotik Hidup': {
    title: 'Apotik Hidup',
    subtitle: 'Kedaulatan Kesehatan Mandiri Berbasis TOGA',
    desc: 'Tanaman obat keluarga penyedia obat herbal alami keluarga sekaligus bahan racikan jamu untuk ketahanan ternak.',
    icon: '🌿',
    badge: 'Apotik'
  },
  '4. Rumah Produksi': {
    title: 'Rumah Produksi (Pabrik Mini)',
    subtitle: 'Integrator Rantai Nilai Mikro & Hilirisasi Dapur',
    desc: 'Unit pengolahan pascapanen dapur: mengolah surplus panen & ternak menjadi produk bernilai tambah (tahan simpan & bernilai jual).',
    icon: '🍯',
    badge: 'Pabrik Mini'
  }
};

export const presets: Record<PilarKategori, PresetItem[]> = {
  '1. Rumah Pangan Mandiri': [
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
    { nama: 'Ayam Kampung', defaultMedia: 'Kandang', defaultQty: 4, defaultNote: 'Telur & daging' },
    { nama: 'Itik / Bebek', defaultMedia: 'Kandang', defaultQty: 3, defaultNote: 'Produksi telur' },
    { nama: 'Entok', defaultMedia: 'Kandang', defaultQty: 2, defaultNote: 'Ternak pedaging' },
    { nama: 'Burung Puyuh', defaultMedia: 'Kandang', defaultQty: 12, defaultNote: 'Telur puyuh harian' },
    { nama: 'Kelinci', defaultMedia: 'Kandang', defaultQty: 2, defaultNote: 'Ternak hias / pedaging' },
    { nama: 'Kambing', defaultMedia: 'Kandang', defaultQty: 1, defaultNote: 'Tabungan hidup darurat' }
  ],
  '3. Apotik Hidup': [
    { nama: 'Jahe Merah', defaultMedia: 'Polybag/Pot', defaultQty: 3, defaultNote: 'Rumpun aktif' },
    { nama: 'Kunyit', defaultMedia: 'Polybag/Pot', defaultQty: 3, defaultNote: 'Rumpun aktif' },
    { nama: 'Temulawak', defaultMedia: 'Polybag/Pot', defaultQty: 2, defaultNote: 'Rumpun aktif' },
    { nama: 'Kencur', defaultMedia: 'Polybag/Pot', defaultQty: 2, defaultNote: 'Pot kecil' },
    { nama: 'Serai Wangi', defaultMedia: 'Langsung di Tanah', defaultQty: 3, defaultNote: 'Rumpun' },
    { nama: 'Daun Sirih', defaultMedia: 'Langsung di Tanah', defaultQty: 1, defaultNote: 'Rambatan' },
    { nama: 'Lengkuas', defaultMedia: 'Langsung di Tanah', defaultQty: 2, defaultNote: 'Rumpun' }
  ],
  '4. Rumah Produksi': [
    { nama: 'Sambal Kemasan (Botol/Pouch)', defaultMedia: 'Dapur Pengolahan', defaultQty: 1, defaultNote: 'Olahan cabai surplus' },
    { nama: 'Keripik Pisang / Singkong', defaultMedia: 'Dapur Pengolahan', defaultQty: 1, defaultNote: 'Camilan tahan simpan' },
    { nama: 'Jamu Herbal / Empon-empon', defaultMedia: 'Dapur Pengolahan', defaultQty: 1, defaultNote: 'Racikan TOGA botolan' },
    { nama: 'Telur Asin', defaultMedia: 'Dapur Pengolahan', defaultQty: 1, defaultNote: 'Olahan telur itik pekarangan' },
    { nama: 'Olahan Tepung / Kue Basah', defaultMedia: 'Dapur Pengolahan', defaultQty: 1, defaultNote: 'Kue olahan singkong/pisang' }
  ]
};
