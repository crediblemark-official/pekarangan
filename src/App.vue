<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import type { MemberData, YardData, AssetItem, SurveyPayload, SyncQueueItem, SedekahLog } from './types';
import { GeoService, type GeoLocationResult } from './services/geo';
import { CameraService, type CompressionResult } from './services/camera';
import { StorageService } from './services/storage';
import { ApiService, getEffectiveGasUrl } from './services/api';

// Navigation & Screen Components
import AppBottomNav, { type AppNavTab } from './components/AppBottomNav.vue';
import HomeDashboard from './components/HomeDashboard.vue';
import CommunityHub from './components/CommunityHub.vue';
import RecordHub from './components/RecordHub.vue';
import SavingsKasMockup from './components/SavingsKasMockup.vue';
import ProfileView from './components/ProfileView.vue';
import BiometricLockOverlay from './components/BiometricLockOverlay.vue';
import OnboardingSetup from './components/OnboardingSetup.vue';
import { SecurityService } from './services/security';
import { Capacitor } from '@capacitor/core';

// Survey Step Components (Fase 1)
import Step1Member from './components/Step1Member.vue';
import Step2Yard from './components/Step2Yard.vue';
import Step3Assets from './components/Step3Assets.vue';
import Step4Review from './components/Step4Review.vue';
import QueueModal from './components/QueueModal.vue';

// Onboarding State: Wajibkan isi identitas pada instalasi baru jika nama pemilik belum diisi
const initialSettings = StorageService.getSettings();
const needsOnboarding = ref(!initialSettings.ownerName || !initialSettings.ownerName.trim());
const appSessionKey = ref(0);

const onOnboardingDone = () => {
  needsOnboarding.value = false;
  appSessionKey.value++;
  showToast('Identitas pekarangan berhasil disimpan! Selamat datang.', 'success');
};

// Biometric & Screen Lock State: Aktif di HP Android fisik, langsung terbuka di desktop browser
const isBiometricEnabled = ref(StorageService.getSettings().isBiometricLockEnabled !== false);
const isAppLocked = ref(
  Capacitor.isNativePlatform() &&
  isBiometricEnabled.value &&
  !SecurityService.isUnlocked()
);

const lockAppNow = () => {
  SecurityService.lockSession();
  isAppLocked.value = true;
};

const onAppUnlocked = () => {
  isAppLocked.value = false;
  showToast('Kunci layar terbuka. Selamat datang!', 'success');
};

// Active Screen (Default: 'home' Dashboard!)
const activeNavTab = ref<AppNavTab | 'survey'>('home');
const currentStep = ref(1);

const currentNavTitle = computed(() => {
  switch (activeNavTab.value) {
    case 'community': return '👥 Direktori Komunitas';
    case 'record': return '📝 Pusat Pencatatan';
    case 'insight': return '📊 Insight Penghematan';
    case 'profile': return '👤 Identitas Pekarangan';
    default: return 'Pekarangan';
  }
});

// Network & Queue State
const isOnline = ref(navigator.onLine);
const syncQueue = ref<SyncQueueItem[]>([]);
const isSyncing = ref(false);
const isSubmitting = ref(false);
const isGeoLoading = ref(false);
const isCameraLoading = ref(false);

// Modals State
const showQueueModal = ref(false);

// Sedekah Logs — shared state antara RecordHub (catat panen) dan SavingsKasMockup (tampilkan)
const sedekahLogs = ref<SedekahLog[]>([]);


const addSedekahLog = (log: SedekahLog) => {
  sedekahLogs.value.unshift(log);
};

// Google Apps Script Web App URL from environment
const GAS_URL = getEffectiveGasUrl();

// Toast Notification
const toast = reactive({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error' | 'warning'
});

const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  toast.message = message;
  toast.type = type;
  toast.show = true;
  setTimeout(() => {
    toast.show = false;
  }, 4000);
};

// Form Data Models (RT/RW starts empty without auto-fill)
const member = reactive<MemberData>({
  nama_lengkap: '',
  nama_panggilan: '',
  nomor_wa: '',
  rt_rw: '',
  alamat_catatan: '',
  gps_lat_long: '',
  status_verifikasi: 'VERIFIED'
});

const yard = reactive<YardData>({
  status_lahan: 'Milik Sendiri',
  tipe_permukaan: ['Tanah Terbuka'],
  estimasi_luas: '10-30 m²',
  zonasi_posisi: ['Depan'],
  paparan_sinar: 'Penuh (>6 jam)',
  sumber_air: 'PDAM',
  fasilitas_limbah: ['Komposter Ember'],
  drive_foto_url: ''
});

const assets = ref<AssetItem[]>([
  { 
    pilar_kategori: '1. Rumah Pangan Mandiri', 
    nama_komoditas: 'Cabai Rawit', 
    jumlah_estimasi: 5, 
    media_tanam: 'Polybag/Pot' 
  }
]);

const photo = ref<CompressionResult | null>(null);
const geoData = ref<GeoLocationResult | null>(null);

// Geolocation Handler
const fetchLocation = async () => {
  isGeoLoading.value = true;
  try {
    const loc = await GeoService.getCurrentPosition();
    geoData.value = loc;
    member.gps_lat_long = loc.formatted;
    showToast(`GPS terdeteksi (Akurasi: ±${loc.accuracy} m)`);
  } catch (err: any) {
    showToast(err.message, 'error');
  } finally {
    isGeoLoading.value = false;
  }
};

// Camera Capture & Compression
const onPhotoSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  isCameraLoading.value = true;
  try {
    const res = await CameraService.compressImage(file, 1280, 720, 0.7);
    photo.value = res;
    showToast(`Foto dikompres: ${res.originalSizeKB} KB ➔ ${res.compressedSizeKB} KB`);
  } catch (err: any) {
    showToast(err.message, 'error');
  } finally {
    isCameraLoading.value = false;
  }
};

const clearPhoto = () => {
  photo.value = null;
};

// Wizard Step Navigation & Validation
const nextStep = () => {
  if (currentStep.value === 1) {
    if (!member.nama_lengkap.trim()) {
      showToast('Nama lengkap wajib diisi!', 'warning');
      return;
    }
    if (!member.nomor_wa.trim()) {
      showToast('Nomor WhatsApp wajib diisi!', 'warning');
      return;
    }
    if (!member.rt_rw) {
      showToast('RT / RW wajib dipilih!', 'warning');
      return;
    }
  }
  if (currentStep.value < 4) {
    currentStep.value++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// Form Reset
const resetForm = () => {
  member.nama_lengkap = '';
  member.nama_panggilan = '';
  member.nomor_wa = '';
  member.rt_rw = '';
  member.alamat_catatan = '';
  member.gps_lat_long = '';
  photo.value = null;
  geoData.value = null;
  assets.value = [
    { pilar_kategori: '1. Rumah Pangan Mandiri', nama_komoditas: 'Cabai Rawit', jumlah_estimasi: 5, media_tanam: 'Polybag/Pot' }
  ];
};

// Submit Data
const submitForm = async () => {
  const payload: SurveyPayload = {
    member_data: { ...member },
    yard_data: { ...yard },
    assets_data: [...assets.value],
    image_base64: photo.value ? photo.value.base64 : ''
  };

  isSubmitting.value = true;

  if (!isOnline.value) {
    StorageService.addToSyncQueue(payload);
    refreshQueue();
    isSubmitting.value = false;
    showToast('Tersimpan di Antrean Offline HP (Blank Spot).', 'warning');
    resetForm();
    currentStep.value = 1;
    activeNavTab.value = 'record';
    return;
  }

  try {
    const res = await ApiService.submitSurvey(GAS_URL, payload);
    StorageService.incrementRecordedMembersCount();
    showToast(`Sukses! Member ID: ${res.member_id}`);
    resetForm();
    currentStep.value = 1;
    activeNavTab.value = 'record';
  } catch (err: any) {
    StorageService.addToSyncQueue(payload);
    refreshQueue();
    showToast(`Gagal kirim: ${err.message}. Data otomatis disimpan di HP.`, 'error');
    resetForm();
    currentStep.value = 1;
    activeNavTab.value = 'record';
  } finally {
    isSubmitting.value = false;
  }
};

// Offline Queue Operations
const refreshQueue = () => {
  syncQueue.value = StorageService.getSyncQueue();
};

const processSyncItem = async (item: SyncQueueItem) => {
  const type = item.type || 'survey';
  if (type === 'survey') {
    await ApiService.submitSurvey(GAS_URL, item.payload);
    StorageService.incrementRecordedMembersCount();
  } else if (type === 'register_account' || item.payload?.action === 'register_account') {
    await ApiService.registerAccount(GAS_URL, item.payload.account || item.payload);
  } else if (type === 'plant') {
    await ApiService.savePlant(GAS_URL, item.payload);
  } else if (type === 'livestock') {
    await ApiService.saveLivestock(GAS_URL, item.payload);
  } else if (type === 'update_phase') {
    await ApiService.updatePlantPhase(GAS_URL, item.payload.plantId, item.payload.phase, item.payload.progress);
  } else if (type === 'egg_log') {
    await ApiService.logEgg(GAS_URL, item.payload.livestockId, item.payload.count, item.payload.note);
  } else if (type === 'harvest') {
    await ApiService.logHarvest(GAS_URL, item.payload);
  } else if (type === 'consume') {
    await ApiService.logConsume(GAS_URL, item.payload);
  } else if (type === 'option') {
    await ApiService.addCustomOption(GAS_URL, item.payload.category, item.payload.value, item.payload.extra);
  }
};

const syncSingleItem = async (item: SyncQueueItem) => {
  StorageService.updateQueueItem(item.queueId, { status: 'SYNCING' });
  refreshQueue();

  try {
    await processSyncItem(item);
    StorageService.removeFromSyncQueue(item.queueId);
    refreshQueue();
    showToast(`"${item.title || 'Data'}" berhasil tersinkron!`);
  } catch (err: any) {
    StorageService.updateQueueItem(item.queueId, { 
      status: 'FAILED', 
      lastError: err.message, 
      retryCount: item.retryCount + 1 
    });
    refreshQueue();
    showToast(`Gagal sinkron antrean: ${err.message}`, 'error');
  }
};

const syncAllQueue = async () => {
  const items = StorageService.getSyncQueue();
  if (items.length === 0) return;

  isSyncing.value = true;
  let successCount = 0;

  for (const item of items) {
    try {
      await processSyncItem(item);
      StorageService.removeFromSyncQueue(item.queueId);
      successCount++;
    } catch (e: any) {
      StorageService.updateQueueItem(item.queueId, { 
        status: 'FAILED', 
        lastError: e.message, 
        retryCount: item.retryCount + 1 
      });
    }
  }

  refreshQueue();
  isSyncing.value = false;
  showToast(`Selesai sinkronisasi: ${successCount} dari ${items.length} terkirim.`);
};

const removeQueueItem = (queueId: string) => {
  StorageService.removeFromSyncQueue(queueId);
  refreshQueue();
  showToast('Antrean dihapus');
};

// Lifecycle
onMounted(() => {
  refreshQueue();

  // Cloud sync from Google Sheets database
  if (isOnline.value) {
    if (StorageService.getSyncQueue().length > 0) {
      syncAllQueue();
    }

    ApiService.fetchAllData(GAS_URL).then((cloudData) => {
      if (cloudData) {
        if (cloudData.members && cloudData.members.length > 0) {
          StorageService.setRecordedMembersCount(cloudData.members.length);
        }
        if (cloudData.plants && cloudData.plants.length > 0) {
          StorageService.savePlants(cloudData.plants);
        }
        if (cloudData.livestocks && cloudData.livestocks.length > 0) {
          StorageService.saveLivestocks(cloudData.livestocks);
        }
        if (cloudData.activityLogs && cloudData.activityLogs.length > 0) {
          StorageService.saveActivityLogs(cloudData.activityLogs);
        }
        if (cloudData.penghematanLogs && cloudData.penghematanLogs.length > 0) {
          StorageService.savePengematanLogs(cloudData.penghematanLogs);
        }

        // Single Device Session Check: jika akun telah diambil alih oleh HP lain
        const currentPhone = StorageService.getSettings().phone?.replace(/\D/g, '');
        const currentDevId = SecurityService.getDeviceId();
        if (currentPhone && cloudData.members && cloudData.members.length > 0) {
          const myCloudProfile = cloudData.members.find((m: any) => 
            String(m.nomor_wa || '').replace(/\D/g, '') === currentPhone
          );
          if (myCloudProfile && myCloudProfile.device_id && myCloudProfile.device_id !== currentDevId) {
            showToast('⚠️ Sesi akun ini telah dipindahkan ke HP lain.', 'warning');
          }
        }
      }
    }).catch(() => {});
  }

  window.addEventListener('online', () => {
    isOnline.value = true;
    showToast('Koneksi internet pulih. Menyinkronkan antrean...');
    if (StorageService.getSyncQueue().length > 0) {
      syncAllQueue();
    }
  });

  window.addEventListener('offline', () => {
    isOnline.value = false;
    showToast('Mode offline (Blank spot). Data tersimpan lokal di HP.', 'warning');
  });
});
</script>

<template>
  <div class="app-container">
    <!-- Top Sticky Header: Visible on regular screens -->
    <header v-if="activeNavTab !== 'survey'" class="app-header">
      <!-- 1. Home Dashboard: App Brand Header -->
      <div v-if="activeNavTab === 'home'" class="brand-wrapper">
        <div class="brand-logo">🌿</div>
        <div class="brand-info">
          <h1>Pekarangan</h1>
        </div>
      </div>

      <!-- 2. Other Screens: Page Title Header (Not App Header) -->
      <div v-else class="page-title-wrapper">
        <h1 class="page-title-text">{{ currentNavTitle }}</h1>
      </div>

      <div class="header-actions">
        <!-- Status dot -->
        <span 
          :class="['status-dot', isOnline ? 'online' : 'offline']" 
          :title="isOnline ? 'Online' : 'Offline'"
        ></span>

        <!-- Queue Badge Button -->
        <button 
          v-if="syncQueue.length > 0" 
          class="btn-icon" 
          @click="showQueueModal = true"
          title="Lihat antrean offline"
        >
          📥 <span style="font-size: 0.7rem; font-weight: 700; color: var(--accent);">{{ syncQueue.length }}</span>
        </button>

        <!-- Quick Biometric Lock Button -->
        <button 
          v-if="isBiometricEnabled" 
          class="btn-icon" 
          @click="lockAppNow"
          title="Kunci aplikasi dengan sidik jari/kunci layar"
        >
          🔒
        </button>
      </div>
    </header>

    <!-- Unified Survey Top Header (Connected Dots Stepper - Clean & Compact) -->
    <header v-if="activeNavTab === 'survey'" class="survey-top-header">
      <button 
        type="button" 
        class="survey-back-btn" 
        @click="currentStep > 1 ? prevStep() : activeNavTab = 'record'"
        :title="currentStep > 1 ? 'Kembali ke Langkah ' + (currentStep - 1) : 'Kembali ke Menu Catat'"
      >
        <span style="font-size: 1.25rem; font-weight: 700; line-height: 1;">←</span>
      </button>

      <div class="survey-dots-wrapper">
        <div class="survey-dots-track">
          <div 
            class="survey-dots-track-fill" 
            :style="{ width: ((currentStep - 1) / 3) * 100 + '%' }"
          ></div>
        </div>

        <button 
          v-for="step in [1, 2, 3, 4]" 
          :key="step"
          type="button"
          class="survey-dot-item" 
          :class="{ active: currentStep === step, completed: currentStep > step }"
          @click="currentStep >= step ? currentStep = step : null"
          :title="'Langkah ' + step"
        >
          <span class="survey-dot"></span>
        </button>
      </div>

      <div class="survey-step-counter">
        {{ currentStep }}/4
      </div>
    </header>

    <!-- Offline Sync Banner (Super Compact 1-Baris) -->
    <div v-if="syncQueue.length > 0 || !isOnline" :class="['sync-banner', { 'is-offline': !isOnline }]">
      <div class="sync-banner-text" @click="syncQueue.length > 0 ? showQueueModal = true : null" title="Klik untuk lihat antrean">
        <span v-if="!isOnline">
          📶 Offline<span v-if="syncQueue.length > 0"> • <strong>{{ syncQueue.length }} di HP</strong></span>
        </span>
        <span v-else>
          🟢 Online • <strong>{{ syncQueue.length }} antrean</strong>
        </span>
      </div>

      <div class="sync-banner-actions" v-if="syncQueue.length > 0">
        <button 
          type="button"
          class="btn-sync" 
          @click="showQueueModal = true"
          title="Buka daftar antrean"
        >
          📥 Lihat ({{ syncQueue.length }})
        </button>

        <button 
          v-if="isOnline"
          type="button"
          class="btn-sync btn-sync-accent" 
          :disabled="isSyncing"
          @click="syncAllQueue"
          title="Kirim semua antrean ke Google Sheets"
        >
          <span v-if="isSyncing" class="spinner" style="width: 10px; height: 10px; border-width: 2px;"></span>
          <span v-else>⚡ Kirim</span>
        </button>
      </div>
    </div>

    <!-- Main Content Views -->
    <main class="app-content" :key="appSessionKey">
      <!-- 1. HOME (BERANDA) -->
      <HomeDashboard 
        v-if="activeNavTab === 'home'" 
        @navigate="(tab) => activeNavTab = tab"
      />

      <!-- 2. COMMUNITY (DIREKTORI PEKARANGAN WARGA) -->
      <CommunityHub 
        v-if="activeNavTab === 'community'"
        @show-toast="showToast"
        @go-to-record="activeNavTab = 'record'"
        @go-to-profile="activeNavTab = 'profile'"
      />

      <!-- 3. CATAT (PUSAT PENCATATAN PEKARANGAN) -->
      <RecordHub 
        v-if="activeNavTab === 'record'"
        @open-survey="activeNavTab = 'survey'"
        @show-toast="showToast"
        @add-sedekah="addSedekahLog"
      />

      <!-- SURVEY / PENDATAAN (FASE 1) -->
      <div v-if="activeNavTab === 'survey'">
        <Step1Member 
          v-if="currentStep === 1"
          :member="member"
          :geo-data="geoData"
          :is-geo-loading="isGeoLoading"
          @fetch-location="fetchLocation"
        />

        <Step2Yard 
          v-if="currentStep === 2"
          :yard="yard"
          :photo="photo"
          :is-camera-loading="isCameraLoading"
          @photo-selected="onPhotoSelected"
          @clear-photo="clearPhoto"
        />

        <Step3Assets 
          v-if="currentStep === 3"
          :assets="assets"
          @show-toast="showToast"
        />

        <Step4Review 
          v-if="currentStep === 4"
          :member="member"
          :yard="yard"
          :assets="assets"
          :photo="photo"
          @go-to-ecosystem="activeNavTab = 'community'"
        />
      </div>

      <!-- 4. INSIGHT (TABUNGAN POIN & LOG PENGHEMATAN) -->
      <SavingsKasMockup 
        v-if="activeNavTab === 'insight'"
        :sedekah-logs="sedekahLogs"
        @show-toast="showToast"
      />

      <!-- 5. PROFILE (PROFIL & PENGATURAN) -->
      <ProfileView 
        v-if="activeNavTab === 'profile'"
        @show-toast="showToast"
        @open-queue="showQueueModal = true"
        @lock-app="lockAppNow"
      />
    </main>

    <!-- Wajib Isi Identitas Saat Instalasi Baru / Fresh Install -->
    <OnboardingSetup 
      v-if="needsOnboarding" 
      @done="onOnboardingDone" 
    />

    <!-- Biometric & Screen Lock Full-Screen Gate -->
    <BiometricLockOverlay 
      v-if="isAppLocked && !needsOnboarding" 
      @unlocked="onAppUnlocked" 
    />

    <!-- Fixed Bottom Navigation Bar (Tombol tengah berubah jadi Lanjut / Simpan saat mode survei) -->
    <AppBottomNav 
      :active-tab="activeNavTab === 'survey' ? 'record' : activeNavTab"
      :survey-queue-count="syncQueue.length"
      :is-survey-mode="activeNavTab === 'survey'"
      :current-step="currentStep"
      :is-submitting="isSubmitting"
      @change-tab="(tab) => activeNavTab = tab"
      @next-step="nextStep"
      @submit-survey="submitForm"
    />

    <!-- Queue Modal -->
    <QueueModal 
      v-if="showQueueModal"
      :sync-queue="syncQueue"
      :is-online="isOnline"
      :is-syncing="isSyncing"
      @close="showQueueModal = false"
      @sync-single="syncSingleItem"
      @sync-all="syncAllQueue"
      @remove-item="removeQueueItem"
    />

    <!-- Toast Notification -->
    <div v-if="toast.show" class="toast-container">
      <div :class="['toast', `toast-${toast.type}`]">
        <span>{{ toast.type === 'success' ? '✅' : toast.type === 'warning' ? '⚠️' : '❌' }}</span>
        <span>{{ toast.message }}</span>
      </div>
    </div>
  </div>
</template>
