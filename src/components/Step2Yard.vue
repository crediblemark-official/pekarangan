<script setup lang="ts">
import type { YardData } from '../types';
import type { CompressionResult } from '../services/camera';

defineProps<{
  yard: YardData;
  photo: CompressionResult | null;
  isCameraLoading: boolean;
}>();

defineEmits<{
  (e: 'photoSelected', event: Event): void;
  (e: 'clearPhoto'): void;
}>();

const toggleMultiSelect = (array: string[], item: string) => {
  const idx = array.indexOf(item);
  if (idx === -1) {
    if (item === 'Nihil') {
      array.length = 0;
      array.push('Nihil');
      return;
    }
    const nihilIdx = array.indexOf('Nihil');
    if (nihilIdx !== -1) array.splice(nihilIdx, 1);
    array.push(item);
  } else {
    array.splice(idx, 1);
  }
};
</script>

<template>
  <section class="step-view active">
    <div class="section-header">
      <h2>🏡 Kondisi Fisik Pekarangan</h2>
      <p>Karakteristik tanah, paparan sinar matahari, dan foto lahan</p>
    </div>

    <!-- Status & Luas Lahan -->
    <div class="card">
      <div class="form-group">
        <label class="form-label">Status Kepemilikan Lahan</label>
        <div class="radio-card-grid full">
          <button 
            type="button"
            v-for="status in ['Milik Sendiri', 'Sewa/Kontrak', 'Lahan Tidur/Fasum']" 
            :key="status"
            :class="['radio-card-btn', { selected: yard.status_lahan === status }]"
            @click="yard.status_lahan = (status as any)"
          >
            <span class="radio-card-title">{{ status }}</span>
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Estimasi Luas Lahan Pekarangan</label>
        <select v-model="yard.estimasi_luas" class="form-control">
          <option value="<10 m²">&lt; 10 m² (Kecil / Teras Depan)</option>
          <option value="10-30 m²">10 - 30 m² (Sedang)</option>
          <option value="30-50 m²">30 - 50 m² (Cukup Luas)</option>
          <option value=">50 m²">&gt; 50 m² (Sangat Luas)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Tipe Permukaan Tanah (Pilih Semua yang Ada)</label>
        <div class="chip-grid">
          <button 
            type="button"
            v-for="tipe in ['Tanah Terbuka', 'Paving/Semen', 'Bebatuan']" 
            :key="tipe"
            :class="['chip-btn', { selected: yard.tipe_permukaan.includes(tipe) }]"
            @click="toggleMultiSelect(yard.tipe_permukaan, tipe)"
          >
            {{ tipe }}
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Zonasi Posisi Pekarangan</label>
        <div class="chip-grid">
          <button 
            type="button"
            v-for="pos in ['Depan', 'Samping', 'Belakang']" 
            :key="pos"
            :class="['chip-btn', { selected: yard.zonasi_posisi.includes(pos) }]"
            @click="toggleMultiSelect(yard.zonasi_posisi, pos)"
          >
            {{ pos }}
          </button>
        </div>
      </div>
    </div>

    <!-- Paparan Sinar & Air -->
    <div class="card">
      <div class="form-group">
        <label class="form-label">Paparan Sinar Matahari</label>
        <select v-model="yard.paparan_sinar" class="form-control">
          <option value="Penuh (>6 jam)">Penuh (&gt; 6 jam / hari)</option>
          <option value="Sebagian (3-6 jam)">Sebagian (3 - 6 jam / hari)</option>
          <option value="Teduh (<3 jam)">Teduh (&lt; 3 jam / hari)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Sumber Air Penyiraman</label>
        <select v-model="yard.sumber_air" class="form-control">
          <option value="PDAM">PDAM</option>
          <option value="Sumur">Sumur Gali / Pompa</option>
          <option value="Air Hujan">Tampungan Air Hujan</option>
          <option value="Aliran Sungai/Selokan">Aliran Sungai / Selokan</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Fasilitas Pengolahan Limbah Organik</label>
        <div class="chip-grid">
          <button 
            type="button"
            v-for="fas in ['Komposter Ember', 'Biopori', 'Kandang Maggot', 'Lubang Sampah', 'Nihil']" 
            :key="fas"
            :class="['chip-btn', { selected: yard.fasilitas_limbah.includes(fas) }]"
            @click="toggleMultiSelect(yard.fasilitas_limbah, fas)"
          >
            {{ fas }}
          </button>
        </div>
      </div>
    </div>

    <!-- Foto Kondisi Pekarangan -->
    <div class="card">
      <div class="card-title">
        <span>📸 Dokumentasi Foto Lahan</span>
        <span v-if="photo" class="badge badge-success">Terkonfirmasi</span>
      </div>

      <div :class="['camera-preview-box', { 'has-image': !!photo }]">
        <img v-if="photo" :src="photo.base64" alt="Kondisi Lahan" class="camera-preview-img" />
        <div v-else class="camera-placeholder">
          <span style="font-size: 2.2rem;">📷</span>
          <span>Foto landscape menghadap lahan pekarangan</span>
          <span style="font-size: 0.72rem;">(Otomatis dikompres &lt; 200 KB)</span>
        </div>

        <div v-if="photo" class="camera-badge-info">
          <span>✓ {{ photo.width }}x{{ photo.height }}px</span>
          <span>•</span>
          <span>{{ photo.compressedSizeKB }} KB</span>
        </div>
      </div>

      <div class="camera-actions">
        <label class="btn btn-outline btn-full" style="cursor: pointer; text-align: center;">
          <span v-if="isCameraLoading" class="spinner"></span>
          <span v-else>📷 {{ photo ? 'Ganti Foto' : 'Ambil Foto Lahan' }}</span>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            style="display: none;" 
            @change="$emit('photoSelected', $event)"
          />
        </label>
        
        <button 
          v-if="photo" 
          type="button" 
          class="btn-icon" 
          style="border: 1px solid var(--danger); color: var(--danger); border-radius: var(--radius-sm);" 
          @click="$emit('clearPhoto')"
          title="Hapus Foto"
        >
          🗑️
        </button>
      </div>
    </div>
  </section>
</template>
