<script setup lang="ts">
import { reactive, computed } from 'vue';
import { StorageService } from '../services/storage';
import type { AppSettings, CommunityMemberItem } from '../types';

const emit = defineEmits<{
  (e: 'done'): void;
}>();

const currentSettings = StorageService.getSettings();

const form = reactive({
  ownerName: currentSettings.ownerName || '',
  yardName: currentSettings.yardName || '',
  phone: currentSettings.phone || '',
  defaultRtRw: currentSettings.defaultRtRw || '01/02',
  addressDetail: currentSettings.addressDetail || '',
  landStatus: currentSettings.landStatus || 'Milik Sendiri',
  landArea: currentSettings.landArea || '10-30 m²'
});

const rtRwOptions = ['01/02', '02/02', '03/02', '04/02', '05/02'];
const landStatusOptions = ['Milik Sendiri', 'Sewa/Kontrak', 'Lahan Tidur/Fasum'];
const landAreaOptions = [
  { value: '<10 m²', label: '<10 m² (Teras / Pot)' },
  { value: '10-30 m²', label: '10-30 m² (Sedang)' },
  { value: '30-50 m²', label: '30-50 m² (Luas)' },
  { value: '>50 m²', label: '>50 m² (Sangat Luas)' }
];

const isValid = computed(() => {
  return (
    form.ownerName.trim().length >= 2 &&
    form.yardName.trim().length >= 2 &&
    form.defaultRtRw.trim().length >= 3
  );
});

const submitIdentity = () => {
  if (!isValid.value) return;

  const updatedSettings: AppSettings = {
    ...currentSettings,
    ownerName: form.ownerName.trim(),
    yardName: form.yardName.trim(),
    phone: form.phone.trim(),
    defaultRtRw: form.defaultRtRw.trim(),
    addressDetail: form.addressDetail.trim(),
    landStatus: form.landStatus,
    landArea: form.landArea
  };

  StorageService.saveSettings(updatedSettings);

  // Perbarui atau tambahkan identitas pemilik perangkat ke direktori anggota lokal
  const members = StorageService.getMembers();
  const existingOwnerIdx = members.findIndex(m => m.isDeviceOwner);

  const ownerMemberData: CommunityMemberItem = {
    id: existingOwnerIdx !== -1 ? members[existingOwnerIdx].id : 'owner_' + Date.now(),
    name: form.ownerName.trim(),
    phone: form.phone.trim(),
    rtRw: form.defaultRtRw.trim(),
    statusLahan: form.landStatus,
    estimasiLuas: form.landArea,
    zonasi: ['Teras Depan', 'Pekarangan Samping'],
    komoditas: [],
    joinedDate: new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
    bio: form.addressDetail.trim() ? `Alamat: ${form.addressDetail.trim()}` : 'Pemilik pekarangan mandiri.',
    yardName: form.yardName.trim(),
    isDeviceOwner: true
  };

  if (existingOwnerIdx !== -1) {
    members[existingOwnerIdx] = { ...members[existingOwnerIdx], ...ownerMemberData };
  } else {
    members.unshift(ownerMemberData);
  }
  StorageService.saveMembers(members);

  emit('done');
};
</script>

<template>
  <div class="onboarding-overlay">
    <div class="onboarding-container">
      <!-- Header (Clean, Light Eco Modern matching App Design) -->
      <header class="onboarding-header">
        <div class="header-brand-row">
          <div class="header-logo">🌱</div>
          <div class="header-meta">
            <span class="header-badge">PENGATURAN AWAL</span>
            <h1 class="header-title">Identitas Pekarangan</h1>
          </div>
        </div>
        <p class="header-subtitle">
          Lengkapi data pemilik dan pekarangan untuk mengaktifkan pencatatan ketahanan pangan keluarga Anda.
        </p>
      </header>

      <!-- Form Body -->
      <form class="onboarding-form" @submit.prevent="submitIdentity">
        <!-- Section 1: Pemilik -->
        <div class="form-section">
          <div class="section-heading">
            <span class="section-tag">WAJIB</span>
            <span class="section-title">👤 Identitas Pemilik</span>
          </div>

          <div class="field-group">
            <label class="field-label" for="owner-name">
              Nama Lengkap Pemilik / Keluarga <span class="required">*</span>
            </label>
            <input 
              id="owner-name"
              v-model="form.ownerName"
              type="text" 
              class="field-input" 
              placeholder="Contoh: Budi Santoso / Kel. Rahardjo"
              required
              autocomplete="name"
            />
            <span class="field-hint">Digunakan sebagai nama penanggung jawab pekarangan.</span>
          </div>

          <div class="field-group">
            <label class="field-label" for="owner-phone">
              Nomor WhatsApp
            </label>
            <input 
              id="owner-phone"
              v-model="form.phone"
              type="tel" 
              class="field-input" 
              placeholder="08xxxxxxxxxx"
              autocomplete="tel"
            />
            <span class="field-hint">Untuk koordinasi bibit dan panen bersama RT.</span>
          </div>

          <div class="field-group">
            <label class="field-label">
              Wilayah RT / RW <span class="required">*</span>
            </label>
            <!-- Quick Chips Selector (Sebaris Horizontal Scroll) -->
            <div class="chip-scroll">
              <button 
                v-for="rt in rtRwOptions" 
                :key="rt"
                type="button" 
                class="chip-btn" 
                :class="{ 'chip-btn-active': form.defaultRtRw === rt }"
                @click="form.defaultRtRw = rt"
              >
                RT {{ rt }}
              </button>
            </div>
            <input 
              v-model="form.defaultRtRw"
              type="text" 
              class="field-input" 
              style="margin-top: 6px;"
              placeholder="Ketik manual jika berbeda (contoh: 03/05)"
              required
            />
          </div>

          <div class="field-group">
            <label class="field-label" for="owner-address">
              Alamat / Nomor Rumah
            </label>
            <input 
              id="owner-address"
              v-model="form.addressDetail"
              type="text" 
              class="field-input" 
              placeholder="Contoh: Jl. Melati No. 14"
              autocomplete="street-address"
            />
          </div>
        </div>

        <!-- Section 2: Objek Pekarangan -->
        <div class="form-section">
          <div class="section-heading">
            <span class="section-tag">WAJIB</span>
            <span class="section-title">🏡 Data Pekarangan</span>
          </div>

          <div class="field-group">
            <label class="field-label" for="yard-name">
              Nama Objek Pekarangan <span class="required">*</span>
            </label>
            <input 
              id="yard-name"
              v-model="form.yardName"
              type="text" 
              class="field-input" 
              placeholder="Contoh: Pekarangan Hijau Asri / Kebun Teras"
              required
            />
            <span class="field-hint">Nama kebun, kolam, atau pekarangan rumah Anda.</span>
          </div>

          <div class="field-group">
            <label class="field-label">Status Kepemilikan Lahan</label>
            <div class="chip-scroll">
              <button 
                v-for="status in landStatusOptions" 
                :key="status"
                type="button" 
                class="chip-btn" 
                :class="{ 'chip-btn-active': form.landStatus === status }"
                @click="form.landStatus = status"
              >
                {{ status }}
              </button>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Estimasi Luas Lahan</label>
            <div class="chip-group-grid">
              <button 
                v-for="area in landAreaOptions" 
                :key="area.value"
                type="button" 
                class="chip-btn" 
                :class="{ 'chip-btn-active': form.landArea === area.value }"
                @click="form.landArea = area.value"
              >
                {{ area.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Submit Action Bar -->
        <div class="submit-section">
          <button 
            type="submit" 
            class="submit-btn" 
            :disabled="!isValid"
          >
            Mulai Pekarangan Saya 🚀
          </button>
          <p v-if="!isValid" class="validation-warning">
            * Mohon lengkapi Nama Pemilik, Nama Pekarangan, dan RT/RW untuk melanjutkan.
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
  max-width: 520px;
  min-height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
}

.onboarding-header {
  background: #ffffff;
  padding: calc(16px + env(safe-area-inset-top, 0px)) 20px 14px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.header-brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.header-logo {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: linear-gradient(135deg, #16a34a, #14532d);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
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
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0;
  color: #14532d;
  letter-spacing: -0.02em;
}

.header-subtitle {
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.45;
  margin: 0;
}

.onboarding-form {
  padding: 16px 20px 32px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section {
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.section-tag {
  background-color: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
  font-size: 0.62rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 3px;
  letter-spacing: 0.04em;
}

.section-title {
  font-size: 0.88rem;
  font-weight: 800;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: -0.01em;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #334155;
}

.required {
  color: #dc2626;
  font-weight: 800;
}

.field-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 0.88rem;
  font-family: inherit;
  color: #0f172a;
  background-color: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}

.field-input:focus {
  background-color: #ffffff;
  border-color: #15803d;
  box-shadow: 0 0 0 2px rgba(21, 128, 61, 0.15);
}

.field-hint {
  font-size: 0.7rem;
  color: #64748b;
  line-height: 1.3;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip-scroll {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.chip-scroll::-webkit-scrollbar {
  display: none; /* Chrome, Safari, WebKit */
}

.chip-group-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.chip-btn {
  background-color: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 0.76rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  text-align: center;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.chip-btn:hover {
  background-color: #e2e8f0;
}

.chip-btn-active {
  background-color: #dcfce7;
  color: #14532d;
  border-color: #15803d;
  font-weight: 800;
}

.submit-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.submit-btn {
  width: 100%;
  background-color: #15803d;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 14px 16px;
  font-size: 0.95rem;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease;
  box-shadow: 0 2px 4px rgba(20, 83, 45, 0.2);
}

.submit-btn:hover:not(:disabled) {
  background-color: #166534;
}

.submit-btn:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.75;
}

.validation-warning {
  font-size: 0.72rem;
  color: #b91c1c;
  text-align: center;
  line-height: 1.3;
  margin: 0;
}
</style>
