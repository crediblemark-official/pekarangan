<script setup lang="ts">
import { ref } from 'vue';
import type { PlantItem, LivestockItem, ActivityLogItem } from '../types';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
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
  targetHst: 60
});

const eggLogForm = ref({
  livestockId: activeLivestocks.value[0]?.id || 'l1',
  count: 3
});

const harvestForm = ref({
  plantId: '',
  qty: '',
  unit: 'Gram / Ikat',
  allocation: 'konsumsi' as 'konsumsi' | 'sedekah' | 'barter'
});

// Aksi Tambah Tanam Baru
const saveNewPlant = () => {
  if (!newPlant.value.name.trim()) {
    emit('showToast', 'Nama tanaman wajib diisi', 'warning');
    return;
  }
  const item: PlantItem = {
    id: 'p' + Date.now(),
    name: newPlant.value.name.trim(),
    variety: newPlant.value.variety || 'Lokal Unggul',
    location: newPlant.value.location,
    qty: newPlant.value.qty || '1 Polybag',
    plantedDate: 'Hari ini',
    hst: 1,
    targetHst: Number(newPlant.value.targetHst) || 60,
    phase: '🌱 Baru Ditanam / Semai',
    icon: '🌱',
    progressPercent: 5
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
  emit('showToast', `Berhasil mencatat tanaman baru: ${item.name}!`);
  newPlant.value.name = '';
  newPlant.value.variety = '';
};

// Aksi Log Telur Harian
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

// Aksi Catat Panen
const openHarvestModal = (plant: PlantItem) => {
  selectedPlant.value = plant;
  harvestForm.value.plantId = plant.id;
  harvestForm.value.qty = '';
  showHarvestModal.value = true;
};

const saveHarvest = () => {
  if (!harvestForm.value.qty) {
    emit('showToast', 'Jumlah hasil panen wajib diisi', 'warning');
    return;
  }
  const plantName = selectedPlant.value?.name || 'Tanaman';
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
    note: allocationNotes[harvestForm.value.allocation]
  };

  StorageService.addActivityLog(log);
  activityLogs.value.unshift(log);

  const harvestPayload = {
    plantId: harvestForm.value.plantId,
    plantName: plantName,
    qty: harvestForm.value.qty,
    allocation: harvestForm.value.allocation,
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
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    emit('addSedekah', {
      id: 's' + Date.now(),
      title: `${selectedPlant.value.icon || '🌿'} ${harvestForm.value.qty} ${selectedPlant.value.name}`,
      date: dateStr,
      note: `Disedekahkan dari hasil panen pekarangan ${selectedPlant.value.location}.`
    });
  }

  showHarvestModal.value = false;
  emit('showToast', `Panen ${plantName} (${harvestForm.value.qty}) berhasil dicatat!`);
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
  const kasItem = {
    id: 'k' + Date.now(),
    item: `${quickConsume.value.qty} ${quickConsume.value.unit} ${quickConsume.value.commodity}`,
    meal: quickConsume.value.meal,
    note: `Hemat belanja dapur keluarga`,
    date: 'Hari ini',
    savedValue: saved
  };
  StorageService.addKasLog(kasItem);

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
    item: kasItem.item,
    meal: quickConsume.value.meal,
    note: kasItem.note,
    savedValue: saved,
    qty: quickConsume.value.qty,
    pricePerUnit: quickConsume.value.price
  };

  // Sync to Sheet or offline queue
  if (!navigator.onLine) {
    StorageService.addToSyncQueue(consumePayload, 'consume', `🍽️ Konsumsi: ${kasItem.item}`);
  } else {
    ApiService.logConsume(settings.gasUrl, consumePayload).catch(() => {
      StorageService.addToSyncQueue(consumePayload, 'consume', `🍽️ Konsumsi: ${kasItem.item}`);
    });
  }

  showQuickConsumeModal.value = false;
  emit('showToast', `🍽️ Konsumsi dicatat! Anda menghemat Rp ${saved.toLocaleString()} pengeluaran belanja.`);
};
</script>

<template>
  <div class="record-hub-page">
    <!-- Header -->
    <div class="section-header">
      <h2>📝 Pusat Pencatatan</h2>
      <p>Jurnal tanam harian, log hasil kandang ternak, dan pendataan profil pekarangan</p>
    </div>

    <!-- PRIMARY ACTION BANNER: FORM PENDATAAN LAHAN (FASE 1) -->
    <div class="card" style="background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; margin-bottom: 14px;">
      <div style="display: flex; gap: 12px; align-items: center;">
        <div style="width: 44px; height: 44px; border-radius: var(--radius-sm); background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;">
          📋
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 800; font-size: 0.95rem;">
            Form Pendataan Profil Lahan
          </div>
          <p style="font-size: 0.74rem; opacity: 0.9; margin-top: 2px; line-height: 1.35;">
            Survei 4 langkah resmi: data warga, karakteristik lahan, GPS, foto, dan 4 pilar aset ke Google Sheets.
          </p>
        </div>
      </div>
      <button 
        type="button" 
        class="btn btn-full"
        style="background: #ffffff; color: var(--primary-dark); font-weight: 700; margin-top: 12px; font-size: 0.85rem;"
        @click="$emit('openSurvey')"
      >
        <span>Buka Form Pendataan (Fase 1)</span>
        <span>➔</span>
      </button>
    </div>

    <!-- QUICK ACTION CHIPS (CATAT HARIAN) -->
    <div class="card" style="padding: 12px; margin-bottom: 14px;">
      <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
        ⚡ Aksi Cepat Harian
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
        <button 
          type="button" 
          class="btn btn-outline btn-sm" 
          style="flex-direction: column; align-items: center; justify-content: center; padding: 8px 4px; text-align: center; gap: 2px;"
          @click="showPlantModal = true"
        >
          <span style="font-size: 1.25rem;">🌱</span>
          <div style="font-weight: 700; font-size: 0.72rem;">Tanam Baru</div>
          <div style="font-size: 0.6rem; color: var(--text-dim);">Input bibit</div>
        </button>

        <button 
          type="button" 
          class="btn btn-outline btn-sm" 
          style="flex-direction: column; align-items: center; justify-content: center; padding: 8px 4px; text-align: center; gap: 2px;"
          @click="showEggModal = true"
        >
          <span style="font-size: 1.25rem;">🥚</span>
          <div style="font-weight: 700; font-size: 0.72rem;">Log Telur</div>
          <div style="font-size: 0.6rem; color: var(--text-dim);">Panen telur</div>
        </button>

        <button 
          type="button" 
          class="btn btn-outline btn-sm" 
          style="flex-direction: column; align-items: center; justify-content: center; padding: 8px 4px; text-align: center; gap: 2px; border-color: var(--primary); background: #f0fdf4;"
          @click="showQuickConsumeModal = true"
        >
          <span style="font-size: 1.25rem;">🍽️</span>
          <div style="font-weight: 700; font-size: 0.72rem; color: var(--primary);">Konsumsi</div>
          <div style="font-size: 0.6rem; color: var(--primary-dark);">Petik sendiri</div>
        </button>
      </div>
    </div>

    <!-- SUB-TAB SWITCHER -->
    <div class="main-tab-nav" style="margin-bottom: 14px;">
      <button 
        type="button" 
        :class="['main-tab-btn', { active: activeTab === 'tanaman' }]"
        @click="activeTab = 'tanaman'"
      >
        🌱 Tanaman Aktif ({{ activePlants.length }})
      </button>
      <button 
        type="button" 
        :class="['main-tab-btn', { active: activeTab === 'ternak' }]"
        @click="activeTab = 'ternak'"
      >
        🐔 Ternak Aktif ({{ activeLivestocks.length }})
      </button>
      <button 
        type="button" 
        :class="['main-tab-btn', { active: activeTab === 'riwayat' }]"
        @click="activeTab = 'riwayat'"
      >
        📜 Jurnal Log
      </button>
    </div>

    <!-- ================= 1. TAB TANAMAN AKTIF ================= -->
    <div v-if="activeTab === 'tanaman'">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-main);">
          Tanaman Sedang Berjalan di Pekarangan
        </span>
        <button 
          type="button" 
          class="btn btn-primary btn-sm" 
          style="padding: 4px 10px; font-size: 0.74rem;"
          @click="showPlantModal = true"
        >
          + Tanam Baru
        </button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div 
          v-for="plant in activePlants" 
          :key="plant.id" 
          class="card" 
          style="margin-bottom: 0; padding: 14px;"
        >
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="display: flex; gap: 10px; align-items: center;">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-sm); background: #f0fdf4; border: 1px solid var(--primary-border); display: flex; align-items: center; justify-content: center; font-size: 22px;">
                {{ plant.icon }}
              </div>
              <div>
                <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-main);">
                  {{ plant.name }}
                </div>
                <div style="font-size: 0.72rem; color: var(--text-dim);">
                  {{ plant.location }} • {{ plant.qty }}
                </div>
              </div>
            </div>
            <span class="geo-badge">
              {{ plant.hst }} HST
            </span>
          </div>

          <!-- Progress Bar Pertumbuhan -->
          <div style="margin: 8px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; margin-bottom: 4px;">
              <span style="font-weight: 700; color: var(--primary);">{{ plant.phase }}</span>
              <span style="color: var(--text-muted);">Target Panen: {{ plant.targetHst }} HST</span>
            </div>
            <div class="readiness-track">
              <div class="readiness-fill" :style="{ width: plant.progressPercent + '%' }"></div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 6px; margin-top: 10px;">
            <button 
              type="button" 
              class="btn btn-outline btn-sm btn-full"
              style="font-size: 0.72rem; padding: 6px;"
              @click="openPhaseModal(plant)"
            >
              🔄 Update Fase
            </button>
            <button 
              type="button" 
              class="btn btn-primary btn-sm btn-full"
              style="font-size: 0.72rem; padding: 6px;"
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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-main);">
          Populasi Kandang Keluarga Produktif
        </span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div 
          v-for="live in activeLivestocks" 
          :key="live.id"
          class="card"
          style="margin-bottom: 0; padding: 14px;"
        >
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="display: flex; gap: 10px; align-items: center;">
              <div style="width: 40px; height: 40px; border-radius: var(--radius-sm); background: #fff7ed; border: 1px solid #fed7aa; display: flex; align-items: center; justify-content: center; font-size: 22px;">
                {{ live.icon }}
              </div>
              <div>
                <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-main);">
                  {{ live.type }}
                </div>
                <div style="font-size: 0.72rem; color: var(--text-dim);">
                  {{ live.qty }} • {{ live.housing }}
                </div>
              </div>
            </div>
          </div>

          <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 0.72rem; color: var(--text-dim); display: block;">Hasil Telur Hari Ini</span>
              <span style="font-weight: 800; font-size: 1.15rem; color: var(--primary);">
                {{ live.todayYield }} Butir
              </span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.72rem; color: var(--text-dim); display: block;">Total 7 Hari</span>
              <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">
                {{ live.weekYield }} Butir
              </span>
            </div>
          </div>

          <p style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.35; margin-bottom: 10px;">
            🥣 {{ live.note }}
          </p>

          <button 
            type="button" 
            class="btn btn-primary btn-sm btn-full"
            @click="quickAddEgg(live)"
          >
            🥚 +1 Tambah Telur Hari Ini
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

        <div class="form-group">
          <label class="form-label">Estimasi Hari Siap Panen (Target HST)</label>
          <input 
            v-model.number="newPlant.targetHst" 
            type="number" 
            class="form-control" 
            placeholder="Contoh: 25 untuk kangkung, 75 untuk cabai"
          />
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
            @click="() => {
              const live = activeLivestocks.find(l => l.id === eggLogForm.livestockId);
              if (live) {
                live.todayYield += eggLogForm.count;
                live.weekYield += eggLogForm.count;
                emit('showToast', `Berhasil mencatat +${eggLogForm.count} telur untuk ${live.name}`);
              }
              showEggModal = false;
            }"
          >
            Simpan Log
          </button>
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
          <label class="form-label">Jumlah / Berat Panen</label>
          <input 
            v-model="harvestForm.qty" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: 500 gram, 2 ikat besar, 10 buah"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Alokasi Hasil Panen</label>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
            <label v-for="opt in [
              { val: 'konsumsi', icon: '🍽️', label: 'Konsumsi Mandiri', sub: 'Hemat pengeluaran belanja keluarga', soon: false },
              { val: 'sedekah',  icon: '❤️', label: 'Sedekah ke Tetangga', sub: 'Tercatat di Buku Kas sebagai rekor kebaikan', soon: true },
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
