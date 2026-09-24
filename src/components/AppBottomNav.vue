<script setup lang="ts">
export type AppNavTab = 'home' | 'barter' | 'record' | 'savings' | 'market';

const props = defineProps<{
  activeTab: AppNavTab;
  surveyQueueCount: number;
  isSurveyMode?: boolean;
  currentStep?: number;
  isSubmitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'changeTab', tab: AppNavTab): void;
  (e: 'nextStep'): void;
  (e: 'submitSurvey'): void;
}>();

const handleCenterClick = () => {
  if (props.isSurveyMode) {
    if (props.currentStep === 4) {
      emit('submitSurvey');
    } else {
      emit('nextStep');
    }
  } else {
    emit('changeTab', 'record');
  }
};
</script>

<template>
  <nav class="app-bottom-nav">
    <button 
      type="button" 
      class="nav-btn" 
      :class="{ active: activeTab === 'home' && !isSurveyMode }"
      @click="$emit('changeTab', 'home')"
    >
      <span class="nav-icon">🏡</span>
      <span class="nav-label">Beranda</span>
    </button>

    <button 
      type="button" 
      class="nav-btn" 
      :class="{ active: activeTab === 'barter' && !isSurveyMode }"
      @click="$emit('changeTab', 'barter')"
    >
      <span class="nav-icon">🧺</span>
      <span class="nav-label">Barter</span>
    </button>

    <!-- Center Accent Button: Catat OR Lanjut/Simpan when in Survey mode -->
    <button 
      type="button" 
      class="nav-btn nav-primary-accent" 
      :class="{ active: activeTab === 'record' || isSurveyMode }"
      :disabled="isSurveyMode && isSubmitting"
      @click="handleCenterClick"
    >
      <template v-if="isSurveyMode">
        <span v-if="isSubmitting" class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span>
        <span v-else-if="currentStep === 4" class="nav-icon">💾</span>
        <span v-else class="nav-icon" style="font-size: 20px; font-weight: bold;">➔</span>
        <span class="nav-label" style="font-weight: 800;">{{ currentStep === 4 ? 'Simpan' : 'Lanjut' }}</span>
      </template>
      <template v-else>
        <span class="nav-icon">📝</span>
        <span class="nav-label">Catat</span>
        <span 
          v-if="surveyQueueCount > 0" 
          style="position: absolute; top: -3px; right: 2px; background: #dc2626; color: #fff; font-size: 0.6rem; padding: 1px 5px; border-radius: 999px; font-weight: 700;"
        >
          {{ surveyQueueCount }}
        </span>
      </template>
    </button>

    <!-- Unified Feature: Tabungan & Buku Kas -->
    <button 
      type="button" 
      class="nav-btn" 
      :class="{ active: activeTab === 'savings' && !isSurveyMode }"
      @click="$emit('changeTab', 'savings')"
    >
      <span class="nav-icon">💰</span>
      <span class="nav-label">Kas & Poin</span>
    </button>

    <!-- Dedicated Feature: Rumah Produksi Dapur -->
    <button 
      type="button" 
      class="nav-btn" 
      :class="{ active: activeTab === 'market' && !isSurveyMode }"
      @click="$emit('changeTab', 'market')"
    >
      <span class="nav-icon">🍯</span>
      <span class="nav-label">Olahan</span>
    </button>
  </nav>
</template>
