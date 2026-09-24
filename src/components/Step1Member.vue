<script setup lang="ts">
import { ref } from 'vue';
import type { MemberData } from '../types';
import type { GeoLocationResult } from '../services/geo';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import SearchableSelect, { type SelectOption } from './SearchableSelect.vue';

const props = defineProps<{
  member: MemberData;
  geoData: GeoLocationResult | null;
  isGeoLoading: boolean;
}>();

defineEmits<{
  (e: 'fetchLocation'): void;
}>();

const masterOpts = StorageService.getMasterOptions();
const rtRwOptions = ref<SelectOption[]>(
  masterOpts.rt_rw.map((rt) => ({
    value: rt,
    label: `RT ${rt.replace('/', ' / RW ')}`,
    sub: 'Lingkungan'
  }))
);

const onAddRtRw = (newOpt: SelectOption) => {
  StorageService.addCustomOption('rt_rw', newOpt.value);
  rtRwOptions.value.push({
    value: newOpt.value,
    label: `RT ${newOpt.value.replace('/', ' / RW ')}`,
    sub: 'Baru ditambahkan'
  });
  // Background sync option to GAS
  const settings = StorageService.getSettings();
  ApiService.addCustomOption(settings.gasUrl, 'rt_rw', newOpt.value).catch(() => {});
};
</script>

<template>
  <section class="step-view active">
    <div class="section-header">
      <h2>👤 Identitas Anggota</h2>
      <p>Data penanggung jawab pekarangan / kepala keluarga</p>
    </div>

    <div class="card">
      <div class="form-group">
        <label class="form-label">Nama Lengkap <span class="req">*</span></label>
        <input 
          v-model="member.nama_lengkap" 
          type="text" 
          class="form-control" 
          placeholder="Contoh: Budi Santoso"
          required
        />
      </div>

      <div class="form-group">
        <label class="form-label">Nama Panggilan / Sapaan Lokal</label>
        <input 
          v-model="member.nama_panggilan" 
          type="text" 
          class="form-control" 
          placeholder="Contoh: Pak Budi"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Nomor WhatsApp <span class="req">*</span></label>
        <input 
          v-model="member.nomor_wa" 
          type="tel" 
          class="form-control" 
          placeholder="081234567890"
          required
        />
      </div>

      <div class="form-group">
        <label class="form-label">RT / RW <span class="req">*</span></label>
        <SearchableSelect
          v-model="member.rt_rw"
          :options="rtRwOptions"
          placeholder="-- Cari atau ketik RT/RW --"
          add-label="Tambah RT/RW"
          @add-option="onAddRtRw"
        />
      </div>

      <div class="form-group">
        <label class="form-label">Alamat / Patokan Rumah</label>
        <textarea 
          v-model="member.alamat_catatan" 
          class="form-control" 
          rows="2" 
          placeholder="Contoh: No. 14, seberang pos kamling"
        ></textarea>
      </div>
    </div>

    <!-- Geolocation Card -->
    <div class="card">
      <div class="card-title">
        <span>📍 Titik Koordinat GPS</span>
        <span v-if="geoData" class="geo-badge">± {{ geoData.accuracy }}m</span>
      </div>

      <div class="geo-box">
        <div class="geo-info">
          <span class="geo-coords">
            {{ member.gps_lat_long || 'Belum diambil' }}
          </span>
          <a 
            v-if="geoData" 
            :href="geoData.mapsUrl" 
            target="_blank" 
            class="btn-sm btn-outline"
            style="text-decoration: none;"
          >
            Buka Peta ↗
          </a>
        </div>

        <button 
          type="button" 
          class="btn btn-outline btn-full" 
          :disabled="isGeoLoading"
          @click="$emit('fetchLocation')"
        >
          <span v-if="isGeoLoading" class="spinner"></span>
          <span v-else>📡 Ambil Titik Lokasi HP</span>
        </button>
      </div>
    </div>
  </section>
</template>
