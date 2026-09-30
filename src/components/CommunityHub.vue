<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CommunityMemberItem } from '../types';
import { StorageService } from '../services/storage';

const emit = defineEmits<{
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
  (e: 'goToProfile'): void;
}>();

const settings = StorageService.getSettings();

// Direktori Anggota State
const members = ref<CommunityMemberItem[]>(StorageService.getMembers());
const searchQuery = ref('');
const selectedRt = ref<string>('all');
const selectedMember = ref<CommunityMemberItem | null>(null);

const isOwner = (m: CommunityMemberItem) => {
  return !!m.isDeviceOwner || m.phone === settings.phone || m.name.toLowerCase() === (settings.ownerName || '').toLowerCase();
};

const rtList = computed(() => {
  const set = new Set<string>();
  members.value.forEach(m => {
    if (m.rtRw) set.add(m.rtRw.split('/')[0].trim());
  });
  return Array.from(set).sort();
});

const filteredMembers = computed(() => {
  const list = members.value.filter(m => {
    const q = searchQuery.value.toLowerCase().trim();
    const matchQuery = !q || 
      m.name.toLowerCase().includes(q) ||
      (m.yardName && m.yardName.toLowerCase().includes(q)) ||
      m.rtRw.toLowerCase().includes(q) ||
      m.komoditas.some(k => k.name.toLowerCase().includes(q)) ||
      (m.bio && m.bio.toLowerCase().includes(q));

    const matchRt = selectedRt.value === 'all' || m.rtRw.startsWith(selectedRt.value);

    return matchQuery && matchRt;
  });

  // Prioritaskan pekarangan milik HP ini di posisi teratas
  return list.sort((a, b) => {
    if (isOwner(a) && !isOwner(b)) return -1;
    if (!isOwner(a) && isOwner(b)) return 1;
    return 0;
  });
});

const openWhatsApp = (phone: string, name: string) => {
  const cleanPhone = phone.replace(/^0/, '62').replace(/\D/g, '');
  const text = encodeURIComponent(`Halo ${name}, salam sesama penggiat pekarangan mandiri pangan!`);
  window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
};
</script>

<template>
  <div class="community-hub">
    <!-- Search & Filter Bar - Full Edge Flat -->
    <div class="card" style="padding: 8px 14px; margin-bottom: 0;">
      <div style="display: flex; gap: 8px; margin-bottom: 6px; align-items: center;">
        <div style="position: relative; flex: 1;">
          <input 
            v-model="searchQuery" 
            type="text" 
            class="form-control" 
            style="padding-left: 32px; font-size: 0.82rem; padding-top: 6px; padding-bottom: 6px;"
            placeholder="Cari nama, RT, tanaman..."
          />
          <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; opacity: 0.6;">🔍</span>
        </div>
        <span class="member-count-pill">{{ filteredMembers.length }} KK</span>
      </div>

      <!-- Filter RT Chips -->
      <div class="rt-filter-chips">
        <button 
          type="button" 
          class="chip-btn" 
          :class="{ active: selectedRt === 'all' }"
          @click="selectedRt = 'all'"
        >
          Semua
        </button>
        <button 
          v-for="rt in rtList" 
          :key="rt"
          type="button" 
          class="chip-btn" 
          :class="{ active: selectedRt === rt }"
          @click="selectedRt = rt"
        >
          RT {{ rt }}
        </button>
      </div>
    </div>

    <!-- Member Cards List - Flat Edge-to-Edge List with Crisp Dividers -->
    <div class="member-list">
      <div 
        v-for="m in filteredMembers" 
        :key="m.id" 
        class="member-card"
        :class="{ 'is-owner-card': isOwner(m) }"
      >
        <!-- Card Header -->
        <div class="member-card-header">
          <div class="member-avatar" :style="isOwner(m) ? { background: '#16a34a', color: '#fff' } : {}">
            {{ isOwner(m) ? '⭐' : m.name.charAt(0).toUpperCase() }}
          </div>
          <div class="member-main-info">
            <div class="member-name-row" style="flex-wrap: wrap; gap: 4px;">
              <span class="member-name">{{ m.name }}</span>
              <span v-if="isOwner(m)" style="font-size: 0.6rem; background: #16a34a; color: #fff; font-weight: 800; padding: 1px 6px; border-radius: 3px;">
                Saya
              </span>
              <span v-else class="verified-icon" title="Pekarangan Aktif">✓</span>
            </div>
            <div v-if="m.yardName" style="font-size: 0.78rem; font-weight: 700; color: #166534;">
              🏡 {{ m.yardName }}
            </div>
            <div class="member-meta">
              <span>RT {{ m.rtRw }}</span>
              <span>•</span>
              <span>{{ m.statusLahan }}</span>
              <span>•</span>
              <span>{{ m.estimasiLuas }}</span>
            </div>
          </div>
        </div>

        <!-- Card Actions -->
        <div class="member-card-actions">
          <button 
            type="button" 
            class="btn-sm btn-outline btn-full"
            style="padding: 5px 8px; font-size: 0.76rem;"
            @click="selectedMember = m"
          >
            <span>Detail</span>
          </button>

          <button 
            v-if="isOwner(m)"
            type="button" 
            class="btn-sm btn-primary btn-full"
            style="padding: 5px 8px; font-size: 0.76rem;"
            @click="$emit('goToProfile')"
          >
            <span>Profil</span>
          </button>

          <button 
            v-else
            type="button" 
            class="btn-sm btn-whatsapp btn-full"
            style="padding: 5px 8px; font-size: 0.76rem;"
            @click="openWhatsApp(m.phone, m.name)"
          >
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredMembers.length === 0" class="empty-state card">
        <div style="font-size: 2.2rem; margin-bottom: 6px;">🔍</div>
        <div style="font-weight: 700; font-size: 0.9rem;">Tidak ada anggota yang cocok</div>
        <div style="font-size: 0.76rem; color: var(--text-dim); margin-top: 2px;">Coba gunakan kata kunci pencarian yang lain</div>
      </div>
    </div>

    <!-- DETAIL MODAL ANGGOTA (SOLID BACKGROUND, TIDAK TEMBUS PANDANG) -->
    <div v-if="selectedMember" class="modal-backdrop" @click="selectedMember = null">
      <div class="modal-card" @click.stop>
        <div class="modal-header">
          <div>
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span style="font-weight: 800; font-size: 1.05rem;">{{ selectedMember.name }}</span>
              <span v-if="isOwner(selectedMember)" style="font-size: 0.6rem; background: #16a34a; color: #fff; font-weight: 800; padding: 1px 6px; border-radius: 3px;">
                Saya
              </span>
            </div>
            <div v-if="selectedMember.yardName" style="font-size: 0.82rem; font-weight: 700; color: #166534; margin-top: 1px;">
              🏡 {{ selectedMember.yardName }}
            </div>
            <div style="font-size: 0.74rem; color: var(--text-dim); margin-top: 1px;">
              Alamat: RT {{ selectedMember.rtRw }} • Bergabung sejak {{ selectedMember.joinedDate }}
            </div>
          </div>
          <button type="button" class="btn-close" @click="selectedMember = null">✕</button>
        </div>

        <div style="margin: 14px 0;">
          <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase;">
            Profil Pekarangan
          </div>
          <div style="background: #f8faf9; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 12px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.78rem;">
              <div>
                <span style="color: var(--text-dim);">Status Lahan:</span><br />
                <strong style="color: var(--text-main);">{{ selectedMember.statusLahan }}</strong>
              </div>
              <div>
                <span style="color: var(--text-dim);">Estimasi Luas:</span><br />
                <strong style="color: var(--text-main);">{{ selectedMember.estimasiLuas }}</strong>
              </div>
              <div style="grid-column: span 2;">
                <span style="color: var(--text-dim);">Zonasi Penempatan:</span><br />
                <strong style="color: var(--text-main);">{{ selectedMember.zonasi.join(', ') }}</strong>
              </div>
            </div>
          </div>

          <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase;">
            Komoditas yang Dibudidayakan
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px;">
            <div 
              v-for="(k, i) in selectedMember.komoditas" 
              :key="i"
              style="display: flex; align-items: center; gap: 6px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 6px 10px; border-radius: 8px; font-size: 0.8rem; font-weight: 600;"
            >
              <span>{{ k.icon }}</span>
              <span>{{ k.name }}</span>
            </div>
          </div>

          <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.45; background: #f8faf9; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb;">
            "{{ selectedMember.bio }}"
          </p>
        </div>

        <div style="display: flex; gap: 8px;">
          <button 
            type="button" 
            class="btn btn-outline btn-full" 
            @click="selectedMember = null"
          >
            Tutup
          </button>
          <button 
            type="button" 
            class="btn btn-primary btn-full"
            style="background: #16a34a; border-color: #16a34a;"
            @click="openWhatsApp(selectedMember.phone, selectedMember.name)"
          >
            <span>💬 Hubungi via WA</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.community-hub {
  padding-bottom: 24px;
}

.member-count-pill {
  font-size: 0.72rem;
  font-weight: 700;
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
  padding: 3px 10px;
  border-radius: 9999px;
}

.rt-filter-chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.chip-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.chip-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.member-card {
  padding: 10px 14px;
  background: #ffffff;
  border: none;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  transition: background 0.15s ease;
}

.member-card.is-owner-card {
  background: #f0fdf4;
  border-left: 3px solid #16a34a;
}

.member-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.member-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #ffffff;
  font-weight: 800;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #bbf7d0;
  flex-shrink: 0;
}

.member-main-info {
  flex: 1;
}

.member-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.member-name {
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--text-main);
}

.verified-icon {
  background: #16a34a;
  color: #fff;
  border-radius: 50%;
  font-size: 0.55rem;
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.member-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  color: var(--text-dim);
  margin-top: 1px;
}

.member-commodities {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.commodity-pill {
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(22, 101, 52, 0.08);
  border: 1px solid rgba(22, 101, 52, 0.15);
  color: #15803d;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.member-card-actions {
  display: flex;
  gap: 6px;
  padding-top: 2px;
}

.btn-whatsapp {
  background: #16a34a;
  color: #ffffff;
  border: 1px solid #15803d;
  font-weight: 700;
}

.btn-whatsapp:active {
  background: #15803d;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-card {
  width: 100%;
  max-width: 480px;
  background: #ffffff !important;
  border-top: 1px solid #e5e7eb;
  border-radius: 24px 24px 0 0;
  padding: 16px 20px calc(18px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.35);
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  z-index: 2001;
  max-height: 88vh;
  overflow-y: auto;
}

.modal-card::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  background: #cbd5e1;
  border-radius: 2px;
  margin: 0 auto 12px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: var(--text-dim);
  cursor: pointer;
  padding: 2px 6px;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
