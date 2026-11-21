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
        <span class="text-xs text-emerald-100 flex items-center gap-1">
          <AppIcon name="sprout" size="xs" class="text-emerald-300" />
          <span>Warga NU</span>
        </span>
      </div>
      <h2 class="home-hero-title">Halo, {{ settings.ownerName || 'Warga Pekarangan' }}</h2>
      <div class="home-yard-sub">
        <span class="flex items-center gap-1">
          <AppIcon name="home" size="xs" class="text-emerald-200" />
          <span>{{ settings.yardName || 'Pekarangan Mandiri' }}</span>
        </span>
        <span v-if="settings.defaultRtRw">•</span>
        <span v-if="settings.defaultRtRw">RT {{ settings.defaultRtRw }}</span>
        <span v-if="settings.ranting">• {{ settings.ranting }}</span>
      </div>
    </div>

    <!-- Quick Stats Grid (Data Riil dari Database Turso SQLite) -->
    <div class="section-header-bar">
      <span class="section-header-title flex items-center gap-1.5">
        <AppIcon name="dashboard" size="xs" class="text-emerald-700" />
        <span>Ringkasan Pekarangan Mandiri</span>
      </span>
    </div>

    <div class="stat-grid-2x2">
      <!-- 1. Pekarangan Terdata -->
      <div class="stat-box active:scale-98 transition-transform cursor-pointer" @click="$emit('navigate', 'community')">
        <div class="stat-box-icon">
          <AppIcon name="home" size="lg" class="text-emerald-600" />
        </div>
        <div class="stat-box-body">
          <div class="stat-box-val font-mono">{{ membersCount }} KK</div>
          <div class="stat-box-lbl">Pekarangan Terdata</div>
        </div>
      </div>

      <!-- 2. Tanaman Aktif -->
      <div class="stat-box active:scale-98 transition-transform cursor-pointer" @click="$emit('navigate', 'record')">
        <div class="stat-box-icon">
          <AppIcon name="leaf" size="lg" class="text-emerald-600" />
        </div>
        <div class="stat-box-body">
          <div class="stat-box-val font-mono">{{ plantsCount }} Pohon</div>
          <div class="stat-box-lbl">Tanaman Aktif (RPM)</div>
        </div>
      </div>

      <!-- 3. Kelompok Ternak Produktif -->
      <div class="stat-box active:scale-98 transition-transform cursor-pointer" @click="$emit('navigate', 'record')">
        <div class="stat-box-icon">
          <AppIcon name="egg" size="lg" class="text-amber-600" />
        </div>
        <div class="stat-box-body">
          <div class="stat-box-val font-mono">{{ livestockCount }} Kandang</div>
          <div class="stat-box-lbl">Ternak Protein Keluarga</div>
        </div>
      </div>

      <!-- 4. Penghematan Belanja Dapur Riil -->
      <div class="stat-box active:scale-98 transition-transform cursor-pointer" @click="$emit('navigate', 'record')">
        <div class="stat-box-icon">
          <AppIcon name="sparkles" size="lg" class="text-emerald-600" />
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
      class="record-quick-action active:scale-[0.99] transition-transform"
      @click="$emit('navigate', 'record')"
    >
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
          <AppIcon name="clipboard" size="md" />
        </div>
        <div>
          <div class="font-bold text-xs text-emerald-950">
            Pusat Pencatatan & Jurnal Pekarangan
          </div>
          <div class="text-[11px] text-neutral-600 mt-0.5">
            Catat tanam, kumpul telur harian, panen & konsumsi dapur
          </div>
        </div>
      </div>
      <AppIcon name="arrow-right" size="sm" class="text-emerald-700" />
    </div>

    <!-- Section Divider Strip -->
    <div class="section-divider"></div>

    <!-- 4 Pilar Resmi Ekonomi Pekarangan Warga NU -->
    <div class="bg-white">
      <div class="section-header-bar">
        <span class="section-header-title flex items-center gap-1.5">
          <AppIcon name="building" size="xs" class="text-emerald-700" />
          <span>4 Pilar Resmi Ekonomi Pekarangan</span>
        </span>
      </div>

      <div class="pillar-mini-grid">
        <!-- Pilar 1 -->
        <div class="pillar-mini-card">
          <div class="pillar-mini-title flex items-center gap-1.5">
            <AppIcon name="leaf" size="xs" class="text-emerald-700" />
            <span>1. RPM</span>
          </div>
          <p class="pillar-mini-desc">
            <strong>Rumah Pangan Mandiri:</strong> Sayuran daun, cabai, tomat, terong & umbi segar pemotong belanja dapur.
          </p>
        </div>

        <!-- Pilar 2 -->
        <div class="pillar-mini-card">
          <div class="pillar-mini-title flex items-center gap-1.5">
            <AppIcon name="egg" size="xs" class="text-amber-700" />
            <span>2. Kandang</span>
          </div>
          <p class="pillar-mini-desc">
            <strong>Kandang Keluarga Produktif:</strong> Sumber protein telur, daging & tabungan aset hidup (living bank).
          </p>
        </div>

        <!-- Pilar 3 -->
        <div class="pillar-mini-card">
          <div class="pillar-mini-title flex items-center gap-1.5">
            <AppIcon name="pill" size="xs" class="text-emerald-700" />
            <span>3. Apotek Hidup</span>
          </div>
          <p class="pillar-mini-desc">
            <strong>Farmasi Mini TOGA:</strong> Jahe, kunyit, temulawak, serai & sirih untuk imunitas dan obat herbal.
          </p>
        </div>

        <!-- Pilar 4 -->
        <div class="pillar-mini-card pillar-mamasar">
          <div class="pillar-mini-title flex items-center gap-1.5 text-purple-800">
            <AppIcon name="package" size="xs" class="text-purple-700" />
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
  margin-top: 1px;
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
}

.pillar-mini-desc {
  font-size: 0.68rem;
  color: #64748b;
  line-height: 1.35;
  margin: 0;
}
</style>
