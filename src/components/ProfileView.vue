<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { StorageService } from '../services/storage';
import { ApiService, getEffectiveGasUrl } from '../services/api';
import { TursoService, isTursoConfigured } from '../services/turso';
import { SecurityService } from '../services/security';
import type { AppSettings } from '../types';
import { MWC_ZONES } from '../data/zones';
import AppIcon from './AppIcon.vue';

const emit = defineEmits<{
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
  (e: 'openQueue'): void;
}>();

const settings = reactive<AppSettings>(StorageService.getSettings());

// Device ID
const deviceId = ref(SecurityService.getDeviceId());

// Form Lock State (Kunci form jika sudah disimpan)
const isFormLocked = ref(true);

const unlockForm = () => {
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

// Turso Cloud State
const isTestingTurso = ref(false);
const isInitSchema = ref(false);
const tursoPingResult = ref<{ success: boolean; latencyMs: number; message: string } | null>(null);

const testTursoConnection = async () => {
  if (!settings.tursoUrl?.trim()) {
    emit('showToast', 'Harap isi URL Database Turso.', 'warning');
    return;
  }
  isTestingTurso.value = true;
  tursoPingResult.value = null;
  try {
    const res = await TursoService.ping({
      url: settings.tursoUrl.trim(),
      authToken: (settings.tursoAuthToken || '').trim()
    });
    tursoPingResult.value = res;
    if (res.success) {
      StorageService.saveSettings({ ...settings });
      emit('showToast', `Koneksi Turso Sukses! (${res.latencyMs} ms)`, 'success');
    } else {
      emit('showToast', res.message, 'error');
    }
  } catch (err: any) {
    emit('showToast', 'Gagal tes koneksi: ' + err.message, 'error');
  } finally {
    isTestingTurso.value = false;
  }
};

const initializeTursoSchema = async () => {
  if (!settings.tursoUrl?.trim()) {
    emit('showToast', 'Harap isi URL Database Turso.', 'warning');
    return;
  }
  StorageService.saveSettings({ ...settings });
  isInitSchema.value = true;
  try {
    const ok = await TursoService.initSchema();
    if (ok) {
      emit('showToast', 'Seluruh tabel Turso berhasil dibuat/disiapkan! 🎉', 'success');
    } else {
      emit('showToast', 'Gagal inisialisasi tabel di Turso.', 'error');
    }
  } catch (err: any) {
    emit('showToast', 'Error inisialisasi: ' + err.message, 'error');
  } finally {
    isInitSchema.value = false;
  }
};

const saveTursoSettings = () => {
  StorageService.saveSettings({ ...settings });
  emit('showToast', 'Pengaturan Database Turso berhasil disimpan!', 'success');
};

onMounted(() => {
  // Pastikan form selalu sinkron dengan data profil terbaru saat halaman dibuka
  const freshSettings = StorageService.getSettings();
  Object.assign(settings, freshSettings);
});

const saveProfile = () => {
  StorageService.saveSettings({ ...settings });

  // Sinkronkan juga ke direktori anggota agar nama pemilik dan pekarangan langsung terbarui
  const members = StorageService.getMembers();
  const ownerIdx = members.findIndex(m => m.isDeviceOwner || m.phone === settings.phone);
  const memberId = (ownerIdx !== -1 && members[ownerIdx].id) ? members[ownerIdx].id : 'MBR-' + Date.now().toString().slice(-6);

  if (ownerIdx !== -1) {
    members[ownerIdx].name = settings.ownerName;
    members[ownerIdx].yardName = settings.yardName;
    members[ownerIdx].phone = settings.phone;
    members[ownerIdx].mwcZone = settings.mwcZone;
    members[ownerIdx].ranting = settings.ranting;
    members[ownerIdx].rtRw = settings.defaultRtRw;
    members[ownerIdx].statusLahan = settings.landStatus;
    members[ownerIdx].estimasiLuas = settings.landArea;
    members[ownerIdx].isDeviceOwner = true;
    StorageService.saveMembers(members);
  }

  // Kirim data profil pemilik akun & device binding ke Database Cloud (Turso / GAS)
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
    if ((gasUrl || isTursoConfigured()) && navigator.onLine) {
      ApiService.registerAccount(gasUrl, accountPayload).then((res) => {
        if (res.member_id && ownerIdx !== -1) {
          members[ownerIdx].id = res.member_id;
          StorageService.saveMembers(members);
        }
      }).catch((err) => {
        console.warn('Gagal sync profile langsung ke cloud:', err);
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
  emit('showToast', 'Identitas pekarangan berhasil disimpan!', 'success');
};

const isSyncingData = ref(false);

const syncCloudData = async () => {
  if (!navigator.onLine) {
    emit('showToast', 'Sedang offline. Hubungkan internet untuk sinkronisasi.', 'warning');
    return;
  }
  const gasUrl = getEffectiveGasUrl();
  const usingTurso = isTursoConfigured();
  if (!gasUrl && !usingTurso) {
    emit('showToast', 'Database belum dikonfigurasi (atur Turso URL di bawah).', 'warning');
    return;
  }

  isSyncingData.value = true;
  try {
    // 1. Jika pengguna memiliki profil lokal yang belum ada di cloud, tautkan ke database
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

    // 2. Tarik seluruh data terbaru dari Cloud (Turso / GAS)
    const cloudData = await ApiService.fetchAllData(gasUrl);
    if (cloudData) {
      if (cloudData.members && cloudData.members.length > 0) {
        StorageService.setRecordedMembersCount(cloudData.members.length);
        StorageService.saveMembers(cloudData.members);
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

    const dbName = usingTurso ? 'Turso SQLite' : 'Google Sheets';
    emit('showToast', `Sinkronisasi berhasil! Data terhubung dengan ${dbName}.`, 'success');
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
        <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; border: 1.5px solid rgba(255,255,255,0.4); flex-shrink: 0;">
          <AppIcon name="home" size="md" class="text-white" />
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
            RT {{ settings.defaultRtRw || '—' }} • {{ settings.addressDetail || '—' }}
          </div>
        </div>
      </div>

      <!-- Quick Metrics Ribbon -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); text-align: center;">
        <div>
          <div class="font-mono" style="font-size: 0.95rem; font-weight: 800;">{{ membersCount }}</div>
          <div style="font-size: 0.6rem; opacity: 0.85;">Pekarangan</div>
        </div>
        <div>
          <div class="font-mono" style="font-size: 0.95rem; font-weight: 800;">{{ plantsCount }}</div>
          <div style="font-size: 0.6rem; opacity: 0.85;">Tanaman</div>
        </div>
        <div>
          <div class="font-mono" style="font-size: 0.95rem; font-weight: 800;">{{ livestockCount }}</div>
          <div style="font-size: 0.6rem; opacity: 0.85;">Kandang</div>
        </div>
        <div>
          <div class="font-mono" style="font-size: 0.95rem; font-weight: 800;">Rp {{ Math.round(totalSavings / 1000) }}k</div>
          <div style="font-size: 0.6rem; opacity: 0.85;">Hemat</div>
        </div>
      </div>
    </div>

    <!-- Edit Profile Form (Data Pemilik & Lahan - DILENGKAPI FITUR KUNCI FORM) -->
    <div class="card">
      <div class="card-title">
        <span class="flex items-center gap-1.5">
          <AppIcon name="edit" size="xs" />
          <span>Identitas Pemilik & Lahan</span>
        </span>
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
        <div class="flex items-center gap-1.5" style="font-size: 0.74rem; font-weight: 800; color: #0f766e; text-transform: uppercase; margin-bottom: 6px;">
          <AppIcon name="user" size="xs" />
          <span>Data Pemilik</span>
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
            <label class="form-label">MWC (Kecamatan)</label>
            <select 
              v-model="settings.mwcZone" 
              class="form-control"
              :disabled="isFormLocked"
              :style="isFormLocked ? { background: '#f8fafc', color: '#1e293b', cursor: 'not-allowed' } : {}"
            >
              <option v-for="z in MWC_ZONES" :key="z.slug" :value="z.name">
                {{ z.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Ranting (Desa)</label>
            <input 
              v-model="settings.ranting" 
              type="text" 
              class="form-control" 
              :disabled="isFormLocked"
              :style="isFormLocked ? { background: '#f8fafc', color: '#1e293b', cursor: 'not-allowed' } : {}"
              placeholder="Contoh: Gapura Barat"
            />
          </div>
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
        <div class="flex items-center gap-1.5" style="font-size: 0.74rem; font-weight: 800; color: var(--primary-dark); text-transform: uppercase; margin-bottom: 6px;">
          <AppIcon name="home" size="xs" />
          <span>Data Pekarangan</span>
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

    <!-- Device Identity Info Card -->
    <div class="card" style="padding: 10px 14px;">
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.76rem;">
        <span style="color: var(--text-dim); display: flex; align-items: center; gap: 4px;">
          <span>📱</span> ID Perangkat Warga:
        </span>
        <code style="font-family: monospace; font-weight: 700; color: var(--primary);">{{ deviceId.substring(0, 16) }}...</code>
      </div>
    </div>

    <!-- Cloud Database Configuration (Turso SQLite Serverless) -->
    <div class="card">
      <div class="card-title">
        <span>⚡ Database Cloud (Turso SQLite)</span>
        <span 
          :style="{
            fontSize: '0.65rem',
            padding: '2px 7px',
            borderRadius: '4px',
            fontWeight: '800',
            background: isTursoConfigured() ? '#dcfce7' : '#f1f5f9',
            color: isTursoConfigured() ? '#166534' : '#475569',
            border: isTursoConfigured() ? '1px solid #86efac' : '1px solid #cbd5e1'
          }"
        >
          {{ isTursoConfigured() ? 'Aktif' : 'Belum Dikonfigurasi' }}
        </span>
      </div>

      <div style="font-size: 0.72rem; color: var(--text-dim); margin-bottom: 10px; line-height: 1.4;">
        SQLite serverless libSQL dengan latensi ultra rendah (&lt;50ms), gratis 5GB, tanpa batas cold-start Google Sheets.
      </div>

      <div class="form-group">
        <label class="form-label">Database URL Turso</label>
        <input 
          v-model="settings.tursoUrl" 
          type="text" 
          class="form-control" 
          placeholder="https://pekarangan-xxxx.turso.io"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Auth Token Turso</label>
        <input 
          v-model="settings.tursoAuthToken" 
          type="password" 
          class="form-control" 
          placeholder="eyJhbGciOiJFZERT..."
        />
      </div>

      <div v-if="tursoPingResult" :style="{
        padding: '6px 10px',
        borderRadius: '6px',
        marginBottom: '10px',
        fontSize: '0.72rem',
        fontWeight: '600',
        background: tursoPingResult.success ? '#f0fdf4' : '#fef2f2',
        color: tursoPingResult.success ? '#15803d' : '#b91c1c',
        border: tursoPingResult.success ? '1px solid #86efac' : '1px solid #fca5a5'
      }">
        {{ tursoPingResult.message }}
      </div>

      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button 
          type="button" 
          class="btn-sync-action active:scale-95 transition-transform flex items-center gap-1" 
          :disabled="isTestingTurso"
          @click="testTursoConnection"
        >
          <span v-if="isTestingTurso" class="spinner-green"></span>
          <AppIcon v-else name="refresh" size="xs" />
          <span>{{ isTestingTurso ? 'Mengetes...' : 'Tes Latensi' }}</span>
        </button>

        <button 
          type="button" 
          class="btn-queue-action active:scale-95 transition-transform flex items-center gap-1" 
          :disabled="isInitSchema"
          @click="initializeTursoSchema"
        >
          <AppIcon name="dashboard" size="xs" />
          <span>{{ isInitSchema ? 'Membuat...' : 'Buat Tabel' }}</span>
        </button>

        <button 
          type="button" 
          class="btn-sm btn-primary active:scale-95 transition-transform flex items-center gap-1" 
          style="margin-left: auto; padding: 5px 12px; font-size: 0.75rem;"
          @click="saveTursoSettings"
        >
          <AppIcon name="save" size="xs" class="text-white" />
          <span>Simpan</span>
        </button>
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
          <div style="font-size: 0.68rem; color: var(--text-dim);">
            {{ isTursoConfigured() ? 'Tarik data terbaru dari Turso SQLite' : 'Tarik data terbaru dari Google Sheets' }}
          </div>
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
