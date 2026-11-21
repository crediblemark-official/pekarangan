<script setup lang="ts">
import { ref } from 'vue';
import type { KabarCategory, CommunityPostItem } from '../types';
import { StorageService } from '../services/storage';
import { TursoService, isTursoConfigured } from '../services/turso';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'postCreated', post: CommunityPostItem): void;
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
}>();

const settings = StorageService.getSettings();
const submittingPost = ref(false);

const CATEGORIES = [
  { id: 'panen', label: 'Panen', icon: '🌾' },
  { id: 'tanam', label: 'Tanam', icon: '🌱' },
  { id: 'ternak', label: 'Ternak', icon: '🥚' },
  { id: 'dapur', label: 'Dapur Hemat', icon: '🍳' },
  { id: 'apotek', label: 'Apotek Hidup', icon: '💊' },
  { id: 'sedekah', label: 'Sedekah', icon: '🤝' },
  { id: 'rpp', label: 'Olahan RPP', icon: '🧺' }
];

const newPostForm = ref({
  category: 'panen' as KabarCategory,
  title: '',
  content: '',
  metricBadge: '',
  isMamasarProduct: false,
  photoUrl: ''
});
const imagePreview = ref<string | null>(null);

const handleImageUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 800;
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.65);
        newPostForm.value.photoUrl = compressed;
        imagePreview.value = compressed;
      }
    };
    img.src = event.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const submitNewPost = async () => {
  if (!newPostForm.value.title.trim()) {
    emit('showToast', 'Judul kabar pekarangan wajib diisi', 'warning');
    return;
  }
  if (!newPostForm.value.content.trim()) {
    emit('showToast', 'Cerita/kabar pekarangan wajib diisi', 'warning');
    return;
  }

  submittingPost.value = true;
  const authorName = settings.ownerName || settings.cadreName || 'Warga Nahdliyin';
  const yardName = settings.yardName || 'Pekarangan Mandiri';
  const ranting = settings.ranting || 'Gapura Timur';
  const mwcZone = settings.mwcZone || 'MWC Gapura';

  const newPost: CommunityPostItem = {
    id: 'post-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    authorId: settings.phone || 'mbr-local',
    authorName,
    authorPhone: settings.phone,
    yardName,
    ranting,
    mwcZone,
    category: newPostForm.value.category,
    title: newPostForm.value.title.trim(),
    content: newPostForm.value.content.trim(),
    metricBadge: newPostForm.value.metricBadge.trim() || undefined,
    photoUrl: newPostForm.value.photoUrl || undefined,
    isMamasarProduct: newPostForm.value.isMamasarProduct,
    reactions: { berkah: 1, masyaallah: 0, seger: 0, semangat: 0 },
    userReaction: 'berkah',
    createdAt: new Date().toISOString()
  };

  // Simpan lokal
  StorageService.addCommunityPost(newPost);

  // Sync Turso jika online
  if (isTursoConfigured() && navigator.onLine) {
    TursoService.createCommunityPost(newPost).catch(err => {
      console.warn('Gagal sync postingan ke Turso:', err);
    });
  }

  submittingPost.value = false;
  emit('postCreated', newPost);
  emit('close');
  emit('showToast', 'Alhamdulillah! Kabar pekarangan berhasil dibagikan ke warga.', 'success');

  // Reset form
  newPostForm.value = {
    category: 'panen',
    title: '',
    content: '',
    metricBadge: '',
    isMamasarProduct: false,
    photoUrl: ''
  };
  imagePreview.value = null;
};
</script>

<template>
  <div v-if="show" class="modal-backdrop" @click="emit('close')">
    <div class="modal-card" @click.stop>
      <div class="modal-header">
        <div>
          <div style="font-weight: 800; font-size: 1.05rem;">🌱 Apa Kabar Pekaranganmu?</div>
          <div style="font-size: 0.74rem; color: var(--text-dim); margin-top: 1px;">
            Ngeksis Berfaedah: Bagikan panen & kemandirian pangan keluarga ke warga NU
          </div>
        </div>
        <button type="button" class="btn-close" @click="emit('close')">✕</button>
      </div>

      <div class="modal-form" style="margin-top: 14px;">
        <!-- Kategori Picker -->
        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" style="font-size: 0.78rem; font-weight: 700;">Kategori Kabar</label>
          <div class="modal-cat-grid">
            <button 
              v-for="cat in CATEGORIES" 
              :key="cat.id"
              type="button" 
              class="modal-cat-btn"
              :class="{ active: newPostForm.category === cat.id }"
              @click="newPostForm.category = cat.id as KabarCategory"
            >
              <span>{{ cat.icon }}</span>
              <span>{{ cat.label }}</span>
            </button>
          </div>
        </div>

        <!-- Judul Kabar -->
        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" style="font-size: 0.78rem; font-weight: 700;">Judul Kabar</label>
          <input 
            v-model="newPostForm.title" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: Panen Cabai Rawit & Bayam Hijau"
            style="font-size: 0.85rem;"
          />
        </div>

        <!-- Metrik Hasil (Opsional) -->
        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" style="font-size: 0.78rem; font-weight: 700;">Hasil Panen / Metrik (Opsional)</label>
          <input 
            v-model="newPostForm.metricBadge" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: 1.5 kg / 12 Butir / Hemat Rp 20.000"
            style="font-size: 0.85rem;"
          />
        </div>

        <!-- Cerita Kabar -->
        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" style="font-size: 0.78rem; font-weight: 700;">Cerita / Catatan Rasa Syukur</label>
          <textarea 
            v-model="newPostForm.content" 
            class="form-control" 
            rows="3" 
            placeholder="Ceritakan sukacita panen, tips menanam, atau rasa masakan pekarangan hari ini..."
            style="font-size: 0.82rem; line-height: 1.4;"
          ></textarea>
        </div>

        <!-- Foto Pekarangan (Kamera / File) -->
        <div class="form-group" style="margin-bottom: 14px;">
          <label class="form-label" style="font-size: 0.78rem; font-weight: 700;">Foto Pekarangan / Hasil Panen</label>
          <div v-if="imagePreview" style="position: relative; margin-bottom: 8px;">
            <img :src="imagePreview" alt="Preview Foto" style="width: 100%; max-height: 180px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb;" />
            <button 
              type="button" 
              class="btn-sm btn-outline" 
              style="position: absolute; right: 8px; top: 8px; background: rgba(255,255,255,0.9); font-size: 0.7rem; padding: 2px 6px;"
              @click="imagePreview = null; newPostForm.photoUrl = '';"
            >
              Hapus Foto
            </button>
          </div>
          <div v-else>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              class="form-control" 
              style="font-size: 0.78rem;" 
              @change="handleImageUpload"
            />
            <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 4px;">
              💡 Foto otomatis dikompres ringan sebelum disimpan.
            </div>
          </div>
        </div>

        <!-- Checkbox Mamasar jika Olahan RPP -->
        <div v-if="newPostForm.category === 'rpp'" style="margin-bottom: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; border-radius: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 600; color: #166534; cursor: pointer;">
            <input type="checkbox" v-model="newPostForm.isMamasarProduct" />
            <span>Tandai siap dipasarkan ke Mamasar (Hilir UMKM)</span>
          </label>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button 
            type="button" 
            class="btn btn-outline btn-full" 
            @click="emit('close')"
          >
            Batal
          </button>
          <button 
            type="button" 
            class="btn btn-primary btn-full" 
            style="background: #16a34a; border-color: #16a34a;"
            :disabled="submittingPost"
            @click="submitNewPost"
          >
            {{ submittingPost ? 'Mengirim...' : '🚀 Bagikan Kabar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  max-height: 90vh;
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

.modal-cat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-top: 4px;
}

.modal-cat-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 2px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
}

.modal-cat-btn.active {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
