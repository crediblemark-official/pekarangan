<script setup lang="ts">
import { ref } from 'vue';
import { CameraService } from '../services/camera';

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
  (e: 'photoCaptured', dataUrl: string): void;
  (e: 'cameraError', message: string): void;
}>();

const cameraInputRef = ref<HTMLInputElement | null>(null);

const triggerCamera = () => {
  if (cameraInputRef.value) {
    cameraInputRef.value.click();
  }
};

const handleFileChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    const res = await CameraService.compressImage(file, 960, 720, 0.65);
    emit('photoCaptured', res.dataUrl);
  } catch (err: any) {
    emit('cameraError', err.message || 'Gagal memproses foto dari kamera.');
  } finally {
    if (cameraInputRef.value) {
      cameraInputRef.value.value = '';
    }
  }
};

const handleSurveyClick = () => {
  if (props.currentStep === 4) {
    emit('submitSurvey');
  } else {
    emit('nextStep');
  }
};

defineExpose({
  triggerCamera
});
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

    <!-- 3. TOMBOL TENGAH JEPRET KAMERA / SURVEY ACTION -->
    <div class="center-camera-wrapper">
      <!-- Tombol saat mode survei (Fase 1) -->
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

      <!-- Tombol Jepret Kamera Utama -->
      <button 
        v-else
        type="button" 
        class="camera-center-btn"
        @click="triggerCamera"
        title="Jepret Foto Pekarangan Langsung"
      >
        <svg class="camera-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
        <span class="camera-plus-badge">+</span>
      </button>

      <!-- Input file kamera tersembunyi yang langsung memicu kamera perangkat -->
      <input 
        ref="cameraInputRef"
        type="file" 
        accept="image/*" 
        capture="environment" 
        style="display: none;" 
        @change="handleFileChange" 
      />
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
.center-camera-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex: 0 0 62px;
  height: 100%;
}

.camera-center-btn {
  position: relative;
  top: -14px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 60%, #15803d 100%);
  border: 3.5px solid #ffffff;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(22, 163, 74, 0.42);
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease;
  user-select: none;
  padding: 0;
}

.camera-center-btn:active {
  transform: translateY(2px) scale(0.92);
  box-shadow: 0 2px 10px rgba(22, 163, 74, 0.3);
}

.camera-icon-svg {
  width: 25px;
  height: 25px;
  stroke: #ffffff;
}

.camera-plus-badge {
  position: absolute;
  bottom: 5px;
  right: 5px;
  background: #ffffff;
  color: #16a34a;
  font-size: 11px;
  font-weight: 900;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
  line-height: 1;
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
