/**
 * ============================================================================
 * MIGRASI DATA LAMA GOOGLE SHEETS KE TURSO SQLITE SERVERLESS
 * ============================================================================
 * Mengimpor seluruh data dari Google Spreadsheet via GAS Web App ke Turso
 * dengan normalisasi nama 4 Pilar resmi dan perbaikan format tanggal RT/RW.
 */

const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

// Baca kredensial dari .env.local
const envPath = path.resolve(__dirname, '../.env.local');
let tursoUrl = 'https://pekarangan-rasyiqi.aws-ap-southeast-1.turso.io';
let authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTUyNDI1MDIsImlkIjoiMDFhMWZjYzMtZmQwMS03ZTljLTgyZGMtZmRiMWM4ODIwYjYzIiwia2lkIjoiNnIxcG10STZ4M3ZLVWJzcDlLdUllZGU4cGc5Q3RpUzhlWU5KWlRESldTUSIsInJpZCI6IjIzNWQ4MjFkLTljZTEtNGFkOC1iNDg3LWYyNjJiMjBiNzM3NCJ9.DfZ_sq39qR3uklK9LOMnvzPD1btYr6IsowYpDJImjVmtqfUgL_ArHjsWxJIwOOstp-Cx6otDu_5ZNXPmgdwXBg';
let gasUrl = 'https://script.google.com/macros/s/AKfycbwwB--TCmNSaWehN6mly4ZSypZFWeIfYgkOn9HPYjPw1EhRYQ9fWpW71Iz8UxyQ9tQeew/exec';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_TURSO_DATABASE_URL=')) {
      tursoUrl = trimmed.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
    } else if (trimmed.startsWith('VITE_TURSO_AUTH_TOKEN=')) {
      authToken = trimmed.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
    } else if (trimmed.startsWith('VITE_GAS_URL=')) {
      gasUrl = trimmed.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

function normalizePillarName(raw) {
  if (!raw) return '1. Rumah Pangan Mandiri (RPM)';
  const s = raw.toLowerCase();
  if (s.includes('pangan') || s.includes('rpm')) return '1. Rumah Pangan Mandiri (RPM)';
  if (s.includes('kandang')) return '2. Kandang Keluarga Produktif';
  if (s.includes('apotek') || s.includes('apotik') || s.includes('toga')) return '3. Apotek Hidup (Farmasi Mini)';
  if (s.includes('olahan') || s.includes('pasca') || s.includes('produksi') || s.includes('rpp')) return '4. Rumah Produksi Pekarangan (RPP)';
  return '1. Rumah Pangan Mandiri (RPM)';
}

function cleanRtRw(raw) {
  if (!raw) return '01/02';
  // Jika Google Sheets auto-convert jadi ISO timestamp (contoh 2026-02-01T17:00:00.000Z)
  if (raw.includes('T') && raw.includes('Z')) return '01/02';
  return raw.trim();
}

async function runMigration() {
  console.log('1. Mengambil data dari Google Sheets...');
  const res = await fetch(`${gasUrl}?action=get_all`);
  const json = await res.json();
  if (!json || json.status !== 'success' || !json.data) {
    throw new Error('Gagal mengambil data dari Google Sheets: ' + JSON.stringify(json));
  }

  const d = json.data;
  console.log(`✓ Data berhasil ditarik:`);
  console.log(`  - Anggota: ${(d.members || []).length}`);
  console.log(`  - Pekarangan: ${(d.yards || []).length}`);
  console.log(`  - Aset Produksi: ${(d.assets || []).length}`);
  console.log(`  - Tanaman: ${(d.plants || []).length}`);
  console.log(`  - Ternak: ${(d.livestocks || []).length}`);
  console.log(`  - Penghematan: ${(d.penghematanLogs || []).length}`);
  console.log(`  - Log Aktivitas: ${(d.activityLogs || []).length}`);

  const client = createClient({ url: tursoUrl, authToken });

  // 1. Migrasi Anggota
  console.log('\n2. Migrasi tbl_anggota...');
  const memberIds = new Set();
  for (const m of (d.members || [])) {
    const mId = m.member_id;
    memberIds.add(mId);

    const addr = (m.alamat_catatan || '').trim();
    let mwc = m.mwc_zone;
    let ranting = m.ranting;

    if (!mwc && addr.toLowerCase().includes('gapura')) {
      mwc = 'MWC Gapura';
    } else if (!mwc) {
      mwc = 'MWC Kota Sumenep';
    }

    if (!ranting && addr.toLowerCase().includes('gapura timur')) {
      ranting = 'Gapura Timur';
    }

    await client.execute({
      sql: `INSERT INTO tbl_anggota (
        member_id, nama_lengkap, nama_panggilan, nomor_wa, mwc_zone, ranting, rt_rw, alamat_catatan, gps_lat_long, status_verifikasi, device_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(member_id) DO UPDATE SET
        nama_lengkap = excluded.nama_lengkap,
        nama_panggilan = excluded.nama_panggilan,
        nomor_wa = excluded.nomor_wa,
        mwc_zone = excluded.mwc_zone,
        ranting = excluded.ranting,
        rt_rw = excluded.rt_rw,
        alamat_catatan = excluded.alamat_catatan,
        gps_lat_long = excluded.gps_lat_long,
        device_id = excluded.device_id;`,
      args: [
        mId,
        m.nama_lengkap,
        m.nama_panggilan || null,
        m.nomor_wa,
        mwc || null,
        ranting || null,
        cleanRtRw(m.rt_rw),
        m.alamat_catatan || null,
        m.gps_lat_long || null,
        m.status_verifikasi || 'VERIFIED',
        m.device_id || null
      ]
    });
  }

  // Cek apakah ada yard yang me-referensikan member yang belum ada
  for (const y of (d.yards || [])) {
    if (y.member_id && !memberIds.has(y.member_id)) {
      await client.execute({
        sql: `INSERT INTO tbl_anggota (member_id, nama_lengkap, nomor_wa, rt_rw) VALUES (?, ?, ?, ?)
              ON CONFLICT(member_id) DO NOTHING`,
        args: [y.member_id, `Keluarga ${y.member_id}`, '081200000000', '01/02']
      });
      memberIds.add(y.member_id);
    }
  }
  console.log(`✓ tbl_anggota selesai (${memberIds.size} entitas).`);

  // 2. Migrasi Pekarangan
  console.log('\n3. Migrasi tbl_pekarangan...');
  const yardIds = new Set();
  for (const y of (d.yards || [])) {
    yardIds.add(y.yard_id);
    await client.execute({
      sql: `INSERT INTO tbl_pekarangan (
        yard_id, member_id, status_lahan, tipe_permukaan, estimasi_luas, zonasi_posisi, paparan_sinar, sumber_air, fasilitas_limbah, drive_foto_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(yard_id) DO UPDATE SET
        status_lahan = excluded.status_lahan,
        tipe_permukaan = excluded.tipe_permukaan,
        estimasi_luas = excluded.estimasi_luas,
        zonasi_posisi = excluded.zonasi_posisi,
        paparan_sinar = excluded.paparan_sinar,
        sumber_air = excluded.sumber_air,
        fasilitas_limbah = excluded.fasilitas_limbah;`,
      args: [
        y.yard_id,
        y.member_id,
        y.status_lahan || 'Milik Sendiri',
        y.tipe_permukaan || null,
        y.estimasi_luas || '10-30 m²',
        y.zonasi_posisi || null,
        y.paparan_sinar || null,
        y.sumber_air || null,
        y.fasilitas_limbah || null,
        y.drive_foto_url || null
      ]
    });
  }
  console.log(`✓ tbl_pekarangan selesai (${yardIds.size} entitas).`);

  // 3. Migrasi Aset 4 Pilar
  console.log('\n4. Migrasi tbl_aset_produksi (4 Pilar)...');
  for (const a of (d.assets || [])) {
    const pilar = normalizePillarName(a.pilar_kategori);
    // Jika ada aset pilar 4 (RPP), aktifkan publish_to_mamasar
    const isRpp = pilar.includes('RPP') || pilar.includes('Rumah Produksi');

    await client.execute({
      sql: `INSERT INTO tbl_aset_produksi (
        asset_id, yard_id, pilar_kategori, nama_komoditas, jumlah_estimasi, media_tanam, catatan_produksi, publish_to_mamasar
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(asset_id) DO UPDATE SET
        pilar_kategori = excluded.pilar_kategori,
        nama_komoditas = excluded.nama_komoditas,
        jumlah_estimasi = excluded.jumlah_estimasi,
        media_tanam = excluded.media_tanam,
        publish_to_mamasar = excluded.publish_to_mamasar;`,
      args: [
        a.asset_id,
        a.yard_id,
        pilar,
        a.nama_komoditas,
        Number(a.jumlah_estimasi) || 1,
        a.media_tanam || 'Polybag/Pot',
        a.catatan_produksi || null,
        isRpp ? 1 : 0
      ]
    });
  }
  console.log(`✓ tbl_aset_produksi selesai (${(d.assets || []).length} aset).`);

  // 4. Migrasi Tanaman
  console.log('\n5. Migrasi tbl_tanaman...');
  for (const p of (d.plants || [])) {
    await client.execute({
      sql: `INSERT INTO tbl_tanaman (
        id, name, variety, location, qty, planted_date, target_hst, phase, icon, progress_percent, is_harvested, owner_device_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        variety = excluded.variety,
        qty = excluded.qty,
        phase = excluded.phase;`,
      args: [
        p.id,
        p.name,
        p.variety || null,
        p.location || 'Pekarangan',
        p.qty || '1',
        p.plantedDate || '2026-10-01',
        Number(p.targetHst) || 60,
        p.phase || 'Vegetatif',
        p.icon || '🌱',
        Number(p.progressPercent) || 40,
        p.isHarvested ? 1 : 0,
        p.ownerDeviceId || null
      ]
    });
  }
  console.log(`✓ tbl_tanaman selesai (${(d.plants || []).length} tanaman).`);

  // 5. Migrasi Ternak
  console.log('\n6. Migrasi tbl_ternak...');
  for (const l of (d.livestocks || [])) {
    await client.execute({
      sql: `INSERT INTO tbl_ternak (
        id, type, name, qty, housing, today_yield, week_yield, last_yield_date, icon, note, owner_device_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        qty = excluded.qty,
        today_yield = excluded.today_yield,
        week_yield = excluded.week_yield;`,
      args: [
        l.id,
        l.type || 'Ayam',
        l.name,
        l.qty || '1',
        l.housing || 'Kandang Umbaran',
        Number(l.todayYield) || 0,
        Number(l.weekYield) || 0,
        l.lastYieldDate || null,
        l.icon || '🐔',
        l.note || null,
        l.ownerDeviceId || null
      ]
    });
  }
  console.log(`✓ tbl_ternak selesai (${(d.livestocks || []).length} kelompok ternak).`);

  // 6. Migrasi Penghematan Dapur
  console.log('\n7. Migrasi tbl_penghematan...');
  for (const k of (d.penghematanLogs || [])) {
    await client.execute({
      sql: `INSERT INTO tbl_penghematan (
        id, item, meal, note, date, saved_value, qty, price_per_unit, owner_device_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        saved_value = excluded.saved_value;`,
      args: [
        k.id,
        k.item,
        k.meal || 'Makan Pagi',
        k.note || null,
        k.date || '2026-10-14',
        Number(k.savedValue) || 0,
        k.qty ? Number(k.qty) : null,
        k.price_per_unit ? Number(k.price_per_unit) : null,
        k.ownerDeviceId || null
      ]
    });
  }
  console.log(`✓ tbl_penghematan selesai (${(d.penghematanLogs || []).length} catatan hemat).`);

  // 7. Migrasi Log Aktivitas
  console.log('\n8. Migrasi tbl_log_aktivitas...');
  for (const log of (d.activityLogs || [])) {
    await client.execute({
      sql: `INSERT INTO tbl_log_aktivitas (id, title, type, date, note) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING;`,
      args: [
        log.id,
        log.title || 'Aktivitas Pekarangan',
        log.type || 'umum',
        log.date || 'Hari ini',
        log.note || null
      ]
    });
  }
  console.log(`✓ tbl_log_aktivitas selesai (${(d.activityLogs || []).length} riwayat log).`);

  console.log('\n======================================================');
  console.log('🎉 SEMUA DATA DARI GOOGLE SHEETS BERHASIL DIPINDAHKAN KE TURSO!');
  console.log('======================================================');
}

runMigration().catch(err => {
  console.error('\n❌ Terjadi kesalahan saat migrasi:', err);
  process.exit(1);
});
