import type { TeaserFeature } from '../types';

export const teaserFeatures: TeaserFeature[] = [
  {
    id: 'bursa_barter',
    title: 'Bursa Barter Tetangga',
    tagline: 'Tukar surplus panenmu dengan bumbu dapur tetangga tanpa keluar uang tunai.',
    icon: '🧺',
    tag: 'Terkunci (Menunggu Kuota Data RT)',
    isLocked: true,
    currentCount: 12,
    targetCount: 30,
    targetUnit: 'pekarangan terdata',
    points: [
      'Tukar langsung surplus cabai, telur, kangkung dengan bumbu dapur tetangga tanpa uang tunai.',
      'Sistem non-tunai berbasis gotong-royong untuk memotong ketergantungan belanja pasar.',
      'Pencocokan ketersediaan komoditas otomatis di area rukun tetangga terdekat.'
    ],
    whyLocked: 'Kenapa belum dibuka? Agar barter berjalan lancar, kita perlu memetakan dulu siapa yang punya cabai, siapa yang punya telur, dan siapa yang punya kangkung. Pastikan Anda dan tetangga sebelah sudah mengisi Form Pendataan Pekarangan!',
    shareMessage: 'Halo tetangga! Ayo kita data pekarangan rumah kita di aplikasi Pekarangan. Semakin cepat data 30 pekarangan terkumpul, fitur Bursa Barter Sayur & Telur antar-warga bisa segera dibuka! Isi formnya di sini: '
  },
  {
    id: 'tabungan_poin',
    title: 'Tabungan Poin Sirkular',
    tagline: 'Ubah sisa dapur menjadi Poin untuk ditukar bibit dan pakan ayam.',
    icon: '♻️',
    tag: 'Segera Hadir',
    isLocked: true,
    currentCount: 10,
    targetCount: 25,
    targetUnit: 'keluarga terdaftar',
    points: [
      'Pilah sampah organik dapur (wadah hijau) untuk disetor ke fasilitas komposter & biopori.',
      'Dapatkan saldo Poin dari setiap kilogram sisa dapur yang Anda setorkan.',
      'Tukarkan poin dengan pupuk kompos siap pakai, bibit tanaman, atau maggot pakan ternak.'
    ],
    whyLocked: 'Sistem pengolahan limbah komunal (komposter & biopori) sedang disiapkan oleh pengurus lingkungan. Simpan wadah hijau dan wadah bersihmu, poin akan mulai dihitung begitu fasilitas siap!',
    shareMessage: 'Tetangga sekalian, sisa dapur kita nanti bisa ditukar bibit & pakan ayam lho! Yuk ikut pendataan pekarangan agar fasilitas komposter segera disiapkan di lingkungan kita: '
  },
  {
    id: 'katalog_produksi',
    title: 'Katalog Rumah Produksi',
    tagline: 'Etalase produk olahan rumah tangga anggota untuk pasar lokal dan oleh-oleh.',
    icon: '🍯',
    tag: 'Segera Hadir',
    isLocked: true,
    currentCount: 8,
    targetCount: 20,
    targetUnit: 'produk terkurasi',
    points: [
      'Pabrik mini dapur: etalase sambal kemasan, keripik pisang/singkong, dan jamu herbal.',
      'Jangkau pembeli langsung dari warga satu lingkungan hingga pasar oleh-oleh.',
      'Dukungan standarisasi kemasan higienis, label bersama, dan promosi komunitas.'
    ],
    whyLocked: 'Kami sedang memetakan potensi olahan dapur warga di Fase 1 (Pilar 4: Rumah Produksi). Begitu terkumpul minimal 20 ragam olahan dapur, etalase pasar lokal akan dibuka secara serentak!',
    shareMessage: 'Punya produk sambal kemasan, keripik, jamu, atau olahan dapur sendiri? Daftarkan di aplikasi Pekarangan agar bisa masuk Katalog Rumah Produksi: '
  },
  {
    id: 'buku_kas',
    title: 'Buku Kas & Sedekah',
    tagline: 'Pantau berapa ratus ribu rupiah uang belanja yang berhasil dihemat pekaranganmu tiap bulan.',
    icon: '📊',
    tag: 'Segera Hadir',
    isLocked: true,
    currentCount: 18,
    targetCount: 30,
    targetUnit: 'pekarangan aktif',
    points: [
      'Kalkulator otomatis menghitung nilai rupiah sayur & telur hasil pekarangan Anda.',
      'Catatan rekor panen yang dinikmati keluarga atau disedekahkan ke tetangga sekitar.',
      'Raih lencana reputasi sosial pekarangan lestari, mandiri, dan berdaya.'
    ],
    whyLocked: 'Ingin tahu berapa uang belanja yang berhasil Anda hemat dari sebatang pohon kelor dan 5 polybag cabai? Fitur kalkulator penghematan akan otomatis aktif setelah profil pekarangan Anda terdata lengkap.',
    shareMessage: 'Pekarangan rumah ternyata bisa menghemat ratusan ribu uang belanja keluarga per bulan! Yuk catat aset tanaman & ternakmu di aplikasi Pekarangan: '
  }
];
