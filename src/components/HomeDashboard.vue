<script setup lang="ts">
import { computed } from 'vue';
import { StorageService } from '../services/storage';

defineEmits<{
  (e: 'navigate', tab: 'barter' | 'record' | 'savings' | 'market'): void;
}>();

const membersCount = computed(() => StorageService.getRecordedMembersCount());
const plantsCount = computed(() => StorageService.getPlants().length);
const totalSavingsVal = computed(() => StorageService.getTotalSavings());

const formattedSavings = computed(() => {
  const val = totalSavingsVal.value;
  if (val >= 1000000) {
    return `Rp ${(val / 1000000).toFixed(1)} Jt`;
  }
  return `Rp ${(val / 1000).toLocaleString('id-ID')} Rb`;
});

const potensiSayur = computed(() => {
  // Estimasi rata-rata panen per komoditas aktif pekarangan
  return Math.max(25, plantsCount.value * 35);
});
</script>

<template>
  <div class="home-dashboard">
    <!-- Hero Banner -->
    <div class="home-hero-card">
      <div class="home-hero-top">
        <span class="home-hero-badge">🌱 EKOSISTEM WARGA</span>
        <span style="font-size: 0.72rem; opacity: 0.9;">Pekarangan Produktif</span>
      </div>
      <h2 class="home-hero-title">Kedaulatan Pangan & Ekonomi Mandiri</h2>
      <p class="home-hero-desc">
        Pemanfaatan pekarangan sebagai jangkar ketahanan pangan harian, modal hidup, obat herbal, dan pabrik mini dapur.
      </p>
    </div>

    <!-- Quick Stats Grid (Dynamic from Database) -->
    <div class="stat-grid-2x2">
      <div class="stat-box" style="cursor: pointer;" @click="$emit('navigate', 'record')">
        <div class="stat-box-top">
          <span>🏡</span>
          <span style="font-size: 0.7rem; color: var(--primary); font-weight: 700;">Database</span>
        </div>
        <div class="stat-box-val">{{ membersCount }} KK</div>
        <div class="stat-box-lbl">Pekarangan Terdata</div>
      </div>

      <div class="stat-box" style="cursor: pointer;" @click="$emit('navigate', 'barter')">
        <div class="stat-box-top">
          <span>🥬</span>
          <span style="font-size: 0.7rem; color: #0284c7; font-weight: 700;">Harian</span>
        </div>
        <div class="stat-box-val">{{ potensiSayur }} Kg</div>
        <div class="stat-box-lbl">Potensi Sayur / Bln</div>
      </div>

      <div class="stat-box" style="cursor: pointer;" @click="$emit('navigate', 'savings')">
        <div class="stat-box-top">
          <span>💰</span>
          <span style="font-size: 0.7rem; color: #16a34a; font-weight: 700;">Hemat</span>
        </div>
        <div class="stat-box-val">{{ formattedSavings }}</div>
        <div class="stat-box-lbl">Kas Penghematan</div>
      </div>

      <div class="stat-box" style="cursor: pointer; opacity: 0.6;" @click="$emit('navigate', 'savings')">
        <div class="stat-box-top">
          <span>♻️</span>
          <span style="
            font-size: 0.5rem; font-weight: 800; letter-spacing: 0.8px;
            text-transform: uppercase; background: #d97706;
            color: #fff; padding: 1px 5px; border-radius: 9999px;
          ">Segera</span>
        </div>
        <div class="stat-box-val">850 Poin</div>
        <div class="stat-box-lbl">Tabungan Nutrisi</div>
      </div>
    </div>

    <!-- Survey Callout Card (Fase 1) -->
    <div class="survey-callout-card">
      <div class="survey-callout-header">
        <div class="survey-callout-icon">📝</div>
        <div>
          <div style="font-weight: 800; font-size: 0.95rem; color: var(--primary-dark);">
            Pusat Pencatatan & Pendataan
          </div>
          <div style="font-size: 0.74rem; color: var(--text-muted);">
            Catat tanam, log panen telur, dan form pendataan lahan
          </div>
        </div>
      </div>
      <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.45;">
        Pantau perkembangan sayuran, panen telur kandang keluarga, atau isi Form Pendataan Lahan pekarangan Anda.
      </p>
      <button 
        type="button" 
        class="btn btn-primary btn-full"
        @click="$emit('navigate', 'record')"
      >
        <span>Buka Menu Catat</span>
        <span>➔</span>
      </button>
    </div>

    <!-- 4 Pilar Resmi Pekarangan -->
    <div class="card">
      <div class="card-title">
        <span>🏛️ 4 Pilar Ketahanan Pekarangan</span>
      </div>

      <div class="pillar-mini-grid">
        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <span>🥦</span>
            <span>1. Pangan Mandiri</span>
          </div>
          <p class="pillar-mini-desc">
            Cabai, tomat, sayur daun & umbi untuk konsumsi harian keluarga.
          </p>
        </div>

        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <span>🐔</span>
            <span>2. Kandang Ternak</span>
          </div>
          <p class="pillar-mini-desc">
            Ayam, bebek & puyuh: sumber protein telur, daging, dan tabungan darurat.
          </p>
        </div>

        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <span>🌿</span>
            <span>3. Apotik Hidup</span>
          </div>
          <p class="pillar-mini-desc">
            Jahe, kunyit, temulawak: kemandirian obat herbal & jamu alami.
          </p>
        </div>

        <div class="pillar-mini-card">
          <div class="pillar-mini-title">
            <span>🍯</span>
            <span>4. Rumah Produksi</span>
          </div>
          <p class="pillar-mini-desc">
            Hilirisasi dapur: sambal botol, keripik, jamu & telur asin bernilai jual.
          </p>
        </div>
      </div>
    </div>

    <!-- Teaser Spotlight 1: Bursa Barter -->
    <div class="card">
      <div class="card-title">
        <span>🧺 Bursa Barter Tetangga
          <span style="
            font-size: 0.5rem; font-weight: 800; letter-spacing: 0.8px;
            text-transform: uppercase; background: #15803d;
            color: #fff; padding: 1px 6px; border-radius: 9999px;
            margin-left: 3px; vertical-align: middle;
          ">Segera Hadir</span>
        </span>
        <button 
          type="button" 
          class="btn-sm btn-outline" 
          style="font-size: 0.72rem; padding: 3px 8px;"
          @click="$emit('navigate', 'barter')"
        >
          Lihat Semua ➔
        </button>
      </div>

      <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 10px; opacity: 0.5;">
        Tukar cabai atau telur dengan bumbu dapur tetangga tanpa uang tunai:
      </p>

      <div style="display: flex; flex-direction: column; gap: 8px; opacity: 0.5;">
        <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-size: 1.4rem;">🌶️</span>
            <div>
              <div style="font-weight: 700; font-size: 0.82rem;">Cabai Rawit Merah (500g)</div>
              <div style="font-size: 0.7rem; color: var(--text-dim);">Pak Budi • Butuh: Telur Ayam</div>
            </div>
          </div>
          <span class="teaser-tag locked" style="font-size: 0.65rem;">🔒 Kuota 12/30</span>
        </div>

        <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-size: 1.4rem;">🥚</span>
            <div>
              <div style="font-weight: 700; font-size: 0.82rem;">Telur Bebek Pekarangan (10 btr)</div>
              <div style="font-size: 0.7rem; color: var(--text-dim);">Bu Siti • Butuh: Jahe Merah / Kangkung</div>
            </div>
          </div>
          <span class="teaser-tag locked" style="font-size: 0.65rem;">🔒 Kuota 12/30</span>
        </div>
      </div>
    </div>

    <!-- Teaser Spotlight 2: Rumah Produksi Dapur -->
    <div class="card">
      <div class="card-title">
        <span>🍯 Katalog Olahan Dapur Warga
          <span style="
            font-size: 0.5rem; font-weight: 800; letter-spacing: 0.8px;
            text-transform: uppercase; background: #d97706;
            color: #fff; padding: 1px 6px; border-radius: 9999px;
            margin-left: 3px; vertical-align: middle;
          ">Segera Hadir</span>
        </span>
        <button 
          type="button" 
          class="btn-sm btn-outline" 
          style="font-size: 0.72rem; padding: 3px 8px;"
          @click="$emit('navigate', 'market')"
        >
          Etalase ➔
        </button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; opacity: 0.5;">
        <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px;">
          <span style="font-size: 1.3rem;">🌶️🍶</span>
          <div style="font-weight: 700; font-size: 0.8rem; margin-top: 4px;">Sambal Bawang Botol</div>
          <div style="font-size: 0.72rem; color: var(--primary); font-weight: 700;">Rp 18.000</div>
          <div style="font-size: 0.68rem; color: var(--text-dim);">Dapur Bu Endang</div>
        </div>

        <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px;">
          <span style="font-size: 1.3rem;">🌿🍵</span>
          <div style="font-weight: 700; font-size: 0.8rem; margin-top: 4px;">Jamu Kunyit Asam 350ml</div>
          <div style="font-size: 0.72rem; color: var(--primary); font-weight: 700;">Rp 8.000</div>
          <div style="font-size: 0.68rem; color: var(--text-dim);">Dapur Bu Siti</div>
        </div>
      </div>
    </div>
  </div>
</template>
