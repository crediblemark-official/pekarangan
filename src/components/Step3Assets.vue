<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { AssetItem, PilarKategori } from '../types';
import { pillarDetails, presets, type PresetItem } from '../data/pillars';
import { StorageService } from '../services/storage';
import SearchableSelect, { type SelectOption } from './SearchableSelect.vue';

const props = defineProps<{
  assets: AssetItem[];
}>();

const emit = defineEmits<{
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
}>();

const activeCategory = ref<PilarKategori>('1. Rumah Pangan Mandiri');
const showCustomModal = ref(false);

const masterOpts = StorageService.getMasterOptions();
const mediaOptions = ref<SelectOption[]>(
  masterOpts.media_tanam.map(m => ({ value: m, label: m }))
);

const onAddMediaOption = (newOpt: SelectOption) => {
  StorageService.addCustomOption('media_tanam', newOpt.value);
  mediaOptions.value.push({ value: newOpt.value, label: newOpt.value });
};

const customAsset = reactive<AssetItem>({
  pilar_kategori: '1. Rumah Pangan Mandiri',
  nama_komoditas: '',
  jumlah_estimasi: 1,
  media_tanam: 'Polybag/Pot',
  catatan_produksi: ''
});

const addPreset = (item: PresetItem) => {
  const existing = props.assets.find(a => a.nama_komoditas === item.nama);
  if (existing) {
    existing.jumlah_estimasi += 1;
    emit('showToast', `Jumlah ${item.nama} ditambahkan (+1)`);
    return;
  }

  props.assets.push({
    pilar_kategori: activeCategory.value,
    nama_komoditas: item.nama,
    jumlah_estimasi: item.defaultQty,
    media_tanam: item.defaultMedia,
    catatan_produksi: item.defaultNote || ''
  });
  emit('showToast', `${item.nama} ditambahkan ke ${activeCategory.value}!`);
};

const openCustomModal = () => {
  customAsset.pilar_kategori = activeCategory.value;
  customAsset.nama_komoditas = '';
  customAsset.jumlah_estimasi = 1;
  customAsset.catatan_produksi = '';
  showCustomModal.value = true;
};

const saveCustomAsset = () => {
  if (!customAsset.nama_komoditas.trim()) {
    emit('showToast', 'Nama komoditas / produk olahan tidak boleh kosong', 'warning');
    return;
  }
  props.assets.push({
    pilar_kategori: customAsset.pilar_kategori,
    nama_komoditas: customAsset.nama_komoditas.trim(),
    jumlah_estimasi: Number(customAsset.jumlah_estimasi) || 1,
    media_tanam: customAsset.media_tanam,
    catatan_produksi: customAsset.catatan_produksi || ''
  });
  showCustomModal.value = false;
  emit('showToast', 'Aset pilar berhasil ditambahkan!');
};

const removeAsset = (index: number) => {
  props.assets.splice(index, 1);
};
</script>

<template>
  <section class="step-view active">
    <div class="section-header">
      <h2>🌱 4 Pilar Aset Produksi</h2>
      <p>Integrasi ketahanan pangan, ternak protein, apotik toga, dan hilirisasi olahan</p>
    </div>

    <!-- Category Tabs -->
    <div class="card">
      <div class="asset-category-tabs">
        <button 
          type="button"
          class="tab-btn" 
          :class="{ active: activeCategory === '1. Rumah Pangan Mandiri' }"
          @click="activeCategory = '1. Rumah Pangan Mandiri'"
        >
          🥦 1. Pangan Mandiri
        </button>
        <button 
          type="button"
          class="tab-btn" 
          :class="{ active: activeCategory === '2. Kandang Keluarga Produktif' }"
          @click="activeCategory = '2. Kandang Keluarga Produktif'"
        >
          🐔 2. Kandang Ternak
        </button>
        <button 
          type="button"
          class="tab-btn" 
          :class="{ active: activeCategory === '3. Apotik Hidup' }"
          @click="activeCategory = '3. Apotik Hidup'"
        >
          🌿 3. Apotik Hidup
        </button>
        <button 
          type="button"
          class="tab-btn" 
          :class="{ active: activeCategory === '4. Rumah Produksi' }"
          @click="activeCategory = '4. Rumah Produksi'"
        >
          🍯 4. Pabrik Mini
        </button>
      </div>

      <!-- Pillar Context Info Box -->
      <div style="background: rgba(46, 196, 182, 0.08); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="font-size: 1.4rem;">{{ pillarDetails[activeCategory].icon }}</span>
          <div>
            <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">
              {{ pillarDetails[activeCategory].title }}
            </div>
            <div style="font-size: 0.72rem; color: var(--accent); font-weight: 600;">
              {{ pillarDetails[activeCategory].subtitle }}
            </div>
          </div>
        </div>
        <p style="font-size: 0.76rem; color: var(--text-muted); line-height: 1.4; margin-top: 4px;">
          {{ pillarDetails[activeCategory].desc }}
        </p>
      </div>

      <!-- Quick Preset Chips -->
      <label class="form-label">Tap untuk menambahkan cepat komoditas:</label>
      <div class="preset-chip-list">
        <button 
          type="button"
          v-for="item in presets[activeCategory]" 
          :key="item.nama"
          class="preset-chip"
          @click="addPreset(item)"
        >
          + {{ item.nama }}
        </button>
      </div>

      <button 
        type="button" 
        class="btn btn-outline btn-full btn-sm"
        @click="openCustomModal"
      >
        ✏️ Tambah Komoditas / Produk Olahan Lainnya...
      </button>
    </div>

    <!-- Added Assets List -->
    <div class="card">
      <div class="card-title">
        <span>Daftar Aset Tercatat ({{ assets.length }})</span>
      </div>

      <div v-if="assets.length === 0" style="text-align: center; color: var(--text-dim); padding: 16px;">
        Belum ada komoditas atau aset yang ditambahkan.
      </div>

      <div class="added-assets-container">
        <div 
          v-for="(asset, idx) in assets" 
          :key="idx" 
          class="asset-item-card"
        >
          <div class="asset-item-header">
            <div class="asset-item-title">
              <span>{{ asset.nama_komoditas }}</span>
              <span class="asset-item-badge">{{ asset.pilar_kategori }}</span>
            </div>
            <button type="button" class="btn-remove-asset" @click="removeAsset(idx)">
              Hapus ✕
            </button>
          </div>

          <div class="asset-item-controls">
            <div>
              <label class="form-label" style="font-size: 0.72rem;">Jumlah Estimasi</label>
              <input 
                v-model.number="asset.jumlah_estimasi" 
                type="number" 
                min="1" 
                class="form-control" 
                style="padding: 6px 10px;"
              />
            </div>
            <div>
              <label class="form-label" style="font-size: 0.72rem;">Media / Fasilitas</label>
              <select 
                v-model="asset.media_tanam" 
                class="form-control" 
                style="padding: 6px 10px;"
              >
                <option value="Langsung di Tanah">Langsung di Tanah</option>
                <option value="Polybag/Pot">Polybag / Pot</option>
                <option value="Vertikultur">Vertikultur</option>
                <option value="Kandang">Kandang Ternak</option>
                <option value="Dapur Pengolahan">Dapur Pengolahan</option>
              </select>
            </div>
          </div>

          <div>
            <input 
              v-model="asset.catatan_produksi" 
              type="text" 
              class="form-control" 
              placeholder="Catatan / hasil produksi harian (misal: 10 butir telur/hari, 20 botol/bulan)"
              style="font-size: 0.76rem; padding: 5px 8px; margin-top: 2px;"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Custom Asset (4 Pilar) -->
    <div v-if="showCustomModal" class="modal-backdrop" @click.self="showCustomModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3>Tambah Aset Komoditas / Olahan</h3>
          <button class="btn-icon" @click="showCustomModal = false">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label">Kategori Pilar Resmi</label>
          <select v-model="customAsset.pilar_kategori" class="form-control">
            <option value="1. Rumah Pangan Mandiri">1. Rumah Pangan Mandiri (RPM)</option>
            <option value="2. Kandang Keluarga Produktif">2. Kandang Keluarga Produktif</option>
            <option value="3. Apotik Hidup">3. Apotik Hidup (TOGA)</option>
            <option value="4. Rumah Produksi">4. Rumah Produksi (Pabrik Mini)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Nama Komoditas / Produk</label>
          <input 
            v-model="customAsset.nama_komoditas" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: Sambal Bawang Botol, Ayam Petelur"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Jumlah Estimasi (Ekor / Pot / Kapasitas)</label>
          <input 
            v-model.number="customAsset.jumlah_estimasi" 
            type="number" 
            min="1" 
            class="form-control" 
          />
        </div>

        <div class="form-group">
          <label class="form-label">Media Tanam / Fasilitas</label>
          <SearchableSelect
            v-model="customAsset.media_tanam"
            :options="mediaOptions"
            placeholder="-- Pilih atau tambah media --"
            add-label="Tambah Media"
            @add-option="onAddMediaOption"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Catatan Hasil / Kapasitas Produksi</label>
          <input 
            v-model="customAsset.catatan_produksi" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: 15 butir telur/hari, 30 botol/bulan"
          />
        </div>

        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button type="button" class="btn btn-outline btn-full" @click="showCustomModal = false">
            Batal
          </button>
          <button type="button" class="btn btn-primary btn-full" @click="saveCustomAsset">
            Simpan
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
