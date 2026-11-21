/**
 * ============================================================================
 * 24 ZONA MWC NU SE-KABUPATEN SUMENEP (TERITORIAL RESMI MAMASAR & PEKARANGAN)
 * ============================================================================
 */

export interface ZoneItem {
  name: string;
  slug: string;
  type: 'daratan' | 'kepulauan';
}

export const MWC_ZONES: ZoneItem[] = [
  // 18 MWC Daratan
  { name: 'MWC Kota Sumenep', slug: 'mwc-kota-sumenep', type: 'daratan' },
  { name: 'MWC Batuan', slug: 'mwc-batuan', type: 'daratan' },
  { name: 'MWC Kalianget', slug: 'mwc-kalianget', type: 'daratan' },
  { name: 'MWC Manding', slug: 'mwc-manding', type: 'daratan' },
  { name: 'MWC Gapura', slug: 'mwc-gapura', type: 'daratan' },
  { name: 'MWC Bluto', slug: 'mwc-bluto', type: 'daratan' },
  { name: 'MWC Saronggi', slug: 'mwc-saronggi', type: 'daratan' },
  { name: 'MWC Lenteng', slug: 'mwc-lenteng', type: 'daratan' },
  { name: 'MWC Guluk-Guluk', slug: 'mwc-guluk-guluk', type: 'daratan' },
  { name: 'MWC Ganding', slug: 'mwc-ganding', type: 'daratan' },
  { name: 'MWC Pragaan', slug: 'mwc-pragaan', type: 'daratan' },
  { name: 'MWC Ambunten', slug: 'mwc-ambunten', type: 'daratan' },
  { name: 'MWC Pasongsongan', slug: 'mwc-pasongsongan', type: 'daratan' },
  { name: 'MWC Rubaru', slug: 'mwc-rubaru', type: 'daratan' },
  { name: 'MWC Dasuk', slug: 'mwc-dasuk', type: 'daratan' },
  { name: 'MWC Dungkek', slug: 'mwc-dungkek', type: 'daratan' },
  { name: 'MWC Batang-Batang', slug: 'mwc-batang-batang', type: 'daratan' },
  { name: 'MWC Batuputih', slug: 'mwc-batuputih', type: 'daratan' },

  // 6 MWC Kepulauan
  { name: 'MWC Talango', slug: 'mwc-talango', type: 'kepulauan' },
  { name: 'MWC Giligenting', slug: 'mwc-giligenting', type: 'kepulauan' },
  { name: 'MWC Nonggunong (Sapudi)', slug: 'mwc-nonggunong', type: 'kepulauan' },
  { name: 'MWC Raas', slug: 'mwc-raas', type: 'kepulauan' },
  { name: 'MWC Arjasa (Kangean)', slug: 'mwc-arjasa', type: 'kepulauan' },
  { name: 'MWC Sapeken', slug: 'mwc-sapeken', type: 'kepulauan' },
];

export const DEFAULT_ZONE = 'MWC Kota Sumenep';
