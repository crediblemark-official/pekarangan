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
  MasterOptions
} from "../types";

const KEYS = {
  SETTINGS: "pekarangan_settings_v2",
  SYNC_QUEUE: "pekarangan_sync_queue_v2",
  CURRENT_DRAFT: "pekarangan_active_draft_v2",
  PLANTS: "pekarangan_plants_v2",
  LIVESTOCK: "pekarangan_livestock_v2",
  ACTIVITY_LOGS: "pekarangan_activity_logs_v2",
  KAS_LOGS: "pekarangan_kas_logs_v2",
  MASTER_OPTIONS: "pekarangan_master_options_v2",
  STATS: "pekarangan_stats_v2"
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

const SEED_PLANTS: PlantItem[] = [
  {
    id: "p1",
    name: "Cabai Rawit Merah",
    variety: "Varietas Bara",
    location: "Teras Depan (Polybag)",
    qty: "6 Polibag",
    plantedDate: "13 Agu 2026",
    hst: 42,
    targetHst: 75,
    phase: "🌸 Sedang Berbunga",
    icon: "🌶️",
    progressPercent: 56
  },
  {
    id: "p2",
    name: "Kangkung Cabut",
    variety: "Kangkung Daun Sempit",
    location: "Bedengan Belakang",
    qty: "1 Bedengan (2x1 m)",
    plantedDate: "2 Sep 2026",
    hst: 22,
    targetHst: 25,
    phase: "🥬 Siap Panen!",
    icon: "🥬",
    progressPercent: 88
  },
  {
    id: "p3",
    name: "Jahe Merah (TOGA)",
    variety: "Rimpang Super",
    location: "Pekarangan Samping",
    qty: "4 Pot",
    plantedDate: "18 Jul 2026",
    hst: 68,
    targetHst: 180,
    phase: "🌿 Rumpun Tumbuh Subur",
    icon: "🌿",
    progressPercent: 38
  }
];

const SEED_LIVESTOCK: LivestockItem[] = [
  {
    id: "l1",
    type: "Ayam Kampung Petelur",
    name: "Kandang Ayam Belakang",
    qty: "5 Ekor (4 Betina, 1 Jantan)",
    housing: "Kandang Sekat Bambu",
    todayYield: 3,
    weekYield: 21,
    icon: "🐔",
    note: "Pakan: Bekatul, sayur sisa dapur, maggot BSF"
  },
  {
    id: "l2",
    type: "Bebek Petelur",
    name: "Kandang Bebek Sudut Kolam",
    qty: "3 Ekor Betina",
    housing: "Kandang Terbuka Serbuk Kayu",
    todayYield: 2,
    weekYield: 14,
    icon: "🦆",
    note: "Produksi telur konsisten, kuning telur jingga pekat"
  }
];

const SEED_ACTIVITIES: ActivityLogItem[] = [
  { id: "a1", title: "Panen 2 Ikat Kangkung Segar", type: "panen", date: "Hari ini, 07:15", note: "Untuk konsumsi sayur bening makan siang keluarga" },
  { id: "a2", title: "Kumpul Telur Ayam (+3 butir)", type: "ternak", date: "Hari ini, 06:40", note: "Telur bersih langsung disimpan di rak dapur" },
  { id: "a3", title: "Pupuk Susulan Kompos Cabai Rawit", type: "rawat", date: "Kemarin, 16:30", note: "Diberi 1 genggam kompos matang per polybag" },
  { id: "a4", title: "Semai Benih Terong Ungu (10 polybag)", type: "tanam", date: "21 Sep 2026", note: "Mulai berkecambah 4 polybag" }
];

const SEED_KAS: KasLogItem[] = [
  {
    id: "c1",
    item: "🥚 3 Butir Telur Ayam",
    meal: "🍳 Sarapan Pagi",
    note: "Telur dadar lalap daun mangkokan pekarangan",
    date: "Hari ini, 07:15",
    savedValue: 9000
  },
  {
    id: "c2",
    item: "🥬 2 Ikat Kangkung Segar",
    meal: "🍲 Makan Siang",
    note: "Tumis kangkung terasi pedas manis",
    date: "Hari ini, 12:20",
    savedValue: 10000
  },
  {
    id: "c3",
    item: "🌶️ 1 Genggam Cabai Rawit (50g)",
    meal: "🍚 Makan Malam",
    note: "Sambal bawang ulek segar dari 3 pot teras",
    date: "Kemarin, 18:40",
    savedValue: 4000
  },
  {
    id: "c4",
    item: "🌿 Rimpang Jahe & Serai",
    meal: "☕ Minuman Sehat",
    note: "Wedang jahe anget malam hari pengganti suplemen",
    date: "22 Sep 2026",
    savedValue: 6000
  }
];

export const StorageService = {
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn("Error reading settings", e);
    }
    return {
      gasUrl: (import.meta.env.VITE_GAS_URL as string) || "",
      defaultRtRw: "",
      cadreName: "",
      theme: "dark"
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
  getPlants(): PlantItem[] {
    try {
      const raw = localStorage.getItem(KEYS.PLANTS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    localStorage.setItem(KEYS.PLANTS, JSON.stringify(SEED_PLANTS));
    return [...SEED_PLANTS];
  },

  savePlants(plants: PlantItem[]): void {
    localStorage.setItem(KEYS.PLANTS, JSON.stringify(plants));
  },

  addPlant(plant: PlantItem): void {
    const list = this.getPlants();
    list.unshift(plant);
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
    try {
      const raw = localStorage.getItem(KEYS.LIVESTOCK);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    localStorage.setItem(KEYS.LIVESTOCK, JSON.stringify(SEED_LIVESTOCK));
    return [...SEED_LIVESTOCK];
  },

  saveLivestocks(livestocks: LivestockItem[]): void {
    localStorage.setItem(KEYS.LIVESTOCK, JSON.stringify(livestocks));
  },

  addEggToLivestock(livestockId: string, count: number): void {
    const list = this.getLivestocks();
    const target = list.find(l => l.id === livestockId);
    if (target) {
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
    localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify(SEED_ACTIVITIES));
    return [...SEED_ACTIVITIES];
  },

  saveActivityLogs(logs: ActivityLogItem[]): void {
    localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
  },

  addActivityLog(log: ActivityLogItem): void {
    const list = this.getActivityLogs();
    list.unshift(log);
    this.saveActivityLogs(list);
  },

  // --- BUKU KAS (PENGHEMATAN) ---
  getKasLogs(): KasLogItem[] {
    try {
      const raw = localStorage.getItem(KEYS.KAS_LOGS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    localStorage.setItem(KEYS.KAS_LOGS, JSON.stringify(SEED_KAS));
    return [...SEED_KAS];
  },

  saveKasLogs(logs: KasLogItem[]): void {
    localStorage.setItem(KEYS.KAS_LOGS, JSON.stringify(logs));
  },

  addKasLog(log: KasLogItem): void {
    const list = this.getKasLogs();
    list.unshift(log);
    this.saveKasLogs(list);
  },

  getTotalSavings(): number {
    const logs = this.getKasLogs();
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
    return 18; // baseline
  },

  incrementRecordedMembersCount(): number {
    const current = this.getRecordedMembersCount();
    const updated = current + 1;
    localStorage.setItem(KEYS.STATS, JSON.stringify({ membersCount: updated }));
    return updated;
  },

  setRecordedMembersCount(count: number): void {
    localStorage.setItem(KEYS.STATS, JSON.stringify({ membersCount: count }));
  }
};
