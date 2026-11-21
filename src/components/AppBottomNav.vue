<script setup lang="ts">
import AppIcon from './AppIcon.vue';

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
  (e: 'openCamera'): void;
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
      class="nav-tab-btn" 
      :class="{ active: activeTab === 'home' && !isSurveyMode }"
      @click="$emit('changeTab', 'home')"
    >
      <AppIcon name="home" size="lg" class="nav-svg-icon" />
      <span class="nav-tab-label">Beranda</span>
    </button>

    <!-- 2. Catat / Pusat Pencatatan -->
    <button 
      type="button" 
      class="nav-tab-btn" 
      :class="{ active: activeTab === 'record' && !isSurveyMode }"
      @click="$emit('changeTab', 'record')"
    >
      <div class="nav-icon-wrapper">
        <AppIcon name="clipboard" size="lg" class="nav-svg-icon" />
        <span 
          v-if="surveyQueueCount > 0" 
          class="queue-badge font-mono"
        >
          {{ surveyQueueCount }}
        </span>
      </div>
      <span class="nav-tab-label">Catat</span>
    </button>

    <!-- 3. TOMBOL TENGAH TIKTOK STYLE / SURVEY ACTION -->
    <div class="center-action-slot">
      <!-- Tombol saat mode survei (Fase 1) -->
      <button 
        v-if="isSurveyMode"
        type="button"
        class="survey-step-btn"
        :disabled="isSubmitting"
        @click="handleSurveyClick"
      >
        <span v-if="isSubmitting" class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span>
        <AppIcon v-else-if="currentStep === 4" name="save" size="sm" color="#ffffff" />
        <AppIcon v-else name="arrow-right" size="sm" color="#ffffff" />
        <span class="survey-step-label">{{ currentStep === 4 ? 'Simpan' : 'Lanjut' }}</span>
      </button>

      <!-- Tombol Buat Kabar ala TikTok (Center Post / Camera Trigger) -->
      <button 
        v-else
        type="button" 
        class="tiktok-create-btn"
        @click="$emit('openCamera')"
        title="Buka Kamera Bawaan Pekarangan"
        aria-label="Kabarkan Pekarangan"
      >
        <div class="tiktok-btn-plate">
          <!-- Cyan accent layer left -->
          <div class="tiktok-wing cyan-wing"></div>
          <!-- Emerald/Green accent layer right -->
          <div class="tiktok-wing emerald-wing"></div>
          <!-- Dark central core -->
          <div class="tiktok-core">
            <AppIcon name="plus" size="sm" color="#ffffff" stroke-width="2.8" />
          </div>
        </div>
      </button>
    </div>

    <!-- 4. Community / Komunitas Warga -->
    <button 
      type="button" 
      class="nav-tab-btn" 
      :class="{ active: activeTab === 'community' && !isSurveyMode }"
      @click="$emit('changeTab', 'community')"
    >
      <AppIcon name="users" size="lg" class="nav-svg-icon" />
      <span class="nav-tab-label">Komunitas</span>
    </button>

    <!-- 5. Profile / Profil & Database -->
    <button 
      type="button" 
      class="nav-tab-btn" 
      :class="{ active: activeTab === 'profile' && !isSurveyMode }"
      @click="$emit('changeTab', 'profile')"
    >
      <AppIcon name="user" size="lg" class="nav-svg-icon" />
      <span class="nav-tab-label">Profil</span>
    </button>
  </nav>
</template>

<style scoped>
.app-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 58px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 1000;
  max-width: 480px;
  margin: 0 auto;
  padding: 0 4px calc(env(safe-area-inset-bottom, 0px) / 2);
  box-sizing: border-box;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
}

.nav-tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 100%;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  padding: 3px 0;
  transition: color 0.15s ease, transform 0.1s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.nav-tab-btn:active {
  transform: scale(0.92);
}

.nav-icon-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-svg-icon {
  width: 20px;
  height: 20px;
  stroke-width: 1.85;
}

.nav-tab-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.1;
}

.nav-tab-btn.active {
  color: #16a34a;
}

.nav-tab-btn.active .nav-tab-label {
  font-weight: 700;
}

.queue-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  background: #dc2626;
  color: #ffffff;
  font-size: 0.58rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 9999px;
  line-height: 1;
  box-shadow: 0 1px 3px rgba(220, 38, 38, 0.35);
}

/* ================= CENTER ACTION SLOT ================= */
.center-action-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 52px;
  height: 100%;
  position: relative;
}

/* TIKTOK STYLE CREATE BUTTON */
.tiktok-create-btn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tiktok-create-btn:active {
  transform: scale(0.88);
}

.tiktok-btn-plate {
  position: relative;
  width: 44px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tiktok-wing {
  position: absolute;
  top: 0;
  width: 36px;
  height: 28px;
  border-radius: 8px;
}

.cyan-wing {
  left: 0;
  background: #00f2fe;
}

.emerald-wing {
  right: 0;
  background: #00e676;
}

.tiktok-core {
  position: relative;
  z-index: 2;
  width: 36px;
  height: 28px;
  background: #0f172a;
  border-radius: 7.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

/* SURVEY STEP BUTTON */
.survey-step-btn {
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #ffffff;
  border: none;
  border-radius: 16px;
  padding: 5px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  box-shadow: 0 3px 10px rgba(22, 163, 74, 0.35);
  cursor: pointer;
  min-width: 50px;
  transition: transform 0.1s ease;
}

.survey-step-btn:active {
  transform: scale(0.94);
}

.survey-step-label {
  font-size: 0.62rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}
</style>
