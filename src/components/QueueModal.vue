<script setup lang="ts">
import type { SyncQueueItem } from '../types';

defineProps<{
  syncQueue: SyncQueueItem[];
  isOnline: boolean;
  isSyncing: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'syncSingle', item: SyncQueueItem): void;
  (e: 'syncAll'): void;
  (e: 'removeItem', queueId: string): void;
}>();

const getTypeBadge = (type?: string) => {
  switch (type) {
    case 'survey': return { icon: '📋', label: 'Survei Lahan' };
    case 'plant': return { icon: '🌱', label: 'Tanam Baru' };
    case 'update_phase': return { icon: '🔄', label: 'Update Fase' };
    case 'egg_log': return { icon: '🥚', label: 'Log Telur' };
    case 'harvest': return { icon: '✂️', label: 'Catat Panen' };
    case 'consume': return { icon: '🍽️', label: 'Buku Kas' };
    case 'option': return { icon: '✨', label: 'Pilihan Baru' };
    default: return { icon: '💾', label: 'Data Lokal' };
  }
};
</script>

<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-sheet">
      <div class="modal-header">
        <h3>📥 Antrean Offline ({{ syncQueue.length }})</h3>
        <button class="btn-icon" @click="$emit('close')">✕</button>
      </div>

      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
        Data yang tersimpan di HP saat berada di area tanpa sinyal:
      </p>

      <div v-if="syncQueue.length === 0" style="text-align: center; padding: 24px; color: var(--text-dim); font-size: 0.85rem;">
        Semua data telah tersinkronisasi ke Google Sheets ✅
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; max-height: 55vh; overflow-y: auto;">
        <div 
          v-for="item in syncQueue" 
          :key="item.queueId"
          class="asset-item-card"
        >
          <div class="asset-item-header">
            <span style="font-weight: 600; font-size: 0.84rem;">
              {{ item.title || item.payload?.member_data?.nama_lengkap || 'Data Antrean' }}
            </span>
            <span class="geo-badge" style="font-size: 0.65rem;">
              {{ getTypeBadge(item.type).icon }} {{ getTypeBadge(item.type).label }}
            </span>
          </div>

          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
            Disimpan: {{ new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) }} • {{ new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
            <span v-if="item.status === 'FAILED'" style="color: #ef4444; font-weight: 600; margin-left: 4px;">(Gagal kirim)</span>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px;">
            <button 
              type="button" 
              class="btn btn-outline btn-sm"
              @click="$emit('removeItem', item.queueId)"
            >
              Hapus
            </button>
            <button 
              type="button" 
              class="btn btn-primary btn-sm" 
              :disabled="!isOnline"
              @click="$emit('syncSingle', item)"
            >
              Kirim Sekarang
            </button>
          </div>
        </div>
      </div>

      <button 
        v-if="syncQueue.length > 0 && isOnline" 
        type="button" 
        class="btn btn-primary btn-full" 
        style="margin-top: 16px;"
        :disabled="isSyncing"
        @click="$emit('syncAll')"
      >
        <span v-if="isSyncing" class="spinner"></span>
        <span v-else>⚡ Sinkronkan Semua ({{ syncQueue.length }})</span>
      </button>
    </div>
  </div>
</template>
