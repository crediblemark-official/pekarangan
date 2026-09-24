<script setup lang="ts">
import type { TeaserFeature } from '../types';

defineProps<{
  teaserFeatures: TeaserFeature[];
}>();

defineEmits<{
  (e: 'openTeaser', feature: TeaserFeature): void;
  (e: 'goToSurvey'): void;
}>();
</script>

<template>
  <section class="step-view active">
    <div class="section-header">
      <h2>🚀 Ekosistem Pekarangan (Fase 2)</h2>
      <p>Fitur masa depan ekonomi sirkular warga. Terkunci sementara hingga kuota pendataan pekarangan terpenuhi.</p>
    </div>

    <!-- Teaser Grid -->
    <div class="teaser-grid">
      <div 
        v-for="feat in teaserFeatures" 
        :key="feat.id" 
        class="teaser-card"
        @click="$emit('openTeaser', feat)"
      >
        <div class="teaser-icon-box">
          <span style="font-size: 1.5rem;">{{ feat.icon }}</span>
          <span class="teaser-lock-icon">🔒</span>
        </div>
        <div class="teaser-card-body">
          <div class="teaser-card-top">
            <span class="teaser-card-title">{{ feat.title }}</span>
            <span class="teaser-tag locked">{{ feat.tag }}</span>
          </div>
          <p class="teaser-card-tagline">{{ feat.tagline }}</p>
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
            <span style="font-size: 0.72rem; color: var(--text-dim); font-weight: 500;">
              📊 {{ feat.currentCount }}/{{ feat.targetCount }} {{ feat.targetUnit }}
            </span>
            <button type="button" class="btn-sm btn-outline" style="font-size: 0.72rem; padding: 3px 8px;">
              Pelajari ➔
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edukasi / Info Box -->
    <div class="card" style="margin-top: 16px; background: #f0fdf4; border-color: var(--primary-border);">
      <div style="display: flex; gap: 10px; align-items: flex-start;">
        <span style="font-size: 1.4rem;">💡</span>
        <div>
          <div style="font-weight: 700; font-size: 0.88rem; color: var(--primary-dark); margin-bottom: 4px;">
            Mengapa Fitur Ini Belum Dibuka?
          </div>
          <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.45;">
            Ekosistem barter, bank pupuk, dan etalase olahan membutuhkan basis data pekarangan yang solid. Semakin banyak warga di lingkungan Anda mengisi Form Pendataan, semakin cepat fitur-fitur ini dibuka secara serentak!
          </p>
          <button 
            type="button" 
            class="btn btn-primary btn-sm" 
            style="margin-top: 10px;"
            @click="$emit('goToSurvey')"
          >
            📝 Lanjut Isi Form Pendataan Sekarang
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
