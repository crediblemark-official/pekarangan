<script setup lang="ts">
import { computed } from 'vue';
import { StorageService } from '../services/storage';

defineEmits<{
  (e: 'navigate', tab: 'community' | 'record' | 'profile'): void;
}>();

const settings = computed(() => StorageService.getSettings());

const membersCount = computed(() => StorageService.getRecordedMembersCount());
const plantsCount = computed(() => StorageService.getPlants().length);
const livestockCount = computed(() => StorageService.getLivestocks().length);
const totalSavingsVal = computed(() => StorageService.getTotalSavings());

const formattedSavings = computed(() => {
  const val = totalSavingsVal.value;
  if (val >= 1000000) {
    return `Rp ${(val / 1000000).toFixed(1)} Jt`;
  }
  return `Rp ${(val / 1000).toLocaleString('id-ID')} Rb`;
});
</script>

<template>
  <div class="home-dashboard">
    <!-- Hero Banner (Identitas Pekarangan Warga) -->
    <div class="home-hero-card">
      <div class="home-hero-top">
        <span class="home-hero-badge">Pekarangan Mandiri Pangan</span>
        <span style="font-size: 0.72rem; opacity: 0.9; display: flex; align-items: center; gap: 4px;">
          <span>🌱</span> Warga NU
        </span>
      </div>
      <h2 class="home-hero-title">Halo, {{ settings.ownerName || 'Warga Pekarangan' }} 👋</h2>
      <div style="font-size: 0.84rem; font-weight: 700; color: #bbf7d0; display: flex; align-items: center; gap: 6px;">
        <span>🏡 {{ settings.yardName || 'Pekarangan Mandiri' }}</span>
        <span v-if="settings.defaultRtRw">•</span>
        <span v-if="settings.defaultRtRw">RT {{ settings.defaultRtRw }}</span>
        <span v-if="settings.ranting">• {{ settings.ranting }}</span>
      </div>
    </div>

    <!-- Quick Stats Grid (Data Riil dari Database Turso SQLite) -->
    <div class="section-header-bar">
      <span class="section-header-title">
        <span>📊</span> Ringkasan Pekarangan Mandiri
      </span>
    </div>

    <div class="stat-grid-2x2">
      <!-- 1. Pekarangan Terdata -->
      <div class="stat-box" @click="$emit('navigate', 'community')">
        <span class="stat-box-icon">🏡</span>
        <div class="stat-box-body">
          <div class="stat-box-val">{{ membersCount }} KK</div>
          <div class="stat-box-lbl">Pekarangan Terdata</div>
        </div>
      </div>

      <!-- 2. Tanaman Aktif -->
      <div class="stat-box" @click="$emit('navigate', 'record')">
        <span class="stat-box-icon">🌱</span>
        <div class="stat-box-body">
          <div class="stat-box-val">{{ plantsCount }} Pohon</div>
          <div class="stat-box-lbl">Tanaman Aktif (RPM)</div>
        </div>
      </div>

      <!-- 3. Kelompok Ternak Produktif -->
      <div class="stat-box" @click="$emit('navigate', 'record')">
        <span class="stat-box-icon">🐔</span>
        <div class="stat-box-body">
          <div class="stat-box-val">{{ livestockCount }} Kandang</div>
          <div class="stat-box-lbl">Ternak Protein Keluarga</div>
        </div>
      </div>

      <!-- 4. Penghematan Belanja Dapur Riil -->
      <div class="stat-box" @click="$emit('navigate', 'record')">
        <span class="stat-box-icon">💰</span>
        <div class="stat-box-body">
          <div class="stat-box-val">{{ formattedSavings }}</div>
          <div class="stat-box-lbl">Hemat Belanja Dapur</div>
        </div>
      </div>
    </div>

    <!-- Section Divider Strip -->
    <div class="section-divider"></div>

    <!-- Aksi Utama: Buka Pusat Pencatatan & Jurnal -->
    <div 
      style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: #f0fdf4; border-bottom: 1px solid var(--primary-border); cursor: pointer;"
      @click="$emit('navigate', 'record')"
    >
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.4rem;">📝</span>
        <div>
          <div style="font-weight: 800; font-size: 0.88rem; color: var(--primary-dark);">
            Pusat Pencatatan & Jurnal Pekarangan
          </div>
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 1px;">
            Catat tanam, kumpul telur harian, panen & konsumsi dapur
          </div>
        </div>
      </div>
      <span style="color: var(--primary); font-weight: 800; font-size: 0.95rem;">➔</span>
    </div>

    <!-- Section Divider Strip -->
    <div class="section-divider"></div>

    <!-- 4 Pilar Resmi Ekonomi Pekarangan Warga NU -->
    <div style="background: #ffffff;">
      <div class="section-header-bar">
        <span class="section-header-title">
          <span>🏛️</span> 4 Pilar Resmi Ekonomi Pekarangan
        </span>
      </div>

      <div class="pillar-mini-grid">
        <!-- Pilar 1 -->
        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <span>🥬</span>
            <span>1. RPM</span>
          </div>
          <p class="pillar-mini-desc">
            <strong>Rumah Pangan Mandiri:</strong> Sayuran daun, cabai, tomat, terong & umbi segar pemotong belanja dapur.
          </p>
        </div>

        <!-- Pilar 2 -->
        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <span>🐔</span>
            <span>2. Kandang</span>
          </div>
          <p class="pillar-mini-desc">
            <strong>Kandang Keluarga Produktif:</strong> Sumber protein telur, daging & tabungan aset hidup (living bank).
          </p>
        </div>

        <!-- Pilar 3 -->
        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <span>🌿</span>
            <span>3. Apotek Hidup</span>
          </div>
          <p class="pillar-mini-desc">
            <strong>Farmasi Mini TOGA:</strong> Jahe, kunyit, temulawak, serai & sirih untuk imunitas dan kedaulatan obat herbal.
          </p>
        </div>

        <!-- Pilar 4 -->
        <div class="pillar-mini-card" style="background: #faf5ff; border-color: #e9d5ff;">
          <div class="pillar-mini-title" style="color: #6b21a8;">
            <span>🍯</span>
            <span>4. RPP ➔ Mamasar</span>
          </div>
          <p class="pillar-mini-desc">
            <strong>Rumah Produksi:</strong> Olah surplus tahan simpan (sambal, keripik, jamu instan) langsung dipasarkan ke Mamasar.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
