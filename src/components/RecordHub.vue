<script setup lang="ts">
import { ref } from 'vue';
import type { PlantItem, LivestockItem, ActivityLogItem } from '../types';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import { SecurityService } from '../services/security';
import SearchableSelect, { type SelectOption } from './SearchableSelect.vue';

const emit = defineEmits<{
  (e: 'openSurvey'): void;
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
  (e: 'addSedekah', log: { id: string; title: string; date: string; note: string }): void;
}>();

const settings = StorageService.getSettings();

// Sub-Tab Switcher: 'tanaman' | 'ternak' | 'riwayat'
const activeTab = ref<'tanaman' | 'ternak' | 'riwayat'>('tanaman');

// Modals
const showPlantModal = ref(false);
const showEggModal = ref(false);
const showLivestockModal = ref(false);
const showHarvestModal = ref(false);
const showUpdatePhaseModal = ref(false);
const showQuickConsumeModal = ref(false);
const selectedPlant = ref<PlantItem | null>(null);

// Database Reactive State
const activePlants = ref<PlantItem[]>(StorageService.getPlants());
const activeLivestocks = ref<LivestockItem[]>(StorageService.getLivestocks());
const activityLogs = ref<ActivityLogItem[]>(StorageService.getActivityLogs());

// Master Options for Searchable Dropdowns
const masterOptions = StorageService.getMasterOptions();

const locationOptions = ref<SelectOption[]>(
  masterOptions.lokasi_tanam.map(loc => ({ value: loc, label: loc, icon: '📍' }))
);

const onAddLocationOption = (newOpt: SelectOption) => {
  StorageService.addCustomOption('lokasi_tanam', newOpt.value);
  locationOptions.value.push({ value: newOpt.value, label: newOpt.value, icon: '📍' });
  ApiService.addCustomOption(settings.gasUrl, 'lokasi_tanam', newOpt.value).catch(() => {});
};

const commodityOptions = ref<SelectOption[]>(
  masterOptions.komoditas_konsumsi.map(c => ({
    value: c.value,
    label: c.label,
    icon: c.icon,
    sub: `Rp ${c.price.toLocaleString()} / ${c.unit}`
  }))
);

const onAddCommodityOption = (newOpt: SelectOption) => {
  const itemObj = {
    label: newOpt.value,
    value: newOpt.value,
    unit: 'porsi',
    price: 5000,
    icon: '🥗'
  };
  StorageService.addCustomOption('komoditas_konsumsi', itemObj);
  commodityOptions.value.push({
    value: newOpt.value,
    label: newOpt.value,
    icon: '🥗',
    sub: 'Rp 5.000 / porsi'
  });
  ApiService.addCustomOption(settings.gasUrl, 'komoditas_konsumsi', newOpt.value, itemObj).catch(() => {});
};

const mealOptions = ref<SelectOption[]>(
  masterOptions.jenis_makan.map(m => ({ value: m, label: m }))
);

const onAddMealOption = (newOpt: SelectOption) => {
  StorageService.addCustomOption('jenis_makan', newOpt.value);
  mealOptions.value.push({ value: newOpt.value, label: newOpt.value });
  ApiService.addCustomOption(settings.gasUrl, 'jenis_makan', newOpt.value).catch(() => {});
};

// Form States
const newPlant = ref({
  name: '',
  variety: '',
  location: locationOptions.value[0]?.value || 'Teras Depan (Polybag)',
  qty: '5 Polybag',
  plantedDate: new Date().toISOString().slice(0, 10),
  targetHst: 60
});

const eggLogForm = ref({
  livestockId: activeLivestocks.value[0]?.id || 'l1',
  count: 3
});

const newLivestock = ref({
  type: 'Ayam Kampung Petelur',
  name: '',
  qty: '5 Ekor (4 Betina, 1 Jantan)',
  housing: 'Kandang Sekat Bambu',
  note: ''
});

const harvestForm = ref({
  plantId: '',
  qty: '',
  unit: 'Gram / Ikat',
  estimatedValue: 20000,
  allocation: 'konsumsi' as 'konsumsi' | 'sedekah' | 'barter'
});

// Aksi Tambah Tanam Baru (Dengan HST Dinamis)
const saveNewPlant = () => {
  if (!newPlant.value.name.trim()) {
    emit('showToast', 'Nama tanaman wajib diisi', 'warning');
    return;
  }
  const dateStr = newPlant.value.plantedDate || new Date().toISOString().slice(0, 10);
  const plantedTs = new Date(dateStr).getTime();
  const diffDays = Math.max(1, Math.floor((Date.now() - plantedTs) / 86400000) + 1);
  const targetHst = Number(newPlant.value.targetHst) || 60;
  const progress = Math.min(100, Math.round((diffDays / targetHst) * 100));

  const item: PlantItem = {
    id: 'p' + Date.now(),
    name: newPlant.value.name.trim(),
    variety: newPlant.value.variety || 'Lokal Unggul',
    location: newPlant.value.location,
    qty: newPlant.value.qty || '1 Polybag',
    plantedDate: dateStr,
    plantedTimestamp: plantedTs,
    hst: diffDays,
    targetHst: targetHst,
    phase: diffDays > 30 ? '🌿 Masa Vegetatif' : '🌱 Baru Ditanam / Semai',
    icon: '🌱',
    progressPercent: progress
  };

  StorageService.addPlant(item);
  activePlants.value.unshift(item);

  // Background sync ke Google Sheets (atau simpan antrean jika offline)
  if (!navigator.onLine) {
    StorageService.addToSyncQueue(item, 'plant', `🌱 Tanam: ${item.name}`);
  } else {
    ApiService.savePlant(settings.gasUrl, item).catch(() => {
      StorageService.addToSyncQueue(item, 'plant', `🌱 Tanam: ${item.name}`);
    });
  }

  showPlantModal.value = false;
  emit('showToast', `Berhasil mencatat tanaman: ${item.name} (${diffDays} HST)!`);
  newPlant.value.name = '';
  newPlant.value.variety = '';
};

// Hapus Tanaman (Dilindungi Kunci Layar / Biometrik)
const deletePlantItem = async (plant: PlantItem) => {
  const auth = await SecurityService.authenticate(`Konfirmasi izin hapus tanaman ${plant.name}`);
  if (!auth.success) {
    emit('showToast', auth.message || 'Verifikasi biometrik/kunci layar diperlukan', 'warning');
    return;
  }
  if (confirm(`Hapus catatan tanaman "${plant.name}"? Data akan dibersihkan dari daftar aktif.`)) {
    StorageService.deletePlant(plant.id);
    activePlants.value = activePlants.value.filter(p => p.id !== plant.id);
    emit('showToast', `Tanaman "${plant.name}" berhasil dihapus.`);
  }
};

// Aksi Tambah Ternak Baru
const saveNewLivestock = () => {
  if (!newLivestock.value.name.trim()) {
    emit('showToast', 'Nama kandang/identitas ternak wajib diisi', 'warning');
    return;
  }
  const icons: Record<string, string> = {
    'Ayam Kampung Petelur': '🐔',
    'Bebek Petelur': '🦆',
    'Burung Puyuh': '🐦',
    'Ikan Lele / Nila': '🐟',
    'Kelinci': '🐇'
  };
  const icon = icons[newLivestock.value.type] || '🐔';
  const item: LivestockItem = {
    id: 'l' + Date.now(),
    type: newLivestock.value.type,
    name: newLivestock.value.name.trim(),
    qty: newLivestock.value.qty || '1 Ekor',
    housing: newLivestock.value.housing || 'Kandang Pekarangan',
    todayYield: 0,
    weekYield: 0,
    lastYieldDate: new Date().toISOString().slice(0, 10),
    icon: icon,
    note: newLivestock.value.note || 'Pakan alami dan sisa dapur'
  };

  StorageService.addLivestock(item);
  activeLivestocks.value.unshift(item);

  if (!navigator.onLine) {
    StorageService.addToSyncQueue(item, 'livestock' as any, `🐔 Ternak: ${item.type} (${item.name})`);
  } else {
    ApiService.saveLivestock(settings.gasUrl, item).catch(() => {
      StorageService.addToSyncQueue(item, 'livestock' as any, `🐔 Ternak: ${item.type} (${item.name})`);
    });
  }

  showLivestockModal.value = false;
  emit('showToast', `Berhasil menambah kelompok ternak: ${item.name}!`);
  newLivestock.value.name = '';
  newLivestock.value.note = '';
};

// Hapus Ternak (Dilindungi Kunci Layar / Biometrik)
const deleteLivestockItem = async (live: LivestockItem) => {
  const auth = await SecurityService.authenticate(`Konfirmasi izin hapus ternak ${live.name}`);
  if (!auth.success) {
    emit('showToast', auth.message || 'Verifikasi biometrik/kunci layar diperlukan', 'warning');
    return;
  }
  if (confirm(`Hapus catatan kelompok ternak "${live.name}"?`)) {
    StorageService.deleteLivestock(live.id);
    activeLivestocks.value = activeLivestocks.value.filter(l => l.id !== live.id);
    emit('showToast', `Kelompok ternak "${live.name}" dihapus.`);
  }
};

// Aksi Log Telur Harian Cepat
const quickAddEgg = (livestock: LivestockItem) => {
  livestock.todayYield += 1;
  livestock.weekYield += 1;
  StorageService.addEggToLivestock(livestock.id, 1);

  const log: ActivityLogItem = {
    id: 'a' + Date.now(),
    title: `Kumpul Telur ${livestock.type} (+1 butir)`,
    type: 'ternak',
    date: 'Baru saja',
    note: `Total hari ini: ${livestock.todayYield} butir`
  };
  StorageService.addActivityLog(log);
  activityLogs.value.unshift(log);

  if (!navigator.onLine) {
    StorageService.addToSyncQueue({ livestockId: livestock.id, count: 1, note: log.note }, 'egg_log', `🥚 Telur +1 (${livestock.name})`);
  } else {
    ApiService.logEgg(settings.gasUrl, livestock.id, 1, log.note).catch(() => {
      StorageService.addToSyncQueue({ livestockId: livestock.id, count: 1, note: log.note }, 'egg_log', `🥚 Telur +1 (${livestock.name})`);
    });
  }

  emit('showToast', `+1 Telur dicatat untuk ${livestock.name} (Total: ${livestock.todayYield} butir)`);
};

// Aksi Simpan dari Modal Telur
const saveEggLog = () => {
  const live = activeLivestocks.value.find(l => l.id === eggLogForm.value.livestockId);
  if (!live) return;
  const count = Number(eggLogForm.value.count) || 1;
  live.todayYield += count;
  live.weekYield += count;
  StorageService.addEggToLivestock(live.id, count);

  const log: ActivityLogItem = {
    id: 'a' + Date.now(),
    title: `Kumpul Telur ${live.type} (+${count} butir)`,
    type: 'ternak',
    date: 'Baru saja',
    note: `Kandang ${live.name} (Total hari ini: ${live.todayYield} butir)`
  };
  StorageService.addActivityLog(log);
  activityLogs.value.unshift(log);

  if (!navigator.onLine) {
    StorageService.addToSyncQueue({ livestockId: live.id, count, note: log.note }, 'egg_log', `🥚 Telur +${count} (${live.name})`);
  } else {
    ApiService.logEgg(settings.gasUrl, live.id, count, log.note).catch(() => {
      StorageService.addToSyncQueue({ livestockId: live.id, count, note: log.note }, 'egg_log', `🥚 Telur +${count} (${live.name})`);
    });
  }

  showEggModal.value = false;
  emit('showToast', `Berhasil mencatat +${count} telur untuk ${live.name} (Total hari ini: ${live.todayYield})`);
};

// Aksi Catat Panen
const openHarvestModal = (plant: PlantItem) => {
  selectedPlant.value = plant;
  harvestForm.value.plantId = plant.id;
  harvestForm.value.qty = '';
  harvestForm.value.estimatedValue = 20000;
  showHarvestModal.value = true;
};

const saveHarvest = () => {
  if (!harvestForm.value.qty) {
    emit('showToast', 'Jumlah hasil panen wajib diisi', 'warning');
    return;
  }
  const plantName = selectedPlant.value?.name || 'Tanaman';
  const val = Number(harvestForm.value.estimatedValue) || 15000;
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const harvestRecord = {
    id: 'h' + Date.now(),
    plantId: harvestForm.value.plantId,
    plantName: plantName,
    qty: harvestForm.value.qty,
    unit: harvestForm.value.unit || 'Satuan',
    estimatedValue: val,
    allocation: harvestForm.value.allocation,
    date: dateStr,
    note: `Panen ${plantName} (${harvestForm.value.qty})`
  };

  StorageService.addHarvestRecord(harvestRecord);

  const allocationNotes: Record<string, string> = {
    konsumsi: 'Dikonsumsi mandiri (menghemat pengeluaran belanja)',
    sedekah: 'Disedekahkan ke tetangga / warga yang membutuhkan',
    barter: 'Surplus ditawarkan ke Bursa Barter Tetangga'
  };

  const log: ActivityLogItem = {
    id: 'a' + Date.now(),
    title: `Panen ${plantName} (${harvestForm.value.qty})`,
    type: 'panen',
    date: 'Baru saja',
    note: `${allocationNotes[harvestForm.value.allocation]} • Nilai pasar: Rp ${val.toLocaleString()}`,
    value: val
  };

  StorageService.addActivityLog(log);
  activityLogs.value.unshift(log);

  const harvestPayload = {
    plantId: harvestForm.value.plantId,
    plantName: plantName,
    qty: harvestForm.value.qty,
    allocation: harvestForm.value.allocation,
    estimatedValue: val,
    note: log.note
  };

  // Sync to Sheet or offline queue
  if (!navigator.onLine) {
    StorageService.addToSyncQueue(harvestPayload, 'harvest', `✂️ Panen: ${plantName} (${harvestForm.value.qty})`);
  } else {
    ApiService.logHarvest(settings.gasUrl, harvestPayload).catch(() => {
      StorageService.addToSyncQueue(harvestPayload, 'harvest', `✂️ Panen: ${plantName} (${harvestForm.value.qty})`);
    });
  }

  if (harvestForm.value.allocation === 'sedekah' && selectedPlant.value) {
    emit('addSedekah', {
      id: 's' + Date.now(),
      title: `${selectedPlant.value.icon || '🌿'} ${harvestForm.value.qty} ${selectedPlant.value.name}`,
      date: dateStr,
      note: `Disedekahkan dari hasil panen pekarangan ${selectedPlant.value.location}.`
    });
  }

  showHarvestModal.value = false;
  emit('showToast', `Panen ${plantName} (${harvestForm.value.qty}) senilai Rp ${val.toLocaleString()} berhasil dicatat!`);
};

// Aksi Update Fase Tanam
const openPhaseModal = (plant: PlantItem) => {
  selectedPlant.value = plant;
  showUpdatePhaseModal.value = true;
};

const setPlantPhase = (phase: string, progress: number) => {
  const plant = selectedPlant.value;
  if (!plant) return;
  plant.phase = phase;
  plant.progressPercent = progress;

  StorageService.updatePlantPhase(plant.id, phase, progress);

  const phasePayload = { plantId: plant.id, phase, progress };
  if (!navigator.onLine) {
    StorageService.addToSyncQueue(phasePayload, 'update_phase', `🔄 Fase: ${plant.name}`);
  } else {
    ApiService.updatePlantPhase(settings.gasUrl, plant.id, phase, progress).catch(() => {
      StorageService.addToSyncQueue(phasePayload, 'update_phase', `🔄 Fase: ${plant.name}`);
    });
  }

  showUpdatePhaseModal.value = false;
  emit('showToast', `Fase pertumbuhan ${plant.name} diperbarui ke: ${phase}`);
};

// Aksi Catat Konsumsi Mandiri Cepat
const quickConsume = ref({
  commodity: commodityOptions.value[0]?.value || '🥚 Telur Ayam Pekarangan',
  qty: 2,
  unit: 'butir',
  price: 3000,
  meal: mealOptions.value[0]?.value || '🍳 Sarapan Pagi'
});

const saveQuickConsume = () => {
  const saved = quickConsume.value.qty * quickConsume.value.price;
  const pengItem = {
    id: 'k' + Date.now(),
    item: `${quickConsume.value.qty} ${quickConsume.value.unit} ${quickConsume.value.commodity}`,
    meal: quickConsume.value.meal,
    note: `Hemat belanja dapur keluarga`,
    date: 'Hari ini',
    savedValue: saved
  };
  StorageService.addPengematanLog(pengItem);

  const actLog: ActivityLogItem = {
    id: 'a' + Date.now(),
    title: `Konsumsi ${quickConsume.value.qty} ${quickConsume.value.unit} ${quickConsume.value.commodity}`,
    type: 'panen',
    date: 'Baru saja',
    note: `${quickConsume.value.meal} • Hemat pengeluaran belanja Rp ${saved.toLocaleString()}`
  };
  StorageService.addActivityLog(actLog);
  activityLogs.value.unshift(actLog);

  const consumePayload = {
    item: pengItem.item,
    meal: quickConsume.value.meal,
    note: pengItem.note,
    savedValue: saved,
    qty: quickConsume.value.qty,
    pricePerUnit: quickConsume.value.price
  };

  // Sync to Sheet or offline queue
  if (!navigator.onLine) {
    StorageService.addToSyncQueue(consumePayload, 'consume', `🍽️ Konsumsi: ${pengItem.item}`);
  } else {
    ApiService.logConsume(settings.gasUrl, consumePayload).catch(() => {
      StorageService.addToSyncQueue(consumePayload, 'consume', `🍽️ Konsumsi: ${pengItem.item}`);
    });
  }

  showQuickConsumeModal.value = false;
  emit('showToast', `🍽️ Konsumsi dicatat! Anda menghemat Rp ${saved.toLocaleString()} pengeluaran belanja.`);
};
</script>

<template>
  <div class="record-hub-page">
    <!-- PRIMARY ACTION: FORM PENDATAAN LAHAN - Sleek Row -->
    <div 
      class="card" 
      style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f0fdf4; border-bottom: 1px solid var(--primary-border); cursor: pointer;"
      @click="$emit('openSurvey')"
    >
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.3rem;">📋</span>
        <div>
          <div style="font-weight: 800; font-size: 0.86rem; color: var(--primary-dark);">
            Profil Lahan Pekarangan
          </div>
          <div style="font-size: 0.68rem; color: var(--text-muted);">
            Lengkapi data lahan, foto kebun & 4 pilar
          </div>
        </div>
      </div>
      <span style="color: var(--primary); font-weight: 800; font-size: 0.85rem;">➔</span>
    </div>

    <!-- Section Divider Strip -->
    <div class="section-divider"></div>

    <!-- QUICK ACTION (CATAT HARIAN) - Full Edge Flat -->
    <div>
      <div class="section-header-bar">
        <span class="section-header-title">
          <span>⚡</span> Aksi Cepat
        </span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; background: #ffffff; border-bottom: 1px solid var(--border-subtle);">
        <button 
          type="button" 
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 4px; text-align: center; gap: 3px; background: transparent; border: none; border-right: 1px solid var(--border-subtle); cursor: pointer; font-family: inherit;"
          @click="showPlantModal = true"
        >
          <span style="font-size: 1.25rem;">🌱</span>
          <span style="font-weight: 700; font-size: 0.74rem; color: var(--text-main);">Tanam</span>
        </button>

        <button 
          type="button" 
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 4px; text-align: center; gap: 3px; background: transparent; border: none; border-right: 1px solid var(--border-subtle); cursor: pointer; font-family: inherit;"
          @click="showEggModal = true"
        >
          <span style="font-size: 1.25rem;">🥚</span>
          <span style="font-weight: 700; font-size: 0.74rem; color: var(--text-main);">Telur</span>
        </button>

        <button 
          type="button" 
          style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 4px; text-align: center; gap: 3px; background: #f0fdf4; border: none; cursor: pointer; font-family: inherit;"
          @click="showQuickConsumeModal = true"
        >
          <span style="font-size: 1.25rem;">🍽️</span>
          <span style="font-weight: 700; font-size: 0.74rem; color: var(--primary);">Konsumsi</span>
        </button>
      </div>
    </div>

    <!-- Section Divider Strip -->
    <div class="section-divider"></div>

    <!-- SUB-TAB SWITCHER - Clean Flat Underline -->
    <div class="main-tab-nav">
      <button 
        type="button" 
        :class="['main-tab-btn', { active: activeTab === 'tanaman' }]"
        @click="activeTab = 'tanaman'"
      >
        🌱 Tanaman ({{ activePlants.length }})
      </button>
      <button 
        type="button" 
        :class="['main-tab-btn', { active: activeTab === 'ternak' }]"
        @click="activeTab = 'ternak'"
      >
        🐔 Ternak ({{ activeLivestocks.length }})
      </button>
      <button 
        type="button" 
        :class="['main-tab-btn', { active: activeTab === 'riwayat' }]"
        @click="activeTab = 'riwayat'"
      >
        📜 Riwayat
      </button>
    </div>

    <!-- ================= 1. TAB TANAMAN AKTIF ================= -->
    <div v-if="activeTab === 'tanaman'">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 14px; border-bottom: 1px solid var(--border-subtle); background: #f8fafc;">
        <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-main);">
          Tanaman Aktif Pekarangan
        </span>
        <button 
          type="button" 
          class="btn btn-primary btn-sm" 
          style="padding: 3px 8px; font-size: 0.72rem;"
          @click="showPlantModal = true"
        >
          + Tanam
        </button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0;">
        <div 
          v-for="plant in activePlants" 
          :key="plant.id" 
          class="card" 
          style="margin-bottom: 0; padding: 10px 14px; border-radius: 0; border-bottom: 1px solid var(--border-subtle);"
        >
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <div style="width: 36px; height: 36px; border-radius: 4px; background: #f0fdf4; border: 1px solid var(--primary-border); display: flex; align-items: center; justify-content: center; font-size: 18px;">
                {{ plant.icon }}
              </div>
              <div>
                <div style="font-weight: 800; font-size: 0.88rem; color: var(--text-main);">
                  {{ plant.name }}
                </div>
                <div style="font-size: 0.7rem; color: var(--text-dim);">
                  {{ plant.location }} • {{ plant.qty }}
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="geo-badge">
                {{ plant.hst }} HST
              </span>
              <button 
                type="button" 
                class="btn-icon" 
                style="width: 24px; height: 24px; font-size: 0.68rem; color: #dc2626; border-radius: 4px; background: #fef2f2; border: 1px solid #fee2e2;"
                title="Hapus"
                @click="deletePlantItem(plant)"
              >
                🗑️
              </button>
            </div>
          </div>

          <!-- Progress Bar Pertumbuhan -->
          <div style="margin: 4px 0 8px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.66rem; color: var(--text-dim); margin-bottom: 2px;">
              <span>{{ plant.phase }}</span>
              <span>Target: {{ plant.targetHst }} HST</span>
            </div>
            <div class="readiness-track" style="height: 4px; border-radius: 2px;">
              <div class="readiness-fill" :style="{ width: plant.progressPercent + '%' }"></div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 6px;">
            <button 
              type="button" 
              class="btn btn-outline btn-sm btn-full"
              style="font-size: 0.72rem; padding: 5px;"
              @click="openPhaseModal(plant)"
            >
              🔄 Ubah Fase
            </button>
            <button 
              type="button" 
              class="btn btn-primary btn-sm btn-full"
              style="font-size: 0.72rem; padding: 5px;"
              @click="openHarvestModal(plant)"
            >
              ✂️ Catat Panen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 2. TAB TERNAK AKTIF ================= -->
    <div v-if="activeTab === 'ternak'">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 14px; border-bottom: 1px solid var(--border-subtle); background: #f8fafc;">
        <span style="font-size: 0.76rem; font-weight: 700; color: var(--text-main);">
          Kandang Ternak Aktif
        </span>
        <button 
          type="button" 
          class="btn btn-primary btn-sm" 
          style="padding: 3px 8px; font-size: 0.72rem;"
          @click="showLivestockModal = true"
        >
          + Ternak
        </button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0;">
        <div 
          v-for="live in activeLivestocks" 
          :key="live.id"
          class="card"
          style="margin-bottom: 0; padding: 10px 14px; border-radius: 0; border-bottom: 1px solid var(--border-subtle);"
        >
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <div style="width: 36px; height: 36px; border-radius: 4px; background: #fff7ed; border: 1px solid #fed7aa; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                {{ live.icon }}
              </div>
              <div>
                <div style="font-weight: 800; font-size: 0.88rem; color: var(--text-main);">
                  {{ live.type }}
                </div>
                <div style="font-size: 0.7rem; color: var(--text-dim);">
                  {{ live.name }} • {{ live.qty }}
                </div>
              </div>
            </div>
            <button 
              type="button" 
              class="btn-icon" 
              style="width: 24px; height: 24px; font-size: 0.68rem; color: #dc2626; border-radius: 4px; background: #fef2f2; border: 1px solid #fee2e2;"
              title="Hapus"
              @click="deleteLivestockItem(live)"
            >
              🗑️
            </button>
          </div>

          <!-- Yield Stats (Divided by crisp line, no round box) -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); margin: 6px 0;">
            <div>
              <span style="font-size: 0.68rem; color: var(--text-dim); display: block;">Telur Hari Ini</span>
              <span style="font-weight: 800; font-size: 1.05rem; color: var(--primary);">
                {{ live.todayYield }} Butir
              </span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.68rem; color: var(--text-dim); display: block;">Total 7 Hari</span>
              <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">
                {{ live.weekYield }} Butir
              </span>
            </div>
          </div>

          <button 
            type="button" 
            class="btn btn-primary btn-sm btn-full"
            style="padding: 6px; font-size: 0.74rem;"
            @click="quickAddEgg(live)"
          >
            🥚 +1 Tambah Telur
          </button>
        </div>
      </div>
    </div>

    <!-- ================= 3. TAB JURNAL LOG ================= -->
    <div v-if="activeTab === 'riwayat'">
      <div class="card">
        <div class="card-title">
          <span>📜 Riwayat Aktivitas Jurnal Pekarangan</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div 
            v-for="log in activityLogs" 
            :key="log.id"
            style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;"
          >
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span>{{ log.type === 'panen' ? '✂️' : log.type === 'ternak' ? '🥚' : log.type === 'tanam' ? '🌱' : '💧' }}</span>
                <span style="font-weight: 700; font-size: 0.82rem; color: var(--text-main);">
                  {{ log.title }}
                </span>
              </div>
              <span style="font-size: 0.68rem; color: var(--text-dim);">{{ log.date }}</span>
            </div>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 3px;">
              {{ log.note }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: TANAM BARU -->
    <div v-if="showPlantModal" class="modal-backdrop" @click.self="showPlantModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3>🌱 Catat Tanam Baru</h3>
          <button class="btn-icon" @click="showPlantModal = false">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label">Nama Komoditas Tanaman <span class="req">*</span></label>
          <input 
            v-model="newPlant.name" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: Cabai Rawit Merah, Kangkung, Jahe Merah"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Varietas / Benih</label>
          <input 
            v-model="newPlant.variety" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: Benih Unggul Lokal, Cap Panah Merah"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Lokasi & Media Tanam</label>
          <SearchableSelect
            v-model="newPlant.location"
            :options="locationOptions"
            placeholder="-- Cari atau tambah lokasi --"
            add-label="Tambah Lokasi"
            @add-option="onAddLocationOption"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Jumlah Wadah / Pohon</label>
          <input 
            v-model="newPlant.qty" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: 5 Polybag, 1 Bedeng, 3 Pot"
          />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label class="form-label">Tanggal Tanam</label>
            <input 
              v-model="newPlant.plantedDate" 
              type="date" 
              class="form-control" 
            />
          </div>

          <div class="form-group">
            <label class="form-label">Target Panen (HST)</label>
            <input 
              v-model.number="newPlant.targetHst" 
              type="number" 
              class="form-control" 
              placeholder="Contoh: 60"
            />
          </div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <button type="button" class="btn btn-outline btn-full" @click="showPlantModal = false">Batal</button>
          <button type="button" class="btn btn-primary btn-full" @click="saveNewPlant">Simpan Tanam</button>
        </div>
      </div>
    </div>

    <!-- MODAL: LOG TELUR HARIAN -->
    <div v-if="showEggModal" class="modal-backdrop" @click.self="showEggModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3>🥚 Log Hasil Telur Harian</h3>
          <button class="btn-icon" @click="showEggModal = false">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label">Pilih Kelompok Ternak</label>
          <SearchableSelect
            v-model="eggLogForm.livestockId"
            :options="activeLivestocks.map(l => ({ value: l.id, label: `${l.type} (${l.name})`, icon: l.icon }))"
            placeholder="-- Pilih Ternak --"
            :allow-add="false"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Jumlah Telur yang Dikumpulkan Hari Ini</label>
          <input 
            v-model.number="eggLogForm.count" 
            type="number" 
            min="1"
            class="form-control" 
          />
        </div>

        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <button type="button" class="btn btn-outline btn-full" @click="showEggModal = false">Batal</button>
          <button 
            type="button" 
            class="btn btn-primary btn-full" 
            @click="saveEggLog"
          >
            Simpan Log
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: TAMBAH TERNAK BARU -->
    <div v-if="showLivestockModal" class="modal-backdrop" @click.self="showLivestockModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3>🐔 Tambah Kelompok Ternak</h3>
          <button class="btn-icon" @click="showLivestockModal = false">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label">Jenis Komoditas Ternak <span class="req">*</span></label>
          <select v-model="newLivestock.type" class="form-control">
            <option value="Ayam Kampung Petelur">🐔 Ayam Kampung Petelur</option>
            <option value="Bebek Petelur">🦆 Bebek Petelur</option>
            <option value="Burung Puyuh">🐦 Burung Puyuh</option>
            <option value="Ikan Lele / Nila">🐟 Ikan Lele / Nila</option>
            <option value="Kelinci">🐇 Kelinci</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Nama / Identitas Kandang <span class="req">*</span></label>
          <input 
            v-model="newLivestock.name" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: Kandang Puyuh Samping, Kolam Belakang"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Populasi / Jumlah Ekor</label>
          <input 
            v-model="newLivestock.qty" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: 15 Ekor Betina"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Model Kandang / Kolam</label>
          <input 
            v-model="newLivestock.housing" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: Kandang Baterai Kawat, Kolam Terpal"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Catatan Pakan / Pemeliharaan</label>
          <textarea 
            v-model="newLivestock.note" 
            class="form-control" 
            rows="2"
            placeholder="Contoh: Pakan konsentrat + dedak, sayur sisa dapur"
          ></textarea>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <button type="button" class="btn btn-outline btn-full" @click="showLivestockModal = false">Batal</button>
          <button type="button" class="btn btn-primary btn-full" @click="saveNewLivestock">Simpan Ternak</button>
        </div>
      </div>
    </div>

    <!-- MODAL: CATAT PANEN SAYUR -->
    <div v-if="showHarvestModal" class="modal-backdrop" @click.self="showHarvestModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3>✂️ Catat Hasil Panen</h3>
          <button class="btn-icon" @click="showHarvestModal = false">✕</button>
        </div>

        <div v-if="selectedPlant" style="margin-bottom: 12px; font-weight: 700; font-size: 0.9rem; color: var(--primary);">
          Komoditas: {{ selectedPlant.name }} ({{ selectedPlant.location }})
        </div>

        <div class="form-group">
          <label class="form-label">Jumlah / Berat Panen <span class="req">*</span></label>
          <input 
            v-model="harvestForm.qty" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: 500 gram, 2 ikat besar, 10 buah"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Estimasi Nilai Panen (Rp) <span style="font-size: 0.72rem; color: var(--text-dim);">(Tercatat di Penghematan)</span></label>
          <input 
            v-model.number="harvestForm.estimatedValue" 
            type="number" 
            class="form-control" 
            placeholder="Contoh: 20000"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Alokasi Hasil Panen</label>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
            <label v-for="opt in [
              { val: 'konsumsi', icon: '🍽️', label: 'Konsumsi Mandiri', sub: 'Hemat pengeluaran belanja keluarga', soon: false },
              { val: 'sedekah',  icon: '❤️', label: 'Sedekah ke Tetangga', sub: 'Tercatat di Penghematan sebagai rekor kebaikan', soon: true },
              { val: 'barter',   icon: '🧺', label: 'Surplus untuk Barter', sub: 'Ditawarkan ke Bursa Barter lingkungan', soon: true }
            ]" :key="opt.val" :style="{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '10px',
              cursor: opt.soon ? 'not-allowed' : 'pointer',
              opacity: opt.soon ? '0.55' : '1',
              border: '1.5px solid ' + (harvestForm.allocation === opt.val ? 'var(--primary)' : 'var(--border-subtle)'),
              background: harvestForm.allocation === opt.val ? '#f0fdf4' : '#fff',
              transition: 'all 0.15s'
            }" @click="!opt.soon && (harvestForm.allocation = opt.val as 'konsumsi' | 'sedekah' | 'barter')">
              <input type="radio" :value="opt.val" v-model="harvestForm.allocation" :disabled="opt.soon" style="accent-color: var(--primary); width:15px; height:15px;" />
              <span style="font-size: 1.1rem;">{{ opt.icon }}</span>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 5px;">
                  <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-main);">{{ opt.label }}</span>
                  <span v-if="opt.soon" style="
                    font-size: 0.5rem; font-weight: 800; letter-spacing: 0.8px;
                    text-transform: uppercase; background: #d97706;
                    color: #fff; padding: 1px 5px; border-radius: 9999px;
                  ">Segera Hadir</span>
                </div>
                <div style="font-size: 0.66rem; color: var(--text-muted);">{{ opt.sub }}</div>
              </div>
            </label>
          </div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <button type="button" class="btn btn-outline btn-full" @click="showHarvestModal = false">Batal</button>
          <button type="button" class="btn btn-primary btn-full" @click="saveHarvest">Simpan Panen</button>
        </div>
      </div>
    </div>

    <!-- MODAL: UPDATE FASE PERTUMBUHAN -->
    <div v-if="showUpdatePhaseModal" class="modal-backdrop" @click.self="showUpdatePhaseModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3>🔄 Update Fase Pertumbuhan</h3>
          <button class="btn-icon" @click="showUpdatePhaseModal = false">✕</button>
        </div>

        <div v-if="selectedPlant" style="margin-bottom: 12px; font-weight: 700; font-size: 0.9rem;">
          {{ selectedPlant.name }}
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button 
            type="button" 
            class="btn btn-outline" 
            style="justify-content: flex-start; text-align: left;"
            @click="setPlantPhase('🌱 Fase Semai / Kecambah', 20)"
          >
            🌱 1. Fase Semai / Berkecambah
          </button>
          <button 
            type="button" 
            class="btn btn-outline" 
            style="justify-content: flex-start; text-align: left;"
            @click="setPlantPhase('🌿 Fase Vegetatif (Daun & Batang)', 40)"
          >
            🌿 2. Fase Vegetatif (Tumbuh Daun & Ranting)
          </button>
          <button 
            type="button" 
            class="btn btn-outline" 
            style="justify-content: flex-start; text-align: left;"
            @click="setPlantPhase('🌸 Sedang Berbunga', 65)"
          >
            🌸 3. Sedang Berbunga (Mulai Pembentukan Buah)
          </button>
          <button 
            type="button" 
            class="btn btn-outline" 
            style="justify-content: flex-start; text-align: left;"
            @click="setPlantPhase('🍅 Mulai Berbuah / Mengisi', 80)"
          >
            🍅 4. Mulai Berbuah / Rimpang Membesar
          </button>
          <button 
            type="button" 
            class="btn btn-primary" 
            style="justify-content: flex-start; text-align: left;"
            @click="setPlantPhase('✂️ Siap Dipanen!', 100)"
          >
            ✂️ 5. Siap Dipanen!
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: CATAT KONSUMSI MANDIRI CEPAT -->
    <div v-if="showQuickConsumeModal" class="modal-backdrop" @click.self="showQuickConsumeModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3>🍽️ Catat Konsumsi Mandiri</h3>
          <button class="btn-icon" @click="showQuickConsumeModal = false">✕</button>
        </div>

        <p style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 12px;">
          Catat bahan pekarangan yang dinikmati/dikonsumsi hari ini untuk menghitung pengeluaran belanja yang dihemat!
        </p>

        <div class="form-group">
          <label class="form-label">Komoditas yang Dikonsumsi</label>
          <SearchableSelect
            v-model="quickConsume.commodity"
            :options="commodityOptions"
            placeholder="-- Cari atau tambah komoditas --"
            add-label="Tambah Komoditas"
            @add-option="onAddCommodityOption"
          />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label class="form-label">Jumlah</label>
            <input v-model.number="quickConsume.qty" type="number" min="1" class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Harga Warung (Rp)</label>
            <input v-model.number="quickConsume.price" type="number" class="form-control" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Waktu & Jenis Konsumsi</label>
          <SearchableSelect
            v-model="quickConsume.meal"
            :options="mealOptions"
            placeholder="-- Pilih Waktu / Jenis Makan --"
            add-label="Tambah Jenis Makan"
            @add-option="onAddMealOption"
          />
        </div>

        <div style="background: #f0fdf4; border: 1px solid var(--primary-border); border-radius: var(--radius-sm); padding: 8px 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.75rem; color: var(--primary-dark); font-weight: 600;">
            💵 Uang Belanja yang Dihemat:
          </span>
          <span style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">
            Rp {{ (quickConsume.qty * quickConsume.price).toLocaleString() }}
          </span>
        </div>

        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-outline btn-full" @click="showQuickConsumeModal = false">Batal</button>
          <button type="button" class="btn btn-primary btn-full" @click="saveQuickConsume">Catat Penghematan</button>
        </div>
      </div>
    </div>
  </div>
</template>
