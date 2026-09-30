<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { StorageService } from '../services/storage';
import { ApiService, getEffectiveGasUrl } from '../services/api';
import { SecurityService } from '../services/security';
import type { AppSettings } from '../types';

const emit = defineEmits<{
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
  (e: 'openQueue'): void;
  (e: 'lockApp'): void;
}>();

const settings = reactive<AppSettings>(StorageService.getSettings());

// Security state
const isBiometricLock = ref(settings.isBiometricLockEnabled !== false);
const deviceId = ref(SecurityService.getDeviceId());
const biometryType = ref('Sidik Jari / Kunci Layar HP');
const isTestingBio = ref(false);

// Form Lock State (Kunci form jika sudah disimpan)
const isFormLocked = ref(true);

const unlockForm = async () => {
  if (isBiometricLock.value && SecurityService.isNative()) {
    const auth = await SecurityService.authenticate('Verifikasi kunci layar untuk mengubah identitas pekarangan');
    if (!auth.success) {
      emit('showToast', 'Verifikasi dibatalkan: Form tetap terkunci', 'warning');
      return;
    }
  }
  // Muat ulang data terbaru dari storage lokal agar input tidak kosong
  const freshSettings = StorageService.getSettings();
  Object.assign(settings, freshSettings);
  isFormLocked.value = false;
  emit('showToast', 'Kunci form dibuka. Anda dapat mengubah data identitas.', 'success');
};

const cancelEdit = () => {
  const original = StorageService.getSettings();
  Object.assign(settings, original);
  isFormLocked.value = true;
  emit('showToast', 'Perubahan dibatalkan', 'warning');
};

// Summary metrics
const membersCount = ref(StorageService.getRecordedMembersCount());
const plantsCount = ref(StorageService.getPlants().length);
const livestockCount = ref(StorageService.getLivestocks().length);
const totalSavings = ref(StorageService.getTotalSavings());
const queueCount = ref(StorageService.getSyncQueue().length);

onMounted(async () => {
  // Pastikan form selalu sinkron dengan data profil terbaru saat halaman dibuka
  const freshSettings = StorageService.getSettings();
  Object.assign(settings, freshSettings);

  const bio = await SecurityService.checkBiometry();
  if (bio.biometryType) {
    biometryType.value = bio.biometryType;
  }
});

const saveProfile = () => {
  settings.isBiometricLockEnabled = isBiometricLock.value;
  StorageService.saveSettings({ ...settings });

  // Sinkronkan juga ke direktori anggota agar nama pemilik dan pekarangan langsung terbarui
  const members = StorageService.getMembers();
  const ownerIdx = members.findIndex(m => m.isDeviceOwner || m.phone === settings.phone);
  const memberId = (ownerIdx !== -1 && members[ownerIdx].id) ? members[ownerIdx].id : 'MBR-' + Date.now().toString().slice(-6);

  if (ownerIdx !== -1) {
    members[ownerIdx].name = settings.ownerName;
    members[ownerIdx].yardName = settings.yardName;
    members[ownerIdx].phone = settings.phone;
    members[ownerIdx].rtRw = settings.defaultRtRw;
    members[ownerIdx].statusLahan = settings.landStatus;
    members[ownerIdx].estimasiLuas = settings.landArea;
    members[ownerIdx].isDeviceOwner = true;
    StorageService.saveMembers(members);
  }

  // Kirim data profil pemilik akun & device binding ke Google Apps Script / Google Sheets
  if (settings.ownerName && settings.ownerName.trim()) {
    const accountPayload = {
      member_id: memberId,
      nama_lengkap: settings.ownerName.trim(),
      nama_panggilan: settings.ownerName.trim().split(' ')[0] || settings.ownerName.trim(),
      nomor_wa: settings.phone.trim() || '-',
      rt_rw: settings.defaultRtRw.trim() || '01/02',
      alamat_catatan: settings.addressDetail.trim() || '-',
      device_id: deviceId.value
    };

    const gasUrl = getEffectiveGasUrl();
    if (gasUrl && navigator.onLine) {
      ApiService.registerAccount(gasUrl, accountPayload).then((res) => {
        if (res.member_id && ownerIdx !== -1) {
          members[ownerIdx].id = res.member_id;
          StorageService.saveMembers(members);
        }
      }).catch((err) => {
        console.warn('Gagal sync profile langsung ke GAS:', err);
        StorageService.addToSyncQueue(
          { action: 'register_account', account: accountPayload },
          'register_account',
          `👤 Akun: ${settings.ownerName}`
        );
      });
    } else {
      StorageService.addToSyncQueue(
        { action: 'register_account', account: accountPayload },
        'register_account',
        `👤 Akun: ${settings.ownerName}`
      );
    }
  }

  isFormLocked.value = true; // Kunci otomatis setelah disimpan!
  emit('showToast', 'Identitas tersimpan dan otomatis dikunci kembali! 🔒', 'success');
};

const toggleBiometricLock = async () => {
  // Verifikasi biometrik dulu sebelum mengubah proteksi
  const res = await SecurityService.authenticate('Konfirmasi perubahan pengaturan keamanan');
  if (res.success) {
    isBiometricLock.value = !isBiometricLock.value;
    settings.isBiometricLockEnabled = isBiometricLock.value;
    StorageService.saveSettings({ ...settings });
    emit(
      'showToast', 
      isBiometricLock.value 
        ? 'Proteksi biometrik & kunci layar DIAKTIFKAN' 
        : 'Proteksi biometrik DINONAKTIFKAN', 
      'success'
    );
  } else {
    emit('showToast', res.message || 'Verifikasi biometrik gagal', 'error');
  }
};

const testBiometric = async () => {
  isTestingBio.value = true;
  try {
    const res = await SecurityService.authenticate('Uji coba verifikasi biometrik pekarangan');
    if (res.success) {
      emit('showToast', 'Verifikasi ' + biometryType.value + ' berhasil! Sensor berfungsi sempurna.', 'success');
    } else {
      emit('showToast', res.message || 'Verifikasi dibatalkan', 'warning');
    }
  } finally {
    isTestingBio.value = false;
  }
};

const lockAppNow = () => {
  SecurityService.lockSession();
  emit('lockApp');
};

const isSyncingData = ref(false);

const syncCloudData = async () => {
  if (!navigator.onLine) {
    emit('showToast', 'Sedang offline. Hubungkan internet untuk sinkronisasi.', 'warning');
    return;
  }
  const gasUrl = getEffectiveGasUrl();
  if (!gasUrl) {
    emit('showToast', 'URL Google Apps Script belum dikonfigurasi di environment.', 'warning');
    return;
  }

  isSyncingData.value = true;
  try {
    // 1. Jika pengguna memiliki profil lokal yang belum ada di cloud, tautkan ke Google Sheets!
    if (settings.ownerName && settings.ownerName.trim()) {
      const accountPayload = {
        member_id: 'MBR-' + Date.now().toString().slice(-6),
        nama_lengkap: settings.ownerName.trim(),
        nama_panggilan: settings.ownerName.trim().split(' ')[0] || settings.ownerName.trim(),
        nomor_wa: settings.phone.trim() || '-',
        rt_rw: settings.defaultRtRw.trim() || '01/02',
        alamat_catatan: settings.addressDetail.trim() || '-',
        device_id: deviceId.value
      };
      await ApiService.registerAccount(gasUrl, accountPayload).catch(() => {});
    }

    // 2. Tarik seluruh data terbaru dari Google Sheets
    const cloudData = await ApiService.fetchAllData(gasUrl);
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
      if (cloudData.penghematanLogs && cloudData.penghematanLogs.length > 0) {
        StorageService.savePengematanLogs(cloudData.penghematanLogs);
      }
    }
    // Perbarui metrik tampilan
    membersCount.value = StorageService.getRecordedMembersCount();
    plantsCount.value = StorageService.getPlants().length;
    livestockCount.value = StorageService.getLivestocks().length;
    totalSavings.value = StorageService.getTotalSavings();
    queueCount.value = StorageService.getSyncQueue().length;

    emit('showToast', 'Sinkronisasi berhasil! Data terhubung dengan Google Sheets.', 'success');
  } catch (err: any) {
    emit('showToast', 'Gagal sinkronisasi: ' + err.message, 'error');
  } finally {
    isSyncingData.value = false;
  }
};

const clearAppCache = async () => {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    emit('showToast', 'Cache aplikasi dibersihkan! Memuat ulang...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  } catch (err: any) {
    emit('showToast', 'Gagal membersihkan cache: ' + err.message, 'error');
  }
};
</script>

<template>
  <div class="profile-page">
    <!-- User Profile Card (Device Bound Identity) - Full Edge Flat -->
    <div class="card" style="background: linear-gradient(135deg, #064e3b, #15803d); color: #fff; padding: 12px 14px; margin-bottom: 0; border-radius: 0; box-shadow: none; border-bottom: 1px solid #166534;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 22px; border: 1.5px solid rgba(255,255,255,0.4); flex-shrink: 0;">
          🏡
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span style="font-weight: 800; font-size: 1.05rem; line-height: 1.2;">
              {{ settings.ownerName || '— Belum Diisi —' }}
            </span>
            <span style="font-size: 0.6rem; background: #22c55e; color: #fff; padding: 1px 6px; border-radius: 3px; font-weight: 700;">
              Saya
            </span>
          </div>
          <div style="font-size: 0.8rem; font-weight: 700; color: #bbf7d0; margin-top: 1px;">
            {{ settings.yardName || '— Nama Pekarangan —' }}
          </div>
          <div style="font-size: 0.72rem; opacity: 0.85; margin-top: 1px;">
            📍 RT {{ settings.defaultRtRw || '—' }} • {{ settings.addressDetail || '—' }}
          </div>
        </div>
      </div>

      <!-- Quick Metrics Ribbon -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); text-align: center;">
        <div>
          <div style="font-size: 0.95rem; font-weight: 800;">{{ membersCount }}</div>
          <div style="font-size: 0.6rem; opacity: 0.85;">Pekarangan</div>
        </div>
        <div>
          <div style="font-size: 0.95rem; font-weight: 800;">{{ plantsCount }}</div>
          <div style="font-size: 0.6rem; opacity: 0.85;">Tanaman</div>
        </div>
        <div>
          <div style="font-size: 0.95rem; font-weight: 800;">{{ livestockCount }}</div>
          <div style="font-size: 0.6rem; opacity: 0.85;">Kandang</div>
        </div>
        <div>
          <div style="font-size: 0.95rem; font-weight: 800;">Rp {{ Math.round(totalSavings / 1000) }}k</div>
          <div style="font-size: 0.6rem; opacity: 0.85;">Hemat</div>
        </div>
      </div>
    </div>

    <!-- Edit Profile Form (Data Pemilik & Lahan - DILENGKAPI FITUR KUNCI FORM) -->
    <div class="card">
      <div class="card-title">
        <span>✏️ Identitas Pemilik & Lahan</span>
        <span 
          :style="{
            fontSize: '0.65rem',
            padding: '2px 7px',
            borderRadius: '4px',
            fontWeight: '800',
            background: isFormLocked ? '#f1f5f9' : '#dcfce7',
            color: isFormLocked ? '#475569' : '#166534',
            border: isFormLocked ? '1px solid #cbd5e1' : '1px solid #86efac'
          }"
        >
          {{ isFormLocked ? 'Kunci' : 'Edit' }}
        </span>
      </div>

      <!-- Section 1: Pemilik (Divided by line, no round box) -->
      <div style="padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle);">
        <div style="font-size: 0.74rem; font-weight: 800; color: #0f766e; text-transform: uppercase; margin-bottom: 6px;">
          👤 Data Pemilik
        </div>
        
        <div class="form-group">
          <label class="form-label">Nama Pemilik</label>
          <input 
            v-model="settings.ownerName" 
            type="text" 
            class="form-control" 
            :disabled="isFormLocked"
            :style="isFormLocked ? { background: '#f8fafc', color: '#1e293b', cursor: 'not-allowed' } : {}"
            placeholder="Belum diisi (Contoh: Budi Santoso)"
          />
        </div>

        <div class="form-group">
          <label class="form-label">WhatsApp</label>
          <input 
            v-model="settings.phone" 
            type="tel" 
            class="form-control" 
            :disabled="isFormLocked"
            :style="isFormLocked ? { background: '#f8fafc', color: '#1e293b', cursor: 'not-allowed' } : {}"
            placeholder="Contoh: 081234567890"
          />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label class="form-label">RT / RW</label>
            <input 
              v-model="settings.defaultRtRw" 
              type="text" 
              class="form-control" 
              :disabled="isFormLocked"
              :style="isFormLocked ? { background: '#f8fafc', color: '#1e293b', cursor: 'not-allowed' } : {}"
              placeholder="Contoh: 01/02"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Alamat / No. Rumah</label>
            <input 
              v-model="settings.addressDetail" 
              type="text" 
              class="form-control" 
              :disabled="isFormLocked"
              :style="isFormLocked ? { background: '#f8fafc', color: '#1e293b', cursor: 'not-allowed' } : {}"
              placeholder="Contoh: Jl. Mawar No. 12"
            />
          </div>
        </div>
      </div>

      <!-- Section 2: Objek Pekarangan (Divided by line, no round box) -->
      <div style="padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid var(--border-subtle);">
        <div style="font-size: 0.74rem; font-weight: 800; color: var(--primary-dark); text-transform: uppercase; margin-bottom: 6px;">
          🏡 Data Pekarangan
        </div>

        <div class="form-group">
          <label class="form-label">Nama Pekarangan</label>
          <input 
            v-model="settings.yardName" 
            type="text" 
            class="form-control" 
            :disabled="isFormLocked"
            :style="isFormLocked ? { background: '#f8fafc', color: '#1e293b', cursor: 'not-allowed' } : {}"
            placeholder="Belum diisi (Contoh: Pekarangan Mandiri)"
          />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div class="form-group">
            <label class="form-label">Status Lahan</label>
            <select 
              v-model="settings.landStatus" 
              class="form-control"
              :disabled="isFormLocked"
              :style="isFormLocked ? { background: '#f8fafc', color: '#1e293b', cursor: 'not-allowed' } : {}"
            >
              <option value="Milik Sendiri">Milik Sendiri</option>
              <option value="Sewa/Kontrak">Sewa/Kontrak</option>
              <option value="Lahan Tidur/Fasum">Lahan Tidur/Fasum</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Estimasi Luas</label>
            <select 
              v-model="settings.landArea" 
              class="form-control"
              :disabled="isFormLocked"
              :style="isFormLocked ? { background: '#f8fafc', color: '#1e293b', cursor: 'not-allowed' } : {}"
            >
              <option value="<10 m²">&lt;10 m² (Teras/Vertikultur)</option>
              <option value="10-30 m²">10-30 m² (Sedang)</option>
              <option value="30-50 m²">30-50 m² (Luas)</option>
              <option value=">50 m²">&gt;50 m² (Sangat Luas)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Action Buttons: Buka Kunci vs Simpan & Kunci Kembali -->
      <div v-if="isFormLocked">
        <button 
          type="button" 
          class="btn btn-outline btn-full" 
          style="padding: 9px; font-weight: 700; border-color: var(--primary); color: var(--primary); display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.82rem;" 
          @click="unlockForm"
        >
          <span>🔓</span>
          <span>Buka Kunci</span>
        </button>
      </div>

      <div v-else style="display: flex; gap: 8px;">
        <button 
          type="button" 
          class="btn btn-outline btn-full" 
          style="padding: 9px; font-weight: 700; font-size: 0.82rem;" 
          @click="cancelEdit"
        >
          ✕ Batal
        </button>
        <button 
          type="button" 
          class="btn btn-primary btn-full" 
          style="padding: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.82rem;" 
          @click="saveProfile"
        >
          <span>🔒</span>
          <span>Simpan & Kunci</span>
        </button>
      </div>
    </div>

    <!-- Biometric & Screen Lock Security Card -->
    <div class="card">
      <div class="card-title">
        <span>🛡️ Keamanan HP</span>
        <span 
          :style="{
            fontSize: '0.65rem',
            padding: '2px 7px',
            borderRadius: '4px',
            fontWeight: '700',
            background: isBiometricLock ? '#dcfce7' : '#f3f4f6',
            color: isBiometricLock ? '#166534' : '#6b7280'
          }"
        >
          {{ isBiometricLock ? 'Aktif' : 'Nonaktif' }}
        </span>
      </div>

      <!-- Toggle Switch Row -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle); margin-bottom: 8px;">
        <div>
          <div style="font-weight: 700; font-size: 0.82rem;">Kunci Layar HP</div>
          <div style="font-size: 0.68rem; color: var(--text-dim);">Kunci otomatis saat aplikasi dibuka</div>
        </div>
        <button 
          type="button" 
          :class="['btn-sm', isBiometricLock ? 'btn-primary' : 'btn-outline']"
          style="padding: 4px 10px; font-weight: 700; font-size: 0.72rem;"
          @click="toggleBiometricLock"
        >
          {{ isBiometricLock ? 'Aktif' : 'Aktifkan' }}
        </button>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 6px; margin-bottom: 8px;">
        <button 
          type="button" 
          class="btn btn-outline btn-full"
          style="padding: 7px; font-size: 0.78rem;"
          :disabled="isTestingBio"
          @click="testBiometric"
        >
          <span v-if="isTestingBio" class="spinner" style="width: 12px; height: 12px;"></span>
          <span v-else>👆 Tes Sensor</span>
        </button>
        <button 
          type="button" 
          class="btn btn-outline btn-full"
          style="padding: 7px; font-size: 0.78rem; color: #15803d; border-color: #86efac;"
          @click="lockAppNow"
        >
          🔒 Kunci
        </button>
      </div>

      <!-- Device Token ID -->
      <div style="padding: 6px 0; font-size: 0.68rem; color: var(--text-dim); display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle);">
        <span>ID Perangkat:</span>
        <code style="font-family: monospace; font-weight: 700; color: var(--primary);">{{ deviceId.substring(0, 16) }}...</code>
      </div>
    </div>



    <!-- Data Management & Sync -->
    <div class="card">
      <div class="card-title">
        <span>💾 Data & Sinkronisasi</span>
      </div>

      <!-- 1. Tombol Sinkronisasi Data Cloud -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
        <div>
          <div style="font-weight: 700; font-size: 0.82rem;">Sinkronisasi Data</div>
          <div style="font-size: 0.68rem; color: var(--text-dim);">Tarik data terbaru dari Google Sheets</div>
        </div>
        <button 
          type="button" 
          class="btn-sync-action" 
          :class="{ 'btn-syncing': isSyncingData }"
          :disabled="isSyncingData"
          @click="syncCloudData"
        >
          <span v-if="isSyncingData" class="spinner-green"></span>
          <span v-if="isSyncingData">Menyinkronkan...</span>
          <span v-else>⚡ Sinkron</span>
        </button>
      </div>

      <!-- 2. Antrean Offline -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
        <div>
          <div style="font-weight: 700; font-size: 0.82rem;">Antrean Offline</div>
          <div style="font-size: 0.68rem; color: var(--text-dim);">Data tersimpan saat offline</div>
        </div>
        <button 
          type="button" 
          class="btn-queue-action" 
          :class="{ 'has-queue-items': queueCount > 0 }"
          @click="$emit('openQueue')"
        >
          <span v-if="queueCount > 0" class="queue-badge-count">{{ queueCount }}</span>
          <span v-if="queueCount > 0">Tertunda</span>
          <span v-else>Kosong (0)</span>
          <span>➔</span>
        </button>
      </div>

      <!-- 3. Hapus Cache Aplikasi -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0;">
        <div>
          <div style="font-weight: 700; font-size: 0.82rem; color: #475569;">Hapus Cache</div>
          <div style="font-size: 0.68rem; color: var(--text-dim);">Segarkan memori & aset tanpa hapus data</div>
        </div>
        <button 
          type="button" 
          class="btn-sm btn-outline" 
          style="padding: 4px 10px; color: #475569; border-color: #cbd5e1; font-size: 0.72rem;"
          @click="clearAppCache"
        >
          🧹 Bersihkan
        </button>
      </div>
    </div>

    <!-- About App -->
    <div style="text-align: center; padding: 10px 0 16px 0; color: var(--text-dim); font-size: 0.68rem; line-height: 1.4;">
      <strong>Pekarangan v2.0</strong> • Kedaulatan Pangan Mandiri
    </div>
  </div>
</template>

<style scoped>
.btn-sync-action {
  padding: 5px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #15803d;
  background-color: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-sync-action:hover:not(:disabled) {
  background-color: #dcfce7;
  border-color: #4ade80;
}

.btn-syncing {
  color: #166534 !important;
  background-color: #f0fdf4 !important;
  border-color: #86efac !important;
  opacity: 0.9 !important;
  cursor: not-allowed !important;
}

.spinner-green {
  width: 12px;
  height: 12px;
  border: 2px solid #bbf7d0;
  border-top-color: #16a34a;
  border-radius: 50%;
  animation: spin-sync 0.8s linear infinite;
  display: inline-block;
  flex-shrink: 0;
}

@keyframes spin-sync {
  to { transform: rotate(360deg); }
}

.btn-queue-action {
  padding: 5px 12px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  background-color: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-queue-action:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
}

.btn-queue-action.has-queue-items {
  color: #b45309;
  background-color: #fffbeb;
  border-color: #fde68a;
}

.btn-queue-action.has-queue-items:hover {
  background-color: #fef3c7;
  border-color: #fcd34d;
}

.queue-badge-count {
  background-color: #f59e0b;
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 9999px;
  min-width: 14px;
  text-align: center;
}
</style>
