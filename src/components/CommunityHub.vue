<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { 
  CommunityMemberItem, 
  CommunityPostItem, 
  FamilyLeaderboardItem, 
  RantingLeaderboardItem, 
  MwcLeaderboardItem,
  KabarCategory
} from '../types';
import { StorageService } from '../services/storage';
import { TursoService, isTursoConfigured } from '../services/turso';

const emit = defineEmits<{
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
  (e: 'goToProfile'): void;
}>();

const settings = StorageService.getSettings();

// 3 Sub-Tabs
const activeSubTab = ref<'kabar' | 'liga' | 'warga'>('kabar');

// ============================================================================
// 1. SUB-TAB: APA KABAR PEKARANGANMU? (FEED SOSIAL)
// ============================================================================
const posts = ref<CommunityPostItem[]>(StorageService.getCommunityPosts());
const loadingPosts = ref(false);
const selectedCategory = ref<string>('all');
const showNewPostModal = ref(false);
const submittingPost = ref(false);

const CATEGORIES = [
  { id: 'all', label: 'Semua', icon: '🌟' },
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

const filteredPosts = computed(() => {
  if (selectedCategory.value === 'all') return posts.value;
  return posts.value.filter(p => p.category === selectedCategory.value);
});

const loadPostsFromTurso = async () => {
  if (!isTursoConfigured()) return;
  loadingPosts.value = true;
  try {
    const tursoPosts = await TursoService.getCommunityPosts(settings.phone);
    if (tursoPosts && tursoPosts.length > 0) {
      posts.value = tursoPosts;
      StorageService.saveCommunityPosts(tursoPosts);
    }
  } catch (err) {
    console.warn('Gagal memuat kabar dari Turso, menggunakan cache offline:', err);
  } finally {
    loadingPosts.value = false;
  }
};

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
    emit('showToast', 'Judul kabar wajib diisi', 'warning');
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
  posts.value.unshift(newPost);

  // Sync Turso jika online
  if (isTursoConfigured() && navigator.onLine) {
    TursoService.createCommunityPost(newPost).catch(err => {
      console.warn('Gagal sync postingan ke Turso:', err);
    });
  }

  submittingPost.value = false;
  showNewPostModal.value = false;
  emit('showToast', 'Alhamdulillah! Kabar pekarangan berhasil dibagikan.', 'success');

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

  // Refresh leaderboard agar poin bertambah
  loadLeaderboardStats();
};

const handleReaction = async (post: CommunityPostItem, type: 'berkah' | 'masyaallah' | 'seger' | 'semangat') => {
  // Optimistic update
  const res = StorageService.toggleReactionLocal(post.id, type);
  if (res) {
    post.reactions = res.reactions;
    post.userReaction = res.userReaction;
  }

  // Turso sync
  if (isTursoConfigured() && navigator.onLine && settings.phone) {
    try {
      const serverRes = await TursoService.togglePostReaction(post.id, settings.phone, type);
      if (serverRes) {
        post.reactions = serverRes.reactions;
        post.userReaction = serverRes.userReaction;
      }
    } catch (err) {
      console.warn('Error sync reaksi ke Turso:', err);
    }
  }
};

const formatRelativeTime = (isoString?: string) => {
  if (!isoString) return 'Baru saja';
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'Baru saja';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}h lalu`;
  return new Date(isoString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

// ============================================================================
// 2. SUB-TAB: LIGA BERKAH (FASTABIQUL KHAIRAT)
// ============================================================================
const leagueTier = ref<'keluarga' | 'ranting' | 'mwc'>('keluarga');
const familyLeaderboard = ref<FamilyLeaderboardItem[]>([]);
const rantingLeaderboard = ref<RantingLeaderboardItem[]>([]);
const mwcLeaderboard = ref<MwcLeaderboardItem[]>([]);
const loadingLeaderboard = ref(false);

const myFamilyRank = computed(() => {
  return familyLeaderboard.value.find(f => f.isCurrentUser) || familyLeaderboard.value[0] || null;
});

const loadLeaderboardStats = async () => {
  if (!isTursoConfigured()) return;
  loadingLeaderboard.value = true;
  try {
    const stats = await TursoService.getLeaderboardStats(settings.phone);
    familyLeaderboard.value = stats.familyLeaderboard;
    rantingLeaderboard.value = stats.rantingLeaderboard;
    mwcLeaderboard.value = stats.mwcLeaderboard;
  } catch (err) {
    console.warn('Gagal memuat leaderboard:', err);
  } finally {
    loadingLeaderboard.value = false;
  }
};

// ============================================================================
// 3. SUB-TAB: DIREKTORI WARGA (EKSISTING)
// ============================================================================
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

  return list.sort((a, b) => {
    if (isOwner(a) && !isOwner(b)) return -1;
    if (!isOwner(a) && isOwner(b)) return 1;
    return 0;
  });
});

const openWhatsApp = (phone: string, name: string) => {
  const cleanPhone = phone.replace(/^0/, '62').replace(/\D/g, '');
  const text = encodeURIComponent(`Halo ${name}, salam sesama penggiat pekarangan mandiri pangan Nahdlatul Ulama!`);
  window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
};

onMounted(() => {
  loadPostsFromTurso();
  loadLeaderboardStats();
});
</script>

<template>
  <div class="community-hub">
    <!-- SUB-TAB SEGMENTED NAVIGATION -->
    <div class="community-subnav-bar">
      <div class="segmented-control">
        <button 
          type="button" 
          class="seg-btn" 
          :class="{ active: activeSubTab === 'kabar' }"
          @click="activeSubTab = 'kabar'"
        >
          <span>📢 Apa Kabar?</span>
          <span class="seg-badge" v-if="posts.length > 0">{{ posts.length }}</span>
        </button>

        <button 
          type="button" 
          class="seg-btn" 
          :class="{ active: activeSubTab === 'liga' }"
          @click="activeSubTab = 'liga'"
        >
          <span>🏆 Liga Berkah</span>
        </button>

        <button 
          type="button" 
          class="seg-btn" 
          :class="{ active: activeSubTab === 'warga' }"
          @click="activeSubTab = 'warga'"
        >
          <span>👥 Warga</span>
          <span class="seg-badge">{{ members.length }}</span>
        </button>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- VIEW 1: APA KABAR PEKARANGANMU? (FEED SOSIAL)                         -->
    <!-- ===================================================================== -->
    <div v-if="activeSubTab === 'kabar'" class="subtab-content">
      <!-- Action Banner: Ajakan & Tombol Posting -->
      <div class="kabar-action-card card">
        <div class="kabar-action-left">
          <div class="kabar-greeting">Ngeksis Berfaedah 🌱</div>
          <div class="kabar-subtext">Pamerkan panen, semai bibit, atau telur segar hari ini!</div>
        </div>
        <button type="button" class="btn btn-primary btn-kabar" @click="showNewPostModal = true">
          <span>📸 Kabarkan</span>
        </button>
      </div>

      <!-- Kategori Filter Chips -->
      <div class="category-chips-scroll">
        <button 
          v-for="cat in CATEGORIES" 
          :key="cat.id"
          type="button" 
          class="cat-chip" 
          :class="{ active: selectedCategory === cat.id }"
          @click="selectedCategory = cat.id"
        >
          <span>{{ cat.icon }}</span>
          <span>{{ cat.label }}</span>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loadingPosts" style="text-align: center; padding: 24px 0; color: var(--text-dim); font-size: 0.85rem;">
        Memperbarui kabar pekarangan dari warga...
      </div>

      <!-- Feed List -->
      <div class="feed-stream">
        <div 
          v-for="post in filteredPosts" 
          :key="post.id" 
          class="feed-card card"
        >
          <!-- Post Header -->
          <div class="feed-header">
            <div class="feed-avatar">
              {{ post.authorName.charAt(0).toUpperCase() }}
            </div>
            <div class="feed-author-meta">
              <div class="feed-author-row">
                <span class="feed-author-name">{{ post.authorName }}</span>
                <span v-if="post.authorPhone === settings.phone" class="self-tag">Saya</span>
              </div>
              <div class="feed-yard-sub">
                <span v-if="post.yardName">🏡 {{ post.yardName }} • </span>
                <span>{{ post.ranting }}</span>
                <span class="dot-sep">•</span>
                <span class="feed-time">{{ formatRelativeTime(post.createdAt) }}</span>
              </div>
            </div>
            <div v-if="post.metricBadge" class="feed-metric-pill">
              {{ post.metricBadge }}
            </div>
          </div>

          <!-- Post Content -->
          <div class="feed-body">
            <h4 class="feed-title">{{ post.title }}</h4>
            <p class="feed-text">{{ post.content }}</p>

            <!-- Foto Lampiran -->
            <div v-if="post.photoUrl" class="feed-photo-box">
              <img :src="post.photoUrl" alt="Foto Pekarangan" class="feed-photo-img" />
            </div>

            <!-- Badge Integrasi Mamasar -->
            <div v-if="post.isMamasarProduct" class="mamasar-feed-tag">
              <span>🧺 Produk Olahan RPP • Tersedia di Mamasar</span>
            </div>
          </div>

          <!-- Post Footer: Reaksi Doa NU & Sapa WA -->
          <div class="feed-actions">
            <div class="reaction-buttons-group">
              <button 
                type="button" 
                class="react-btn" 
                :class="{ active: post.userReaction === 'berkah' }"
                @click="handleReaction(post, 'berkah')"
              >
                <span>🤲</span>
                <span class="react-label">Berkah</span>
                <span class="react-count">{{ post.reactions?.berkah || 0 }}</span>
              </button>

              <button 
                type="button" 
                class="react-btn" 
                :class="{ active: post.userReaction === 'masyaallah' }"
                @click="handleReaction(post, 'masyaallah')"
              >
                <span>💚</span>
                <span class="react-label">MasyaAllah</span>
                <span class="react-count">{{ post.reactions?.masyaallah || 0 }}</span>
              </button>

              <button 
                type="button" 
                class="react-btn" 
                :class="{ active: post.userReaction === 'seger' }"
                @click="handleReaction(post, 'seger')"
              >
                <span>🥬</span>
                <span class="react-label">Seger</span>
                <span class="react-count">{{ post.reactions?.seger || 0 }}</span>
              </button>

              <button 
                type="button" 
                class="react-btn" 
                :class="{ active: post.userReaction === 'semangat' }"
                @click="handleReaction(post, 'semangat')"
              >
                <span>🔥</span>
                <span class="react-label">Giat</span>
                <span class="react-count">{{ post.reactions?.semangat || 0 }}</span>
              </button>
            </div>

            <button 
              v-if="post.authorPhone && post.authorPhone !== settings.phone"
              type="button" 
              class="sapa-wa-btn"
              @click="openWhatsApp(post.authorPhone, post.authorName)"
              title="Kirim sapaan WhatsApp"
            >
              💬 Sapa
            </button>
          </div>
        </div>

        <!-- Empty Feed -->
        <div v-if="filteredPosts.length === 0 && !loadingPosts" class="empty-state card">
          <div style="font-size: 2.2rem; margin-bottom: 6px;">🌱</div>
          <div style="font-weight: 700; font-size: 0.9rem;">Belum ada kabar di kategori ini</div>
          <div style="font-size: 0.76rem; color: var(--text-dim); margin-top: 2px;">
            Jadilah yang pertama mengabarkan perkembangan pekarangan Anda!
          </div>
          <button type="button" class="btn btn-primary" style="margin-top: 12px; font-size: 0.82rem;" @click="showNewPostModal = true">
            📸 Buat Kabar Baru
          </button>
        </div>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- VIEW 2: LIGA BERKAH (FASTABIQUL KHAIRAT)                              -->
    <!-- ===================================================================== -->
    <div v-else-if="activeSubTab === 'liga'" class="subtab-content">
      <!-- Tier Selector: Keluarga, Ranting, MWC -->
      <div class="league-tier-tabs card" style="padding: 6px; margin-bottom: 12px;">
        <div class="tier-buttons">
          <button 
            type="button" 
            class="tier-btn" 
            :class="{ active: leagueTier === 'keluarga' }"
            @click="leagueTier = 'keluarga'"
          >
            👨‍👩‍👧 Antar Keluarga
          </button>
          <button 
            type="button" 
            class="tier-btn" 
            :class="{ active: leagueTier === 'ranting' }"
            @click="leagueTier = 'ranting'"
          >
            🕌 Antar Ranting
          </button>
          <button 
            type="button" 
            class="tier-btn" 
            :class="{ active: leagueTier === 'mwc' }"
            @click="leagueTier = 'mwc'"
          >
            🏛️ Antar MWC
          </button>
        </div>
      </div>

      <!-- Banner Status Pekarangan Saya -->
      <div v-if="leagueTier === 'keluarga' && myFamilyRank" class="my-rank-banner card">
        <div class="my-rank-header">
          <div class="my-rank-badge">🏆 Peringkat #{{ myFamilyRank.rank }}</div>
          <div class="my-rank-points">{{ myFamilyRank.totalPoints }} Poin Berkah</div>
        </div>
        <div class="my-rank-desc">
          Pekarangan <strong>{{ myFamilyRank.familyName }}</strong> aktif di <strong>{{ myFamilyRank.ranting }}</strong> dengan {{ myFamilyRank.pilarCount }} Pilar Produktif.
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loadingLeaderboard" style="text-align: center; padding: 24px 0; color: var(--text-dim); font-size: 0.85rem;">
        Menghitung poin Fastabiqul Khairat dari Turso...
      </div>

      <!-- 1. TIER KELUARGA -->
      <div v-if="leagueTier === 'keluarga' && !loadingLeaderboard" class="leaderboard-list">
        <!-- Top 3 Podium Cards -->
        <div class="podium-section" v-if="familyLeaderboard.length >= 3">
          <!-- Juara 2 -->
          <div class="podium-card silver">
            <div class="podium-crown">🥈</div>
            <div class="podium-name">{{ familyLeaderboard[1].familyName }}</div>
            <div class="podium-pts">{{ familyLeaderboard[1].totalPoints }} Pts</div>
            <div class="podium-badge">{{ familyLeaderboard[1].ranting }}</div>
          </div>
          <!-- Juara 1 -->
          <div class="podium-card gold">
            <div class="podium-crown">👑</div>
            <div class="podium-name">{{ familyLeaderboard[0].familyName }}</div>
            <div class="podium-pts">{{ familyLeaderboard[0].totalPoints }} Pts</div>
            <div class="podium-badge">Juara 1 🥇</div>
          </div>
          <!-- Juara 3 -->
          <div class="podium-card bronze">
            <div class="podium-crown">🥉</div>
            <div class="podium-name">{{ familyLeaderboard[2].familyName }}</div>
            <div class="podium-pts">{{ familyLeaderboard[2].totalPoints }} Pts</div>
            <div class="podium-badge">{{ familyLeaderboard[2].ranting }}</div>
          </div>
        </div>

        <!-- Full List Table -->
        <div class="rank-items card" style="padding: 0;">
          <div 
            v-for="item in familyLeaderboard" 
            :key="item.memberId" 
            class="rank-row"
            :class="{ 'is-me-row': item.isCurrentUser }"
          >
            <div class="rank-number" :class="'rank-' + item.rank">
              {{ item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : '#' + item.rank }}
            </div>
            <div class="rank-info">
              <div class="rank-name-row">
                <span class="rank-name">{{ item.familyName }}</span>
                <span class="rank-honour-pill">{{ item.badge }}</span>
              </div>
              <div class="rank-sub">
                <span>{{ item.ranting }}</span>
                <span>•</span>
                <span>{{ item.pilarCount }} Pilar Aktif</span>
                <span v-if="item.totalSavings > 0">• Hemat Rp {{ item.totalSavings.toLocaleString() }}</span>
              </div>
            </div>
            <div class="rank-points-col">
              <span class="pts-val">{{ item.totalPoints }}</span>
              <span class="pts-lbl">Poin</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. TIER RANTING -->
      <div v-else-if="leagueTier === 'ranting' && !loadingLeaderboard" class="leaderboard-list">
        <div class="rank-items card" style="padding: 0;">
          <div 
            v-for="item in rantingLeaderboard" 
            :key="item.ranting" 
            class="rank-row"
          >
            <div class="rank-number" :class="'rank-' + item.rank">
              {{ item.rank === 1 ? '🏆' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : '#' + item.rank }}
            </div>
            <div class="rank-info">
              <div class="rank-name-row">
                <span class="rank-name">PRNU {{ item.ranting }}</span>
                <span class="rank-honour-pill">{{ item.badge }}</span>
              </div>
              <div class="rank-sub">
                <span>{{ item.mwcZone }}</span>
                <span>•</span>
                <span>{{ item.activeFamiliesCount }} KK Berpekarangan</span>
              </div>
            </div>
            <div class="rank-points-col">
              <span class="pts-val">{{ item.totalPoints }}</span>
              <span class="pts-lbl">Poin</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. TIER MWC -->
      <div v-else-if="leagueTier === 'mwc' && !loadingLeaderboard" class="leaderboard-list">
        <div class="rank-items card" style="padding: 0;">
          <div 
            v-for="item in mwcLeaderboard" 
            :key="item.mwcZone" 
            class="rank-row"
          >
            <div class="rank-number" :class="'rank-' + item.rank">
              {{ item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '#' + item.rank }}
            </div>
            <div class="rank-info">
              <div class="rank-name-row">
                <span class="rank-name">{{ item.mwcZone }}</span>
                <span class="rank-honour-pill">{{ item.badge }}</span>
              </div>
              <div class="rank-sub">
                <span>{{ item.totalRanting }} Ranting Terdaftar</span>
                <span>•</span>
                <span>{{ item.activeFamiliesCount }} KK Aktif</span>
              </div>
            </div>
            <div class="rank-points-col">
              <span class="pts-val">{{ item.totalPoints }}</span>
              <span class="pts-lbl">Poin</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Panduan Poin Edukatif -->
      <div class="scoring-info-box card">
        <div class="scoring-title">🌱 Rumus Poin Fastabiqul Khairat</div>
        <div class="scoring-grid">
          <div class="scoring-item">
            <span class="sc-pts">+50</span>
            <span class="sc-desc">Tiap Pilar Terdata (Maks 200 Pts)</span>
          </div>
          <div class="scoring-item">
            <span class="sc-pts">+20</span>
            <span class="sc-desc">Tiap Catatan Panen Riil</span>
          </div>
          <div class="scoring-item">
            <span class="sc-pts">+15</span>
            <span class="sc-desc">Tiap Catatan Produksi Telur</span>
          </div>
          <div class="scoring-item">
            <span class="sc-pts">+15</span>
            <span class="sc-desc">Posting Kabar Pekarangan</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- VIEW 3: DIREKTORI WARGA (EKSISTING)                                   -->
    <!-- ===================================================================== -->
    <div v-else-if="activeSubTab === 'warga'" class="subtab-content">
      <!-- Search & Filter Bar -->
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

      <!-- Member Cards List -->
      <div class="member-list">
        <div 
          v-for="m in filteredMembers" 
          :key="m.id" 
          class="member-card"
          :class="{ 'is-owner-card': isOwner(m) }"
        >
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
                <span v-if="m.ranting">{{ m.ranting }} • </span>
                <span>RT {{ m.rtRw }}</span>
                <span>•</span>
                <span>{{ m.statusLahan }}</span>
                <span>•</span>
                <span>{{ m.estimasiLuas }}</span>
              </div>
            </div>
          </div>

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

        <div v-if="filteredMembers.length === 0" class="empty-state card">
          <div style="font-size: 2.2rem; margin-bottom: 6px;">🔍</div>
          <div style="font-weight: 700; font-size: 0.9rem;">Tidak ada anggota yang cocok</div>
          <div style="font-size: 0.76rem; color: var(--text-dim); margin-top: 2px;">Coba gunakan kata kunci pencarian yang lain</div>
        </div>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- MODAL: KABARKAN PEKARANGAN BARU                                       -->
    <!-- ===================================================================== -->
    <div v-if="showNewPostModal" class="modal-backdrop" @click="showNewPostModal = false">
      <div class="modal-card" @click.stop>
        <div class="modal-header">
          <div>
            <div style="font-weight: 800; font-size: 1.05rem;">🌱 Apa Kabar Pekaranganmu?</div>
            <div style="font-size: 0.74rem; color: var(--text-dim); margin-top: 1px;">
              Bagikan kabar sukacita panen & kemandirian pangan keluarga ke warga NU
            </div>
          </div>
          <button type="button" class="btn-close" @click="showNewPostModal = false">✕</button>
        </div>

        <div class="modal-form" style="margin-top: 14px;">
          <!-- Kategori Picker -->
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-size: 0.78rem; font-weight: 700;">Kategori Kabar</label>
            <div class="modal-cat-grid">
              <button 
                v-for="cat in CATEGORIES.filter(c => c.id !== 'all')" 
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
            <label class="form-label" style="font-size: 0.78rem; font-weight: 700;">Jumlah / Hasil (Opsional)</label>
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
                💡 Foto otomatis dikompres hemat kuota sebelum disimpan.
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
              @click="showNewPostModal = false"
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

    <!-- ===================================================================== -->
    <!-- MODAL: DETAIL ANGGOTA                                                 -->
    <!-- ===================================================================== -->
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
            class="btn btn-whatsapp btn-full"
            @click="openWhatsApp(selectedMember.phone, selectedMember.name)"
          >
            Sapa di WhatsApp
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

/* SUBNAV SEGMENTED BAR */
.community-subnav-bar {
  background: var(--card-bg, #ffffff);
  border-bottom: 1px solid var(--border, #e5e7eb);
  padding: 8px 14px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.segmented-control {
  display: flex;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 3px;
  gap: 3px;
}

.seg-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 6px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-btn.active {
  background: #ffffff;
  color: #166534;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.seg-badge {
  font-size: 0.65rem;
  background: #22c55e;
  color: #ffffff;
  padding: 1px 5px;
  border-radius: 999px;
  font-weight: 800;
}

.subtab-content {
  padding: 12px 14px;
}

/* KABAR ACTION CARD */
.kabar-action-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1px solid #bbf7d0;
  margin-bottom: 10px;
}

.kabar-greeting {
  font-weight: 800;
  font-size: 0.92rem;
  color: #14532d;
}

.kabar-subtext {
  font-size: 0.72rem;
  color: #166534;
  margin-top: 2px;
}

.btn-kabar {
  font-size: 0.78rem;
  padding: 7px 12px;
  background: #16a34a;
  border-color: #16a34a;
  font-weight: 700;
  white-space: nowrap;
}

/* CATEGORY CHIPS SCROLL */
.category-chips-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 8px;
  scrollbar-width: none;
}
.category-chips-scroll::-webkit-scrollbar {
  display: none;
}

.cat-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-main, #334155);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.cat-chip.active {
  background: #166534;
  border-color: #166534;
  color: #ffffff;
}

/* FEED STREAM */
.feed-stream {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feed-card {
  padding: 14px;
  border: 1px solid var(--border, #e5e7eb);
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.feed-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.feed-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #dcfce7;
  color: #166534;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.feed-author-meta {
  flex: 1;
  min-width: 0;
}

.feed-author-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.feed-author-name {
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--text-main, #1e293b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.self-tag {
  font-size: 0.6rem;
  background: #16a34a;
  color: #fff;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 3px;
}

.feed-yard-sub {
  font-size: 0.72rem;
  color: var(--text-dim, #64748b);
  margin-top: 1px;
}

.dot-sep {
  margin: 0 4px;
}

.feed-metric-pill {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.feed-title {
  font-size: 0.92rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px;
}

.feed-text {
  font-size: 0.82rem;
  color: #334155;
  line-height: 1.45;
  margin: 0 0 10px;
}

.feed-photo-box {
  margin-bottom: 10px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.feed-photo-img {
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  display: block;
}

.mamasar-feed-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #1e40af;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 3px 8px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.feed-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
  gap: 8px;
}

.reaction-buttons-group {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.react-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
}

.react-btn:active {
  transform: scale(0.95);
}

.react-btn.active {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.react-count {
  font-size: 0.7rem;
  opacity: 0.85;
}

.sapa-wa-btn {
  background: transparent;
  border: 1px solid #bbf7d0;
  color: #16a34a;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

/* LIGA BERKAH STYLES */
.tier-buttons {
  display: flex;
  gap: 4px;
}

.tier-btn {
  flex: 1;
  padding: 8px 4px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
}

.tier-btn.active {
  background: #166534;
  color: #ffffff;
}

.my-rank-banner {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1px solid #bbf7d0;
  padding: 12px 14px;
  margin-bottom: 12px;
}

.my-rank-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.my-rank-badge {
  font-weight: 800;
  font-size: 0.95rem;
  color: #15803d;
}

.my-rank-points {
  font-size: 0.82rem;
  font-weight: 800;
  color: #14532d;
  background: #dcfce7;
  padding: 2px 8px;
  border-radius: 6px;
}

.my-rank-desc {
  font-size: 0.76rem;
  color: #166534;
}

/* PODIUM SECTION */
.podium-section {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 8px;
  align-items: flex-end;
  margin-bottom: 12px;
}

.podium-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 6px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
}

.podium-card.gold {
  border-color: #facc15;
  background: linear-gradient(180deg, #fefce8 0%, #ffffff 100%);
  transform: translateY(-6px);
}

.podium-card.silver {
  border-color: #cbd5e1;
}

.podium-card.bronze {
  border-color: #fed7aa;
}

.podium-crown {
  font-size: 1.4rem;
  margin-bottom: 2px;
}

.podium-name {
  font-size: 0.74rem;
  font-weight: 800;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.podium-pts {
  font-size: 0.78rem;
  font-weight: 800;
  color: #166534;
  margin-top: 2px;
}

.podium-badge {
  font-size: 0.65rem;
  color: #64748b;
  margin-top: 2px;
}

/* RANK TABLE ROWS */
.rank-items {
  overflow: hidden;
  border: 1px solid var(--border, #e5e7eb);
  margin-bottom: 12px;
}

.rank-row {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  gap: 10px;
}

.rank-row:last-child {
  border-bottom: none;
}

.rank-row.is-me-row {
  background: #f0fdf4;
}

.rank-number {
  font-size: 0.95rem;
  font-weight: 800;
  color: #64748b;
  width: 26px;
  text-align: center;
}

.rank-info {
  flex: 1;
  min-width: 0;
}

.rank-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.rank-name {
  font-size: 0.85rem;
  font-weight: 800;
  color: #1e293b;
}

.rank-honour-pill {
  font-size: 0.64rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
}

.rank-sub {
  font-size: 0.72rem;
  color: var(--text-dim, #64748b);
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 1px;
}

.rank-points-col {
  text-align: right;
}

.pts-val {
  display: block;
  font-size: 0.92rem;
  font-weight: 900;
  color: #166534;
}

.pts-lbl {
  font-size: 0.64rem;
  color: #94a3b8;
  text-transform: uppercase;
}

/* SCORING INFO BOX */
.scoring-info-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 12px;
}

.scoring-title {
  font-size: 0.8rem;
  font-weight: 800;
  color: #334155;
  margin-bottom: 8px;
}

.scoring-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.scoring-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 6px 8px;
  border-radius: 6px;
}

.sc-pts {
  font-size: 0.76rem;
  font-weight: 900;
  color: #16a34a;
}

.sc-desc {
  font-size: 0.7rem;
  color: #64748b;
  line-height: 1.2;
}

/* MODAL NEW POST */
.modal-cat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 4px;
}

.modal-cat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 4px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
}

.modal-cat-btn.active {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

/* DIREKTORI WARGA STYLES */
.member-count-pill {
  font-size: 0.72rem;
  font-weight: 800;
  background: #e2e8f0;
  color: #475569;
  padding: 4px 8px;
  border-radius: 6px;
}

.rt-filter-chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.chip-btn {
  padding: 4px 10px;
  border: 1px solid var(--border);
  background: #f8faf9;
  border-radius: 14px;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-dim);
  cursor: pointer;
  white-space: nowrap;
}

.chip-btn.active {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.member-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px;
  padding: 10px 12px;
}

.is-owner-card {
  border-color: #86efac;
  background: #fafffc;
}

.member-card-header {
  display: flex;
  gap: 10px;
  align-items: center;
}

.member-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.member-main-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 0.88rem;
  font-weight: 800;
  color: #0f172a;
}

.verified-icon {
  font-size: 0.7rem;
  background: #22c55e;
  color: #fff;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.member-meta {
  font-size: 0.72rem;
  color: var(--text-dim);
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 2px;
}

.member-card-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  border-top: 1px solid #f1f5f9;
  padding-top: 8px;
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

/* MODAL SHARED */
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

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
