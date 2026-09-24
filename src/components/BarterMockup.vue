<script setup lang="ts">
import { ref, computed } from 'vue';

const emit = defineEmits<{
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
  (e: 'goToSurvey'): void;
}>();

interface BarterItem {
  id: string;
  title: string;
  category: 'sayur' | 'ternak' | 'toga' | 'kompos';
  icon: string;
  owner: string;
  rt: string;
  qty: string;
  wants: string;
  postedAt: string;
  notes: string;
}

const activeCategory = ref<'all' | 'sayur' | 'ternak' | 'toga' | 'kompos'>('all');
const searchQuery = ref('');
const selectedItem = ref<BarterItem | null>(null);
const showAddModal = ref(false);

// New offer mockup form
const newOffer = ref({
  title: '',
  category: 'sayur' as 'sayur' | 'ternak' | 'toga' | 'kompos',
  qty: '',
  wants: ''
});

const items = ref<BarterItem[]>([
  {
    id: 'b1',
    title: 'Cabai Rawit Merah Segar',
    category: 'sayur',
    icon: '🌶️',
    owner: 'Pak Budi Santoso',
    rt: 'RT 01',
    qty: '500 gram (panen pagi)',
    wants: '10 butir telur ayam atau 1 karung pupuk kompos',
    postedAt: 'Hari ini, 08:30',
    notes: 'Cabai ditanam organik tanpa pestisida kimia dari 6 polybag pekarangan depan.'
  },
  {
    id: 'b2',
    title: 'Telur Ayam Kampung Asli',
    category: 'ternak',
    icon: '🥚',
    owner: 'Ibu Siti Rahayu',
    rt: 'RT 02',
    qty: '12 butir (segar)',
    wants: 'Sayur bayam/kangkung 3 ikat atau jahe merah',
    postedAt: 'Kemarin, 16:45',
    notes: 'Dari kandang keluarga pekarangan belakang, pakan dedak dan sisa sayur hijau.'
  },
  {
    id: 'b3',
    title: 'Bibit Jahe Merah & Kunyit',
    category: 'toga',
    icon: '🌿',
    owner: 'Pak Wawan',
    rt: 'RT 01',
    qty: '4 polybag siap tanam',
    wants: 'Benih tomat atau polybag kosong',
    postedAt: 'Kemarin, 10:15',
    notes: 'Rimpang tua berkualitas, tunas sudah tumbuh sehat setinggi 15 cm.'
  },
  {
    id: 'b4',
    title: 'Kangkung Organik Segar',
    category: 'sayur',
    icon: '🥬',
    owner: 'Ibu Ani',
    rt: 'RT 02',
    qty: '3 ikat besar',
    wants: 'Bawang merah atau bumbu dapur',
    postedAt: '2 hari lalu',
    notes: 'Dipetik saat ada yang mau barter agar tetap segar.'
  },
  {
    id: 'b5',
    title: 'Pupuk Kompos Kasgot Organik',
    category: 'kompos',
    icon: '🌱',
    owner: 'Pak Joko',
    rt: 'RT 01',
    qty: '1 kantong (5 kg)',
    wants: 'Bibit cabai rawit atau pepaya',
    postedAt: '3 hari lalu',
    notes: 'Kompos fermentasi matang, tidak bau, sangat subur untuk media tanam pot.'
  }
]);

const filteredItems = computed(() => {
  return items.value.filter(item => {
    const matchesCat = activeCategory.value === 'all' || item.category === activeCategory.value;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          item.wants.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchesCat && matchesSearch;
  });
});

const submitOffer = () => {
  if (!newOffer.value.title.trim()) {
    emit('showToast', 'Nama hasil pekarangan wajib diisi', 'warning');
    return;
  }
  items.value.unshift({
    id: 'b' + Date.now(),
    title: newOffer.value.title,
    category: newOffer.value.category,
    icon: newOffer.value.category === 'sayur' ? '🥬' : newOffer.value.category === 'ternak' ? '🥚' : newOffer.value.category === 'toga' ? '🌿' : '🌱',
    owner: 'Pekarangan Anda',
    rt: 'RT Anda',
    qty: newOffer.value.qty || '1 porsi',
    wants: newOffer.value.wants || 'Bebas / diskusikan',
    postedAt: 'Baru saja',
    notes: 'Penawaran barter baru dari pekarangan keluarga.'
  });
  showAddModal.value = false;
  newOffer.value.title = '';
  newOffer.value.qty = '';
  newOffer.value.wants = '';
  emit('showToast', 'Penawaran barter berhasil diterbitkan (Mode Mockup)!');
};

const sendProposal = () => {
  emit('showToast', 'Permintaan barter terkirim ke pemilik komoditas!', 'success');
  selectedItem.value = null;
};
</script>

<template>
  <div class="barter-page" style="position: relative;">
    <!-- ======= COMING SOON OVERLAY ======= -->
    <div style="
      position: fixed;
      inset: 0;
      z-index: 50;
      background: radial-gradient(ellipse at center, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.60) 45%, rgba(255,255,255,0) 100%);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    ">
      <div style="font-size: 3rem; line-height: 1;">🧺</div>
      <div style="
        background: #14532d;
        color: #fff;
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        padding: 3px 12px;
        border-radius: 9999px;
      ">Segera Hadir</div>
      <div style="font-size: 1.15rem; font-weight: 800; color: #052e16;">Bursa Barter Tetangga</div>
      <p style="font-size: 0.78rem; color: #374151; line-height: 1.5; max-width: 260px;">
        Tukar surplus cabai, telur, dan sayuran dengan kebutuhan tetangga tanpa uang tunai. Aktif segera setelah komunitas makin solid. Semangat! 💪
      </p>
      <div style="
        width: 100%;
        max-width: 240px;
        background: #d1fae5;
        border-radius: 9999px;
        height: 6px;
        overflow: hidden;
        margin-top: 4px;
      ">
        <div style="width: 60%; height: 100%; background: linear-gradient(90deg, #16a34a, #15803d); border-radius: 9999px;"></div>
      </div>

    </div>
    <!-- ===================================== -->

    <!-- Section Header -->
    <div class="section-header">
      <h2>🧺 Bursa Barter Tetangga</h2>
      <p>Tukar surplus panen pekarangan dengan kebutuhan tetangga tanpa uang tunai</p>
    </div>

    <!-- Quota Progress Banner -->
    <div class="card" style="background: #f0fdf4; border-color: var(--primary-border);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <span style="font-weight: 700; font-size: 0.82rem; color: var(--primary-dark);">
          🔒 Kesiapan Barter Lingkungan RT
        </span>
        <span style="font-size: 0.74rem; font-weight: 700; color: var(--primary);">
          18 / 30 Terdata
        </span>
      </div>
      <div class="readiness-track">
        <div class="readiness-fill" style="width: 60%;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
        <span style="font-size: 0.72rem; color: var(--text-muted);">
          Kurang 12 pekarangan lagi untuk peluncuran resmi barter serentak.
        </span>
        <button 
          type="button" 
          class="btn-sm btn-outline" 
          style="font-size: 0.7rem; padding: 2px 8px;"
          @click="$emit('goToSurvey')"
        >
          Isi Form ➔
        </button>
      </div>
    </div>

    <!-- Search & Filter Controls -->
    <div style="margin-bottom: 12px; display: flex; gap: 8px;">
      <input 
        v-model="searchQuery" 
        type="text" 
        class="form-control" 
        placeholder="🔍 Cari cabai, telur, pupuk, kangkung..." 
        style="padding: 9px 12px; font-size: 0.85rem;"
      />
      <button 
        type="button" 
        class="btn btn-primary btn-sm"
        style="white-space: nowrap; padding: 0 12px;"
        @click="showAddModal = true"
      >
        + Tawarkan
      </button>
    </div>

    <!-- Category Filter Chips -->
    <div class="asset-category-tabs">
      <button 
        type="button" 
        :class="['tab-btn', { active: activeCategory === 'all' }]"
        @click="activeCategory = 'all'"
      >
        Semua ({{ items.length }})
      </button>
      <button 
        type="button" 
        :class="['tab-btn', { active: activeCategory === 'sayur' }]"
        @click="activeCategory = 'sayur'"
      >
        🥬 Sayuran
      </button>
      <button 
        type="button" 
        :class="['tab-btn', { active: activeCategory === 'ternak' }]"
        @click="activeCategory = 'ternak'"
      >
        🥚 Telur & Ternak
      </button>
      <button 
        type="button" 
        :class="['tab-btn', { active: activeCategory === 'toga' }]"
        @click="activeCategory = 'toga'"
      >
        🌿 TOGA & Bibit
      </button>
      <button 
        type="button" 
        :class="['tab-btn', { active: activeCategory === 'kompos' }]"
        @click="activeCategory = 'kompos'"
      >
        🌱 Pupuk Kompos
      </button>
    </div>

    <!-- Barter Items Feed -->
    <div class="barter-feed">
      <div 
        v-for="item in filteredItems" 
        :key="item.id" 
        class="barter-item-card"
        @click="selectedItem = item"
        style="cursor: pointer;"
      >
        <div class="barter-item-header">
          <div class="barter-owner-info">
            <div class="barter-avatar">{{ item.owner.charAt(0) }}</div>
            <div>
              <div style="font-weight: 700; font-size: 0.8rem; color: var(--text-main);">{{ item.owner }}</div>
              <div style="font-size: 0.68rem; color: var(--text-dim);">{{ item.rt }} • {{ item.postedAt }}</div>
            </div>
          </div>
          <span class="teaser-tag soon" style="font-size: 0.65rem;">Tersedia</span>
        </div>

        <div class="barter-item-content">
          <div class="barter-img-placeholder">
            <span>{{ item.icon }}</span>
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 800; font-size: 0.9rem; color: var(--text-main);">
              {{ item.title }}
            </div>
            <div style="font-size: 0.75rem; color: var(--primary); font-weight: 600;">
              📦 Jumlah: {{ item.qty }}
            </div>
          </div>
        </div>

        <div class="barter-want-box">
          <span style="font-weight: 700;">🔄 Ingin ditukar:</span>
          <span>{{ item.wants }}</span>
        </div>
      </div>
    </div>

    <!-- Modal: Detail Item Barter -->
    <div v-if="selectedItem" class="modal-backdrop" @click.self="selectedItem = null">
      <div class="modal-sheet">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.8rem;">{{ selectedItem.icon }}</span>
            <div>
              <h3 style="margin: 0; font-size: 1.05rem;">{{ selectedItem.title }}</h3>
              <span style="font-size: 0.72rem; color: var(--text-dim);">{{ selectedItem.owner }} ({{ selectedItem.rt }})</span>
            </div>
          </div>
          <button class="btn-icon" @click="selectedItem = null">✕</button>
        </div>

        <div class="card" style="margin: 10px 0; background: #f9fafb;">
          <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.45;">
            {{ selectedItem.notes }}
          </div>
        </div>

        <div class="barter-want-box" style="margin-bottom: 14px;">
          <span style="font-weight: 700;">🔄 Ingin ditukar:</span>
          <span>{{ selectedItem.wants }}</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button type="button" class="btn btn-primary" @click="sendProposal">
            🤝 Ajukan Tawaran Barter Saya
          </button>
          <button 
            type="button" 
            class="btn btn-whatsapp"
            @click="emit('showToast', 'Membuka obrolan WhatsApp dengan ' + selectedItem.owner)"
          >
            📲 Tanya Pemilik via WhatsApp
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Tambah Penawaran Barter Baru -->
    <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3>+ Tawarkan Hasil Pekarangan</h3>
          <button class="btn-icon" @click="showAddModal = false">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label">Kategori Komoditas</label>
          <select v-model="newOffer.category" class="form-control">
            <option value="sayur">🥬 Sayuran & Cabai</option>
            <option value="ternak">🥚 Telur & Daging Ternak</option>
            <option value="toga">🌿 TOGA & Bibit Tanaman</option>
            <option value="kompos">🌱 Pupuk Kompos Organik</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Nama Komoditas yang Ditawarkan <span class="req">*</span></label>
          <input 
            v-model="newOffer.title" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: Cabai rawit 1 kg, Telur bebek 10 butir"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Jumlah / Satuan</label>
          <input 
            v-model="newOffer.qty" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: 500 gram, 2 ikat, 3 polybag"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Ingin Ditukar Dengan Apa?</label>
          <input 
            v-model="newOffer.wants" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: Bumbu dapur, beras, atau pupuk kandang"
          />
        </div>

        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <button type="button" class="btn btn-outline btn-full" @click="showAddModal = false">Batal</button>
          <button type="button" class="btn btn-primary btn-full" @click="submitOffer">Terbitkan</button>
        </div>
      </div>
    </div>
  </div>
</template>
