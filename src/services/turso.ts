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
  CommunityMemberItem
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
      )`
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
  }
};
