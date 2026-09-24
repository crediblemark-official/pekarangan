<script setup lang="ts">
import type { MemberData, YardData, AssetItem } from '../types';
import type { CompressionResult } from '../services/camera';

defineProps<{
  member: MemberData;
  yard: YardData;
  assets: AssetItem[];
  photo: CompressionResult | null;
}>();

defineEmits<{
  (e: 'goToEcosystem'): void;
}>();
</script>

<template>
  <section class="step-view active">
    <div class="section-header">
      <h2>✅ Konfirmasi & Simpan</h2>
      <p>Periksa ringkasan data sebelum disimpan ke Google Sheets</p>
    </div>

    <!-- Ringkasan Warga -->
    <div class="card">
      <div class="card-title">Ringkasan Warga</div>
      <div class="summary-item">
        <span class="summary-label">Nama Lengkap</span>
        <span class="summary-val">{{ member.nama_lengkap }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">WhatsApp</span>
        <span class="summary-val">{{ member.nomor_wa }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">RT/RW</span>
        <span class="summary-val">{{ member.rt_rw }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">GPS Lat, Long</span>
        <span class="summary-val">{{ member.gps_lat_long || 'N/A' }}</span>
      </div>
    </div>

    <!-- Karakteristik Pekarangan -->
    <div class="card">
      <div class="card-title">Karakteristik Pekarangan</div>
      <div class="summary-item">
        <span class="summary-label">Status & Luas</span>
        <span class="summary-val">{{ yard.status_lahan }} ({{ yard.estimasi_luas }})</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Posisi Lahan</span>
        <span class="summary-val">{{ yard.zonasi_posisi.join(', ') }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Sinar & Air</span>
        <span class="summary-val">{{ yard.paparan_sinar }} • {{ yard.sumber_air }}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Foto Lahan</span>
        <span class="summary-val">{{ photo ? `Siap (${photo.compressedSizeKB} KB)` : 'Tidak ada foto' }}</span>
      </div>
    </div>

    <!-- Aset 4 Pilar Terdaftar -->
    <div class="card">
      <div class="card-title">Aset 4 Pilar Terdaftar ({{ assets.length }})</div>
      <div v-for="(ast, i) in assets" :key="i" class="summary-item">
        <div>
          <span class="summary-label" style="display: block; font-weight: 600; color: var(--text-main);">
            {{ ast.nama_komoditas }}
          </span>
          <span style="font-size: 0.7rem; color: var(--accent);">
            {{ ast.pilar_kategori }}
          </span>
        </div>
        <div style="text-align: right;">
          <span class="summary-val" style="display: block;">
            {{ ast.jumlah_estimasi }} • {{ ast.media_tanam }}
          </span>
          <span v-if="ast.catatan_produksi" style="font-size: 0.72rem; color: var(--text-dim);">
            {{ ast.catatan_produksi }}
          </span>
        </div>
      </div>
    </div>

    <!-- Teaser Info: Integrasi Fase 2 -->
    <div class="card" style="background: #f8fafc; border: 1px dashed var(--primary-border);">
      <div style="display: flex; gap: 10px; align-items: center;">
        <span style="font-size: 1.5rem;">🧺</span>
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 0.84rem; color: var(--text-main);">
            Terhubung ke Bursa Barter & Poin
          </div>
          <p style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">
            Setelah data tersimpan, pekarangan Anda siap masuk dalam peta ketahanan pangan dan ekonomi sirkular lingkungan.
          </p>
        </div>
        <button type="button" class="btn-sm btn-outline" @click="$emit('goToEcosystem')">
          Lihat ➔
        </button>
      </div>
    </div>
  </section>
</template>
