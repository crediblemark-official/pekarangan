<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { SecurityService } from '../services/security';
import { StorageService } from '../services/storage';

const emit = defineEmits<{
  (e: 'unlocked'): void;
}>();

const settings = StorageService.getSettings();
const isAuthenticating = ref(false);
const errorMsg = ref('');
const biometryInfo = ref('Sidik Jari / Kunci Layar HP');

const attemptUnlock = async () => {
  isAuthenticating.value = true;
  errorMsg.value = '';

  try {
    const res = await SecurityService.authenticate('Buka akses data pekarangan Anda');
    if (res.success) {
      emit('unlocked');
    } else if (res.message) {
      errorMsg.value = res.message;
    }
  } catch (err: any) {
    errorMsg.value = err?.message || 'Gagal memverifikasi';
  } finally {
    isAuthenticating.value = false;
  }
};

onMounted(async () => {
  // Jika di browser desktop, langsung buka otomatis
  if (!SecurityService.isNative()) {
    emit('unlocked');
    return;
  }

  const bio = await SecurityService.checkBiometry();
  if (bio.biometryType) {
    biometryInfo.value = bio.biometryType;
  }
  // Otomatis coba panggil biometrik saat pertama tampil di HP
  setTimeout(() => {
    attemptUnlock();
  }, 400);
});
</script>

<template>
  <div class="biometric-lock-modal">
    <div class="lock-card">
      <!-- Shield / Biometric Icon -->
      <div class="lock-icon-wrapper" @click="attemptUnlock">
        <div class="lock-pulse-ring"></div>
        <div class="lock-icon-inner">
          <span class="fingerprint-emoji">🔒</span>
        </div>
      </div>

      <div class="lock-header">
        <h2 class="lock-title">Pekarangan Terkunci</h2>
        <p class="lock-subtitle">
          Dilindungi oleh sensor <strong>{{ biometryInfo }}</strong> bawaan HP Anda.
        </p>
      </div>

      <!-- Identity Card -->
      <div class="identity-badge">
        <span class="badge-icon">🏡</span>
        <div class="badge-text">
          <div class="badge-name">{{ settings.yardName || 'Pekarangan Keluarga' }}</div>
          <div class="badge-rt">{{ settings.ownerName ? settings.ownerName + ' • ' : '' }}RT {{ settings.defaultRtRw || '01/02' }}</div>
        </div>
      </div>

      <!-- Error message if any -->
      <div v-if="errorMsg" class="lock-error-alert">
        <span>⚠️</span>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Unlock Action Button -->
      <button 
        type="button" 
        class="btn-unlock-biometric"
        :disabled="isAuthenticating"
        @click="SecurityService.isNative() ? attemptUnlock() : emit('unlocked')"
      >
        <span v-if="isAuthenticating" class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span>
        <template v-else>
          <span style="font-size: 1.25rem;">👆</span>
          <span>{{ SecurityService.isNative() ? 'Buka Kunci Layar / Sidik Jari' : 'Buka Pekarangan (Mode Desktop)' }}</span>
        </template>
      </button>

      <button 
        v-if="!SecurityService.isNative()"
        type="button"
        style="background: transparent; border: none; color: #86efac; font-size: 0.74rem; margin-top: 10px; cursor: pointer; text-decoration: underline;"
        @click="emit('unlocked')"
      >
        Buka Langsung di Desktop Browser ➔
      </button>

      <div class="lock-footer-info">
        <span>🛡️ Data tersimpan aman & privat di perangkat ini</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.biometric-lock-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: radial-gradient(circle at top, #14532d 0%, #062312 60%, #021208 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.lock-card {
  width: 100%;
  max-width: 360px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 28px;
  padding: 32px 24px;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lock-icon-wrapper {
  position: relative;
  width: 88px;
  height: 88px;
  margin-bottom: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-pulse-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid rgba(74, 222, 128, 0.35);
  animation: pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.lock-icon-inner {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(21, 128, 61, 0.4));
  border: 2px solid rgba(74, 222, 128, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
}

.fingerprint-emoji {
  font-size: 38px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.lock-header {
  margin-bottom: 20px;
}

.lock-title {
  color: #ffffff;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 6px 0;
}

.lock-subtitle {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.82rem;
  line-height: 1.45;
  margin: 0;
}

.lock-subtitle strong {
  color: #86efac;
}

.identity-badge {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 10px 14px;
  margin-bottom: 22px;
  text-align: left;
}

.badge-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-text {
  flex: 1;
}

.badge-name {
  color: #ffffff;
  font-weight: 700;
  font-size: 0.92rem;
}

.badge-rt {
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.72rem;
  margin-top: 2px;
}

.lock-error-alert {
  width: 100%;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #fca5a5;
  font-size: 0.76rem;
  padding: 8px 12px;
  border-radius: 10px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
}

.btn-unlock-biometric {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 14px 20px;
  border-radius: 16px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 25px -5px rgba(22, 163, 74, 0.4);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-unlock-biometric:active {
  transform: scale(0.97);
  box-shadow: 0 5px 15px -3px rgba(22, 163, 74, 0.3);
}

.lock-footer-info {
  margin-top: 18px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

@keyframes pulse {
  0% {
    transform: scale(0.96);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.12);
    opacity: 0.2;
  }
  100% {
    transform: scale(0.96);
    opacity: 0.8;
  }
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
</style>
