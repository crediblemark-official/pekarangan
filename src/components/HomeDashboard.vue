<script setup lang="ts">
import { computed } from 'vue';
import { StorageService } from '../services/storage';
import AppIcon from './AppIcon.vue';

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
        <div class="warga-nu-pill">
          <AppIcon name="sprout" size="xs" color="#86efac" />
          <span>Warga NU</span>
        </div>
      </div>
      <h2 class="home-hero-title">Halo, {{ settings.ownerName || 'Warga Pekarangan' }}</h2>
      <div class="home-yard-sub">
        <div class="yard-chip">
          <AppIcon name="home" size="xs" color="#bbf7d0" />
          <span>{{ settings.yardName || 'Pekarangan Mandiri' }}</span>
        </div>
        <span v-if="settings.defaultRtRw" class="sub-sep">•</span>
        <span v-if="settings.defaultRtRw">RT {{ settings.defaultRtRw }}</span>
        <span v-if="settings.ranting" class="sub-sep">•</span>
        <span v-if="settings.ranting">{{ settings.ranting }}</span>
      </div>
    </div>

    <!-- Quick Stats Grid (Data Riil dari Database Turso SQLite) -->
    <div class="section-header-bar">
      <div class="section-header-title">
        <AppIcon name="dashboard" size="xs" color="#166534" />
        <span>Ringkasan Pekarangan Mandiri</span>
      </div>
    </div>

    <div class="stat-grid-2x2">
      <!-- 1. Pekarangan Terdata -->
      <div class="stat-box" @click="$emit('navigate', 'community')">
        <div class="stat-box-icon">
          <AppIcon name="home" size="md" color="#16a34a" />
        </div>
        <div class="stat-box-body">
          <div class="stat-box-val font-mono">{{ membersCount }} KK</div>
          <div class="stat-box-lbl">Pekarangan Terdata</div>
        </div>
      </div>

      <!-- 2. Tanaman Aktif -->
      <div class="stat-box" @click="$emit('navigate', 'record')">
        <div class="stat-box-icon">
          <AppIcon name="leaf" size="md" color="#16a34a" />
        </div>
        <div class="stat-box-body">
          <div class="stat-box-val font-mono">{{ plantsCount }} Pohon</div>
          <div class="stat-box-lbl">Tanaman Aktif (RPM)</div>
        </div>
      </div>

      <!-- 3. Kelompok Ternak Produktif -->
      <div class="stat-box" @click="$emit('navigate', 'record')">
        <div class="stat-box-icon">
          <AppIcon name="egg" size="md" color="#d97706" />
        </div>
        <div class="stat-box-body">
          <div class="stat-box-val font-mono">{{ livestockCount }} Kandang</div>
          <div class="stat-box-lbl">Ternak Protein Keluarga</div>
        </div>
      </div>

      <!-- 4. Penghematan Belanja Dapur Riil -->
      <div class="stat-box" @click="$emit('navigate', 'record')">
        <div class="stat-box-icon">
          <AppIcon name="sparkles" size="md" color="#16a34a" />
        </div>
        <div class="stat-box-body">
          <div class="stat-box-val font-mono">{{ formattedSavings }}</div>
          <div class="stat-box-lbl">Hemat Belanja Dapur</div>
        </div>
      </div>
    </div>

    <!-- Section Divider Strip -->
    <div class="section-divider"></div>

    <!-- Aksi Utama: Buka Pusat Pencatatan & Jurnal -->
    <div 
      class="record-quick-action"
      @click="$emit('navigate', 'record')"
    >
      <div class="record-action-left">
        <div class="record-action-icon-box">
          <AppIcon name="clipboard" size="md" color="#166534" />
        </div>
        <div class="record-action-text">
          <div class="record-action-title">
            Pusat Pencatatan & Jurnal Pekarangan
          </div>
          <div class="record-action-sub">
            Catat tanam, kumpul telur harian, panen & konsumsi dapur
          </div>
        </div>
      </div>
      <div class="record-action-arrow">
        <AppIcon name="arrow-right" size="sm" color="#16a34a" />
      </div>
    </div>

    <!-- Section Divider Strip -->
    <div class="section-divider"></div>

    <!-- 4 Pilar Resmi Ekonomi Pekarangan Warga NU -->
    <div class="pillar-section">
      <div class="section-header-bar">
        <div class="section-header-title">
          <AppIcon name="building" size="xs" color="#166534" />
          <span>4 Pilar Resmi Ekonomi Pekarangan</span>
        </div>
      </div>

      <div class="pillar-mini-grid">
        <!-- Pilar 1 -->
        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <AppIcon name="leaf" size="xs" color="#166534" />
            <span>1. RPM</span>
          </div>
          <p class="pillar-mini-desc">
            <strong>Rumah Pangan Mandiri:</strong> Sayuran daun, cabai, tomat, terong & umbi segar pemotong belanja dapur.
          </p>
        </div>

        <!-- Pilar 2 -->
        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <AppIcon name="egg" size="xs" color="#d97706" />
            <span>2. Kandang</span>
          </div>
          <p class="pillar-mini-desc">
            <strong>Kandang Keluarga:</strong> Sumber protein telur, daging & tabungan aset hidup (living bank).
          </p>
        </div>

        <!-- Pilar 3 -->
        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <AppIcon name="pill" size="xs" color="#166534" />
            <span>3. Apotek Hidup</span>
          </div>
          <p class="pillar-mini-desc">
            <strong>Farmasi Mini TOGA:</strong> Jahe, kunyit, temulawak, serai & sirih untuk imunitas dan obat herbal.
          </p>
        </div>

        <!-- Pilar 4 -->
        <div class="pillar-mini-card pillar-mamasar">
          <div class="pillar-mini-title" style="color: #6b21a8;">
            <AppIcon name="package" size="xs" color="#7e22ce" />
            <span>4. RPP ➔ Mamasar</span>
          </div>
          <p class="pillar-mini-desc">
            <strong>Rumah Produksi:</strong> Olah surplus tahan simpan (sambal, keripik, jamu) dipasarkan ke Mamasar.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-dashboard {
  background: var(--bg-body, #f8fafc);
}

.home-hero-card {
  background: linear-gradient(135deg, #15803d 0%, #166534 100%);
  color: #ffffff;
  padding: 16px 14px;
  position: relative;
}

.home-hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.home-hero-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: rgba(255, 255, 255, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
}

.warga-nu-pill {
  font-size: 0.72rem;
  color: #dcfce7;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}

.home-hero-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}

.home-yard-sub {
  font-size: 0.78rem;
  font-weight: 600;
  color: #bbf7d0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.yard-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.sub-sep {
  opacity: 0.6;
}

.section-header-bar {
  padding: 8px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.section-header-title {
  font-size: 0.76rem;
  font-weight: 700;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-grid-2x2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: #e2e8f0;
}

.stat-box {
  background: #ffffff;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.stat-box:active {
  transform: scale(0.98);
}

.stat-box-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-box-val {
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
}

.stat-box-lbl {
  font-size: 0.68rem;
  color: #64748b;
  margin-top: 2px;
}

.section-divider {
  height: 6px;
  background: #f1f5f9;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
}

.record-quick-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #f0fdf4;
  border-bottom: 1px solid #bbf7d0;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

.record-quick-action:active {
  transform: scale(0.99);
}

.record-action-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.record-action-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #dcfce7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.record-action-text {
  min-width: 0;
}

.record-action-title {
  font-weight: 700;
  font-size: 0.86rem;
  color: #14532d;
  line-height: 1.2;
}

.record-action-sub {
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 2px;
}

.record-action-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 8px;
}

.pillar-section {
  background: #ffffff;
}

.pillar-mini-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 10px 14px 16px;
}

.pillar-mini-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
}

.pillar-mamasar {
  background: #faf5ff;
  border-color: #e9d5ff;
}

.pillar-mini-title {
  font-size: 0.76rem;
  font-weight: 700;
  color: #166534;
  margin-bottom: 3px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.pillar-mini-desc {
  font-size: 0.68rem;
  color: #64748b;
  line-height: 1.35;
  margin: 0;
}
</style>
