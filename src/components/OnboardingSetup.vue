<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { StorageService } from '../services/storage';
import { ApiService, getEffectiveGasUrl } from '../services/api';
import { isTursoConfigured } from '../services/turso';
import { SecurityService } from '../services/security';
import type { AppSettings, CommunityMemberItem } from '../types';
import { MWC_ZONES } from '../data/zones';
import AppIcon from './AppIcon.vue';

const emit = defineEmits<{
  (e: 'done'): void;
}>();

const currentSettings = StorageService.getSettings();
const deviceId = SecurityService.getDeviceId();
const isSubmitting = ref(false);
const isCheckingAccount = ref(false);
const foundAccount = ref<any | null>(null);

const form = reactive({
  ownerName: currentSettings.ownerName || '',
  phone: currentSettings.phone || '',
  mwcZone: currentSettings.mwcZone || 'MWC Kota Sumenep',
  ranting: currentSettings.ranting || ''
});

const isValid = computed(() => {
  return (
    form.ownerName.trim().length >= 2 &&
    form.phone.trim().replace(/\D/g, '').length >= 9 &&
    form.mwcZone &&
    form.ranting.trim().length >= 2
  );
});

// Otomatis deteksi akun keluarga secara halus di latar belakang saat nomor WA diketik lengkap (>= 10 digit)
let lookupTimeout: any = null;
watch(() => form.phone, (newVal) => {
  const digits = newVal.replace(/\D/g, '');
  if (digits.length >= 10) {
    if (lookupTimeout) clearTimeout(lookupTimeout);
    lookupTimeout = setTimeout(() => {
      checkExistingAccount();
    }, 400);
  } else {
    foundAccount.value = null;
  }
});

const checkExistingAccount = async () => {
  const digits = form.phone.trim().replace(/\D/g, '');
  if (digits.length < 9) return;

  const gasUrl = getEffectiveGasUrl();
  if ((!gasUrl && !isTursoConfigured()) || !navigator.onLine) return;

  isCheckingAccount.value = true;

  try {
    const res = await ApiService.lookupAccount(gasUrl, { 
      phone: form.phone.trim(),
      device_id: deviceId 
    });
    if (res.status === 'success' && res.found && res.member) {
      foundAccount.value = res.member;
      // Auto-fill jika kolom belum diisi user
      if (res.member.nama_lengkap && !form.ownerName.trim()) {
        form.ownerName = res.member.nama_lengkap;
      }
      if (res.member.ranting && !form.ranting.trim()) {
        form.ranting = res.member.ranting;
      }
      if (res.member.mwc_zone) {
        form.mwcZone = res.member.mwc_zone;
      }
    } else {
      foundAccount.value = null;
    }
  } catch (err: any) {
    console.warn('Gagal periksa akun keluarga:', err);
  } finally {
    isCheckingAccount.value = false;
  }
};

const submitIdentity = async () => {
  if (!isValid.value || isSubmitting.value) return;

  isSubmitting.value = true;

  const updatedSettings: AppSettings = {
    ...currentSettings,
    ownerName: form.ownerName.trim(),
    yardName: currentSettings.yardName || 'Pekarangan Mandiri',
    phone: form.phone.trim(),
    mwcZone: form.mwcZone,
    ranting: form.ranting.trim(),
    deviceId: deviceId
  };

  StorageService.saveSettings(updatedSettings);

  // Perbarui atau tambahkan identitas keluarga ke direktori anggota lokal
  const members = StorageService.getMembers();
  const existingOwnerIdx = members.findIndex(m => m.isDeviceOwner);
  const memberId = foundAccount.value?.member_id || 
    (existingOwnerIdx !== -1 && members[existingOwnerIdx].id ? members[existingOwnerIdx].id : 'MBR-' + Date.now().toString().slice(-6));

  const ownerMemberData: CommunityMemberItem = {
    id: memberId,
    name: form.ownerName.trim(),
    phone: form.phone.trim(),
    mwcZone: form.mwcZone,
    ranting: form.ranting.trim(),
    rtRw: foundAccount.value?.rt_rw || currentSettings.defaultRtRw || '01/02',
    statusLahan: currentSettings.landStatus || 'Milik Sendiri',
    estimasiLuas: currentSettings.landArea || '10-30 m²',
    zonasi: ['Teras Depan', 'Pekarangan Samping'],
    komoditas: [],
    joinedDate: new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
    bio: 'Keluarga penggiat pekarangan mandiri pangan.',
    yardName: updatedSettings.yardName,
    isDeviceOwner: true
  };

  if (existingOwnerIdx !== -1) {
    members[existingOwnerIdx] = { ...members[existingOwnerIdx], ...ownerMemberData };
  } else {
    members.unshift(ownerMemberData);
  }
  StorageService.saveMembers(members);

  // Payload pendaftaran identitas keluarga ke Cloud Database
  const accountPayload = {
    member_id: memberId,
    nama_lengkap: form.ownerName.trim(),
    nama_panggilan: form.ownerName.trim().split(' ')[0] || form.ownerName.trim(),
    nomor_wa: form.phone.trim(),
    rt_rw: foundAccount.value?.rt_rw || currentSettings.defaultRtRw || '01/02',
    alamat_catatan: foundAccount.value?.alamat_catatan || '-',
    device_id: deviceId
  };

  const gasUrl = getEffectiveGasUrl();
  if ((gasUrl || isTursoConfigured()) && navigator.onLine) {
    try {
      const res = await ApiService.registerAccount(gasUrl, accountPayload);
      if (res.member_id) {
        ownerMemberData.id = res.member_id;
        StorageService.saveMembers(members);
      }
      StorageService.incrementRecordedMembersCount();
    } catch (err) {
      console.warn('Gagal sinkron akun langsung ke server, simpan di antrean:', err);
      StorageService.addToSyncQueue(
        { action: 'register_account', account: accountPayload },
        'register_account',
        `👤 Akun: ${form.ownerName}`
      );
    }
  } else {
    StorageService.addToSyncQueue(
      { action: 'register_account', account: accountPayload },
      'register_account',
      `👤 Akun: ${form.ownerName}`
    );
  }

  isSubmitting.value = false;
  emit('done');
};
</script>

<template>
  <div class="onboarding-overlay">
    <div class="onboarding-container">
      <!-- Header -->
      <header class="onboarding-header">
        <div class="header-brand-row">
          <div class="header-logo">
            <AppIcon name="sprout" size="sm" color="#ffffff" />
          </div>
          <div class="header-meta">
            <span class="header-badge">PEKARANGAN MANDIRI</span>
            <h1 class="header-title">Pendaftaran Keluarga</h1>
          </div>
        </div>
        <p class="header-desc">
          Daftarkan identitas keluarga Anda untuk memulai pencatatan mandiri tanaman, ternak, dan panen pekarangan rumah.
        </p>
      </header>

      <!-- Account Recovery Banner (Jika Akun Ditemukan di Cloud) -->
      <div v-if="foundAccount" class="found-banner">
        <div class="found-icon">
          <AppIcon name="user" size="sm" color="#16a34a" />
        </div>
        <div class="found-info">
          <div class="found-title">Akun Keluarga Terdaftar</div>
          <div class="found-desc">
            Selamat datang kembali, <strong>{{ foundAccount.nama_lengkap }}</strong>! Data pekarangan Anda di <strong>{{ foundAccount.ranting || 'Gapura' }}</strong> siap disinkronkan.
          </div>
        </div>
      </div>

      <!-- Form Body -->
      <form class="onboarding-form" @submit.prevent="submitIdentity">
        <!-- Field 1: Nomor HP / WhatsApp -->
        <div class="field-group">
          <label class="field-label" for="owner-phone">
            Nomor WhatsApp Keluarga <span class="required">*</span>
          </label>
          <input 
            id="owner-phone"
            v-model="form.phone"
            type="tel" 
            class="field-input" 
            placeholder="Contoh: 081234567890"
            required
            autocomplete="tel"
          />
          <span class="field-hint">
            Digunakan untuk silaturahmi sesama penggiat dan pemulihan data.
          </span>
        </div>

        <!-- Field 2: Nama Lengkap -->
        <div class="field-group">
          <label class="field-label" for="owner-name">
            Nama Kepala Keluarga / Pengelola <span class="required">*</span>
          </label>
          <input 
            id="owner-name"
            v-model="form.ownerName"
            type="text" 
            class="field-input" 
            placeholder="Contoh: Rasyiqi atau Bpk. Rasyiqi"
            required
            autocomplete="name"
          />
          <span class="field-hint">Nama penanggung jawab pekarangan rumah tangga.</span>
        </div>

        <!-- Field 3: Wilayah MWC & Ranting -->
        <div class="territory-grid">
          <div class="field-group">
            <label class="field-label">MWC (Kecamatan) <span class="required">*</span></label>
            <select v-model="form.mwcZone" class="field-input">
              <option v-for="z in MWC_ZONES" :key="z.slug" :value="z.name">
                {{ z.name }}
              </option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">Desa / Ranting <span class="required">*</span></label>
            <input 
              v-model="form.ranting" 
              type="text" 
              class="field-input" 
              placeholder="Contoh: Gapura Timur"
              required 
            />
          </div>
        </div>

        <!-- Submit Button -->
        <div class="submit-section">
          <button 
            type="submit" 
            class="submit-btn" 
            :disabled="!isValid || isSubmitting"
          >
            <template v-if="isSubmitting">
              <AppIcon name="loader" size="xs" color="#ffffff" />
              <span>Menyimpan Identitas...</span>
            </template>
            <template v-else-if="foundAccount">
              <AppIcon name="arrow-right" size="xs" color="#ffffff" />
              <span>Masuk ke Pekarangan Saya</span>
            </template>
            <template v-else>
              <AppIcon name="sprout" size="xs" color="#ffffff" />
              <span>Mulai Menanam & Mencatat</span>
            </template>
          </button>
          <p v-if="!isValid" class="validation-warning">
            * Mohon lengkapi Nomor WhatsApp, Nama, dan Desa untuk melanjutkan.
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.onboarding-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: #f8fafc;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0;
}

.onboarding-container {
  width: 100%;
  max-width: 480px;
  min-height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
}

.onboarding-header {
  background: #ffffff;
  padding: calc(24px + env(safe-area-inset-top, 0px)) 20px 18px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.header-brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.header-logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #16a34a, #15803d);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(22, 163, 74, 0.2);
}

.header-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-badge {
  display: inline-block;
  align-self: flex-start;
  background-color: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  padding: 1px 6px;
  border-radius: 4px;
}

.header-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.25;
}

.header-desc {
  font-size: 0.82rem;
  color: #64748b;
  line-height: 1.45;
  margin: 0;
}

.found-banner {
  margin: 16px 20px 0 20px;
  padding: 12px 14px;
  border-radius: 8px;
  background-color: #f0fdf4;
  border: 1px solid #86efac;
  display: flex;
  gap: 12px;
  align-items: center;
}

.found-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.found-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.found-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #166534;
}

.found-desc {
  font-size: 0.78rem;
  color: #15803d;
  line-height: 1.35;
}

.onboarding-form {
  padding: 24px 20px 40px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 4px;
}

.required {
  color: #dc2626;
}

.field-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  font-size: 0.92rem;
  color: #0f172a;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.field-input:focus {
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
}

.field-hint {
  font-size: 0.72rem;
  color: #64748b;
  line-height: 1.35;
}

.territory-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.submit-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 10px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  font-size: 0.95rem;
  font-weight: 800;
  color: #ffffff;
  background: linear-gradient(135deg, #16a34a, #15803d);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.validation-warning {
  font-size: 0.72rem;
  color: #dc2626;
  text-align: center;
  margin: 0;
}
</style>
