<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { KabarCategory, CommunityPostItem } from '../types';
import { StorageService } from '../services/storage';
import { TursoService, isTursoConfigured } from '../services/turso';
import { CameraService } from '../services/camera';
import AppIcon from './AppIcon.vue';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'postCreated', post: CommunityPostItem): void;
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
}>();

const settings = StorageService.getSettings();

// Modes: 'viewfinder' (live camera) | 'caption' (review & write caption)
const mode = ref<'viewfinder' | 'caption'>('viewfinder');

// Video & Stream State
const videoRef = ref<HTMLVideoElement | null>(null);
const fileFallbackRef = ref<HTMLInputElement | null>(null);
const mediaStream = ref<MediaStream | null>(null);
const cameraFacing = ref<'environment' | 'user'>('environment');
const isCameraLoading = ref(true);
const cameraError = ref<string | null>(null);
const shutterFlashing = ref(false);

// Captured Photo & Post State
const capturedPhotoUrl = ref<string>('');
const caption = ref('');
const selectedCategory = ref<KabarCategory>('panen');
const isMamasar = ref(false);
const isSubmitting = ref(false);

const CATEGORIES = [
  { id: 'panen', label: 'Panen', icon: 'wheat' },
  { id: 'tanam', label: 'Tanam', icon: 'sprout' },
  { id: 'ternak', label: 'Ternak', icon: 'egg' },
  { id: 'dapur', label: 'Dapur', icon: 'utensils' },
  { id: 'apotek', label: 'Apotek', icon: 'pill' },
  { id: 'berbagi', label: 'Berbagi', icon: 'heart-handshake' },
  { id: 'rpp', label: 'RPP', icon: 'package' }
];

const CAPTION_SUGGESTIONS = [
  'Panen segar hari ini dari pekarangan',
  'Pungut telur pekarangan segar',
  'Semai bibit baru di polybag',
  'Masak sayur organik hasil kebun sendiri'
];

const stopCameraStream = () => {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(track => track.stop());
    mediaStream.value = null;
  }
};

const startCamera = async () => {
  isCameraLoading.value = true;
  cameraError.value = null;
  stopCameraStream();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraError.value = 'Browser atau perangkat ini belum mendukung kamera langsung.';
    isCameraLoading.value = false;
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: cameraFacing.value,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    mediaStream.value = stream;
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      await videoRef.value.play();
    }
  } catch (err: any) {
    console.warn('Gagal membuka kamera langsung:', err);
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      cameraError.value = 'Izin kamera ditolak. Berikan izin kamera di browser Anda.';
    } else {
      cameraError.value = 'Tidak dapat mengakses kamera: ' + (err.message || 'Kamera sedang digunakan');
    }
  } finally {
    isCameraLoading.value = false;
  }
};

const switchCamera = async () => {
  cameraFacing.value = cameraFacing.value === 'environment' ? 'user' : 'environment';
  await startCamera();
};

const takeShutter = () => {
  const video = videoRef.value;
  if (!video || !video.videoWidth) return;

  // Visual flash effect
  shutterFlashing.value = true;
  setTimeout(() => {
    shutterFlashing.value = false;
  }, 180);

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Jika kamera depan, mirror balik horizontal agar natural
  if (cameraFacing.value === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

  capturedPhotoUrl.value = dataUrl;
  stopCameraStream();
  mode.value = 'caption';
};

const retakePhoto = async () => {
  capturedPhotoUrl.value = '';
  mode.value = 'viewfinder';
  await startCamera();
};

const handleGalleryPick = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    const res = await CameraService.compressImage(file, 960, 720, 0.7);
    capturedPhotoUrl.value = res.dataUrl;
    stopCameraStream();
    mode.value = 'caption';
  } catch (err: any) {
    emit('showToast', err.message || 'Gagal memproses foto dari galeri', 'error');
  } finally {
    if (fileFallbackRef.value) fileFallbackRef.value.value = '';
  }
};

const applySuggestion = (sug: string) => {
  if (!caption.value.trim()) {
    caption.value = sug;
  } else {
    caption.value += '. ' + sug;
  }
};

const handleShare = async () => {
  if (!caption.value.trim()) {
    emit('showToast', 'Beri sedikit catatan kabar untuk foto pekarangan Anda', 'warning');
    return;
  }

  isSubmitting.value = true;
  const authorName = settings.ownerName || settings.cadreName || 'Warga Nahdliyin';
  const yardName = settings.yardName || 'Pekarangan Mandiri';
  const ranting = settings.ranting || 'Gapura Timur';
  const mwcZone = settings.mwcZone || 'MWC Gapura';

  let title = caption.value.trim().split('\n')[0];
  if (title.length > 45) {
    title = title.substring(0, 42) + '...';
  }

  const newPost: CommunityPostItem = {
    id: 'post-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    authorId: settings.phone || 'mbr-local',
    authorName,
    authorPhone: settings.phone,
    yardName,
    ranting,
    mwcZone,
    category: selectedCategory.value,
    title,
    content: caption.value.trim(),
    photoUrl: capturedPhotoUrl.value,
    isMamasarProduct: selectedCategory.value === 'rpp' && isMamasar.value,
    reactions: { keren: 1, suka: 0, seger: 0, semangat: 0 },
    userReaction: 'keren',
    createdAt: new Date().toISOString()
  };

  StorageService.addCommunityPost(newPost);

  if (isTursoConfigured() && navigator.onLine) {
    TursoService.createCommunityPost(newPost).catch(err => {
      console.warn('Gagal sync kabar pekarangan ke Turso:', err);
    });
  }

  isSubmitting.value = false;
  caption.value = '';
  selectedCategory.value = 'panen';
  isMamasar.value = false;

  stopCameraStream();
  emit('postCreated', newPost);
  emit('close');
  emit('showToast', 'Kabar pekarangan berhasil dibagikan ke warga.', 'success');
};

const handleClose = () => {
  stopCameraStream();
  emit('close');
};

onMounted(() => {
  startCamera();
});

onBeforeUnmount(() => {
  stopCameraStream();
});
</script>

<template>
  <div v-if="show" class="camera-modal-backdrop">
    <!-- =================================================================== -->
    <!-- MODE 1: VIEWFINDER (KAMERA LANGSUNG DI DALAM APLIKASI)              -->
    <!-- =================================================================== -->
    <div v-if="mode === 'viewfinder'" class="viewfinder-container">
      <!-- White Flash on Shutter -->
      <div v-if="shutterFlashing" class="shutter-flash"></div>

      <!-- Top Bar: Close & Camera Indicator -->
      <div class="viewfinder-top-bar">
        <button 
          type="button" 
          class="btn-camera-ctrl active:scale-90 transition-transform" 
          @click="handleClose" 
          title="Tutup Kamera"
          aria-label="Tutup Kamera"
        >
          <AppIcon name="x" size="md" color="#ffffff" />
        </button>
        
        <div class="camera-badge-title">
          <AppIcon name="sprout" size="xs" color="#34d399" />
          <span>Kamera Pekarangan</span>
        </div>

        <button 
          type="button" 
          class="btn-camera-ctrl active:scale-90 transition-transform" 
          @click="switchCamera" 
          title="Balik Kamera"
          aria-label="Balik Kamera"
        >
          <AppIcon name="refresh" size="md" color="#ffffff" />
        </button>
      </div>

      <!-- Live Video Viewfinder -->
      <div class="video-wrapper">
        <video 
          ref="videoRef" 
          autoplay 
          playsinline 
          muted 
          class="camera-video-elem"
        ></video>

        <!-- Loading Spinner -->
        <div v-if="isCameraLoading" class="camera-loading-overlay">
          <div class="spinner" style="width: 32px; height: 32px; border-width: 3px; border-color: #22c55e; border-top-color: transparent;"></div>
          <span class="text-xs text-neutral-300 font-medium mt-3">Menghubungkan sensor kamera...</span>
        </div>

        <!-- Error State / Fallback -->
        <div v-if="cameraError" class="camera-error-overlay">
          <AppIcon name="camera" size="xl" class="text-neutral-400 mb-2" />
          <div class="text-sm font-semibold text-white mb-1">Kamera Tidak Tersedia</div>
          <div class="text-xs text-neutral-400 max-w-xs mb-4 leading-relaxed">
            {{ cameraError }}
          </div>
          <button 
            type="button" 
            class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg active:scale-95 transition-transform"
            @click="fileFallbackRef?.click()"
          >
            <AppIcon name="image" size="sm" />
            <span>Pilih dari Galeri</span>
          </button>
        </div>
      </div>

      <!-- Bottom Control Bar: Gallery, Shutter, Switch -->
      <div class="viewfinder-bottom-bar">
        <!-- Galeri Button -->
        <button 
          type="button" 
          class="control-btn gallery-btn" 
          @click="fileFallbackRef?.click()"
          title="Buka Galeri Foto"
          aria-label="Galeri"
        >
          <AppIcon name="image" size="lg" color="#ffffff" />
        </button>

        <!-- Shutter Button (Lingkaran Putih Tactile) -->
        <button 
          type="button" 
          class="shutter-btn" 
          :disabled="isCameraLoading || !!cameraError"
          @click="takeShutter"
          title="Jepret Foto"
          aria-label="Ambil Foto"
        >
          <div class="shutter-inner"></div>
        </button>

        <!-- Flip Camera Button -->
        <button 
          type="button" 
          class="control-btn flip-btn" 
          @click="switchCamera" 
          title="Ganti Kamera Depan/Belakang"
          aria-label="Balik Kamera"
        >
          <AppIcon name="refresh" size="lg" color="#ffffff" />
        </button>
      </div>

      <!-- Hidden Gallery File Picker -->
      <input 
        ref="fileFallbackRef"
        type="file" 
        accept="image/*" 
        style="display: none;" 
        @change="handleGalleryPick" 
      />
    </div>

    <!-- =================================================================== -->
    <!-- MODE 2: CAPTION & BAGIKAN (FULL-EDGE BOTTOM SHEET ANTI-SLOP)         -->
    <!-- =================================================================== -->
    <div v-else-if="mode === 'caption'" class="caption-container">
      <div class="caption-sheet">
        <div class="sheet-top-row">
          <div class="sheet-title-info">
            <div class="flex items-center gap-1.5">
              <AppIcon name="camera" size="sm" class="text-emerald-600" />
              <span class="sheet-heading">Kabar Pekarangan</span>
            </div>
            <span class="sheet-subheading">Ceritakan perkembangan pekarangan Anda</span>
          </div>
          <button 
            type="button" 
            class="btn-sheet-close active:scale-90 transition-transform" 
            @click="handleClose"
            aria-label="Tutup"
          >
            <AppIcon name="x" size="md" />
          </button>
        </div>

        <!-- Photo Preview with Retake -->
        <div class="preview-box">
          <img :src="capturedPhotoUrl" alt="Foto Hasil Jepretan" class="preview-img" />
          <button 
            type="button" 
            class="btn-retake-floating active:scale-95 transition-transform" 
            @click="retakePhoto"
          >
            <AppIcon name="refresh" size="xs" />
            <span>Foto Ulang</span>
          </button>
        </div>

        <!-- Category Picker -->
        <div class="cat-picker-box">
          <div class="cat-label">Kategori Kabar</div>
          <div class="cat-scroll">
            <button 
              v-for="cat in CATEGORIES" 
              :key="cat.id"
              type="button" 
              class="cat-chip"
              :class="{ active: selectedCategory === cat.id }"
              @click="selectedCategory = cat.id as KabarCategory"
            >
              <AppIcon :name="cat.icon" size="xs" />
              <span>{{ cat.label }}</span>
            </button>
          </div>
        </div>

        <!-- Caption Input Area -->
        <div class="caption-input-box">
          <textarea 
            v-model="caption" 
            rows="3" 
            class="caption-textarea" 
            placeholder="Tulis catatan kabar pekaranganmu... (contoh: Panen bayam dan cabai rawit segar hari ini)"
            autofocus
          ></textarea>

          <!-- Suggestion pills -->
          <div class="suggestion-scroll">
            <button 
              v-for="(sug, idx) in CAPTION_SUGGESTIONS" 
              :key="idx"
              type="button" 
              class="sug-chip active:scale-95 transition-transform" 
              @click="applySuggestion(sug)"
            >
              {{ sug }}
            </button>
          </div>
        </div>

        <!-- Mamasar Checkbox jika RPP -->
        <div v-if="selectedCategory === 'rpp'" class="mamasar-box">
          <label class="mamasar-label">
            <input type="checkbox" v-model="isMamasar" class="accent-emerald-600 rounded" />
            <div class="flex items-center gap-1.5">
              <AppIcon name="package" size="xs" class="text-emerald-700" />
              <span>Tandai produk olahan siap dipasarkan (Mamasar)</span>
            </div>
          </label>
        </div>

        <!-- Bottom Actions (One-Word Button Rule) -->
        <div class="sheet-actions">
          <button 
            type="button" 
            class="btn-sheet-cancel active:scale-[0.98] transition-transform" 
            @click="handleClose"
          >
            Batal
          </button>
          <button 
            type="button" 
            class="btn-sheet-submit active:scale-[0.98] transition-transform" 
            :disabled="isSubmitting"
            @click="handleShare"
          >
            <AppIcon v-if="!isSubmitting" name="send" size="sm" color="#ffffff" />
            <span v-if="isSubmitting" class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span>
            <span>{{ isSubmitting ? 'Mengirim' : 'Bagikan' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.camera-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ================= VIEWFINDER ================= */
.viewfinder-container {
  width: 100%;
  max-width: 480px;
  height: 100%;
  position: relative;
  background: #000000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.shutter-flash {
  position: absolute;
  inset: 0;
  background: #ffffff;
  z-index: 100;
  animation: flashAnim 0.18s ease-out forwards;
}

@keyframes flashAnim {
  0% { opacity: 0.9; }
  100% { opacity: 0; }
}

.viewfinder-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 16px 12px;
  background: linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%);
}

.btn-camera-ctrl {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(8px);
}

.camera-badge-title {
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  background: rgba(15, 23, 42, 0.55);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  gap: 6px;
  backdrop-filter: blur(6px);
}

.video-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000000;
  overflow: hidden;
}

.camera-video-elem {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.camera-loading-overlay, .camera-error-overlay {
  position: absolute;
  inset: 0;
  background: #090d16;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}

.viewfinder-bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 20px 24px calc(24px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%);
}

.control-btn {
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: transform 0.12s ease;
}

.control-btn:active {
  transform: scale(0.9);
}

/* SHUTTER BUTTON */
.shutter-btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: transparent;
  border: 3.5px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 4px 18px rgba(0,0,0,0.45);
  transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.shutter-btn:active {
  transform: scale(0.9);
}

.shutter-inner {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: #ffffff;
  transition: all 0.12s ease;
}

.shutter-btn:active .shutter-inner {
  transform: scale(0.85);
  background: #22c55e;
}

/* ================= CAPTION SHEET ================= */
.caption-container {
  width: 100%;
  max-width: 480px;
  height: 100%;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
}

.caption-sheet {
  width: 100%;
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  padding: 14px 16px calc(18px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -12px 36px rgba(0, 0, 0, 0.28);
  animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 94vh;
  overflow-y: auto;
}

.caption-sheet::before {
  content: '';
  display: block;
  width: 32px;
  height: 3.5px;
  background: #cbd5e1;
  border-radius: 2px;
  margin: 0 auto 10px;
}

.sheet-top-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.sheet-heading {
  font-weight: 700;
  font-size: 0.95rem;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.sheet-subheading {
  display: block;
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 1px;
}

.btn-sheet-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.preview-box {
  position: relative;
  margin: 10px -16px 12px;
  border-radius: 0;
  overflow: hidden;
  background: #090d16;
  border: none;
  max-height: 360px;
}

.preview-img {
  width: 100%;
  max-height: 360px;
  object-fit: cover;
  display: block;
}

.btn-retake-floating {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(15, 23, 42, 0.78);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(6px);
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.cat-picker-box {
  margin-bottom: 10px;
}

.cat-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cat-scroll {
  display: flex;
  gap: 5px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}
.cat-scroll::-webkit-scrollbar {
  display: none;
}

.cat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 16px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.12s ease;
}

.cat-chip.active {
  background: #dcfce7;
  border-color: #86efac;
  color: #15803d;
}

.caption-input-box {
  margin-bottom: 10px;
}

.caption-textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 0.82rem;
  line-height: 1.4;
  color: #0f172a;
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
  background: #ffffff;
}

.caption-textarea:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.18);
}

.suggestion-scroll {
  display: flex;
  gap: 5px;
  overflow-x: auto;
  margin-top: 6px;
  padding-bottom: 2px;
  scrollbar-width: none;
}
.suggestion-scroll::-webkit-scrollbar {
  display: none;
}

.sug-chip {
  display: inline-block;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 3px 8px;
  font-size: 0.65rem;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
}

.mamasar-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 6px 10px;
  margin-bottom: 10px;
}

.mamasar-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.74rem;
  font-weight: 600;
  color: #166534;
  cursor: pointer;
}

.sheet-actions {
  display: flex;
  gap: 8px;
}

.btn-sheet-cancel {
  flex: 1;
  padding: 9px;
  font-size: 0.8rem;
  font-weight: 600;
  border-radius: 10px;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  cursor: pointer;
}

.btn-sheet-submit {
  flex: 2;
  padding: 9px;
  font-size: 0.82rem;
  font-weight: 700;
  border-radius: 10px;
  background: #16a34a;
  color: #ffffff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
