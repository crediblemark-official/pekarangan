<script setup lang="ts">
import { ref, computed } from 'vue';

const emit = defineEmits<{
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
}>();

const showRegisterModal = ref(false);
const activeFilter = ref<'all' | 'sambal' | 'camilan' | 'jamu' | 'ternak'>('all');
const searchQuery = ref('');

interface ProductItem {
  id: string;
  name: string;
  category: 'sambal' | 'camilan' | 'jamu' | 'ternak';
  price: string;
  producer: string;
  rt: string;
  icon: string;
  desc: string;
}

const products = ref<ProductItem[]>([
  {
    id: 'p1',
    name: 'Sambal Bawang Botol 150g',
    category: 'sambal',
    price: 'Rp 18.000',
    producer: 'Dapur Bu Endang',
    rt: 'RT 02',
    icon: '🌶️🍶',
    desc: 'Dibuat dari cabai rawit merah segar pekarangan sendiri, tanpa bahan pengawet kimiawi.'
  },
  {
    id: 'p2',
    name: 'Keripik Singkong Balado 250g',
    category: 'camilan',
    price: 'Rp 12.000',
    producer: 'Dapur Pak Slamet',
    rt: 'RT 01',
    icon: '🥔✨',
    desc: 'Olahan umbi singkong pekarangan samping rumah, renyah gurih bumbu rempah asli.'
  },
  {
    id: 'p3',
    name: 'Jamu Kunyit Asam Segar 350ml',
    category: 'jamu',
    price: 'Rp 8.000',
    producer: 'Apotik Dapur Bu Siti',
    rt: 'RT 03',
    icon: '🌿🍵',
    desc: 'Ekstrak kunyit murni dan gula aren, menyegarkan dan melancarkan sirkulasi darah.'
  },
  {
    id: 'p4',
    name: 'Telur Asin Masir Gurih (Isi 4)',
    category: 'ternak',
    price: 'Rp 16.000 / pack',
    producer: 'Kandang Pak Joko',
    rt: 'RT 02',
    icon: '🥚⭐',
    desc: 'Olahan telur bebek pekarangan dengan proses balut bata merah selama 14 hari, kuning telur berminyak masir.'
  },
  {
    id: 'p5',
    name: 'Keripik Pisang Manis 200g',
    category: 'camilan',
    price: 'Rp 14.000',
    producer: 'Dapur Bu Ani',
    rt: 'RT 01',
    icon: '🍌🍪',
    desc: 'Pisang kepok matang pohon pekarangan belakang, digoreng minyak kelapa higienis.'
  },
  {
    id: 'p6',
    name: 'Sambal Teri Cabai Hijau 150g',
    category: 'sambal',
    price: 'Rp 20.000',
    producer: 'Dapur Bu Rita',
    rt: 'RT 01',
    icon: '🌶️🐟',
    desc: 'Cabai hijau pekarangan dipadu dengan teri medan gurih pedas sedap.'
  }
]);

const newProduct = ref({
  name: '',
  category: 'sambal' as 'sambal' | 'camilan' | 'jamu' | 'ternak',
  price: '',
  desc: ''
});

const filteredProducts = computed(() => {
  return products.value.filter(p => {
    const matchesCat = activeFilter.value === 'all' || p.category === activeFilter.value;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          p.desc.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchesCat && matchesSearch;
  });
});

const registerProduct = () => {
  if (!newProduct.value.name.trim()) {
    emit('showToast', 'Nama produk wajib diisi', 'warning');
    return;
  }
  products.value.unshift({
    id: 'p' + Date.now(),
    name: newProduct.value.name,
    category: newProduct.value.category,
    price: newProduct.value.price || 'Rp 15.000',
    producer: 'Dapur Anda',
    rt: 'RT Anda',
    icon: newProduct.value.category === 'sambal' ? '🌶️🍶' : newProduct.value.category === 'jamu' ? '🌿🍵' : newProduct.value.category === 'camilan' ? '🍪✨' : '🥚⭐',
    desc: newProduct.value.desc || 'Produk olahan pascapanen dapur pekarangan keluarga.'
  });
  showRegisterModal.value = false;
  newProduct.value.name = '';
  newProduct.value.price = '';
  newProduct.value.desc = '';
  emit('showToast', 'Produk berhasil didaftarkan ke etalase katalog warga!');
};
</script>

<template>
  <div class="production-market-page" style="position: relative;">
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
      <div style="font-size: 3rem; line-height: 1;">🏗️</div>
      <div style="
        background: #78350f;
        color: #fff;
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        padding: 3px 12px;
        border-radius: 9999px;
      ">Segera Hadir</div>
      <div style="font-size: 1.15rem; font-weight: 800; color: #1c1917;">Rumah Produksi</div>
      <p style="font-size: 0.78rem; color: #57534e; line-height: 1.5; max-width: 260px;">
        Fitur etalase produk olahan warga (sambal, jamu, keripik, telur asin) akan aktif segera setelah komunitas makin solid. Semangat! 💪
      </p>
      <div style="
        width: 100%;
        max-width: 240px;
        background: #e7e5e4;
        border-radius: 9999px;
        height: 6px;
        overflow: hidden;
        margin-top: 4px;
      ">
        <div style="width: 60%; height: 100%; background: linear-gradient(90deg, #d97706, #f59e0b); border-radius: 9999px;"></div>
      </div>

    </div>
    <!-- ===================================== -->

    <!-- Header -->
    <div class="section-header">
      <h2>🍯 Rumah Produksi (Pabrik Mini)</h2>
      <p>Etalase produk olahan pascapanen dapur warga untuk pasar lokal & oleh-oleh</p>
    </div>

    <!-- Top Banner: Pilar 4 Hilirisasi -->
    <div class="card" style="background: #fffbeb; border-color: #fde68a;">
      <div style="display: flex; gap: 10px; align-items: center;">
        <span style="font-size: 1.6rem;">🏬</span>
        <div>
          <div style="font-weight: 700; font-size: 0.85rem; color: #92400e;">
            Integrator Nilai Tambah Dapur
          </div>
          <p style="font-size: 0.74rem; color: #78350f; line-height: 1.35; margin-top: 2px;">
            Ubah surplus cabai, pisang, singkong, dan telur menjadi produk olahan tahan simpan dan bernilai jual tinggi.
          </p>
        </div>
      </div>
    </div>

    <!-- Search & Register Button -->
    <div style="margin-bottom: 12px; display: flex; gap: 8px;">
      <input 
        v-model="searchQuery" 
        type="text" 
        class="form-control" 
        placeholder="🔍 Cari sambal, keripik, jamu, telur asin..." 
        style="padding: 9px 12px; font-size: 0.85rem;"
      />
      <button 
        type="button" 
        class="btn btn-primary btn-sm"
        style="white-space: nowrap; padding: 0 12px;"
        @click="showRegisterModal = true"
      >
        + Daftarkan
      </button>
    </div>

    <!-- Category Filter Chips -->
    <div class="asset-category-tabs">
      <button 
        type="button" 
        :class="['tab-btn', { active: activeFilter === 'all' }]"
        @click="activeFilter = 'all'"
      >
        Semua ({{ products.length }})
      </button>
      <button 
        type="button" 
        :class="['tab-btn', { active: activeFilter === 'sambal' }]"
        @click="activeFilter = 'sambal'"
      >
        🌶️ Sambal Kemasan
      </button>
      <button 
        type="button" 
        :class="['tab-btn', { active: activeFilter === 'camilan' }]"
        @click="activeFilter = 'camilan'"
      >
        🥔 Keripik & Camilan
      </button>
      <button 
        type="button" 
        :class="['tab-btn', { active: activeFilter === 'jamu' }]"
        @click="activeFilter = 'jamu'"
      >
        🌿 Jamu Herbal
      </button>
      <button 
        type="button" 
        :class="['tab-btn', { active: activeFilter === 'ternak' }]"
        @click="activeFilter = 'ternak'"
      >
        🥚 Telur Asin
      </button>
    </div>

    <!-- Products Grid -->
    <div class="market-grid">
      <div 
        v-for="p in filteredProducts" 
        :key="p.id" 
        class="market-item-card"
      >
        <div style="font-size: 2.2rem; text-align: center; padding: 8px 0; background: #fdfaf6; border-radius: var(--radius-sm);">
          {{ p.icon }}
        </div>
        <div>
          <div style="font-weight: 800; font-size: 0.82rem; color: var(--text-main); line-height: 1.25;">
            {{ p.name }}
          </div>
          <div class="market-price" style="margin: 3px 0;">
            {{ p.price }}
          </div>
          <div style="font-size: 0.68rem; color: var(--text-dim);">
            {{ p.producer }} ({{ p.rt }})
          </div>
        </div>
        <p style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.3; margin-top: 2px;">
          {{ p.desc }}
        </p>
        <button 
          type="button" 
          class="btn btn-whatsapp btn-sm btn-full"
          style="font-size: 0.72rem; padding: 6px; margin-top: auto;"
          @click="emit('showToast', 'Menghubungi ' + p.producer + ' via WhatsApp')"
        >
          Pesan via WA
        </button>
      </div>
    </div>

    <!-- Modal: Daftarkan Olahan Baru -->
    <div v-if="showRegisterModal" class="modal-backdrop" @click.self="showRegisterModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3>+ Daftarkan Olahan Dapur Warga</h3>
          <button class="btn-icon" @click="showRegisterModal = false">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label">Kategori Olahan</label>
          <select v-model="newProduct.category" class="form-control">
            <option value="sambal">🌶️ Sambal Kemasan (Botol/Pouch)</option>
            <option value="camilan">🥔 Keripik & Camilan Kering</option>
            <option value="jamu">🌿 Jamu Herbal & Empon-empon</option>
            <option value="ternak">🥚 Telur Asin & Olahan Ternak</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Nama Produk Olahan <span class="req">*</span></label>
          <input 
            v-model="newProduct.name" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: Sambal Goreng Bawang Botol, Keripik Pisang Renyah"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Harga Satuan (Rp)</label>
          <input 
            v-model="newProduct.price" 
            type="text" 
            class="form-control" 
            placeholder="Contoh: Rp 15.000 / botol"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Deskripsi & Keunggulan Bahan Baku</label>
          <textarea 
            v-model="newProduct.desc" 
            rows="2" 
            class="form-control" 
            placeholder="Contoh: Dibuat dari cabai rawit pekarangan sendiri tanpa pengawet..."
          ></textarea>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <button type="button" class="btn btn-outline btn-full" @click="showRegisterModal = false">Batal</button>
          <button type="button" class="btn btn-primary btn-full" @click="registerProduct">Simpan ke Etalase</button>
        </div>
      </div>
    </div>
  </div>
</template>
