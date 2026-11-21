import type { TeaserFeature } from '../types';

export const teaserFeatures: TeaserFeature[] = [
  {
    id: 'bursa_barter',
    title: 'Bursa Barter Tetangga',
    tagline: 'Tukar surplus panenmu dengan bumbu dapur tetangga tanpa keluar uang tunai.',
    icon: '🧺',
    tag: 'Menunggu Kuota Data RT',
    isLocked: true,
    currentCount: 12,
    targetCount: 30,
    targetUnit: 'pekarangan terdata',
    points: [
      'Tukar langsung surplus cabai, telur, kangkung dengan bumbu dapur tetangga tanpa uang tunai.',
      'Sistem non-tunai berbasis gotong-royong untuk memotong ketergantungan belanja pasar.',
      'Pencocokan ketersediaan komoditas otomatis di area rukun tetangga terdekat.'
    ],
    whyLocked: 'Agar barter berjalan lancar, kita perlu memetakan dulu siapa yang punya cabai, siapa yang punya telur, dan siapa yang punya kangkung di lingkungan Anda.',
    shareMessage: 'Halo tetangga! Ayo kita data pekarangan rumah kita di aplikasi Pekarangan agar bursa barter sayur & telur antar-warga bisa segera dibuka: '
  },
  {
    id: 'tabungan_poin',
    title: 'Tabungan Poin Sirkular',
    tagline: 'Ubah sisa dapur menjadi nutrisi kompos dan pakan ternak.',
    icon: '♻️',
    tag: 'Sirkular Organik',
    isLocked: true,
    currentCount: 10,
    targetCount: 25,
    targetUnit: 'keluarga terdaftar',
    points: [
      'Pilah sampah organik dapur (wadah hijau) untuk disetor ke fasilitas komposter & biopori.',
      'Daur ulang sisa dapur menjadi pupuk organik cair (POC) dan kompos alami untuk tanaman.',
      'Pemanfaatan sisa sayuran untuk pakan ayam dan budidaya maggot hemat biaya.'
    ],
    whyLocked: 'Sistem daur ulang limbah organik komunal sedang disiapkan oleh pengurus lingkungan.',
    shareMessage: 'Tetangga sekalian, sisa dapur kita nanti bisa ditukar bibit & pupuk kompos lho! Yuk ikut pendataan pekarangan: '
  },
  {
    id: 'pasar_mamasar',
    title: 'Pemasaran Surplus RPP ke Mamasar',
    tagline: 'Pasarkan produk olahan surplus pekaranganmu ke direktori UMKM Mamasar tanpa potongan komisi.',
    icon: '🏪',
    tag: 'Integrasi Hilir',
    isLocked: false,
    currentCount: 15,
    targetCount: 20,
    targetUnit: 'produk RPP terverifikasi',
    points: [
      'Hilirisasi Dapur (Pilar 4 RPP): mengolah surplus panen jadi sambal botol, keripik, jamu herbal, dan telur asin.',
      'Terhubung langsung ke platform Mamasar (Direktori Digital UMKM Nahdliyin se-Kabupaten Sumenep).',
      'Transaksi langsung 100% via WhatsApp warga tanpa potongan biaya admin/tengkulak.'
    ],
    whyLocked: 'Pastikan data Rumah Produksi Pekarangan (RPP) Anda sudah terdata lengkap dengan estimasi kapasitas produksi surplus.',
    shareMessage: 'Punya olahan dapur dari surplus kebun pekarangan? Ayo catat di aplikasi Pekarangan agar terhubung ke pasar digital Mamasar: '
  },
  {
    id: 'buku_kas',
    title: 'Kalkulator Hemat Dapur & Sedekah',
    tagline: 'Pantau berapa ratus ribu rupiah uang belanja yang berhasil dihemat pekarangan keluarga tiap bulan.',
    icon: '📊',
    tag: 'Aktif di Tab Insight',
    isLocked: false,
    currentCount: 25,
    targetCount: 30,
    targetUnit: 'pekarangan aktif',
    points: [
      'Kalkulator otomatis menghitung nilai rupiah sayur & telur hasil pekarangan yang dimakan keluarga.',
      'Catatan rekor panen yang dinikmati keluarga atau disedekahkan ke tetangga sekitar.',
      'Bukan buku kas komersial, melainkan tolok ukur kemandirian pangan dan ketahanan dapur keluarga.'
    ],
    whyLocked: 'Catat konsumsi hasil kebun Anda di tab Insight untuk memantau penghematan belanja bulanan.',
    shareMessage: 'Pekarangan rumah ternyata bisa menghemat ratusan ribu uang belanja keluarga per bulan! Yuk catat aset tanaman & ternakmu: '
  }
];
