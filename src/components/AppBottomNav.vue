<script setup lang="ts">
export type AppNavTab = 'home' | 'record' | 'community' | 'profile';

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
  (e: 'openCreatePost'): void;
}>();

const handleSurveyClick = () => {
  if (props.currentStep === 4) {
    emit('submitSurvey');
  } else {
    emit('nextStep');
  }
};
</script>

<template>
  <nav class="app-bottom-nav">
    <!-- 1. Home / Beranda -->
    <button 
      type="button" 
      class="nav-btn" 
      :class="{ active: activeTab === 'home' && !isSurveyMode }"
      @click="$emit('changeTab', 'home')"
    >
      <span class="nav-icon">🏡</span>
      <span class="nav-label">Beranda</span>
    </button>

    <!-- 2. Catat / Pusat Pencatatan -->
    <button 
      type="button" 
      class="nav-btn" 
      :class="{ active: activeTab === 'record' && !isSurveyMode }"
      @click="$emit('changeTab', 'record')"
    >
      <span class="nav-icon">📝</span>
      <span class="nav-label">Catat</span>
      <span 
        v-if="surveyQueueCount > 0" 
        style="position: absolute; top: -3px; right: 2px; background: #dc2626; color: #fff; font-size: 0.6rem; padding: 1px 5px; border-radius: 999px; font-weight: 700;"
      >
        {{ surveyQueueCount }}
      </span>
    </button>

    <!-- 3. TOMBOL TENGAH TIKTOK STYLE (+) / SURVEY ACTION -->
    <div class="tiktok-center-container">
      <button 
        v-if="isSurveyMode"
        type="button"
        class="survey-center-btn"
        :disabled="isSubmitting"
        @click="handleSurveyClick"
      >
        <span v-if="isSubmitting" class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
        <span v-else-if="currentStep === 4" class="nav-icon">💾</span>
        <span v-else class="nav-icon" style="font-size: 18px; font-weight: bold;">➔</span>
        <span class="survey-center-label">{{ currentStep === 4 ? 'Simpan' : 'Lanjut' }}</span>
      </button>

      <button 
        v-else
        type="button" 
        class="tiktok-create-btn"
        @click="$emit('openCreatePost')"
        title="Kabarkan Pekarangan (Ngeksis Berfaedah)"
      >
        <span class="tiktok-flank-cyan"></span>
        <span class="tiktok-center-box">
          <span class="tiktok-plus">+</span>
        </span>
        <span class="tiktok-flank-green"></span>
      </button>
    </div>

    <!-- 4. Community / Komunitas Warga -->
    <button 
      type="button" 
      class="nav-btn" 
      :class="{ active: activeTab === 'community' && !isSurveyMode }"
      @click="$emit('changeTab', 'community')"
    >
      <span class="nav-icon">👥</span>
      <span class="nav-label">Komunitas</span>
    </button>

    <!-- 5. Profile / Profil & Database -->
    <button 
      type="button" 
      class="nav-btn" 
      :class="{ active: activeTab === 'profile' && !isSurveyMode }"
      @click="$emit('changeTab', 'profile')"
    >
      <span class="nav-icon">👤</span>
      <span class="nav-label">Profil</span>
    </button>
  </nav>
</template>

<style scoped>
.tiktok-center-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex: 0 0 54px;
  height: 100%;
}

.tiktok-create-btn {
  position: relative;
  width: 44px;
  height: 30px;
  background: transparent;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s ease;
  user-select: none;
}

.tiktok-create-btn:active {
  transform: scale(0.9);
}

.tiktok-flank-cyan {
  position: absolute;
  left: 0;
  top: 0;
  width: 38px;
  height: 30px;
  background: #25f4ee;
  border-radius: 8px;
}

.tiktok-flank-green {
  position: absolute;
  right: 0;
  top: 0;
  width: 38px;
  height: 30px;
  background: #22c55e;
  border-radius: 8px;
}

.tiktok-center-box {
  position: relative;
  z-index: 2;
  width: 38px;
  height: 30px;
  background: #0f172a;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.tiktok-plus {
  color: #ffffff;
  font-size: 21px;
  font-weight: 800;
  line-height: 1;
  margin-top: -1px;
}

.survey-center-btn {
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #ffffff;
  border: none;
  border-radius: 20px;
  padding: 6px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.4);
  cursor: pointer;
  min-width: 58px;
  transition: transform 0.12s ease;
}

.survey-center-btn:active {
  transform: scale(0.95);
}

.survey-center-label {
  font-size: 0.62rem;
  font-weight: 800;
  color: #ffffff;
}
</style>
