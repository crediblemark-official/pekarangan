<script setup lang="ts">
export type AppNavTab = 'home' | 'community' | 'record' | 'insight' | 'profile';

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
    <!-- 1. Home -->
    <button 
      type="button" 
      class="nav-btn" 
      :class="{ active: activeTab === 'home' && !isSurveyMode }"
      @click="$emit('changeTab', 'home')"
    >
      <span class="nav-icon">🏡</span>
      <span class="nav-label">Home</span>
    </button>

    <!-- 2. Community -->
    <button 
      type="button" 
      class="nav-btn" 
      :class="{ active: activeTab === 'community' && !isSurveyMode }"
      @click="$emit('changeTab', 'community')"
    >
      <span class="nav-icon">👥</span>
      <span class="nav-label">Community</span>
    </button>

    <!-- 3. Catat (Center Accent Button: Catat OR Lanjut/Simpan when in Survey mode) -->
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

    <!-- 4. Insight (Kas, Tabungan, & Statistik Produksi) -->
    <button 
      type="button" 
      class="nav-btn" 
      :class="{ active: activeTab === 'insight' && !isSurveyMode }"
      @click="$emit('changeTab', 'insight')"
    >
      <span class="nav-icon">📊</span>
      <span class="nav-label">Insight</span>
    </button>

    <!-- 5. Profile -->
    <button 
      type="button" 
      class="nav-btn" 
      :class="{ active: activeTab === 'profile' && !isSurveyMode }"
      @click="$emit('changeTab', 'profile')"
    >
      <span class="nav-icon">👤</span>
      <span class="nav-label">Profile</span>
    </button>
  </nav>
</template>

