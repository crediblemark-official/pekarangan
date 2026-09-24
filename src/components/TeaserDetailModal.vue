<script setup lang="ts">
import type { TeaserFeature } from '../types';

defineProps<{
  feature: TeaserFeature;
  isVoted: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'toggleVote', featureId: string): void;
  (e: 'shareWA', feature: TeaserFeature): void;
}>();
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-sheet">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.5rem;">{{ feature.icon }}</span>
          <div>
            <h3 style="margin: 0; font-size: 1.05rem;">{{ feature.title }}</h3>
            <span class="teaser-tag locked" style="font-size: 0.65rem;">🔒 {{ feature.tag }}</span>
          </div>
        </div>
        <button class="btn-icon" @click="$emit('close')">✕</button>
      </div>

      <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.4; margin-top: 6px;">
        {{ feature.tagline }}
      </p>

      <!-- Progress Kesiapan Lingkungan -->
      <div class="readiness-box">
        <div class="readiness-header">
          <span>Kesiapan Lingkungan RT</span>
          <span>{{ feature.currentCount }} / {{ feature.targetCount }} {{ feature.targetUnit }}</span>
        </div>
        <div class="readiness-track">
          <div 
            class="readiness-fill" 
            :style="{ width: Math.min(100, Math.round((feature.currentCount / feature.targetCount) * 100)) + '%' }"
          ></div>
        </div>
        <div class="readiness-subtext">
          Butuh {{ feature.targetCount - feature.currentCount }} data pekarangan lagi untuk mengaktifkan fitur ini di lingkungan Anda.
        </div>
      </div>

      <!-- 3 Poin Manfaat Nyata -->
      <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-main); margin-top: 8px;">
        Manfaat Nyata untuk Anda:
      </div>
      <div class="feature-point-list">
        <div v-for="(point, idx) in feature.points" :key="idx" class="feature-point-item">
          <span class="feature-point-bullet">✓</span>
          <span>{{ point }}</span>
        </div>
      </div>

      <!-- Mengapa Terkunci & Cara Mempercepat -->
      <div style="background: #f9fafb; border-left: 3px solid var(--primary); padding: 8px 12px; border-radius: 4px; font-size: 0.76rem; color: var(--text-muted); line-height: 1.4; margin: 10px 0;">
        {{ feature.whyLocked }}
      </div>

      <!-- CTA Buttons: Vote & WhatsApp Share -->
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px;">
        <button 
          type="button" 
          :class="['btn', isVoted ? 'btn-outline' : 'btn-primary']"
          @click="$emit('toggleVote', feature.id)"
        >
          {{ isVoted ? '✅ Anda Masuk Antrean Prioritas' : '🔔 Saya Tertarik (Masuk Antrean Prioritas)' }}
        </button>

        <button 
          type="button" 
          class="btn btn-whatsapp" 
          @click="$emit('shareWA', feature)"
        >
          📲 Ajak Tetangga via WhatsApp
        </button>
      </div>
    </div>
  </div>
</template>
