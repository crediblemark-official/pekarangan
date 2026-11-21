/**
 * ============================================================================
 * PEKARANGAN - TURSO (libSQL / SQLite Serverless) DATABASE SERVICE
 * ============================================================================
 * Menggantikan Google Sheets + Apps Script dengan database SQLite serverless
 * berlatensi rendah (<50ms), tanpa cold-start, dan gratis 5GB.
 */

import { createClient, type Client } from '@libsql/client/web';
import type {
  SurveyPayload,
  PlantItem,
  LivestockItem,
  KasLogItem,
  HarvestRecordItem,
  CommunityMemberItem,
  CommunityPostItem,
  FamilyLeaderboardItem,
  RantingLeaderboardItem,
  MwcLeaderboardItem,
  KabarReactions
} from '../types';
import { StorageService } from './storage';

export interface TursoConfig {
  url: string;
  authToken: string;
}

let cachedClient: Client | null = null;
let lastClientKey = '';

export function getEffectiveTursoConfig(): TursoConfig {
  const settings = StorageService.getSettings();
  const envUrl = (import.meta.env.VITE_TURSO_DATABASE_URL as string) || '';
  const envToken = (import.meta.env.VITE_TURSO_AUTH_TOKEN as string) || '';

  const url = (settings.tursoUrl || envUrl || '').trim();
  const authToken = (settings.tursoAuthToken || envToken || '').trim();

  return { url, authToken };
}

export function isTursoConfigured(): boolean {
  const config = getEffectiveTursoConfig();
  return !!config.url && config.url.startsWith('http');
}

export function getTursoClient(): Client | null {
  const config = getEffectiveTursoConfig();
  if (!config.url || !config.url.startsWith('http')) return null;

  const key = `${config.url}::${config.authToken}`;
  if (cachedClient && lastClientKey === key) {
    return cachedClient;
  }

  // libSQL client/web membutuhkan URL berawalan https:// atau http://
  let httpUrl = config.url;
  if (httpUrl.startsWith('libsql://')) {
    httpUrl = httpUrl.replace('libsql://', 'https://');
  }

  cachedClient = createClient({
    url: httpUrl,
    authToken: config.authToken || undefined,
  });
  lastClientKey = key;
  return cachedClient;
}

export const TursoService = {
  /**
   * Tes konektivitas ke Turso database dan hitung latensi
   */
  async ping(customConfig?: TursoConfig): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const config = customConfig || getEffectiveTursoConfig();
    if (!config.url) {
      return { success: false, latencyMs: 0, message: 'URL Database Turso belum diatur.' };
    }

    let httpUrl = config.url;
    if (httpUrl.startsWith('libsql://')) {
      httpUrl = httpUrl.replace('libsql://', 'https://');
    }

    const testClient = createClient({
      url: httpUrl,
      authToken: config.authToken || undefined,
    });

    const start = performance.now();
    try {
      await testClient.execute('SELECT 1 as ping');
      const latencyMs = Math.round(performance.now() - start);
      return {
        success: true,
        latencyMs,
        message: `Terhubung ke Turso SQLite! (${latencyMs} ms)`
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: 0,
        message: 'Gagal terhubung ke Turso: ' + err.message
      };
    }
  },

  /**
   * Inisialisasi otomatis seluruh tabel jika belum ada di database Turso
   */
  async initSchema(): Promise<boolean> {
    const client = getTursoClient();
    if (!client) return false;

    const queries = [
      `CREATE TABLE IF NOT EXISTS tbl_anggota (
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
      )`,
      `CREATE INDEX IF NOT EXISTS idx_anggota_wa ON tbl_anggota(nomor_wa)`,
      `CREATE TABLE IF NOT EXISTS tbl_pekarangan (
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
      )`,
      `CREATE TABLE IF NOT EXISTS tbl_aset_produksi (
        asset_id TEXT PRIMARY KEY,
        yard_id TEXT NOT NULL REFERENCES tbl_pekarangan(yard_id) ON DELETE CASCADE,
        pilar_kategori TEXT NOT NULL,
        nama_komoditas TEXT NOT NULL,
        jumlah_estimasi REAL NOT NULL,
        media_tanam TEXT NOT NULL,
        catatan_produksi TEXT,
        publish_to_mamasar INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS tbl_tanaman (
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
      )`,
      `CREATE TABLE IF NOT EXISTS tbl_ternak (
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
      )`,
      `CREATE TABLE IF NOT EXISTS tbl_panen (
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
      )`,
      `CREATE TABLE IF NOT EXISTS tbl_penghematan (
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
      )`,
      `CREATE TABLE IF NOT EXISTS tbl_log_aktivitas (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        date TEXT,
        note TEXT,
        value REAL,
        owner_device_id TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )`,
      `CREATE TABLE IF NOT EXISTS tbl_master_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        value TEXT NOT NULL,
        extra TEXT,
        UNIQUE(category, value)
      )`,
      `CREATE TABLE IF NOT EXISTS tbl_kabar_pekarangan (
        id TEXT PRIMARY KEY,
        author_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_phone TEXT,
        yard_name TEXT,
        ranting TEXT,
        mwc_zone TEXT,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        photo_url TEXT,
        metric_badge TEXT,
        reactions_data TEXT DEFAULT '{"keren":0,"suka":0,"seger":0,"semangat":0}',
        is_mamasar_product INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_kabar_zone ON tbl_kabar_pekarangan(mwc_zone, ranting)`,
      `CREATE INDEX IF NOT EXISTS idx_kabar_author ON tbl_kabar_pekarangan(author_id)`,
      `CREATE TABLE IF NOT EXISTS tbl_kabar_reactions (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL REFERENCES tbl_kabar_pekarangan(id) ON DELETE CASCADE,
        user_phone TEXT NOT NULL,
        reaction_type TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        UNIQUE(post_id, user_phone)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_reaction_post ON tbl_kabar_reactions(post_id)`
    ];

    try {
      await client.batch(queries.map(sql => ({ sql, args: [] })), 'write');
      return true;
    } catch (err) {
      console.warn('Gagal inisialisasi skema Turso:', err);
      return false;
    }
  },

  /**
   * Simpan hasil survei pendataan pekarangan (Member, Yard, 4 Pilar Assets)
   */
  async submitSurvey(payload: SurveyPayload): Promise<{ success: boolean; member_id: string; yard_id: string }> {
    const client = getTursoClient();
    if (!client) throw new Error('Turso client belum diinisialisasi.');

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const memberId = payload.member_data.member_id || `MBR-${todayStr}-${randSuffix}`;
    const yardId = payload.yard_data.yard_id || `YRD-${todayStr}-${randSuffix}`;

    const batchStatements: { sql: string; args: any[] }[] = [];

    // 1. Simpan atau perbarui data anggota
    batchStatements.push({
      sql: `INSERT INTO tbl_anggota (
        member_id, nama_lengkap, nama_panggilan, nomor_wa, mwc_zone, ranting, rt_rw, alamat_catatan, gps_lat_long, status_verifikasi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(member_id) DO UPDATE SET
        nama_lengkap = excluded.nama_lengkap,
        nama_panggilan = excluded.nama_panggilan,
        nomor_wa = excluded.nomor_wa,
        mwc_zone = excluded.mwc_zone,
        ranting = excluded.ranting,
        rt_rw = excluded.rt_rw,
        alamat_catatan = excluded.alamat_catatan,
        gps_lat_long = excluded.gps_lat_long;`,
      args: [
        memberId,
        payload.member_data.nama_lengkap,
        payload.member_data.nama_panggilan || null,
        payload.member_data.nomor_wa,
        payload.member_data.mwc_zone || null,
        payload.member_data.ranting || null,
        payload.member_data.rt_rw,
        payload.member_data.alamat_catatan || null,
        payload.member_data.gps_lat_long || null,
        payload.member_data.status_verifikasi || 'VERIFIED'
      ]
    });

    // 2. Simpan data karakteristik pekarangan
    batchStatements.push({
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
        fasilitas_limbah = excluded.fasilitas_limbah,
        drive_foto_url = excluded.drive_foto_url;`,
      args: [
        yardId,
        memberId,
        payload.yard_data.status_lahan,
        Array.isArray(payload.yard_data.tipe_permukaan) ? payload.yard_data.tipe_permukaan.join(', ') : payload.yard_data.tipe_permukaan,
        payload.yard_data.estimasi_luas,
        Array.isArray(payload.yard_data.zonasi_posisi) ? payload.yard_data.zonasi_posisi.join(', ') : payload.yard_data.zonasi_posisi,
        payload.yard_data.paparan_sinar,
        payload.yard_data.sumber_air,
        Array.isArray(payload.yard_data.fasilitas_limbah) ? payload.yard_data.fasilitas_limbah.join(', ') : payload.yard_data.fasilitas_limbah,
        payload.yard_data.drive_foto_url || null
      ]
    });

    // 3. Simpan 4 Pilar Aset Produksi
    if (Array.isArray(payload.assets_data)) {
      payload.assets_data.forEach((asset, idx) => {
        const assetId = asset.asset_id || `AST-${todayStr}-${randSuffix}-${idx + 1}`;
        batchStatements.push({
          sql: `INSERT INTO tbl_aset_produksi (
            asset_id, yard_id, pilar_kategori, nama_komoditas, jumlah_estimasi, media_tanam, catatan_produksi, publish_to_mamasar
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          args: [
            assetId,
            yardId,
            asset.pilar_kategori,
            asset.nama_komoditas,
            Number(asset.jumlah_estimasi) || 1,
            asset.media_tanam,
            asset.catatan_produksi || null,
            asset.publish_to_mamasar ? 1 : 0
          ]
        });
      });
    }

    // 4. Catat aktivitas
    batchStatements.push({
      sql: `INSERT INTO tbl_log_aktivitas (id, title, type, date, note) VALUES (?, ?, ?, ?, ?);`,
      args: [
        `LOG-${Date.now()}`,
        `Pendataan Lahan: ${payload.member_data.nama_lengkap}`,
        'survei',
        'Hari ini',
        `RT ${payload.member_data.rt_rw} • ${payload.assets_data.length} aset terdata`
      ]
    });

    await client.batch(batchStatements, 'write');
    return { success: true, member_id: memberId, yard_id: yardId };
  },

  /**
   * Cari akun warga berdasarkan nomor WhatsApp
   */
  async lookupAccount(phone: string, deviceId?: string): Promise<{ found: boolean; member?: any; isOtherDeviceActive?: boolean }> {
    const client = getTursoClient();
    if (!client) return { found: false };

    try {
      const cleanPhone = phone.replace(/^0/, '62').replace(/\D/g, '');
      const rawPhone = phone.trim();

      const result = await client.execute({
        sql: `SELECT * FROM tbl_anggota WHERE nomor_wa = ? OR nomor_wa = ? OR nomor_wa LIKE ? LIMIT 1`,
        args: [rawPhone, cleanPhone, `%${cleanPhone.slice(-8)}`]
      });

      if (result.rows.length === 0) {
        return { found: false };
      }

      const row = result.rows[0];
      const member = {
        member_id: row.member_id,
        nama_lengkap: row.nama_lengkap,
        nama_panggilan: row.nama_panggilan,
        nomor_wa: row.nomor_wa,
        mwc_zone: row.mwc_zone,
        ranting: row.ranting,
        rt_rw: row.rt_rw,
        alamat_catatan: row.alamat_catatan,
        gps_lat_long: row.gps_lat_long,
        status_verifikasi: row.status_verifikasi,
        device_id: row.device_id
      };

      const isOtherDeviceActive = !!(row.device_id && deviceId && row.device_id !== deviceId);
      return { found: true, member, isOtherDeviceActive };
    } catch (err) {
      console.warn('Turso lookupAccount error:', err);
      return { found: false };
    }
  },

  /**
   * Tarik seluruh data dari Turso untuk sinkronisasi lokal
   */
  async fetchAllData(): Promise<{
    members: CommunityMemberItem[];
    plants: PlantItem[];
    livestocks: LivestockItem[];
    harvestRecords: HarvestRecordItem[];
    penghematanLogs: KasLogItem[];
  } | null> {
    const client = getTursoClient();
    if (!client) return null;

    try {
      const [membersRes, yardsRes, assetsRes, plantsRes, liveRes, harvestRes, kasRes] = await client.batch([
        { sql: 'SELECT * FROM tbl_anggota ORDER BY created_at DESC', args: [] },
        { sql: 'SELECT * FROM tbl_pekarangan', args: [] },
        { sql: 'SELECT * FROM tbl_aset_produksi', args: [] },
        { sql: 'SELECT * FROM tbl_tanaman ORDER BY created_at DESC', args: [] },
        { sql: 'SELECT * FROM tbl_ternak ORDER BY created_at DESC', args: [] },
        { sql: 'SELECT * FROM tbl_panen ORDER BY created_at DESC', args: [] },
        { sql: 'SELECT * FROM tbl_penghematan ORDER BY created_at DESC', args: [] },
      ], 'read');

      // Map members
      const yardsMap = new Map<string, any>();
      yardsRes.rows.forEach(y => yardsMap.set(String(y.member_id), y));

      const assetsMap = new Map<string, any[]>();
      assetsRes.rows.forEach(a => {
        const yId = String(a.yard_id);
        if (!assetsMap.has(yId)) assetsMap.set(yId, []);
        assetsMap.get(yId)!.push(a);
      });

      const members: CommunityMemberItem[] = membersRes.rows.map(m => {
        const mId = String(m.member_id);
        const yard = yardsMap.get(mId);
        const yardAssets = yard ? (assetsMap.get(String(yard.yard_id)) || []) : [];

        return {
          id: mId,
          name: String(m.nama_lengkap || ''),
          phone: String(m.nomor_wa || ''),
          mwcZone: m.mwc_zone ? String(m.mwc_zone) : undefined,
          ranting: m.ranting ? String(m.ranting) : undefined,
          rtRw: String(m.rt_rw || ''),
          statusLahan: yard ? String(yard.status_lahan || 'Milik Sendiri') : 'Milik Sendiri',
          estimasiLuas: yard ? String(yard.estimasi_luas || '10-30 m²') : '10-30 m²',
          zonasi: yard && yard.zonasi_posisi ? String(yard.zonasi_posisi).split(', ') : [],
          komoditas: yardAssets.map(a => ({
            name: String(a.nama_komoditas),
            icon: '🌱',
            category: String(a.pilar_kategori)
          })),
          joinedDate: m.created_at ? String(m.created_at).slice(0, 10) : 'Terdata',
          bio: 'Keluarga pekarangan mandiri pangan Warga NU.',
          yardName: `Pekarangan ${m.nama_lengkap}`
        };
      });

      const plants: PlantItem[] = plantsRes.rows.map(p => ({
        id: String(p.id),
        name: String(p.name),
        variety: String(p.variety || ''),
        location: String(p.location || ''),
        qty: String(p.qty || ''),
        plantedDate: String(p.planted_date || ''),
        targetHst: Number(p.target_hst) || 60,
        hst: 0,
        phase: String(p.phase || 'Pertumbuhan'),
        icon: String(p.icon || '🌱'),
        progressPercent: Number(p.progress_percent) || 0,
        isHarvested: Number(p.is_harvested) === 1,
        ownerDeviceId: p.owner_device_id ? String(p.owner_device_id) : undefined
      }));

      const livestocks: LivestockItem[] = liveRes.rows.map(l => ({
        id: String(l.id),
        type: String(l.type),
        name: String(l.name),
        qty: String(l.qty || ''),
        housing: String(l.housing || ''),
        todayYield: Number(l.today_yield) || 0,
        weekYield: Number(l.week_yield) || 0,
        lastYieldDate: l.last_yield_date ? String(l.last_yield_date) : undefined,
        icon: String(l.icon || '🐔'),
        note: String(l.note || ''),
        ownerDeviceId: l.owner_device_id ? String(l.owner_device_id) : undefined
      }));

      const harvestRecords: HarvestRecordItem[] = harvestRes.rows.map(h => ({
        id: String(h.id),
        plantId: String(h.plant_id || ''),
        plantName: String(h.plant_name),
        qty: String(h.qty),
        unit: String(h.unit || 'Satuan'),
        estimatedValue: Number(h.estimated_value) || 0,
        allocation: h.allocation as any,
        date: String(h.date || ''),
        note: String(h.note || ''),
        ownerDeviceId: h.owner_device_id ? String(h.owner_device_id) : undefined
      }));

      const penghematanLogs: KasLogItem[] = kasRes.rows.map(k => ({
        id: String(k.id),
        item: String(k.item),
        meal: String(k.meal || ''),
        note: String(k.note || ''),
        date: String(k.date || ''),
        savedValue: Number(k.saved_value) || 0,
        qty: k.qty ? Number(k.qty) : undefined,
        pricePerUnit: k.price_per_unit ? Number(k.price_per_unit) : undefined,
        ownerDeviceId: k.owner_device_id ? String(k.owner_device_id) : undefined
      }));

      return {
        members,
        plants,
        livestocks,
        harvestRecords,
        penghematanLogs
      };
    } catch (err) {
      console.warn('Turso fetchAllData error:', err);
      return null;
    }
  },

  /**
   * Simpan tanaman aktif
   */
  async savePlant(plant: PlantItem): Promise<boolean> {
    const client = getTursoClient();
    if (!client) return false;
    try {
      await client.execute({
        sql: `INSERT INTO tbl_tanaman (
          id, name, variety, location, qty, planted_date, target_hst, phase, icon, progress_percent, is_harvested, owner_device_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          variety = excluded.variety,
          location = excluded.location,
          qty = excluded.qty,
          phase = excluded.phase,
          progress_percent = excluded.progress_percent,
          is_harvested = excluded.is_harvested;`,
        args: [
          plant.id,
          plant.name,
          plant.variety,
          plant.location,
          plant.qty,
          plant.plantedDate,
          plant.targetHst,
          plant.phase,
          plant.icon,
          plant.progressPercent,
          plant.isHarvested ? 1 : 0,
          plant.ownerDeviceId || null
        ]
      });
      return true;
    } catch (err) {
      console.warn('Turso savePlant error:', err);
      return false;
    }
  },

  /**
   * Simpan kelompok ternak
   */
  async saveLivestock(live: LivestockItem): Promise<boolean> {
    const client = getTursoClient();
    if (!client) return false;
    try {
      await client.execute({
        sql: `INSERT INTO tbl_ternak (
          id, type, name, qty, housing, today_yield, week_yield, last_yield_date, icon, note, owner_device_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          qty = excluded.qty,
          housing = excluded.housing,
          today_yield = excluded.today_yield,
          week_yield = excluded.week_yield,
          last_yield_date = excluded.last_yield_date,
          note = excluded.note;`,
        args: [
          live.id,
          live.type,
          live.name,
          live.qty,
          live.housing,
          live.todayYield,
          live.weekYield,
          live.lastYieldDate || null,
          live.icon,
          live.note,
          live.ownerDeviceId || null
        ]
      });
      return true;
    } catch (err) {
      console.warn('Turso saveLivestock error:', err);
      return false;
    }
  },

  /**
   * Catat telur harian
   */
  async logEgg(livestockId: string, count: number, note?: string): Promise<boolean> {
    const client = getTursoClient();
    if (!client) return false;
    try {
      await client.batch([
        {
          sql: `UPDATE tbl_ternak 
                SET today_yield = today_yield + ?, 
                    week_yield = week_yield + ?, 
                    last_yield_date = date('now', 'localtime') 
                WHERE id = ?`,
          args: [count, count, livestockId]
        },
        {
          sql: `INSERT INTO tbl_log_aktivitas (id, title, type, date, note) VALUES (?, ?, ?, ?, ?)`,
          args: [
            `LOG-${Date.now()}`,
            `Kumpul Telur (+${count} butir)`,
            'ternak',
            'Hari ini',
            note || `Ternak ID: ${livestockId}`
          ]
        }
      ], 'write');
      return true;
    } catch (err) {
      console.warn('Turso logEgg error:', err);
      return false;
    }
  },

  /**
   * Catat panen
   */
  async logHarvest(harvest: HarvestRecordItem): Promise<boolean> {
    const client = getTursoClient();
    if (!client) return false;
    try {
      await client.batch([
        {
          sql: `INSERT INTO tbl_panen (
            id, plant_id, plant_name, qty, unit, estimated_value, allocation, consumed_qty, surplus_qty, date, note, owner_device_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            harvest.id,
            harvest.plantId || null,
            harvest.plantName,
            harvest.qty,
            harvest.unit,
            harvest.estimatedValue,
            harvest.allocation,
            harvest.consumedQty || null,
            harvest.surplusQty || null,
            harvest.date,
            harvest.note || null,
            harvest.ownerDeviceId || null
          ]
        },
        {
          sql: `INSERT INTO tbl_log_aktivitas (id, title, type, date, note, value, owner_device_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `LOG-${Date.now()}`,
            `Panen ${harvest.plantName} (${harvest.qty})`,
            'panen',
            harvest.date,
            harvest.note || `Alokasi: ${harvest.allocation}`,
            harvest.estimatedValue,
            harvest.ownerDeviceId || null
          ]
        }
      ], 'write');
      return true;
    } catch (err) {
      console.warn('Turso logHarvest error:', err);
      return false;
    }
  },

  /**
   * Catat penghematan konsumsi dapur riil
   */
  async logConsume(consume: KasLogItem): Promise<boolean> {
    const client = getTursoClient();
    if (!client) return false;
    try {
      await client.batch([
        {
          sql: `INSERT INTO tbl_penghematan (
            id, item, meal, note, date, saved_value, qty, price_per_unit, owner_device_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            consume.id,
            consume.item,
            consume.meal,
            consume.note,
            consume.date,
            consume.savedValue,
            consume.qty || null,
            consume.pricePerUnit || null,
            consume.ownerDeviceId || null
          ]
        },
        {
          sql: `INSERT INTO tbl_log_aktivitas (id, title, type, date, note, value, owner_device_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `LOG-${Date.now()}`,
            `Hemat Dapur: ${consume.item}`,
            'konsumsi',
            consume.date,
            `Hemat Rp ${consume.savedValue.toLocaleString()}`,
            consume.savedValue,
            consume.ownerDeviceId || null
          ]
        }
      ], 'write');
      return true;
    } catch (err) {
      console.warn('Turso logConsume error:', err);
      return false;
    }
  },

  /**
   * Pendaftaran akun warga / device binding
   */
  async registerAccount(account: {
    member_id?: string;
    nama_lengkap: string;
    nama_panggilan?: string;
    nomor_wa: string;
    mwc_zone?: string;
    ranting?: string;
    rt_rw?: string;
    alamat_catatan?: string;
    device_id?: string;
    force_takeover?: boolean;
  }): Promise<{ success: boolean; member_id: string }> {
    const client = getTursoClient();
    if (!client) throw new Error('Turso client belum diinisialisasi.');
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const memberId = account.member_id || `MBR-${todayStr}-${randSuffix}`;

    await client.execute({
      sql: `INSERT INTO tbl_anggota (
        member_id, nama_lengkap, nama_panggilan, nomor_wa, mwc_zone, ranting, rt_rw, alamat_catatan, device_id, status_verifikasi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED')
      ON CONFLICT(member_id) DO UPDATE SET
        nama_lengkap = excluded.nama_lengkap,
        nama_panggilan = excluded.nama_panggilan,
        nomor_wa = excluded.nomor_wa,
        mwc_zone = COALESCE(excluded.mwc_zone, tbl_anggota.mwc_zone),
        ranting = COALESCE(excluded.ranting, tbl_anggota.ranting),
        rt_rw = COALESCE(excluded.rt_rw, tbl_anggota.rt_rw),
        alamat_catatan = COALESCE(excluded.alamat_catatan, tbl_anggota.alamat_catatan),
        device_id = COALESCE(excluded.device_id, tbl_anggota.device_id);`,
      args: [
        memberId,
        account.nama_lengkap,
        account.nama_panggilan || null,
        account.nomor_wa,
        account.mwc_zone || null,
        account.ranting || null,
        account.rt_rw || '01/02',
        account.alamat_catatan || null,
        account.device_id || null
      ]
    });

    return { success: true, member_id: memberId };
  },

  /**
   * Update fase pertumbuhan tanaman
   */
  async updatePlantPhase(plantId: string, phase: string, progressPercent: number): Promise<boolean> {
    const client = getTursoClient();
    if (!client) return false;
    try {
      await client.execute({
        sql: `UPDATE tbl_tanaman SET phase = ?, progress_percent = ? WHERE id = ?`,
        args: [phase, progressPercent, plantId]
      });
      return true;
    } catch (err) {
      console.warn('Turso updatePlantPhase error:', err);
      return false;
    }
  },

  /**
   * Tambah opsi kustom ke master
   */
  async addCustomOption(category: string, value: string, extra?: any): Promise<boolean> {
    const client = getTursoClient();
    if (!client) return false;
    try {
      await client.execute({
        sql: `INSERT INTO tbl_master_options (category, value, extra) VALUES (?, ?, ?)
              ON CONFLICT(category, value) DO UPDATE SET extra = excluded.extra`,
        args: [category, value, extra ? JSON.stringify(extra) : null]
      });
      return true;
    } catch (err) {
      console.warn('Turso addCustomOption error:', err);
      return false;
    }
  },

  /**
   * Mengambil daftar postingan sosial 'Apa Kabar Pekaranganmu?' terbaru
   */
  async getCommunityPosts(userPhone?: string): Promise<CommunityPostItem[]> {
    const client = getTursoClient();
    if (!client) return [];
    try {
      const rs = await client.execute({
        sql: `SELECT 
                p.id, p.author_id, p.author_name, p.author_phone, p.yard_name,
                p.ranting, p.mwc_zone, p.category, p.title, p.content,
                p.photo_url, p.metric_badge, p.reactions_data, p.is_mamasar_product, p.created_at,
                (SELECT r.reaction_type FROM tbl_kabar_reactions r WHERE r.post_id = p.id AND r.user_phone = ?) as user_reaction
              FROM tbl_kabar_pekarangan p
              ORDER BY p.created_at DESC
              LIMIT 50`,
        args: [userPhone || '']
      });

      return rs.rows.map(row => {
        let rawReactions: any = {};
        try {
          if (row.reactions_data) {
            rawReactions = typeof row.reactions_data === 'string' ? JSON.parse(row.reactions_data as string) : (row.reactions_data as any);
          }
        } catch {}

        const reactions: KabarReactions = {
          keren: (rawReactions.keren ?? rawReactions.berkah ?? 0),
          suka: (rawReactions.suka ?? rawReactions.masyaallah ?? 0),
          seger: (rawReactions.seger ?? 0),
          semangat: (rawReactions.semangat ?? 0)
        };

        let userReaction: any = row.user_reaction;
        if (userReaction === 'berkah') userReaction = 'keren';
        if (userReaction === 'masyaallah') userReaction = 'suka';

        return {
          id: String(row.id),
          authorId: String(row.author_id || ''),
          authorName: String(row.author_name || 'Warga Nahdliyin'),
          authorPhone: row.author_phone ? String(row.author_phone) : undefined,
          yardName: row.yard_name ? String(row.yard_name) : undefined,
          ranting: String(row.ranting || 'Gapura Timur'),
          mwcZone: String(row.mwc_zone || 'MWC Gapura'),
          category: (row.category as any) || 'panen',
          title: String(row.title || ''),
          content: String(row.content || ''),
          photoUrl: row.photo_url ? String(row.photo_url) : undefined,
          metricBadge: row.metric_badge ? String(row.metric_badge) : undefined,
          reactions,
          userReaction,
          createdAt: String(row.created_at || ''),
          isMamasarProduct: Boolean(row.is_mamasar_product)
        };
      });
    } catch (err) {
      console.warn('Turso getCommunityPosts error:', err);
      return [];
    }
  },

  /**
   * Buat postingan kabar pekarangan baru
   */
  async createCommunityPost(post: CommunityPostItem): Promise<boolean> {
    const client = getTursoClient();
    if (!client) return false;
    try {
      const reactionsJson = JSON.stringify(post.reactions || { keren: 0, suka: 0, seger: 0, semangat: 0 });
      await client.execute({
        sql: `INSERT INTO tbl_kabar_pekarangan (
                id, author_id, author_name, author_phone, yard_name,
                ranting, mwc_zone, category, title, content,
                photo_url, metric_badge, reactions_data, is_mamasar_product, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        args: [
          post.id,
          post.authorId,
          post.authorName,
          post.authorPhone || null,
          post.yardName || null,
          post.ranting || null,
          post.mwcZone || null,
          post.category,
          post.title,
          post.content,
          post.photoUrl || null,
          post.metricBadge || null,
          reactionsJson,
          post.isMamasarProduct ? 1 : 0
        ]
      });
      return true;
    } catch (err) {
      console.warn('Turso createCommunityPost error:', err);
      return false;
    }
  },

  /**
   * Toggle reaksi kabar pekarangan (Keren, Suka, Seger, Semangat)
   */
  async togglePostReaction(
    postId: string,
    userPhone: string,
    reactionType: 'keren' | 'suka' | 'seger' | 'semangat' | 'berkah' | 'masyaallah'
  ): Promise<{ reactions: KabarReactions; userReaction: 'keren' | 'suka' | 'seger' | 'semangat' | null } | null> {
    const client = getTursoClient();
    if (!client || !userPhone) return null;

    const normType: 'keren' | 'suka' | 'seger' | 'semangat' = 
      reactionType === 'berkah' ? 'keren' : 
      reactionType === 'masyaallah' ? 'suka' : reactionType;

    try {
      const existing = await client.execute({
        sql: `SELECT reaction_type FROM tbl_kabar_reactions WHERE post_id = ? AND user_phone = ?`,
        args: [postId, userPhone]
      });

      let nextUserReaction: 'keren' | 'suka' | 'seger' | 'semangat' | null = null;
      let diffKeren = 0;
      let diffSuka = 0;
      let diffSeger = 0;
      let diffSemangat = 0;

      if (existing.rows.length > 0) {
        let prev = existing.rows[0].reaction_type as string;
        if (prev === 'berkah') prev = 'keren';
        if (prev === 'masyaallah') prev = 'suka';

        if (prev === normType) {
          await client.execute({
            sql: `DELETE FROM tbl_kabar_reactions WHERE post_id = ? AND user_phone = ?`,
            args: [postId, userPhone]
          });
          if (prev === 'keren') diffKeren = -1;
          if (prev === 'suka') diffSuka = -1;
          if (prev === 'seger') diffSeger = -1;
          if (prev === 'semangat') diffSemangat = -1;
          nextUserReaction = null;
        } else {
          await client.execute({
            sql: `UPDATE tbl_kabar_reactions SET reaction_type = ?, created_at = datetime('now', 'localtime') WHERE post_id = ? AND user_phone = ?`,
            args: [normType, postId, userPhone]
          });
          if (prev === 'keren') diffKeren = -1;
          if (prev === 'suka') diffSuka = -1;
          if (prev === 'seger') diffSeger = -1;
          if (prev === 'semangat') diffSemangat = -1;

          if (normType === 'keren') diffKeren += 1;
          if (normType === 'suka') diffSuka += 1;
          if (normType === 'seger') diffSeger += 1;
          if (normType === 'semangat') diffSemangat += 1;
          nextUserReaction = normType;
        }
      } else {
        const randId = 'rc-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        await client.execute({
          sql: `INSERT INTO tbl_kabar_reactions (id, post_id, user_phone, reaction_type) VALUES (?, ?, ?, ?)`,
          args: [randId, postId, userPhone, normType]
        });
        if (normType === 'keren') diffKeren = 1;
        if (normType === 'suka') diffSuka = 1;
        if (normType === 'seger') diffSeger = 1;
        if (normType === 'semangat') diffSemangat = 1;
        nextUserReaction = normType;
      }

      const postRow = await client.execute({
        sql: `SELECT reactions_data FROM tbl_kabar_pekarangan WHERE id = ?`,
        args: [postId]
      });

      let rawReactions: any = {};
      if (postRow.rows.length > 0 && postRow.rows[0].reactions_data) {
        try {
          rawReactions = typeof postRow.rows[0].reactions_data === 'string'
            ? JSON.parse(postRow.rows[0].reactions_data as string)
            : postRow.rows[0].reactions_data;
        } catch {}
      }

      const currentReactions: KabarReactions = {
        keren: Math.max(0, (rawReactions.keren ?? rawReactions.berkah ?? 0) + diffKeren),
        suka: Math.max(0, (rawReactions.suka ?? rawReactions.masyaallah ?? 0) + diffSuka),
        seger: Math.max(0, (rawReactions.seger ?? 0) + diffSeger),
        semangat: Math.max(0, (rawReactions.semangat ?? 0) + diffSemangat)
      };
      // Keep legacy keys synced for compatibility
      currentReactions.berkah = currentReactions.keren;
      currentReactions.masyaallah = currentReactions.suka;

      await client.execute({
        sql: `UPDATE tbl_kabar_pekarangan SET reactions_data = ? WHERE id = ?`,
        args: [JSON.stringify(currentReactions), postId]
      });

      return {
        reactions: currentReactions,
        userReaction: nextUserReaction
      };
    } catch (err) {
      console.warn('Turso togglePostReaction error:', err);
      return null;
    }
  },

  /**
   * Menghitung statistik klasemen 'Liga Pekarangan' (Keluarga, Ranting, MWC)
   */
  async getLeaderboardStats(currentUserPhone?: string): Promise<{
    familyLeaderboard: FamilyLeaderboardItem[];
    rantingLeaderboard: RantingLeaderboardItem[];
    mwcLeaderboard: MwcLeaderboardItem[];
  }> {
    const client = getTursoClient();
    if (!client) {
      return { familyLeaderboard: [], rantingLeaderboard: [], mwcLeaderboard: [] };
    }

    try {
      const memberQuery = await client.execute(`
        SELECT 
          a.member_id,
          a.nama_lengkap,
          a.nomor_wa,
          COALESCE(a.ranting, 'Gapura Timur') as ranting,
          COALESCE(a.mwc_zone, 'MWC Gapura') as mwc_zone,
          y.yard_id,
          (SELECT COUNT(DISTINCT pilar_kategori) FROM tbl_aset_produksi WHERE yard_id = y.yard_id) as pilar_count,
          (SELECT COUNT(*) FROM tbl_aset_produksi WHERE yard_id = y.yard_id) as total_assets,
          (SELECT COUNT(*) FROM tbl_panen WHERE plant_id IN (SELECT id FROM tbl_tanaman)) as total_harvests,
          (SELECT COUNT(*) FROM tbl_kabar_pekarangan WHERE author_id = a.member_id OR author_phone = a.nomor_wa) as post_count,
          COALESCE((SELECT SUM(saved_value) FROM tbl_penghematan), 0) as total_savings
        FROM tbl_anggota a
        LEFT JOIN tbl_pekarangan y ON a.member_id = y.member_id
      `);

      const cleanPhone = (p?: string) => (p || '').replace(/^0/, '62').replace(/\D/g, '');
      const userCleanPhone = cleanPhone(currentUserPhone);

      const rawFamilies: FamilyLeaderboardItem[] = memberQuery.rows.map(row => {
        const pilarCount = Number(row.pilar_count) || 0;
        const totalAssets = Number(row.total_assets) || 0;
        const postCount = Number(row.post_count) || 0;
        const savings = Number(row.total_savings) || 0;
        const phone = String(row.nomor_wa || '');

        let points = (pilarCount * 50) + (totalAssets * 10) + (postCount * 15) + Math.round(savings / 1000);
        if (points === 0) points = 35; // Poin partisipasi dasar anggota terverifikasi

        const isCurrent = !!userCleanPhone && cleanPhone(phone) === userCleanPhone;

        let badge = 'Penggiat Hijau';
        if (pilarCount >= 3) badge = 'Pilar Paripurna';
        else if (totalAssets >= 8) badge = 'Pekarangan Subur';

        return {
          rank: 0,
          memberId: String(row.member_id),
          familyName: String(row.nama_lengkap || 'Keluarga Nahdliyin'),
          yardName: row.yard_id ? `Pekarangan ${row.nama_lengkap}` : undefined,
          ranting: String(row.ranting || 'Gapura Timur'),
          mwcZone: String(row.mwc_zone || 'MWC Gapura'),
          totalPoints: points,
          pilarCount,
          totalSavings: savings,
          badge,
          isCurrentUser: isCurrent
        };
      });

      rawFamilies.sort((a, b) => b.totalPoints - a.totalPoints);
      rawFamilies.forEach((f, idx) => {
        f.rank = idx + 1;
        if (f.rank === 1) f.badge = 'Juara Utama';
        else if (f.rank === 2) f.badge = 'Teladan Desa';
        else if (f.rank === 3) f.badge = 'Bintang Hijau';
      });

      const rantingMap = new Map<string, {
        ranting: string;
        mwcZone: string;
        familiesCount: number;
        totalPoints: number;
      }>();

      rawFamilies.forEach(f => {
        const rName = f.ranting || 'Gapura Timur';
        const existing = rantingMap.get(rName) || {
          ranting: rName,
          mwcZone: f.mwcZone || 'MWC Gapura',
          familiesCount: 0,
          totalPoints: 0
        };
        existing.familiesCount += 1;
        existing.totalPoints += f.totalPoints;
        rantingMap.set(rName, existing);
      });

      const rawRantings: RantingLeaderboardItem[] = Array.from(rantingMap.values()).map(r => ({
        rank: 0,
        ranting: r.ranting,
        mwcZone: r.mwcZone,
        activeFamiliesCount: r.familiesCount,
        totalPoints: r.totalPoints + (r.familiesCount * 50),
        totalHarvestKg: Math.round(r.totalPoints * 0.08),
        totalEggs: Math.round(r.totalPoints * 0.15),
        badge: 'Ranting Guyub'
      }));

      rawRantings.sort((a, b) => b.totalPoints - a.totalPoints);
      rawRantings.forEach((r, idx) => {
        r.rank = idx + 1;
        if (r.rank === 1) r.badge = 'Ranting Terdaulat';
        else if (r.rank === 2) r.badge = 'Ranting Asri';
        else if (r.rank === 3) r.badge = 'Ranting Mandiri';
      });

      const mwcMap = new Map<string, {
        mwcZone: string;
        rantingSet: Set<string>;
        familiesCount: number;
        totalPoints: number;
      }>();

      rawFamilies.forEach(f => {
        const mName = f.mwcZone || 'MWC Gapura';
        const existing = mwcMap.get(mName) || {
          mwcZone: mName,
          rantingSet: new Set<string>(),
          familiesCount: 0,
          totalPoints: 0
        };
        existing.rantingSet.add(f.ranting);
        existing.familiesCount += 1;
        existing.totalPoints += f.totalPoints;
        mwcMap.set(mName, existing);
      });

      const rawMwc: MwcLeaderboardItem[] = Array.from(mwcMap.values()).map(m => ({
        rank: 0,
        mwcZone: m.mwcZone,
        totalRanting: m.rantingSet.size,
        activeFamiliesCount: m.familiesCount,
        totalPoints: m.totalPoints + (m.familiesCount * 100),
        mamasarProductsCount: Math.round(m.totalPoints / 120),
        badge: 'MWC Berdaya'
      }));

      rawMwc.sort((a, b) => b.totalPoints - a.totalPoints);
      rawMwc.forEach((m, idx) => {
        m.rank = idx + 1;
        if (m.rank === 1) m.badge = 'MWC Daulat Pangan';
        else if (m.rank === 2) m.badge = 'MWC Progresif';
      });

      return {
        familyLeaderboard: rawFamilies,
        rantingLeaderboard: rawRantings,
        mwcLeaderboard: rawMwc
      };
    } catch (err) {
      console.warn('Turso getLeaderboardStats error:', err);
      return { familyLeaderboard: [], rantingLeaderboard: [], mwcLeaderboard: [] };
    }
  }
};
