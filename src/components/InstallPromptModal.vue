<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePwaInstall } from '../composables/usePwaInstall';
import AppIcon from './AppIcon.vue';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'installed'): void;
}>();

const { isInstalled, promptInstall } = usePwaInstall();

const isIos = ref(false);
const isInAppBrowser = ref(false);
const showManualGuide = ref(false);
const installState = ref<'idle' | 'installing' | 'success' | 'manual'>('idle');

onMounted(() => {
  const ua = navigator.userAgent || '';
  isIos.value = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
  isInAppBrowser.value = /FBAN|FBAV|Instagram|WhatsApp|Line|Telegram|MicroMessenger/i.test(ua);

  if (isIos.value || isInAppBrowser.value) {
    showManualGuide.value = true;
    installState.value = 'manual';
  }
});

const handleInstallClick = async () => {
  if (isIos.value || isInAppBrowser.value) {
    showManualGuide.value = true;
    installState.value = 'manual';
    return;
  }

  installState.value = 'installing';
  try {
    const result = await promptInstall();
    if (result === 'success') {
      installState.value = 'success';
      emit('installed');
    } else if (result === 'dismissed') {
      installState.value = 'idle';
    } else {
      // Prompt otomatis tidak didukung / ditahan browser -> tampilkan panduan manual
      showManualGuide.value = true;
      installState.value = 'manual';
    }
  } catch {
    showManualGuide.value = true;
    installState.value = 'manual';
  }
};
</script>

<template>
  <div class="pwa-install-overlay" @click.self="emit('close')">
    <div class="pwa-install-dialog">
      <!-- Close Button (Top Right) -->
      <button 
        type="button" 
        class="pwa-close-btn" 
        @click="emit('close')"
        title="Tutup"
        aria-label="Tutup"
      >
        ✕
      </button>

      <!-- 1. SUCCESS STATE: Aplikasi Sudah Terpasang -->
      <div v-if="installState === 'success' || isInstalled" class="pwa-content-flow">
        <div class="pwa-success-badge">
          <AppIcon name="check" size="lg" color="#15803d" />
        </div>
        <div class="pwa-text-group">
          <h3 class="pwa-dialog-title">Aplikasi Berhasil Dipasang!</h3>
          <p class="pwa-dialog-desc">
            Ikon <strong>Pekarangan</strong> kini sudah aktif di layar utama HP Anda. Buka melalui ikon tersebut untuk pengalaman offline-first penuh.
          </p>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="btn-pwa-primary"
        >
          Buka Pekarangan
        </button>
      </div>

      <!-- 2. IN-APP BROWSER (WhatsApp, Telegram, IG, dll) -->
      <div v-else-if="isInAppBrowser" class="pwa-content-flow">
        <div class="pwa-warning-badge">
          ⚠️
        </div>
        <div class="pwa-text-group">
          <h3 class="pwa-dialog-title">Buka di Browser Utama</h3>
          <p class="pwa-dialog-desc">
            Aplikasi obrolan membatasi fitur pemasangan PWA langsung. Untuk memasang ke layar HP:
          </p>
        </div>
        <div class="pwa-guide-box">
          <p class="pwa-guide-label">Langkah mudah:</p>
          <ol class="pwa-guide-list">
            <li>Ketuk menu <strong>titik tiga (⋮)</strong> di pojok browser ini.</li>
            <li>Pilih <strong>"Buka di Browser"</strong> (Chrome / Safari).</li>
            <li>Setelah terbuka di browser utama, pasang langsung dari sana.</li>
          </ol>
        </div>
        <div class="pwa-action-stack">
          <a
            href="https://github.com/crediblemark-official/pekarangan/releases/tag/v2.1.0"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-pwa-dark"
          >
            <AppIcon name="download" size="xs" color="#ffffff" />
            <span>Unduh File APK Android</span>
          </a>
          <button
            type="button"
            @click="emit('close')"
            class="btn-pwa-ghost"
          >
            Tutup
          </button>
        </div>
      </div>

      <!-- 3. iOS SAFARI INSTRUCTIONS -->
      <div v-else-if="isIos" class="pwa-content-flow">
        <img src="/pwa-192x192.png" alt="Pekarangan" class="pwa-app-icon" />
        <div class="pwa-text-group">
          <h3 class="pwa-dialog-title">Pasang di iPhone / iPad</h3>
          <p class="pwa-dialog-desc">
            Gunakan fitur bawaan Safari untuk memasang Pekarangan ke layar utama:
          </p>
        </div>
        <div class="pwa-guide-box">
          <ol class="pwa-guide-list">
            <li>Ketuk tombol <strong>Bagikan (Share)</strong> — ikon kotak panah ke atas di bilah Safari.</li>
            <li>Gulir ke bawah dan ketuk <strong>"Tambahkan ke Layar Utama"</strong>.</li>
            <li>Ketuk <strong>"Tambah"</strong> di pojok kanan atas.</li>
          </ol>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="btn-pwa-primary"
        >
          Saya Mengerti
        </button>
      </div>

      <!-- 4. MANUAL FALLBACK (Jika browser menolak / cooldown / Desktop) -->
      <div v-else-if="installState === 'manual' || showManualGuide" class="pwa-content-flow">
        <img src="/pwa-192x192.png" alt="Pekarangan" class="pwa-app-icon" />
        <div class="pwa-text-group">
          <h3 class="pwa-dialog-title">Pasang Aplikasi Pekarangan</h3>
          <p class="pwa-dialog-desc">
            Browser Anda mengunci dialog otomatis. Pasang manual dalam 2 detik:
          </p>
        </div>
        <div class="pwa-guide-steps">
          <div class="pwa-step-item">
            <span class="pwa-step-num">1</span>
            <p>Ketuk menu <strong>titik tiga (⋮)</strong> atau ikon install (💻⬇️) di bilah atas browser.</p>
          </div>
          <div class="pwa-step-item">
            <span class="pwa-step-num">2</span>
            <p>Pilih menu <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar utama"</strong>.</p>
          </div>
        </div>
        <div class="pwa-action-stack">
          <a
            href="https://github.com/crediblemark-official/pekarangan/releases/tag/v2.1.0"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-pwa-dark"
          >
            <AppIcon name="download" size="xs" color="#ffffff" />
            <span>Unduh File APK Android Resmi</span>
          </a>
          <button
            type="button"
            @click="emit('close')"
            class="btn-pwa-ghost"
          >
            Lanjut Menggunakan Versi Web
          </button>
        </div>
      </div>

      <!-- 5. DEFAULT PROMPT (Direct 1-Click Install via beforeinstallprompt) -->
      <div v-else class="pwa-content-flow">
        <img src="/pwa-192x192.png" alt="Pekarangan" class="pwa-app-icon" />

        <div class="pwa-text-group">
          <h3 class="pwa-dialog-title">Pasang Aplikasi Pekarangan</h3>
          <p class="pwa-dialog-desc">
            Pasang langsung ke layar utama HP Anda. Berjalan 100% offline tanpa kuota internet &amp; bebas iklan.
          </p>
        </div>

        <div class="pwa-benefits-box">
          <div class="pwa-benefit-item">
            <AppIcon name="check" size="xs" color="#15803d" />
            <span>100% Offline (catat panen tanpa sinyal)</span>
          </div>
          <div class="pwa-benefit-item">
            <AppIcon name="check" size="xs" color="#15803d" />
            <span>Sangat ringan (~2MB), tanpa Play Store</span>
          </div>
          <div class="pwa-benefit-item">
            <AppIcon name="check" size="xs" color="#15803d" />
            <span>Gratis selamanya, privasi aman di HP</span>
          </div>
        </div>

        <div class="pwa-action-stack">
          <button
            type="button"
            @click="handleInstallClick"
            :disabled="installState === 'installing'"
            class="btn-pwa-primary"
          >
            <AppIcon name="download" size="sm" color="#ffffff" />
            <span>{{ installState === 'installing' ? 'Menyiapkan...' : 'Pasang Sekarang ke HP' }}</span>
          </button>

          <button
            type="button"
            @click="emit('close')"
            class="btn-pwa-ghost"
          >
            Lanjut Menggunakan di Web Saja
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Fullscreen Backdrop Overlay */
.pwa-install-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background-color: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: pwaFadeIn 0.2s ease-out;
}

/* Modal Card */
.pwa-install-dialog {
  position: relative;
  background: #ffffff;
  width: 100%;
  max-width: 375px;
  border-radius: 24px;
  padding: 24px 20px 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(226, 232, 240, 0.9);
  text-align: center;
  box-sizing: border-box;
  animation: pwaPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Close Button */
.pwa-close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1;
}

.pwa-close-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

/* Content Flow */
.pwa-content-flow {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
}

/* App Icon Image */
.pwa-app-icon {
  width: 68px;
  height: 68px;
  border-radius: 18px;
  margin: 4px auto 0;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  object-fit: cover;
  display: block;
  border: 1px solid #f1f5f9;
}

/* Badges */
.pwa-success-badge {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: #dcfce7;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 4px auto 0;
}

.pwa-warning-badge {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #fef3c7;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 4px auto 0;
}

/* Typography */
.pwa-text-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.pwa-dialog-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.pwa-dialog-desc {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0;
  line-height: 1.45;
}

/* Benefits Box */
.pwa-benefits-box {
  width: 100%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.pwa-benefit-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: #334155;
  font-weight: 500;
}

/* Guide Box */
.pwa-guide-box {
  width: 100%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 14px;
  box-sizing: border-box;
  text-align: left;
}

.pwa-guide-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px 0;
}

.pwa-guide-list {
  margin: 0;
  padding-left: 18px;
  font-size: 0.76rem;
  color: #475569;
  line-height: 1.5;
}

/* 2-Step Guide */
.pwa-guide-steps {
  width: 100%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}

.pwa-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.pwa-step-item p {
  margin: 0;
  font-size: 0.78rem;
  color: #334155;
  line-height: 1.4;
}

.pwa-step-num {
  width: 20px;
  height: 20px;
  border-radius: 9999px;
  background: #15803d;
  color: #ffffff;
  font-weight: 700;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

/* Action Buttons Stack */
.pwa-action-stack {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 2px;
}

/* Buttons */
.btn-pwa-primary {
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  background: #15803d;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.88rem;
  border-radius: 14px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(21, 128, 61, 0.25);
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.btn-pwa-primary:hover {
  background: #166534;
}

.btn-pwa-primary:active {
  transform: scale(0.98);
}

.btn-pwa-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-pwa-dark {
  width: 100%;
  min-height: 42px;
  padding: 10px 16px;
  background: #0f172a;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.82rem;
  border-radius: 14px;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.btn-pwa-dark:hover {
  background: #000000;
}

.btn-pwa-dark:active {
  transform: scale(0.98);
}

.btn-pwa-ghost {
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 10px;
  transition: color 0.15s ease;
}

.btn-pwa-ghost:hover {
  color: #0f172a;
}

/* Animations */
@keyframes pwaFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pwaPop {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
