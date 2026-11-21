<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { 
  CommunityMemberItem, 
  CommunityPostItem, 
  FamilyLeaderboardItem, 
  RantingLeaderboardItem, 
  MwcLeaderboardItem
} from '../types';
import { StorageService } from '../services/storage';
import { TursoService, isTursoConfigured } from '../services/turso';
import AppIcon from './AppIcon.vue';

const emit = defineEmits<{
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
  (e: 'goToProfile'): void;
  (e: 'openCreatePost'): void;
}>();

const settings = StorageService.getSettings();

// 3 Sub-Tabs
const activeSubTab = ref<'kabar' | 'liga' | 'warga'>('kabar');

// Helper to strip any legacy bare emojis from stored badges / metrics
const cleanEmoji = (text?: string): string => {
  if (!text) return '';
  return text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
};

// ============================================================================
// 1. SUB-TAB: APA KABAR PEKARANGANMU? (FEED SOSIAL)
// ============================================================================
const posts = ref<CommunityPostItem[]>(StorageService.getCommunityPosts());
const loadingPosts = ref(false);
const selectedCategory = ref<string>('all');

const CATEGORIES = [
  { id: 'all', label: 'Semua', icon: 'star' },
  { id: 'panen', label: 'Panen', icon: 'wheat' },
  { id: 'tanam', label: 'Tanam', icon: 'sprout' },
  { id: 'ternak', label: 'Ternak', icon: 'egg' },
  { id: 'dapur', label: 'Dapur', icon: 'utensils' },
  { id: 'apotek', label: 'Apotek', icon: 'pill' },
  { id: 'sedekah', label: 'Sedekah', icon: 'heart-handshake' },
  { id: 'rpp', label: 'RPP', icon: 'package' }
];

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

const refresh = () => {
  posts.value = StorageService.getCommunityPosts();
  loadPostsFromTurso();
  loadLeaderboardStats();
};

defineExpose({
  refresh
});

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
          <AppIcon name="radio" size="xs" />
          <span>Kabar</span>
          <span class="seg-badge font-mono" v-if="posts.length > 0">{{ posts.length }}</span>
        </button>

        <button 
          type="button" 
          class="seg-btn" 
          :class="{ active: activeSubTab === 'liga' }"
          @click="activeSubTab = 'liga'"
        >
          <AppIcon name="trophy" size="xs" />
          <span>Liga</span>
        </button>

        <button 
          type="button" 
          class="seg-btn" 
          :class="{ active: activeSubTab === 'warga' }"
          @click="activeSubTab = 'warga'"
        >
          <AppIcon name="users" size="xs" />
          <span>Warga</span>
          <span class="seg-badge font-mono">{{ members.length }}</span>
        </button>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- VIEW 1: APA KABAR PEKARANGANMU? (FEED SOSIAL)                         -->
    <!-- ===================================================================== -->
    <div v-if="activeSubTab === 'kabar'" class="subtab-content">
      <!-- Kategori Filter Chips -->
      <div class="category-chips-scroll">
        <button 
          v-for="cat in CATEGORIES" 
          :key="cat.id"
          type="button" 
          class="cat-chip active:scale-95 transition-transform" 
          :class="{ active: selectedCategory === cat.id }"
          @click="selectedCategory = cat.id"
        >
          <AppIcon :name="cat.icon" size="xs" />
          <span>{{ cat.label }}</span>
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loadingPosts" class="py-6 text-center text-xs text-neutral-500 font-medium">
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
            <div class="feed-avatar font-mono">
              {{ post.authorName.charAt(0).toUpperCase() }}
            </div>
            <div class="feed-author-meta">
              <div class="feed-author-row">
                <span class="feed-author-name">{{ post.authorName }}</span>
                <span v-if="post.authorPhone === settings.phone" class="self-tag">Saya</span>
              </div>
              <div class="feed-yard-sub">
                <span v-if="post.yardName" class="inline-flex items-center gap-0.5">
                  <AppIcon name="home" size="xs" class="text-emerald-600 inline" />
                  <span>{{ post.yardName }}</span>
                  <span class="dot-sep">•</span>
                </span>
                <span>{{ post.ranting }}</span>
                <span class="dot-sep">•</span>
                <span class="feed-time font-mono">{{ formatRelativeTime(post.createdAt) }}</span>
              </div>
            </div>
            <div v-if="post.metricBadge" class="feed-metric-pill font-mono">
              {{ cleanEmoji(post.metricBadge) }}
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
              <AppIcon name="package" size="xs" class="text-blue-700" />
              <span>Produk Olahan RPP • Mamasar</span>
            </div>
          </div>

          <!-- Post Footer: Reaksi Doa NU & Sapa WA -->
          <div class="feed-actions">
            <div class="reaction-buttons-group">
              <button 
                type="button" 
                class="react-btn active:scale-95 transition-transform" 
                :class="{ active: post.userReaction === 'berkah' }"
                @click="handleReaction(post, 'berkah')"
              >
                <AppIcon name="sparkles" size="xs" />
                <span class="react-label">Berkah</span>
                <span class="react-count font-mono">{{ post.reactions?.berkah || 0 }}</span>
              </button>

              <button 
                type="button" 
                class="react-btn active:scale-95 transition-transform" 
                :class="{ active: post.userReaction === 'masyaallah' }"
                @click="handleReaction(post, 'masyaallah')"
              >
                <AppIcon name="heart" size="xs" />
                <span class="react-label">MasyaAllah</span>
                <span class="react-count font-mono">{{ post.reactions?.masyaallah || 0 }}</span>
              </button>

              <button 
                type="button" 
                class="react-btn active:scale-95 transition-transform" 
                :class="{ active: post.userReaction === 'seger' }"
                @click="handleReaction(post, 'seger')"
              >
                <AppIcon name="leaf" size="xs" />
                <span class="react-label">Seger</span>
                <span class="react-count font-mono">{{ post.reactions?.seger || 0 }}</span>
              </button>

              <button 
                type="button" 
                class="react-btn active:scale-95 transition-transform" 
                :class="{ active: post.userReaction === 'semangat' }"
                @click="handleReaction(post, 'semangat')"
              >
                <AppIcon name="flame" size="xs" />
                <span class="react-label">Giat</span>
                <span class="react-count font-mono">{{ post.reactions?.semangat || 0 }}</span>
              </button>
            </div>

            <button 
              v-if="post.authorPhone && post.authorPhone !== settings.phone"
              type="button" 
              class="sapa-wa-btn active:scale-95 transition-transform"
              @click="openWhatsApp(post.authorPhone, post.authorName)"
              title="Kirim sapaan WhatsApp"
            >
              <AppIcon name="chat" size="xs" />
              <span>Sapa</span>
            </button>
          </div>
        </div>

        <!-- Empty Feed -->
        <div v-if="filteredPosts.length === 0 && !loadingPosts" class="empty-state card">
          <AppIcon name="sprout" size="xl" class="text-neutral-400 mb-2" />
          <div class="font-bold text-sm text-neutral-800 dark:text-neutral-200">Belum ada kabar di kategori ini</div>
          <div class="text-xs text-neutral-500 mt-1">
            Jadilah yang pertama mengabarkan perkembangan pekarangan Anda!
          </div>
          <button 
            type="button" 
            class="flex items-center gap-1.5 mx-auto mt-3 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg active:scale-95 transition-transform shadow-xs" 
            @click="emit('openCreatePost')"
          >
            <AppIcon name="camera" size="xs" />
            <span>Kabarkan</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- VIEW 2: LIGA BERKAH (FASTABIQUL KHAIRAT)                              -->
    <!-- ===================================================================== -->
    <div v-else-if="activeSubTab === 'liga'" class="subtab-content">
      <!-- Tier Selector: Keluarga, Ranting, MWC -->
      <div class="league-tier-tabs card p-1 mb-3">
        <div class="tier-buttons">
          <button 
            type="button" 
            class="tier-btn active:scale-98 transition-transform" 
            :class="{ active: leagueTier === 'keluarga' }"
            @click="leagueTier = 'keluarga'"
          >
            <AppIcon name="users" size="xs" />
            <span>Keluarga</span>
          </button>
          <button 
            type="button" 
            class="tier-btn active:scale-98 transition-transform" 
            :class="{ active: leagueTier === 'ranting' }"
            @click="leagueTier = 'ranting'"
          >
            <AppIcon name="building" size="xs" />
            <span>Ranting</span>
          </button>
          <button 
            type="button" 
            class="tier-btn active:scale-98 transition-transform" 
            :class="{ active: leagueTier === 'mwc' }"
            @click="leagueTier = 'mwc'"
          >
            <AppIcon name="landmark" size="xs" />
            <span>MWC</span>
          </button>
        </div>
      </div>

      <!-- Banner Status Pekarangan Saya -->
      <div v-if="leagueTier === 'keluarga' && myFamilyRank" class="my-rank-banner card">
        <div class="my-rank-header">
          <div class="my-rank-badge flex items-center gap-1.5">
            <AppIcon name="trophy" size="sm" class="text-emerald-700" />
            <span>Peringkat</span>
            <span class="font-mono">#{{ myFamilyRank.rank }}</span>
          </div>
          <div class="my-rank-points font-mono">
            {{ myFamilyRank.totalPoints }} Pts
          </div>
        </div>
        <div class="my-rank-desc">
          Pekarangan <strong>{{ myFamilyRank.familyName }}</strong> • <strong>{{ myFamilyRank.ranting }}</strong> ({{ myFamilyRank.pilarCount }} Pilar Aktif)
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loadingLeaderboard" class="py-6 text-center text-xs text-neutral-500 font-medium">
        Menghitung poin Fastabiqul Khairat dari Turso...
      </div>

      <!-- 1. TIER KELUARGA -->
      <div v-if="leagueTier === 'keluarga' && !loadingLeaderboard" class="leaderboard-list">
        <!-- Top 3 Podium Cards -->
        <div class="podium-section" v-if="familyLeaderboard.length >= 3">
          <!-- Juara 2 (Silver) -->
          <div class="podium-card silver">
            <AppIcon name="medal" size="md" class="text-slate-400 mx-auto mb-1" />
            <div class="podium-name">{{ familyLeaderboard[1].familyName }}</div>
            <div class="podium-pts font-mono">{{ familyLeaderboard[1].totalPoints }} Pts</div>
            <div class="podium-badge">{{ familyLeaderboard[1].ranting }}</div>
          </div>
          <!-- Juara 1 (Gold) -->
          <div class="podium-card gold">
            <AppIcon name="crown" size="lg" class="text-amber-500 mx-auto mb-1" />
            <div class="podium-name">{{ familyLeaderboard[0].familyName }}</div>
            <div class="podium-pts font-mono">{{ familyLeaderboard[0].totalPoints }} Pts</div>
            <div class="podium-badge-gold">Juara 1</div>
          </div>
          <!-- Juara 3 (Bronze) -->
          <div class="podium-card bronze">
            <AppIcon name="medal" size="md" class="text-amber-700 mx-auto mb-1" />
            <div class="podium-name">{{ familyLeaderboard[2].familyName }}</div>
            <div class="podium-pts font-mono">{{ familyLeaderboard[2].totalPoints }} Pts</div>
            <div class="podium-badge">{{ familyLeaderboard[2].ranting }}</div>
          </div>
        </div>

        <!-- Full List Table -->
        <div class="rank-items card p-0">
          <div 
            v-for="item in familyLeaderboard" 
            :key="item.memberId" 
            class="rank-row"
            :class="{ 'is-me-row': item.isCurrentUser }"
          >
            <div class="rank-col">
              <span v-if="item.rank === 1" class="rank-badge gold"><AppIcon name="crown" size="xs" /></span>
              <span v-else-if="item.rank === 2" class="rank-badge silver"><AppIcon name="medal" size="xs" /></span>
              <span v-else-if="item.rank === 3" class="rank-badge bronze"><AppIcon name="medal" size="xs" /></span>
              <span v-else class="rank-num font-mono">#{{ item.rank }}</span>
            </div>
            <div class="rank-info">
              <div class="rank-name-row">
                <span class="rank-name">{{ item.familyName }}</span>
                <span class="rank-honour-pill">{{ cleanEmoji(item.badge) }}</span>
              </div>
              <div class="rank-sub">
                <span>{{ item.ranting }}</span>
                <span>•</span>
                <span>{{ item.pilarCount }} Pilar</span>
                <span v-if="item.totalSavings > 0">• Hemat Rp <span class="font-mono">{{ item.totalSavings.toLocaleString() }}</span></span>
              </div>
            </div>
            <div class="rank-points-col">
              <span class="pts-val font-mono">{{ item.totalPoints }}</span>
              <span class="pts-lbl">Poin</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. TIER RANTING -->
      <div v-else-if="leagueTier === 'ranting' && !loadingLeaderboard" class="leaderboard-list">
        <div class="rank-items card p-0">
          <div 
            v-for="item in rantingLeaderboard" 
            :key="item.ranting" 
            class="rank-row"
          >
            <div class="rank-col">
              <span v-if="item.rank === 1" class="rank-badge gold"><AppIcon name="trophy" size="xs" /></span>
              <span v-else-if="item.rank === 2" class="rank-badge silver"><AppIcon name="medal" size="xs" /></span>
              <span v-else-if="item.rank === 3" class="rank-badge bronze"><AppIcon name="medal" size="xs" /></span>
              <span v-else class="rank-num font-mono">#{{ item.rank }}</span>
            </div>
            <div class="rank-info">
              <div class="rank-name-row">
                <span class="rank-name">PRNU {{ item.ranting }}</span>
                <span class="rank-honour-pill">{{ cleanEmoji(item.badge) }}</span>
              </div>
              <div class="rank-sub">
                <span>{{ item.mwcZone }}</span>
                <span>•</span>
                <span><strong class="font-mono">{{ item.activeFamiliesCount }}</strong> KK Berpekarangan</span>
              </div>
            </div>
            <div class="rank-points-col">
              <span class="pts-val font-mono">{{ item.totalPoints }}</span>
              <span class="pts-lbl">Poin</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. TIER MWC -->
      <div v-else-if="leagueTier === 'mwc' && !loadingLeaderboard" class="leaderboard-list">
        <div class="rank-items card p-0">
          <div 
            v-for="item in mwcLeaderboard" 
            :key="item.mwcZone" 
            class="rank-row"
          >
            <div class="rank-col">
              <span v-if="item.rank === 1" class="rank-badge gold"><AppIcon name="trophy" size="xs" /></span>
              <span v-else-if="item.rank === 2" class="rank-badge silver"><AppIcon name="medal" size="xs" /></span>
              <span v-else class="rank-num font-mono">#{{ item.rank }}</span>
            </div>
            <div class="rank-info">
              <div class="rank-name-row">
                <span class="rank-name">{{ item.mwcZone }}</span>
                <span class="rank-honour-pill">{{ cleanEmoji(item.badge) }}</span>
              </div>
              <div class="rank-sub">
                <span>{{ item.totalRanting }} Ranting</span>
                <span>•</span>
                <span><strong class="font-mono">{{ item.activeFamiliesCount }}</strong> KK Aktif</span>
              </div>
            </div>
            <div class="rank-points-col">
              <span class="pts-val font-mono">{{ item.totalPoints }}</span>
              <span class="pts-lbl">Poin</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Panduan Poin Edukatif -->
      <div class="scoring-info-box card">
        <div class="scoring-title flex items-center gap-1.5">
          <AppIcon name="sparkles" size="xs" class="text-emerald-600" />
          <span>Aturan Poin Fastabiqul Khairat</span>
        </div>
        <div class="scoring-grid">
          <div class="scoring-item">
            <span class="sc-pts font-mono">+50</span>
            <span class="sc-desc">Tiap Pilar Terdata (Maks 200)</span>
          </div>
          <div class="scoring-item">
            <span class="sc-pts font-mono">+20</span>
            <span class="sc-desc">Tiap Catatan Panen Riil</span>
          </div>
          <div class="scoring-item">
            <span class="sc-pts font-mono">+15</span>
            <span class="sc-desc">Tiap Catatan Produksi Telur</span>
          </div>
          <div class="scoring-item">
            <span class="sc-pts font-mono">+15</span>
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
      <div class="card p-2 mb-2">
        <div class="flex gap-2 mb-2 items-center">
          <div class="relative flex-1">
            <input 
              v-model="searchQuery" 
              type="text" 
              class="form-control" 
              style="padding-left: 32px; font-size: 0.82rem; padding-top: 6px; padding-bottom: 6px;"
              placeholder="Cari nama, RT, tanaman..."
            />
            <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
              <AppIcon name="search" size="xs" />
            </div>
          </div>
          <span class="member-count-pill font-mono">{{ filteredMembers.length }} KK</span>
        </div>

        <!-- Filter RT Chips -->
        <div class="rt-filter-chips">
          <button 
            type="button" 
            class="chip-btn active:scale-95 transition-transform" 
            :class="{ active: selectedRt === 'all' }"
            @click="selectedRt = 'all'"
          >
            Semua
          </button>
          <button 
            v-for="rt in rtList" 
            :key="rt"
            type="button" 
            class="chip-btn active:scale-95 transition-transform" 
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
            <div class="member-avatar font-mono" :style="isOwner(m) ? { background: '#16a34a', color: '#fff' } : {}">
              {{ isOwner(m) ? '★' : m.name.charAt(0).toUpperCase() }}
            </div>
            <div class="member-main-info">
              <div class="member-name-row flex-wrap gap-1">
                <span class="member-name">{{ m.name }}</span>
                <span v-if="isOwner(m)" class="self-tag">Saya</span>
                <span v-else class="verified-icon" title="Pekarangan Aktif">
                  <AppIcon name="check" size="xs" class="text-white" stroke-width="2.5" />
                </span>
              </div>
              <div v-if="m.yardName" class="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                <AppIcon name="home" size="xs" class="text-emerald-600 inline" />
                <span>{{ m.yardName }}</span>
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
              class="btn-sm btn-outline btn-full active:scale-95 transition-transform"
              style="padding: 5px 8px; font-size: 0.76rem;"
              @click="selectedMember = m"
            >
              <span>Detail</span>
            </button>

            <button 
              v-if="isOwner(m)"
              type="button" 
              class="btn-sm btn-primary btn-full active:scale-95 transition-transform"
              style="padding: 5px 8px; font-size: 0.76rem;"
              @click="$emit('goToProfile')"
            >
              <span>Profil</span>
            </button>

            <button 
              v-else
              type="button" 
              class="btn-sm btn-whatsapp btn-full active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              style="padding: 5px 8px; font-size: 0.76rem;"
              @click="openWhatsApp(m.phone, m.name)"
            >
              <AppIcon name="chat" size="xs" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        <div v-if="filteredMembers.length === 0" class="empty-state card">
          <AppIcon name="search" size="xl" class="text-neutral-400 mb-2" />
          <div class="font-bold text-sm text-neutral-800 dark:text-neutral-200">Tidak ada anggota yang cocok</div>
          <div class="text-xs text-neutral-500 mt-1">Coba gunakan kata kunci pencarian yang lain</div>
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
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-base text-neutral-900">{{ selectedMember.name }}</span>
              <span v-if="isOwner(selectedMember)" class="self-tag">Saya</span>
            </div>
            <div v-if="selectedMember.yardName" class="text-xs font-semibold text-emerald-800 mt-0.5 flex items-center gap-1">
              <AppIcon name="home" size="xs" class="text-emerald-600 inline" />
              <span>{{ selectedMember.yardName }}</span>
            </div>
            <div class="text-xs text-neutral-500 mt-0.5">
              Alamat: RT {{ selectedMember.rtRw }} • Bergabung {{ selectedMember.joinedDate }}
            </div>
          </div>
          <button type="button" class="btn-close active:scale-90 transition-transform" @click="selectedMember = null">
            <AppIcon name="x" size="md" />
          </button>
        </div>

        <div style="margin: 12px 0;">
          <div class="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
            Profil Pekarangan
          </div>
          <div class="bg-neutral-50 border border-neutral-200 rounded-xl p-3 mb-3 text-xs leading-relaxed">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <span class="text-neutral-500">Status Lahan:</span><br />
                <strong class="text-neutral-800">{{ selectedMember.statusLahan }}</strong>
              </div>
              <div>
                <span class="text-neutral-500">Estimasi Luas:</span><br />
                <strong class="text-neutral-800">{{ selectedMember.estimasiLuas }}</strong>
              </div>
              <div class="col-span-2">
                <span class="text-neutral-500">Zonasi:</span><br />
                <strong class="text-neutral-800">{{ selectedMember.zonasi.join(', ') }}</strong>
              </div>
            </div>
          </div>

          <div class="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
            Komoditas yang Dibudidayakan
          </div>
          <div class="flex flex-wrap gap-1.5 mb-3">
            <div 
              v-for="(k, i) in selectedMember.komoditas" 
              :key="i"
              class="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-semibold"
            >
              <AppIcon name="leaf" size="xs" class="text-emerald-600" />
              <span>{{ cleanEmoji(k.name) }}</span>
            </div>
          </div>

          <p class="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-lg border border-neutral-200">
            "{{ selectedMember.bio }}"
          </p>
        </div>

        <div class="flex gap-2">
          <button 
            type="button" 
            class="btn btn-outline btn-full active:scale-98 transition-transform" 
            @click="selectedMember = null"
          >
            Tutup
          </button>
          <button 
            type="button" 
            class="btn btn-whatsapp btn-full active:scale-98 transition-transform flex items-center justify-center gap-1.5"
            @click="openWhatsApp(selectedMember.phone, selectedMember.name)"
          >
            <AppIcon name="chat" size="xs" />
            <span>WhatsApp</span>
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

@media (prefers-color-scheme: dark) {
  .segmented-control {
    background: #1e293b;
  }
}

.seg-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 6px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 0.76rem;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  transition: all 0.12s ease;
}

.seg-btn.active {
  background: #ffffff;
  color: #166534;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

@media (prefers-color-scheme: dark) {
  .seg-btn.active {
    background: #0f172a;
    color: #4ade80;
  }
}

.seg-badge {
  font-size: 0.62rem;
  background: #16a34a;
  color: #ffffff;
  padding: 1px 5px;
  border-radius: 999px;
  font-weight: 700;
}

.subtab-content {
  padding: 12px 14px;
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
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-main, #334155);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.12s ease;
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
  gap: 10px;
}

.feed-card {
  padding: 12px 14px;
  border: 1px solid var(--border, #e5e7eb);
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.feed-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.feed-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #dcfce7;
  color: #166534;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.88rem;
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
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--text-main, #1e293b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.self-tag {
  font-size: 0.58rem;
  background: #16a34a;
  color: #fff;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 3px;
}

.feed-yard-sub {
  font-size: 0.7rem;
  color: var(--text-dim, #64748b);
  margin-top: 1px;
}

.dot-sep {
  margin: 0 3px;
}

.feed-metric-pill {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  white-space: nowrap;
}

.feed-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
}

.feed-text {
  font-size: 0.8rem;
  color: #334155;
  line-height: 1.4;
  margin: 0 0 8px;
}

.feed-photo-box {
  margin-bottom: 8px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.feed-photo-img {
  width: 100%;
  max-height: 240px;
  object-fit: cover;
  display: block;
}

.mamasar-feed-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #1e40af;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 2px 8px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.feed-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #f1f5f9;
  padding-top: 8px;
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
  padding: 4px 7px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.12s ease;
}

.react-btn.active {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.react-count {
  font-size: 0.68rem;
  opacity: 0.9;
}

.sapa-wa-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid #bbf7d0;
  color: #16a34a;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.72rem;
  font-weight: 600;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 4px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
}

.tier-btn.active {
  background: #16a34a;
  color: #ffffff;
}

.my-rank-banner {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1px solid #bbf7d0;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.my-rank-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}

.my-rank-badge {
  font-weight: 700;
  font-size: 0.88rem;
  color: #15803d;
}

.my-rank-points {
  font-size: 0.78rem;
  font-weight: 700;
  color: #14532d;
  background: #dcfce7;
  padding: 1px 7px;
  border-radius: 6px;
}

.my-rank-desc {
  font-size: 0.72rem;
  color: #166534;
}

/* PODIUM SECTION */
.podium-section {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 6px;
  align-items: flex-end;
  margin-bottom: 10px;
}

.podium-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 4px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}

.podium-card.gold {
  border-color: #facc15;
  background: linear-gradient(180deg, #fefce8 0%, #ffffff 100%);
  transform: translateY(-4px);
}

.podium-card.silver {
  border-color: #cbd5e1;
}

.podium-card.bronze {
  border-color: #fed7aa;
}

.podium-name {
  font-size: 0.72rem;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}

.podium-pts {
  font-size: 0.74rem;
  font-weight: 800;
  color: #166534;
  margin-top: 1px;
}

.podium-badge {
  font-size: 0.62rem;
  color: #64748b;
  margin-top: 1px;
}

.podium-badge-gold {
  font-size: 0.62rem;
  font-weight: 800;
  color: #854d0e;
  background: #fef08a;
  border-radius: 4px;
  padding: 1px 5px;
  display: inline-block;
  margin-top: 1px;
}

/* RANK TABLE ROWS */
.rank-items {
  overflow: hidden;
  border: 1px solid var(--border, #e5e7eb);
  margin-bottom: 10px;
}

.rank-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  gap: 10px;
}

.rank-row:last-child {
  border-bottom: none;
}

.rank-row.is-me-row {
  background: #f0fdf4;
}

.rank-col {
  width: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rank-num {
  font-size: 0.82rem;
  font-weight: 800;
  color: #64748b;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
}

.rank-badge.gold {
  background: #fef08a;
  color: #854d0e;
}

.rank-badge.silver {
  background: #f1f5f9;
  color: #475569;
}

.rank-badge.bronze {
  background: #ffedd5;
  color: #9a3412;
}

.rank-info {
  flex: 1;
  min-width: 0;
}

.rank-name-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.rank-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: #1e293b;
}

.rank-honour-pill {
  font-size: 0.62rem;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
}

.rank-sub {
  font-size: 0.7rem;
  color: var(--text-dim, #64748b);
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 1px;
}

.rank-points-col {
  text-align: right;
  flex-shrink: 0;
}

.pts-val {
  display: block;
  font-size: 0.88rem;
  font-weight: 800;
  color: #166534;
  line-height: 1.1;
}

.pts-lbl {
  font-size: 0.6rem;
  color: #94a3b8;
  text-transform: uppercase;
}

/* SCORING INFO BOX */
.scoring-info-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 10px 12px;
}

.scoring-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: #334155;
  margin-bottom: 6px;
}

.scoring-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.scoring-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 5px 8px;
  border-radius: 6px;
}

.sc-pts {
  font-size: 0.74rem;
  font-weight: 800;
  color: #16a34a;
}

.sc-desc {
  font-size: 0.68rem;
  color: #64748b;
  line-height: 1.2;
}

/* DIREKTORI WARGA STYLES */
.member-count-pill {
  font-size: 0.7rem;
  font-weight: 700;
  background: #e2e8f0;
  color: #475569;
  padding: 3px 7px;
  border-radius: 6px;
}

.rt-filter-chips {
  display: flex;
  gap: 5px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}
.rt-filter-chips::-webkit-scrollbar {
  display: none;
}

.chip-btn {
  padding: 3px 9px;
  border: 1px solid var(--border);
  background: #f8faf9;
  border-radius: 12px;
  font-size: 0.72rem;
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
  gap: 6px;
  margin-top: 6px;
}

.member-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 10px;
  padding: 8px 10px;
}

.is-owner-card {
  border-color: #86efac;
  background: #fafffc;
}

.member-card-header {
  display: flex;
  gap: 8px;
  align-items: center;
}

.member-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.88rem;
  flex-shrink: 0;
}

.member-main-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 0.84rem;
  font-weight: 700;
  color: #0f172a;
}

.verified-icon {
  background: #16a34a;
  color: #fff;
  border-radius: 50%;
  width: 13px;
  height: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.member-meta {
  font-size: 0.7rem;
  color: var(--text-dim);
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 1px;
}

.member-card-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  border-top: 1px solid #f1f5f9;
  padding-top: 6px;
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
  border-radius: 20px 20px 0 0;
  padding: 14px 16px calc(18px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -12px 36px rgba(0, 0, 0, 0.28);
  animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  z-index: 2001;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-card::before {
  content: '';
  display: block;
  width: 32px;
  height: 3.5px;
  background: #cbd5e1;
  border-radius: 2px;
  margin: 0 auto 10px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
