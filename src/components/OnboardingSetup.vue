<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { StorageService } from '../services/storage';
import { ApiService, getEffectiveGasUrl } from '../services/api';
import { SecurityService } from '../services/security';
import type { AppSettings, CommunityMemberItem } from '../types';

const emit = defineEmits<{
  (e: 'done'): void;
}>();

const currentSettings = StorageService.getSettings();
const deviceId = SecurityService.getDeviceId();
const isSubmitting = ref(false);
const isCheckingAccount = ref(false);
const foundAccount = ref<any | null>(null);
const isOtherDeviceActive = ref(false);

const form = reactive({
  ownerName: currentSettings.ownerName || '',
  phone: currentSettings.phone || ''
});

const isValid = computed(() => {
  return (
    form.ownerName.trim().length >= 2 &&
    form.phone.trim().replace(/\D/g, '').length >= 9
  );
});

// Otomatis cek jika nomor WA sudah pernah terdaftar saat nomor diketik lengkap (>= 10 digit)
let lookupTimeout: any = null;
watch(() => form.phone, (newVal) => {
  const digits = newVal.replace(/\D/g, '');
  if (digits.length >= 10) {
    if (lookupTimeout) clearTimeout(lookupTimeout);
    lookupTimeout = setTimeout(() => {
      checkExistingAccount();
    }, 500);
  } else {
    foundAccount.value = null;
    isOtherDeviceActive.value = false;
  }
});

const checkExistingAccount = async () => {
  const digits = form.phone.trim().replace(/\D/g, '');
  if (digits.length < 9) return;

  const gasUrl = getEffectiveGasUrl();
  if (!gasUrl || !navigator.onLine) return;

  isCheckingAccount.value = true;

  try {
    const res = await ApiService.lookupAccount(gasUrl, { 
      phone: form.phone.trim(),
      device_id: deviceId 
    });
    if (res.status === 'success' && res.found && res.member) {
      foundAccount.value = res.member;
      isOtherDeviceActive.value = !!res.isOtherDeviceActive;
      // Auto-fill nama dengan data yang ditemukan di database cloud
      if (res.member.nama_lengkap) {
        form.ownerName = res.member.nama_lengkap;
      }
    } else {
      foundAccount.value = null;
      isOtherDeviceActive.value = false;
    }
  } catch (err: any) {
    console.warn('Gagal periksa akun:', err);
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
    phone: form.phone.trim(),
    deviceId: deviceId
  };

  StorageService.saveSettings(updatedSettings);

  // Perbarui atau tambahkan identitas pemilik perangkat ke direktori anggota lokal
  const members = StorageService.getMembers();
  const existingOwnerIdx = members.findIndex(m => m.isDeviceOwner);
  const memberId = foundAccount.value?.member_id || 
    (existingOwnerIdx !== -1 && members[existingOwnerIdx].id ? members[existingOwnerIdx].id : 'MBR-' + Date.now().toString().slice(-6));

  const ownerMemberData: CommunityMemberItem = {
    id: memberId,
    name: form.ownerName.trim(),
    phone: form.phone.trim(),
    rtRw: foundAccount.value?.rt_rw || currentSettings.defaultRtRw || '-',
    statusLahan: currentSettings.landStatus || 'Milik Sendiri',
    estimasiLuas: currentSettings.landArea || '10-30 m²',
    zonasi: ['Teras Depan', 'Pekarangan Samping'],
    komoditas: [],
    joinedDate: new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
    bio: 'Pemilik pekarangan mandiri.',
    yardName: currentSettings.yardName || 'Pekarangan Rumah',
    isDeviceOwner: true
  };

  if (existingOwnerIdx !== -1) {
    members[existingOwnerIdx] = { ...members[existingOwnerIdx], ...ownerMemberData };
  } else {
    members.unshift(ownerMemberData);
  }
  StorageService.saveMembers(members);

  // Payload pendaftaran / penautan akun ke Google Sheets
  const accountPayload = {
    member_id: memberId,
    nama_lengkap: form.ownerName.trim(),
    nama_panggilan: form.ownerName.trim().split(' ')[0] || form.ownerName.trim(),
    nomor_wa: form.phone.trim(),
    rt_rw: foundAccount.value?.rt_rw || currentSettings.defaultRtRw || '-',
    alamat_catatan: foundAccount.value?.alamat_catatan || '-',
    device_id: deviceId,
    force_takeover: isOtherDeviceActive.value
  };

  const gasUrl = getEffectiveGasUrl();
  if (gasUrl && navigator.onLine) {
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
          <div class="header-logo">🌱</div>
          <div class="header-meta">
            <span class="header-badge">SELAMAT DATANG</span>
            <h1 class="header-title">Identitas Pemilik</h1>
          </div>
        </div>
        <p class="header-desc">
          Cukup isi nama dan nomor HP Anda untuk mengaktifkan akun. Kebijakan sistem: 1 akun aktif di 1 perangkat HP.
        </p>
      </header>

      <!-- Account Recovery Banner (Jika Akun Ditemukan di Cloud) -->
      <div 
        v-if="foundAccount" 
        class="found-banner"
        :class="{ 'banner-warning': isOtherDeviceActive }"
      >
        <div class="found-icon">{{ isOtherDeviceActive ? '⚠️' : '📲' }}</div>
        <div class="found-info">
          <div class="found-title">
            {{ isOtherDeviceActive ? 'Akun Aktif di HP Lain (Ganti HP)' : 'Akun Ditemukan!' }}
          </div>
          <div class="found-desc">
            <template v-if="isOtherDeviceActive">
              Akun atas nama <strong>{{ foundAccount.nama_lengkap }}</strong> sedang aktif di HP lain. Tekan tombol di bawah untuk memindahkan sesi ke HP ini (HP lama otomatis logout).
            </template>
            <template v-else>
              Nomor ini terdaftar atas nama <strong>{{ foundAccount.nama_lengkap }}</strong>. Klik tombol di bawah untuk memulihkan akun ke HP ini.
            </template>
          </div>
        </div>
      </div>

      <!-- Form Body (HANYA Nama & Nomor HP) -->
      <form class="onboarding-form" @submit.prevent="submitIdentity">
        <!-- Field 1: Nomor HP / WhatsApp -->
        <div class="field-group">
          <label class="field-label" for="owner-phone">
            Nomor HP / WhatsApp <span class="required">*</span>
          </label>
          <div class="input-with-action">
            <input 
              id="owner-phone"
              v-model="form.phone"
              type="tel" 
              class="field-input" 
              placeholder="Contoh: 081234567890"
              required
              autocomplete="tel"
            />
            <button 
              type="button" 
              class="check-btn" 
              :disabled="isCheckingAccount || form.phone.trim().length < 9"
              @click="checkExistingAccount"
            >
              <span v-if="isCheckingAccount">Cek...</span>
              <span v-else>🔍 Cek</span>
            </button>
          </div>
          <span class="field-hint">
            Digunakan sebagai identitas akun Anda di Google Sheets.
          </span>
        </div>

        <!-- Field 2: Nama Lengkap -->
        <div class="field-group">
          <label class="field-label" for="owner-name">
            Nama Lengkap <span class="required">*</span>
          </label>
          <input 
            id="owner-name"
            v-model="form.ownerName"
            type="text" 
            class="field-input" 
            placeholder="Contoh: Budi Santoso"
            required
            autocomplete="name"
          />
          <span class="field-hint">Nama penanggung jawab pekarangan keluarga.</span>
        </div>

        <!-- Device Info -->
        <div class="device-bind-box">
          <div class="bind-badge">🔒 1 AKUN 1 PERANGKAT</div>
          <p class="bind-text">
            Perangkat terikat: <code>{{ deviceId.substring(0, 18) }}...</code>. Sesi aktif dilindungi di Google Sheets.
          </p>
        </div>

        <!-- Submit Button -->
        <div class="submit-section">
          <button 
            type="submit" 
            class="submit-btn" 
            :class="{ 'btn-takeover': isOtherDeviceActive }"
            :disabled="!isValid || isSubmitting"
          >
            <span v-if="isSubmitting">Menyimpan Akun... ⏳</span>
            <span v-else-if="foundAccount && isOtherDeviceActive">Pindahkan Sesi ke HP Ini 📲</span>
            <span v-else-if="foundAccount">Pulihkan Akun ke HP Ini 📲</span>
            <span v-else>Mulai Pekarangan Saya 🚀</span>
          </button>
          <p v-if="!isValid" class="validation-warning">
            * Mohon isi Nomor HP dan Nama Lengkap untuk melanjutkan.
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
  padding: calc(20px + env(safe-area-inset-top, 0px)) 20px 16px 20px;
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
  border-radius: 4px;
  background: linear-gradient(135deg, #16a34a, #14532d);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(22, 163, 74, 0.15);
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
  border-radius: 3px;
}

.header-title {
  font-size: 1.2rem;
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
  padding: 12px;
  border-radius: 4px;
  background-color: #f0fdf4;
  border: 1px solid #86efac;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.banner-warning {
  background-color: #fffbeb !important;
  border-color: #fde68a !important;
}

.banner-warning .found-title {
  color: #b45309 !important;
}

.banner-warning .found-desc {
  color: #92400e !important;
}

.found-icon {
  font-size: 24px;
  flex-shrink: 0;
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

.input-with-action {
  display: flex;
  gap: 8px;
}

.input-with-action .field-input {
  flex: 1;
}

.check-btn {
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 0 14px;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.check-btn:hover:not(:disabled) {
  background-color: #e2e8f0;
}

.check-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.field-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  font-size: 0.92rem;
  color: #0f172a;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
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

.device-bind-box {
  background-color: #f8fafc;
  border: 1px dashed #cbd5e1;
  padding: 12px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.bind-badge {
  font-size: 0.62rem;
  font-weight: 800;
  color: #475569;
  letter-spacing: 0.05em;
}

.bind-text {
  font-size: 0.72rem;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}

.bind-text code {
  background: #e2e8f0;
  padding: 1px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.72rem;
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
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
}

.btn-takeover {
  background: linear-gradient(135deg, #d97706, #b45309) !important;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25) !important;
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
