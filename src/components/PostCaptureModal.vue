<script setup lang="ts">
import { ref } from 'vue';
import type { KabarCategory, CommunityPostItem } from '../types';
import { StorageService } from '../services/storage';
import { TursoService, isTursoConfigured } from '../services/turso';

const props = defineProps<{
  show: boolean;
  photoUrl: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'retake'): void;
  (e: 'postCreated', post: CommunityPostItem): void;
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
}>();

const settings = StorageService.getSettings();
const isSubmitting = ref(false);
const caption = ref('');
const selectedCategory = ref<KabarCategory>('panen');
const isMamasar = ref(false);

const CATEGORIES = [
  { id: 'panen', label: 'Panen', icon: '🌾' },
  { id: 'tanam', label: 'Tanam', icon: '🌱' },
  { id: 'ternak', label: 'Telur/Ternak', icon: '🥚' },
  { id: 'dapur', label: 'Dapur Hemat', icon: '🍳' },
  { id: 'apotek', label: 'Apotek Hidup', icon: '💊' },
  { id: 'sedekah', label: 'Sedekah', icon: '🤝' },
  { id: 'rpp', label: 'Olahan RPP', icon: '🧺' }
];

const CAPTION_SUGGESTIONS = [
  'Alhamdulillah panen segar hari ini! 🌾',
  'Pungut telur ayam pekarangan segar 🥚',
  'Semai bibit tanaman baru di polybag 🌱',
  'Masak sayur organik dari kebun sendiri 🍳'
];

const applySuggestion = (sug: string) => {
  if (!caption.value.trim()) {
    caption.value = sug;
  } else {
    caption.value += ' ' + sug;
  }
};

const handleShare = async () => {
  if (!caption.value.trim()) {
    emit('showToast', 'Beri sedikit cerita atau caption untuk foto Anda', 'warning');
    return;
  }

  isSubmitting.value = true;
  const authorName = settings.ownerName || settings.cadreName || 'Warga Nahdliyin';
  const yardName = settings.yardName || 'Pekarangan Mandiri';
  const ranting = settings.ranting || 'Gapura Timur';
  const mwcZone = settings.mwcZone || 'MWC Gapura';

  // Smart title generation dari kalimat pertama caption
  let title = caption.value.trim().split('\n')[0];
  if (title.length > 45) {
    title = title.substring(0, 42) + '...';
  }

  const newPost: CommunityPostItem = {
    id: 'post-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    authorId: settings.phone || 'mbr-local',
    authorName,
    authorPhone: settings.phone,
    yardName,
    ranting,
    mwcZone,
    category: selectedCategory.value,
    title,
    content: caption.value.trim(),
    photoUrl: props.photoUrl,
    isMamasarProduct: selectedCategory.value === 'rpp' && isMamasar.value,
    reactions: { berkah: 1, masyaallah: 0, seger: 0, semangat: 0 },
    userReaction: 'berkah',
    createdAt: new Date().toISOString()
  };

  // Simpan ke storage lokal
  StorageService.addCommunityPost(newPost);

  // Sync ke Turso DB
  if (isTursoConfigured() && navigator.onLine) {
    TursoService.createCommunityPost(newPost).catch(err => {
      console.warn('Gagal sync kabar pekarangan ke Turso:', err);
    });
  }

  isSubmitting.value = false;
  caption.value = '';
  selectedCategory.value = 'panen';
  isMamasar.value = false;

  emit('postCreated', newPost);
  emit('close');
  emit('showToast', 'Alhamdulillah! Foto kabar pekarangan berhasil dibagikan.', 'success');
};
</script>

<template>
  <div v-if="show" class="post-capture-backdrop" @click="emit('close')">
    <div class="post-capture-sheet" @click.stop>
      <!-- Sheet Header -->
      <div class="sheet-header">
        <div class="header-title-box">
          <span class="sheet-title">📸 Kabar Pekarangan</span>
          <span class="sheet-sub">Jepretan siap dibagikan ke warga NU</span>
        </div>
        <button type="button" class="btn-close" @click="emit('close')" title="Batal">✕</button>
      </div>

      <!-- Photo Preview with Retake overlay -->
      <div class="preview-box">
        <img :src="photoUrl" alt="Foto Jepretan" class="preview-image" />
        <button type="button" class="btn-retake" @click="emit('retake')">
          <span>🔄 Foto Ulang</span>
        </button>
      </div>

      <!-- Category Pills -->
      <div class="category-section">
        <div class="section-label">Pilih Kategori:</div>
        <div class="category-chips-row">
          <button 
            v-for="cat in CATEGORIES" 
            :key="cat.id"
            type="button" 
            class="cat-chip-btn"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectedCategory = cat.id as KabarCategory"
          >
            <span>{{ cat.icon }}</span>
            <span>{{ cat.label }}</span>
          </button>
        </div>
      </div>

      <!-- Caption Textarea -->
      <div class="caption-section">
        <textarea 
          v-model="caption" 
          rows="3" 
          class="caption-input" 
          placeholder="Tulis caption kabar pekaranganmu... (misal: Alhamdulillah panen cabai rawit merah segar di teras depan 🌶️)"
          autofocus
        ></textarea>

        <!-- Quick suggestion pills -->
        <div class="sug-pills-row">
          <button 
            v-for="(sug, idx) in CAPTION_SUGGESTIONS" 
            :key="idx"
            type="button" 
            class="sug-pill" 
            @click="applySuggestion(sug)"
          >
            {{ sug }}
          </button>
        </div>
      </div>

      <!-- Mamasar Checkbox (khusus olahan RPP) -->
      <div v-if="selectedCategory === 'rpp'" class="mamasar-opt-box">
        <label class="mamasar-opt-label">
          <input type="checkbox" v-model="isMamasar" />
          <span>🧺 Tandai siap dipasarkan ke Mamasar (Surplus UMKM)</span>
        </label>
      </div>

      <!-- Action Buttons -->
      <div class="sheet-footer">
        <button type="button" class="btn btn-outline btn-cancel" @click="emit('close')">
          Batal
        </button>
        <button 
          type="button" 
          class="btn btn-primary btn-submit"
          :disabled="isSubmitting"
          @click="handleShare"
        >
          {{ isSubmitting ? 'Mengirim...' : '🚀 Bagikan Kabar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.post-capture-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2500;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.post-capture-sheet {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  padding: 16px 18px calc(18px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.35);
  animation: slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 92vh;
  overflow-y: auto;
}

.post-capture-sheet::before {
  content: '';
  display: block;
  width: 36px;
  height: 4px;
  background: #cbd5e1;
  border-radius: 2px;
  margin: 0 auto 10px;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
}

.sheet-title {
  display: block;
  font-weight: 800;
  font-size: 1rem;
  color: #0f172a;
}

.sheet-sub {
  display: block;
  font-size: 0.72rem;
  color: #64748b;
  margin-top: 1px;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px 6px;
}

/* PREVIEW BOX */
.preview-box {
  position: relative;
  margin: 12px 0;
  border-radius: 14px;
  overflow: hidden;
  background: #0f172a;
  border: 1px solid #e2e8f0;
  max-height: 220px;
}

.preview-image {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  display: block;
}

.btn-retake {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(15, 23, 42, 0.75);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(4px);
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-retake:active {
  transform: scale(0.95);
}

/* CATEGORY */
.category-section {
  margin-bottom: 10px;
}

.section-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 5px;
  text-transform: uppercase;
}

.category-chips-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.category-chips-row::-webkit-scrollbar {
  display: none;
}

.cat-chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 20px;
  font-size: 0.74rem;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.cat-chip-btn.active {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

/* CAPTION SECTION */
.caption-section {
  margin-bottom: 12px;
}

.caption-input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 0.85rem;
  line-height: 1.45;
  color: #0f172a;
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
}

.caption-input:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
}

.sug-pills-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-top: 6px;
  padding-bottom: 2px;
  scrollbar-width: none;
}
.sug-pills-row::-webkit-scrollbar {
  display: none;
}

.sug-pill {
  display: inline-block;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 3px 8px;
  font-size: 0.68rem;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
}

.sug-pill:active {
  background: #e2e8f0;
}

.mamasar-opt-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 12px;
}

.mamasar-opt-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #166534;
  cursor: pointer;
}

/* FOOTER */
.sheet-footer {
  display: flex;
  gap: 8px;
}

.btn-cancel {
  flex: 1;
  padding: 10px;
  font-size: 0.82rem;
}

.btn-submit {
  flex: 2;
  padding: 10px;
  font-size: 0.84rem;
  font-weight: 800;
  background: #16a34a;
  border-color: #16a34a;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
