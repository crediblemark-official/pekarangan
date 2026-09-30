<script setup lang="ts">
import { ref, computed } from 'vue';
import type { SedekahLog, KasLogItem } from '../types';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import SearchableSelect, { type SelectOption } from './SearchableSelect.vue';

const props = withDefaults(defineProps<{
  sedekahLogs?: SedekahLog[];
}>(), {
  sedekahLogs: () => []
});

const emit = defineEmits<{
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
}>();

const settings = StorageService.getSettings();

// --- LOG PENGHEMATAN (DATABASE DINAMIS) ---
const consumedLogs = ref<KasLogItem[]>(StorageService.getPengematanLogs());
const realSavings = computed(() => {
  return consumedLogs.value.reduce((acc, curr) => acc + (Number(curr.savedValue) || 0), 0);
});

// Total Nilai Produksi Panen (dihitung dinamis dari riwayat panen riil)
const harvestRecords = ref(StorageService.getHarvestRecords());
const totalHarvestValue = computed(() => {
  return harvestRecords.value.reduce((acc, curr) => acc + (Number(curr.estimatedValue) || 0), 0);
});

const showConsumeModal = ref(false);
const masterOpts = StorageService.getMasterOptions();

const commodityOptions = ref<SelectOption[]>(
  masterOpts.komoditas_konsumsi.map(c => ({
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
  masterOpts.jenis_makan.map(m => ({ value: m, label: m }))
);

const onAddMealOption = (newOpt: SelectOption) => {
  StorageService.addCustomOption('jenis_makan', newOpt.value);
  mealOptions.value.push({ value: newOpt.value, label: newOpt.value });
  ApiService.addCustomOption(settings.gasUrl, 'jenis_makan', newOpt.value).catch(() => {});
};

const consumeForm = ref({
  commodity: commodityOptions.value[0]?.value || '🥚 Telur Ayam Pekarangan',
  qty: 2,
  unit: 'butir',
  pricePerUnit: 3000,
  mealType: mealOptions.value[0]?.value || '🍳 Sarapan Pagi',
  note: 'Telur dadar untuk sarapan anak'
});

const onCommoditySelected = (val: string) => {
  const match = masterOpts.komoditas_konsumsi.find(c => c.value === val);
  if (match) {
    consumeForm.value.unit = match.unit;
    consumeForm.value.pricePerUnit = match.price;
  }
};

const submitConsume = () => {
  if (consumeForm.value.qty <= 0) {
    emit('showToast', 'Jumlah konsumsi harus lebih dari 0', 'warning');
    return;
  }
  const savedAmount = consumeForm.value.qty * consumeForm.value.pricePerUnit;

  const newLog: KasLogItem = {
    id: 'c' + Date.now(),
    item: `${consumeForm.value.qty} ${consumeForm.value.unit} ${consumeForm.value.commodity}`,
    meal: consumeForm.value.mealType,
    note: consumeForm.value.note || 'Dimasak untuk konsumsi keluarga',
    date: 'Hari ini',
    savedValue: savedAmount
  };

  StorageService.addPengematanLog(newLog);
  consumedLogs.value.unshift(newLog);

  const consumePayload = {
    item: newLog.item,
    meal: newLog.meal,
    note: newLog.note,
    savedValue: savedAmount,
    qty: consumeForm.value.qty,
    pricePerUnit: consumeForm.value.pricePerUnit
  };

  if (!navigator.onLine) {
    StorageService.addToSyncQueue(consumePayload, 'consume', `🍽️ Konsumsi: ${newLog.item}`);
  } else {
    ApiService.logConsume(settings.gasUrl, consumePayload).catch(() => {
      StorageService.addToSyncQueue(consumePayload, 'consume', `🍽️ Konsumsi: ${newLog.item}`);
    });
  }

  showConsumeModal.value = false;
  emit('showToast', `🍽️ Konsumsi dicatat! Anda hemat Rp ${savedAmount.toLocaleString()} pengeluaran belanja.`);
};

const deleteConsumeLog = (id: string) => {
  if (confirm('Hapus catatan konsumsi ini?')) {
    consumedLogs.value = consumedLogs.value.filter(l => l.id !== id);
    StorageService.savePengematanLogs(consumedLogs.value);
    emit('showToast', 'Catatan konsumsi berhasil dihapus', 'success');
  }
};
</script>

<template>
  <div class="savings-kas-page">
    <!-- Dual Summary Metric Card (Top Overview) - Full Edge Flat -->
    <div class="card"
      style="background: linear-gradient(135deg, #064e3b, #15803d); color: #ffffff; padding: 12px 14px; margin-bottom: 0; border-radius: 0; box-shadow: none; border-bottom: 1px solid #166534;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
        <div style="border-right: 1px solid rgba(255, 255, 255, 0.2); padding-right: 8px;">
          <span style="font-size: 0.65rem; opacity: 0.85; text-transform: uppercase; font-weight: 700;">
            💰 Hemat Belanja
          </span>
          <div style="font-size: 1.25rem; font-weight: 900; margin-top: 1px;">
            Rp {{ realSavings.toLocaleString() }}
          </div>
        </div>

        <div style="padding-left: 6px;">
          <span style="font-size: 0.65rem; opacity: 0.85; text-transform: uppercase; font-weight: 700;">
            🌾 Nilai Panen
          </span>
          <div style="font-size: 1.25rem; font-weight: 900; margin-top: 1px;">
            Rp {{ totalHarvestValue.toLocaleString() }}
          </div>
        </div>
      </div>

      <!-- Quick Highlights Badges (Single Word) -->
      <div style="display: flex; gap: 6px; flex-wrap: wrap; border-top: 1px solid rgba(255, 255, 255, 0.15); padding-top: 6px;">
        <div style="background: rgba(255,255,255,0.18); border-radius: 3px; padding: 1px 7px; font-size: 0.68rem; font-weight: 700;">
          🥗 Konsumsi
        </div>
        <div style="background: rgba(255,255,255,0.18); border-radius: 3px; padding: 1px 7px; font-size: 0.68rem; font-weight: 700;">
          ❤️ Sedekah
        </div>
      </div>
    </div>

    <!-- ================= LAPORAN PENGHEMATAN KONSUMSI MANDIRI ================= -->
    <!-- 1. Hero Card: Penghematan Riil Konsumsi Mandiri - Full Edge Flat -->
    <div class="card"
      style="background: #f0fdf4; border: none; border-bottom: 1px solid var(--primary-border); border-radius: 0; padding: 10px 14px; margin-bottom: 0;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
        <div>
          <div style="font-size: 0.68rem; color: var(--primary-dark); font-weight: 700; text-transform: uppercase;">
            PENGHEMATAN KONSUMSI
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--primary-dark); margin: 1px 0;">
            Rp {{ realSavings.toLocaleString() }}
          </div>
        </div>
        <span
          style="font-size: 0.62rem; background: var(--primary); color: #fff; padding: 1px 6px; border-radius: 3px; font-weight: 700;">
          Hemat
        </span>
      </div>

      <!-- Tombol Catat Konsumsi Mandiri -->
      <button type="button" class="btn btn-primary btn-full"
        style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; font-weight: 700; font-size: 0.82rem;"
        @click="showConsumeModal = true">
        <span>🍽️ + Catat Konsumsi Mandiri</span>
      </button>
    </div>

    <!-- 2. Rincian Konsumsi Mandiri (Log Penghematan Riil) - Full Edge Flat -->
    <div class="card">
      <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
        <span>🥗 Riwayat Konsumsi</span>
        <span style="font-size: 0.68rem; color: var(--primary); font-weight: 700;">{{ consumedLogs.length }} Catatan</span>
      </div>

      <div v-if="consumedLogs.length === 0" style="text-align: center; padding: 14px; color: var(--text-dim); font-size: 0.74rem;">
        Belum ada catatan konsumsi mandiri.
      </div>

      <div v-else style="display: flex; flex-direction: column;">
        <div v-for="log in consumedLogs" :key="log.id"
          style="padding: 8px 0; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1; padding-right: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span style="font-weight: 700; font-size: 0.8rem; color: var(--text-main);">{{ log.item }}</span>
              <span
                style="font-size: 0.62rem; background: #e0f2fe; color: #0369a1; padding: 1px 5px; border-radius: 3px; font-weight: 600;">
                {{ log.meal }}
              </span>
            </div>
            <div style="font-size: 0.68rem; color: var(--text-dim); margin-top: 1px;">{{ log.date }}</div>
          </div>
          <div style="text-align: right; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
            <span style="font-size: 0.84rem; font-weight: 800; color: var(--primary);">
              +Rp {{ log.savedValue.toLocaleString() }}
            </span>
            <button type="button" @click="deleteConsumeLog(log.id)" style="background: none; border: none; color: #94a3b8; font-size: 0.65rem; cursor: pointer;" title="Hapus">
              🗑️ Hapus
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Total Nilai Produksi Panen - Full Edge Flat -->
    <div class="card" style="background: #f8fafc; border: none; border-bottom: 1px solid var(--border-subtle); padding: 10px 14px; margin-bottom: 0;">
      <div class="card-title" style="margin-bottom: 2px;">
        <span>🌾 Nilai Produksi Panen</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
        <span style="font-size: 1.25rem; font-weight: 800; color: #334155;">
          Rp {{ totalHarvestValue.toLocaleString() }}
        </span>
        <span
          style="font-size: 0.62rem; color: var(--text-dim); background: #e2e8f0; padding: 1px 6px; border-radius: 3px; font-weight: 700;">
          Panen
        </span>
      </div>

      <div style="display: flex; flex-direction: column;">
        <div v-if="harvestRecords.length === 0" style="text-align: center; padding: 10px; color: var(--text-dim); font-size: 0.74rem;">
          Belum ada catatan panen di pekarangan.
        </div>
        <div v-for="rec in harvestRecords" :key="rec.id"
          style="display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; padding: 6px 0; border-bottom: 1px dotted var(--border-subtle);">
          <div>
            <span style="font-weight: 600; color: var(--text-main);">{{ rec.plantName }}</span>
            <span style="font-size: 0.66rem; color: var(--text-dim); margin-left: 6px;">({{ rec.qty }} • {{ rec.date }})</span>
          </div>
          <span style="font-weight: 700; color: #475569;">
            Rp {{ (rec.estimatedValue || 0).toLocaleString() }}
          </span>
        </div>
      </div>
    </div>

    <!-- 4. Catatan Sedekah Tetangga - Full Edge Flat -->
    <div class="card">
      <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
        <span>❤️ Sedekah Pangan</span>
        <span style="font-size: 0.68rem; color: #db2777; font-weight: 700;">{{ props.sedekahLogs?.length || 0 }} Catatan</span>
      </div>

      <div v-if="!props.sedekahLogs || props.sedekahLogs.length === 0" style="text-align: center; padding: 10px; color: var(--text-dim); font-size: 0.74rem;">
        Belum ada catatan sedekah pangan.
      </div>

      <div v-else style="display: flex; flex-direction: column;">
        <div v-for="(sed, idx) in props.sedekahLogs" :key="sed.id || idx"
          style="padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; color: #9d174d;">
            <span>{{ sed.title }}</span>
            <span style="color: #be185d; font-size: 0.68rem; font-weight: normal;">{{ sed.date }}</span>
          </div>
          <div style="font-size: 0.7rem; color: #4b5563; margin-top: 1px;">
            {{ sed.note }}
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Catat Konsumsi Mandiri Hari Ini -->
    <div v-if="showConsumeModal" class="modal-backdrop" @click.self="showConsumeModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3>🍽️ Catat Konsumsi Mandiri</h3>
          <button class="btn-icon" @click="showConsumeModal = false">✕</button>
        </div>

        <p style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 12px;">
          Catat bahan hasil pekarangan yang dikonsumsi hari ini. Penghematan uang belanja dihitung otomatis!
        </p>

        <div class="form-group">
          <label class="form-label">Komoditas yang Dikonsumsi</label>
          <SearchableSelect
            v-model="consumeForm.commodity"
            :options="commodityOptions"
            placeholder="-- Cari atau tambah komoditas --"
            add-label="Tambah Komoditas"
            @add-option="onAddCommodityOption"
            @change="onCommoditySelected"
          />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="form-group">
            <label class="form-label">Jumlah ({{ consumeForm.unit }})</label>
            <input v-model.number="consumeForm.qty" type="number" min="1" class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Harga Pasar / Satuan (Rp)</label>
            <input v-model.number="consumeForm.pricePerUnit" type="number" class="form-control" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Waktu & Jenis Konsumsi</label>
          <SearchableSelect
            v-model="consumeForm.mealType"
            :options="mealOptions"
            placeholder="-- Pilih Waktu Konsumsi --"
            add-label="Tambah Waktu Konsumsi"
            @add-option="onAddMealOption"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Catatan Konsumsi (Opsional)</label>
          <input v-model="consumeForm.note" type="text" placeholder="Misal: Dimakan bersama keluarga / diseduh hangat"
            class="form-control" />
        </div>

        <!-- Live Preview Perhitungan Penghematan -->
        <div
          style="background: #f0fdf4; border: 1px solid var(--primary-border); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.78rem; color: var(--primary-dark); font-weight: 600;">
            💵 Uang Belanja yang Dihemat:
          </span>
          <span style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">
            Rp {{ (consumeForm.qty * consumeForm.pricePerUnit).toLocaleString() }}
          </span>
        </div>

        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-outline btn-full" @click="showConsumeModal = false">Batal</button>
          <button type="button" class="btn btn-primary btn-full" @click="submitConsume">Simpan Penghematan</button>
        </div>
      </div>
    </div>
  </div>
</template>


