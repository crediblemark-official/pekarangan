/**
 * ============================================================================
 * PEKARANGAN - STORAGE & OFFLINE DATABASE (TypeScript) v2.0
 * ============================================================================
 */

import type {
  AppSettings,
  SurveyPayload,
  SyncQueueItem,
  PlantItem,
  LivestockItem,
  ActivityLogItem,
  KasLogItem,
  HarvestRecordItem,
  MasterOptions,
  CommunityMemberItem
} from "../types";

/**
 * Storage key version:
 * - v2: data lama — mengandung seed/demo data palsu (Budi Santoso, dll)
 * - v3: bersih — fresh install tanpa data makhluq ghaib
 * Settings tetap v2 agar GAS URL & preferensi user tidak hilang.
 */
const KEYS = {
  SETTINGS:          'pekarangan_settings_v2',      // v2 dipertahankan — simpan GAS URL
  SYNC_QUEUE:        'pekarangan_sync_queue_v3',
  CURRENT_DRAFT:     'pekarangan_active_draft_v3',
  PLANTS:            'pekarangan_plants_v3',
  LIVESTOCK:         'pekarangan_livestock_v3',
  ACTIVITY_LOGS:     'pekarangan_activity_logs_v3',
  PENGHEMATAN_LOGS:  'pekarangan_penghematan_logs_v3',
  HARVEST_RECORDS:   'pekarangan_harvest_records_v3',
  MASTER_OPTIONS:    'pekarangan_master_options_v3',
  STATS:             'pekarangan_stats_v3',
  MEMBERS:           'pekarangan_members_v3'
};


const DEFAULT_OPTIONS: MasterOptions = {
  rt_rw: ["01/02", "02/02", "03/02", "04/02", "05/02"],
  lokasi_tanam: [
    "Teras Depan (Polybag)",
    "Teras Depan (Pot)",
    "Pekarangan Samping",
    "Bedengan Belakang",
    "Vertikultur Dinding",
    "Roof / Balkon Atas"
  ],
  komoditas_konsumsi: [
    { label: "Telur Ayam Pekarangan", value: "🥚 Telur Ayam Pekarangan", unit: "butir", price: 3000, icon: "🥚" },
    { label: "Sayur Bayam / Kangkung", value: "🥬 Sayur Bayam / Kangkung", unit: "ikat", price: 5000, icon: "🥬" },
    { label: "Cabai Rawit Segar", value: "🌶️ Cabai Rawit Segar", unit: "genggam (50g)", price: 4000, icon: "🌶️" },
    { label: "Jamu TOGA / Empon", value: "🌿 Jamu TOGA / Empon", unit: "porsi", price: 6000, icon: "🌿" },
    { label: "Ikan Lele / Nila Kolam", value: "🐟 Ikan Lele / Nila Kolam", unit: "ekor", price: 7000, icon: "🐟" }
  ],
  jenis_makan: [
    "🍳 Sarapan Pagi",
    "🍲 Makan Siang",
    "🍚 Makan Malam",
    "🌿 Minuman Sehat / Herbal",
    "🍎 Buah / Camilan Segar"
  ],
  media_tanam: [
    "Langsung di Tanah",
    "Polybag/Pot",
    "Vertikultur",
    "Kandang",
    "Dapur Pengolahan"
  ]
};

const SEED_PENGHEMATAN: KasLogItem[] = [];


const SEED_MEMBERS: CommunityMemberItem[] = [];


export const StorageService = {
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          gasUrl: (import.meta.env.VITE_GAS_URL as string) || parsed.gasUrl || '',
          defaultRtRw: parsed.defaultRtRw || '',
          cadreName: parsed.cadreName || '',
          ownerName: parsed.ownerName || parsed.cadreName || '',
          yardName: parsed.yardName || '',
          phone: parsed.phone || '',
          addressDetail: parsed.addressDetail || '',
          landStatus: parsed.landStatus || 'Milik Sendiri',
          landArea: parsed.landArea || '10-30 m²',
          theme: parsed.theme || 'dark',
          isBiometricLockEnabled: parsed.isBiometricLockEnabled !== false,
          deviceId: parsed.deviceId
        };
      }
    } catch (e) {
      console.warn('Error reading settings', e);
    }
    return {
      gasUrl: (import.meta.env.VITE_GAS_URL as string) || '',
      defaultRtRw: '',
      cadreName: '',
      ownerName: '',
      yardName: '',
      phone: '',
      addressDetail: '',
      landStatus: 'Milik Sendiri',
      landArea: '10-30 m²',
      theme: 'dark',
      isBiometricLockEnabled: true
    };
  },

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  // --- SYNC QUEUE ---
  getSyncQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  addToSyncQueue(payload: any, type: any = 'survey', title?: string): string {
    const queue = this.getSyncQueue();
    const queueId = `SYNC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const item: SyncQueueItem = {
      queueId,
      createdAt: new Date().toISOString(),
      status: "PENDING",
      retryCount: 0,
      type,
      title: title || (type === 'survey' ? (payload.member_data?.nama_lengkap || 'Survei Lahan') : type),
      payload
    };

    queue.unshift(item);
    localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
    return queueId;
  },

  removeFromSyncQueue(queueId: string): void {
    const queue = this.getSyncQueue().filter(i => i.queueId !== queueId);
    localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
  },

  updateQueueItem(queueId: string, updates: Partial<SyncQueueItem>): void {
    const queue = this.getSyncQueue();
    const idx = queue.findIndex(i => i.queueId === queueId);
    if (idx !== -1) {
      queue[idx] = { ...queue[idx], ...updates };
      localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
    }
  },

  // --- DRAFTS ---
  saveActiveDraft(payload: Partial<SurveyPayload>): void {
    try {
      localStorage.setItem(KEYS.CURRENT_DRAFT, JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to save active draft", e);
    }
  },

  getActiveDraft(): Partial<SurveyPayload> | null {
    try {
      const data = localStorage.getItem(KEYS.CURRENT_DRAFT);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  clearActiveDraft(): void {
    localStorage.removeItem(KEYS.CURRENT_DRAFT);
  },

  // --- TANAMAN (PLANTS) ---
  computePlantHst(plant: PlantItem): number {
    if (plant.plantedTimestamp) {
      const diffMs = Date.now() - plant.plantedTimestamp;
      return Math.max(1, Math.floor(diffMs / 86400000) + 1);
    }
    if (plant.plantedDate) {
      const parsed = Date.parse(plant.plantedDate);
      if (!isNaN(parsed)) {
        const diffMs = Date.now() - parsed;
        return Math.max(1, Math.floor(diffMs / 86400000) + 1);
      }
    }
    return plant.hst || 1;
  },

  getPlants(): PlantItem[] {
    let list: PlantItem[] = [];
    try {
      const raw = localStorage.getItem(KEYS.PLANTS);
      list = raw ? JSON.parse(raw) : [];
    } catch (e) {
      list = [];
    }

    // Refresh dynamic HST and progress
    list.forEach(p => {
      p.hst = this.computePlantHst(p);
      if (!p.phase?.includes('Selesai')) {
        p.progressPercent = Math.min(100, Math.round((p.hst / (p.targetHst || 60)) * 100));
      }
    });

    return list;
  },

  savePlants(plants: PlantItem[]): void {
    localStorage.setItem(KEYS.PLANTS, JSON.stringify(plants));
  },

  addPlant(plant: PlantItem): void {
    const list = this.getPlants();
    list.unshift(plant);
    this.savePlants(list);
  },

  deletePlant(plantId: string): void {
    const list = this.getPlants().filter(p => p.id !== plantId);
    this.savePlants(list);
  },

  updatePlantPhase(plantId: string, phase: string, progressPercent: number): void {
    const list = this.getPlants();
    const target = list.find(p => p.id === plantId);
    if (target) {
      target.phase = phase;
      target.progressPercent = progressPercent;
      this.savePlants(list);
    }
  },

  // --- TERNAK (LIVESTOCK) ---
  getLivestocks(): LivestockItem[] {
    let list: LivestockItem[] = [];
    try {
      const raw = localStorage.getItem(KEYS.LIVESTOCK);
      list = raw ? JSON.parse(raw) : [];
    } catch (e) {
      list = [];
    }

    // Otomatis reset produksi telur harian jika ganti hari
    const todayStr = new Date().toISOString().slice(0, 10);
    let hasChanged = false;
    list.forEach(l => {
      if (!l.lastYieldDate) {
        l.lastYieldDate = todayStr;
        hasChanged = true;
      } else if (l.lastYieldDate !== todayStr) {
        l.todayYield = 0;
        l.lastYieldDate = todayStr;
        hasChanged = true;
      }
    });

    if (hasChanged) {
      this.saveLivestocks(list);
    }

    return list;
  },

  saveLivestocks(livestocks: LivestockItem[]): void {
    localStorage.setItem(KEYS.LIVESTOCK, JSON.stringify(livestocks));
  },

  addLivestock(livestock: LivestockItem): void {
    const list = this.getLivestocks();
    list.unshift(livestock);
    this.saveLivestocks(list);
  },

  deleteLivestock(livestockId: string): void {
    const list = this.getLivestocks().filter(l => l.id !== livestockId);
    this.saveLivestocks(list);
  },

  addEggToLivestock(livestockId: string, count: number): void {
    const list = this.getLivestocks();
    const target = list.find(l => l.id === livestockId);
    if (target) {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (target.lastYieldDate !== todayStr) {
        target.todayYield = 0;
        target.lastYieldDate = todayStr;
      }
      target.todayYield += count;
      target.weekYield += count;
      this.saveLivestocks(list);
    }
  },

  // --- LOG AKTIVITAS ---
  getActivityLogs(): ActivityLogItem[] {
    try {
      const raw = localStorage.getItem(KEYS.ACTIVITY_LOGS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify([]));
    return [];
  },

  saveActivityLogs(logs: ActivityLogItem[]): void {
    localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
  },

  addActivityLog(log: ActivityLogItem): void {
    const list = this.getActivityLogs();
    list.unshift(log);
    this.saveActivityLogs(list);
  },

  // --- PANEN RIIL (HARVEST RECORDS) ---
  getHarvestRecords(): HarvestRecordItem[] {
    try {
      const raw = localStorage.getItem(KEYS.HARVEST_RECORDS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // Kosong jika belum ada data panen nyata
    return [];
  },

  saveHarvestRecords(records: HarvestRecordItem[]): void {
    localStorage.setItem(KEYS.HARVEST_RECORDS, JSON.stringify(records));
  },

  addHarvestRecord(record: HarvestRecordItem): void {
    const list = this.getHarvestRecords();
    list.unshift(record);
    this.saveHarvestRecords(list);
  },

  getTotalHarvestValue(): number {
    const records = this.getHarvestRecords();
    return records.reduce((acc, curr) => acc + (Number(curr.estimatedValue) || 0), 0);
  },

  // --- PENGHEMATAN (LOG KONSUMSI MANDIRI) ---
  getPengematanLogs(): KasLogItem[] {
    try {
      const raw = localStorage.getItem(KEYS.PENGHEMATAN_LOGS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    localStorage.setItem(KEYS.PENGHEMATAN_LOGS, JSON.stringify(SEED_PENGHEMATAN));
    return [...SEED_PENGHEMATAN];
  },

  savePengematanLogs(logs: KasLogItem[]): void {
    localStorage.setItem(KEYS.PENGHEMATAN_LOGS, JSON.stringify(logs));
  },

  addPengematanLog(log: KasLogItem): void {
    const list = this.getPengematanLogs();
    list.unshift(log);
    this.savePengematanLogs(list);
  },

  getTotalSavings(): number {
    const logs = this.getPengematanLogs();
    return logs.reduce((acc, curr) => acc + (Number(curr.savedValue) || 0), 0);
  },

  // --- MASTER OPTIONS (DROPDOWNS) ---
  getMasterOptions(): MasterOptions {
    try {
      const raw = localStorage.getItem(KEYS.MASTER_OPTIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          rt_rw: parsed.rt_rw || DEFAULT_OPTIONS.rt_rw,
          lokasi_tanam: parsed.lokasi_tanam || DEFAULT_OPTIONS.lokasi_tanam,
          komoditas_konsumsi: parsed.komoditas_konsumsi || DEFAULT_OPTIONS.komoditas_konsumsi,
          jenis_makan: parsed.jenis_makan || DEFAULT_OPTIONS.jenis_makan,
          media_tanam: parsed.media_tanam || DEFAULT_OPTIONS.media_tanam
        };
      }
    } catch (e) {}
    localStorage.setItem(KEYS.MASTER_OPTIONS, JSON.stringify(DEFAULT_OPTIONS));
    return { ...DEFAULT_OPTIONS };
  },

  saveMasterOptions(opts: MasterOptions): void {
    localStorage.setItem(KEYS.MASTER_OPTIONS, JSON.stringify(opts));
  },

  addCustomOption(category: keyof MasterOptions, value: any): void {
    const opts = this.getMasterOptions();
    if (category === "komoditas_konsumsi") {
      const exists = opts.komoditas_konsumsi.some(c => c.value === value.value || c.label === value.label);
      if (!exists) {
        opts.komoditas_konsumsi.push(value);
      }
    } else {
      const arr = opts[category] as string[];
      if (Array.isArray(arr) && !arr.includes(value)) {
        arr.push(value);
      }
    }
    this.saveMasterOptions(opts);
  },

  // --- STATS DARI PEKARANGAN TERDATA ---
  getRecordedMembersCount(): number {
    try {
      const raw = localStorage.getItem(KEYS.STATS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.membersCount === "number") return parsed.membersCount;
      }
    } catch (e) {}
    return 0; // fresh install
  },

  incrementRecordedMembersCount(): number {
    const current = this.getRecordedMembersCount();
    const updated = current + 1;
    localStorage.setItem(KEYS.STATS, JSON.stringify({ membersCount: updated }));
    return updated;
  },

  setRecordedMembersCount(count: number): void {
    localStorage.setItem(KEYS.STATS, JSON.stringify({ membersCount: count }));
  },

  // --- DIREKTORI ANGGOTA KOMUNITAS ---
  getMembers(): CommunityMemberItem[] {
    try {
      const raw = localStorage.getItem(KEYS.MEMBERS);
      return raw ? JSON.parse(raw) : [...SEED_MEMBERS];
    } catch {
      return [...SEED_MEMBERS];
    }
  },

  saveMembers(members: CommunityMemberItem[]): void {
    localStorage.setItem(KEYS.MEMBERS, JSON.stringify(members));
  },

  addMember(member: CommunityMemberItem): void {
    const list = this.getMembers();
    list.unshift(member);
    this.saveMembers(list);
  }
};
