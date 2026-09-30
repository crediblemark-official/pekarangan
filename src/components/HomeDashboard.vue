<script setup lang="ts">
import { ref, computed } from 'vue';
import { StorageService } from '../services/storage';

defineEmits<{
  (e: 'navigate', tab: 'community' | 'record' | 'insight' | 'profile'): void;
}>();

const settings = computed(() => StorageService.getSettings());

const membersCount = computed(() => StorageService.getRecordedMembersCount());
const plantsCount = computed(() => StorageService.getPlants().length);
const totalSavingsVal = computed(() => StorageService.getTotalSavings());
const totalHarvestVal = computed(() => StorageService.getTotalHarvestValue());

const formattedSavings = computed(() => {
  const val = totalSavingsVal.value;
  if (val >= 1000000) {
    return `Rp ${(val / 1000000).toFixed(1)} Jt`;
  }
  return `Rp ${(val / 1000).toLocaleString('id-ID')} Rb`;
});

const formattedHarvest = computed(() => {
  const val = totalHarvestVal.value;
  if (val >= 1000000) {
    return `Rp ${(val / 1000000).toFixed(1)} Jt`;
  }
  return `Rp ${(val / 1000).toLocaleString('id-ID')} Rb`;
});

const potensiSayur = computed(() => {
  // Estimasi rata-rata hasil panen sayur & buah (~3.5 kg / tanaman aktif per bulan)
  if (plantsCount.value === 0) return 0;
  return Math.round(plantsCount.value * 3.5);
});

// Fitur Segera Hadir (4-Item Horizontal Grid)
interface ComingSoonFeature {
  id: string;
  label: string;
  sub: string;
  title: string;
  icon: string;
  bg: string;
  border: string;
  badge: string;
  desc: string;
  targetTab?: 'community' | 'insight' | 'record' | 'profile';
}

const comingSoonItems: ComingSoonFeature[] = [
  {
    id: 'barter',
    label: 'Barter',
    sub: 'Tukar Hasil',
    title: 'Bursa Barter Tetangga',
    icon: '🧺',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    badge: 'Barter',
    desc: 'Tukar surplus cabai, telur, bibit, atau pupuk dengan kebutuhan tetangga tanpa uang tunai.'
  },
  {
    id: 'market',
    label: 'Olahan',
    sub: 'Pabrik Mini',
    title: 'Rumah Produksi (Pabrik Mini)',
    icon: '🍯',
    bg: '#f3e8ff',
    border: '#ddd6fe',
    badge: 'Olahan',
    desc: 'Etalase produk pascapanen dapur warga (sambal botol, keripik, jamu herbal, telur asin) untuk pasar lokal.'
  },
  {
    id: 'points',
    label: 'Nutrisi',
    sub: 'Bank Sampah',
    title: 'Tabungan Poin & Bank Sampah',
    icon: '♻️',
    bg: '#fff7ed',
    border: '#fed7aa',
    badge: 'Nutrisi',
    desc: 'Setor sisa dapur sayur/buah dan sampah organik ke komposter komunal untuk ditukar bibit & pupuk kasgot.'
  },
  {
    id: 'seedbank',
    label: 'Benih',
    sub: 'Bank Bibit',
    title: 'Bank Benih & Bibit Mandiri',
    icon: '🌱',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    badge: 'Bibit',
    desc: 'Bank perbanyakan dan pembagian bibit tanaman pangan unggul antar pekarangan warga.'
  }
];

const selectedFeature = ref<ComingSoonFeature | null>(null);
const openFeatureModal = (item: ComingSoonFeature) => {
  selectedFeature.value = item;
};
</script>

<template>
  <div class="home-dashboard">
    <!-- Hero Banner (Personalized to Device-Bound Owner & Yard) - Full Edge -->
    <div class="home-hero-card">
      <div class="home-hero-top">
        <span class="home-hero-badge">Pribadi</span>
        <span style="font-size: 0.72rem; opacity: 0.9; display: flex; align-items: center; gap: 4px;">
          <span>🔒</span> Aman
        </span>
      </div>
      <h2 class="home-hero-title">Halo, {{ settings.ownerName || 'Warga Pekarangan' }} 👋</h2>
      <div style="font-size: 0.84rem; font-weight: 700; color: #bbf7d0; display: flex; align-items: center; gap: 6px;">
        <span>🏡 {{ settings.yardName || 'Pekarangan Mandiri' }}</span>
        <span v-if="settings.defaultRtRw">•</span>
        <span v-if="settings.defaultRtRw">RT {{ settings.defaultRtRw }}</span>
      </div>
    </div>

    <!-- 2x2 Coming Soon Quick Menu - Full Edge Flat (Same 2-grid style as stats below) -->
    <div class="coming-soon-section">
      <div class="coming-soon-header">
        <span class="coming-soon-header-title">
          <span>🚀</span> Fitur Segera
        </span>
      </div>

      <div class="stat-grid-2x2">
        <button 
          v-for="item in comingSoonItems" 
          :key="item.id" 
          type="button" 
          class="stat-box"
          @click="openFeatureModal(item)"
        >
          <span class="stat-box-icon">{{ item.icon }}</span>
          <div class="stat-box-body">
            <div class="stat-box-val" style="font-size: 0.88rem;">{{ item.label }}</div>
            <div class="stat-box-lbl">{{ item.sub }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Section Divider Strip -->
    <div class="section-divider"></div>

    <!-- Quick Stats Grid (Dynamic from Database) - Full Edge Flat 2x2 -->
    <div class="section-header-bar">
      <span class="section-header-title">
        <span>📊</span> Ringkasan Data
      </span>
    </div>

    <div class="stat-grid-2x2">
      <div class="stat-box" @click="$emit('navigate', 'record')">
        <span class="stat-box-icon">🏡</span>
        <div class="stat-box-body">
          <div class="stat-box-val">{{ membersCount }} KK</div>
          <div class="stat-box-lbl">Pekarangan Terdata</div>
        </div>
      </div>

      <div class="stat-box" @click="$emit('navigate', 'record')">
        <span class="stat-box-icon">🥬</span>
        <div class="stat-box-body">
          <div class="stat-box-val">{{ potensiSayur }} Kg</div>
          <div class="stat-box-lbl">Sayur / Bulan</div>
        </div>
      </div>

      <div class="stat-box" @click="$emit('navigate', 'insight')">
        <span class="stat-box-icon">💰</span>
        <div class="stat-box-body">
          <div class="stat-box-val">{{ formattedSavings }}</div>
          <div class="stat-box-lbl">Penghematan Dapur</div>
        </div>
      </div>

      <div class="stat-box" @click="$emit('navigate', 'insight')">
        <span class="stat-box-icon">🌾</span>
        <div class="stat-box-body">
          <div class="stat-box-val">{{ formattedHarvest }}</div>
          <div class="stat-box-lbl">Nilai Hasil Panen</div>
        </div>
      </div>
    </div>

    <!-- Section Divider Strip -->
    <div class="section-divider"></div>

    <!-- Action: Pusat Pencatatan - Sleek Row -->
    <div 
      style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f0fdf4; border-bottom: 1px solid var(--primary-border); cursor: pointer;"
      @click="$emit('navigate', 'record')"
    >
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.3rem;">📝</span>
        <div>
          <div style="font-weight: 800; font-size: 0.86rem; color: var(--primary-dark);">
            Pusat Pencatatan Pekarangan
          </div>
          <div style="font-size: 0.68rem; color: var(--text-muted);">
            Catat tanam harian & log panen telur
          </div>
        </div>
      </div>
      <span style="color: var(--primary); font-weight: 800; font-size: 0.85rem;">➔</span>
    </div>

    <!-- Section Divider Strip -->
    <div class="section-divider"></div>

    <!-- 4 Pilar Resmi Pekarangan - Full Edge Flat -->
    <div style="background: #ffffff;">
      <div class="section-header-bar">
        <span class="section-header-title">
          <span>🏛️</span> 4 Pilar Pekarangan
        </span>
      </div>

      <div class="pillar-mini-grid">
        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <span>🥦</span>
            <span>1. Pangan</span>
          </div>
          <p class="pillar-mini-desc">
            Sayur daun, cabai, tomat & umbi harian.
          </p>
        </div>

        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <span>🐔</span>
            <span>2. Ternak</span>
          </div>
          <p class="pillar-mini-desc">
            Protein telur, daging & tabungan darurat.
          </p>
        </div>

        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <span>🌿</span>
            <span>3. Apotik</span>
          </div>
          <p class="pillar-mini-desc">
            Herbal alami, jamu & tanaman obat keluarga.
          </p>
        </div>

        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <span>🍯</span>
            <span>4. Olahan</span>
          </div>
          <p class="pillar-mini-desc">
            Sambal, jamu, telur asin & produk dapur.
          </p>
        </div>
      </div>
    </div>

    <!-- MODAL DETAIL FITUR SEGERA HADIR -->
    <div v-if="selectedFeature" class="modal-backdrop" @click.self="selectedFeature = null">
      <div class="modal-sheet">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div 
              style="width: 40px; height: 40px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 20px;"
              :style="{ background: selectedFeature.bg, border: '1px solid ' + selectedFeature.border }"
            >
              {{ selectedFeature.icon }}
            </div>
            <div>
              <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-main);">
                {{ selectedFeature.title }}
              </div>
              <div style="font-size: 0.68rem; font-weight: 700; color: #d97706;">
                🔒 {{ selectedFeature.badge }}
              </div>
            </div>
          </div>
          <button type="button" class="btn-close" @click="selectedFeature = null">✕</button>
        </div>

        <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin: 12px 0;">
          {{ selectedFeature.desc }}
        </p>

        <!-- Progress Kesiapan -->
        <div class="readiness-box" style="margin-bottom: 14px;">
          <div class="readiness-header">
            <span>Kesiapan Pekarangan Warga</span>
            <span>{{ membersCount }} / 30 KK Terdata</span>
          </div>
          <div class="readiness-track">
            <div class="readiness-fill" :style="{ width: Math.min(100, Math.round((membersCount / 30) * 100)) + '%' }"></div>
          </div>
          <div class="readiness-subtext">
            Fitur otomatis aktif serentak saat kuota 30 pekarangan warga terdata di sistem.
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button 
            type="button" 
            class="btn btn-outline btn-full" 
            @click="selectedFeature = null"
          >
            Tutup
          </button>
          <button 
            v-if="selectedFeature.targetTab"
            type="button" 
            class="btn btn-primary btn-full" 
            @click="() => {
              const tab = selectedFeature?.targetTab;
              selectedFeature = null;
              if (tab) $emit('navigate', tab);
            }"
          >
            Buka Layar ➔
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
