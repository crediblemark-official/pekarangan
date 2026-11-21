<template>
  <svg 
    class="app-icon"
    :width="numericPixelSize"
    :height="numericPixelSize"
    :style="iconInlineStyles"
    :viewBox="viewBox" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round" 
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- ================= 1. MENU & NAVIGATION ================= -->
    
    <!-- Home / Beranda: Sleek architectural storefront with hearth/door -->
    <g v-if="name === 'home' || name === 'beranda'">
      <path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-9Z" />
      <path v-if="duotone" d="M9 21V12.5a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5V21" fill="currentColor" fill-opacity="0.18" />
      <path d="M9 21V12.5a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5V21" />
      <path d="M12 3v3" opacity="0.35" />
    </g>

    <!-- Explore / Jelajah -->
    <g v-else-if="name === 'explore' || name === 'jelajah'">
      <circle cx="12" cy="12" r="9" />
      <polygon points="12,6.5 14.5,12 12,17.5 9.5,12" stroke-linejoin="round" />
      <polygon v-if="duotone" points="12,6.5 14.5,12 12,17.5" fill="currentColor" fill-opacity="0.22" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </g>

    <!-- Users / Warga / Tim / Komunitas -->
    <g v-else-if="name === 'users' || name === 'warga' || name === 'team' || name === 'tim' || name === 'community'">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <circle v-if="duotone" cx="9" cy="7" r="2.2" fill="currentColor" fill-opacity="0.2" stroke="none" />
    </g>

    <!-- User / Profil Avatar -->
    <g v-else-if="name === 'user' || name === 'avatar' || name === 'profile' || name === 'profil'">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <circle v-if="duotone" cx="12" cy="7" r="2.2" fill="currentColor" fill-opacity="0.2" stroke="none" />
    </g>

    <!-- Clipboard / Catat / Form -->
    <g v-else-if="name === 'clipboard' || name === 'catat' || name === 'form' || name === 'record'">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1Z" />
      <path v-if="duotone" d="M9 11h6M9 15h4" opacity="0.45" stroke-width="1.5" />
    </g>

    <!-- Edit / Pencil -->
    <g v-else-if="name === 'edit' || name === 'pencil' || name === 'ubah'">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />
      <path v-if="duotone" d="m15 5 4 4" opacity="0.4" />
    </g>

    <!-- Dashboard -->
    <g v-else-if="name === 'dashboard' || name === 'overview' || name === 'ringkasan' || name === 'layout-dashboard'">
      <rect x="3" y="3" width="7.5" height="9" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="5" rx="2" />
      <rect x="13.5" y="11" width="7.5" height="10" rx="2" />
      <rect x="3" y="15" width="7.5" height="6" rx="2" />
      <circle v-if="duotone" cx="6.75" cy="7.5" r="1.2" fill="currentColor" />
    </g>

    <!-- ================= 2. PEKARANGAN DOMAIN ICONS ================= -->

    <!-- Leaf / Daun / Panen Hijau -->
    <g v-else-if="name === 'leaf' || name === 'daun'">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      <path v-if="duotone" d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" fill="currentColor" fill-opacity="0.18" stroke="none" />
    </g>

    <!-- Wheat / Panen / Padi / Panenan -->
    <g v-else-if="name === 'wheat' || name === 'panen' || name === 'harvest'">
      <path d="m2 22 10-10" />
      <path d="M16 8a4 4 0 0 0-4-4c-2.2 0-4 1.8-4 4 0 2.2 1.8 4 4 4" />
      <path d="M18 14a4 4 0 0 0-4-4c-2.2 0-4 1.8-4 4 0 2.2 1.8 4 4 4" />
      <path d="M12 2a4 4 0 0 0-4 4c0 2.2 1.8 4 4 4" />
      <path d="m20 4-2 2" />
      <path d="m19 11-2 2" />
      <circle v-if="duotone" cx="12" cy="6" r="1.5" fill="currentColor" opacity="0.3" />
    </g>

    <!-- Sprout / Tanam / Bibit / Semai -->
    <g v-else-if="name === 'sprout' || name === 'tanam' || name === 'semai' || name === 'bibit'">
      <path d="M12 21V10" />
      <path d="M12 10C12 5.5 7.5 3 3 3v3c0 4.5 4.5 6 9 6" stroke-linejoin="round" />
      <path d="M12 13c3.5-3.5 8-3.5 9-1 0 4-4.5 6-9 4" stroke-linejoin="round" />
      <path v-if="duotone" d="M12 10C12 5.5 7.5 3 3 3v3c0 4.5 4.5 6 9 6Z" fill="currentColor" fill-opacity="0.22" stroke="none" />
      <path v-if="duotone" d="M12 13c3.5-3.5 8-3.5 9-1 0 4-4.5 6-9 4Z" fill="currentColor" fill-opacity="0.16" stroke="none" />
      <ellipse cx="12" cy="21" rx="2.5" ry="1" fill="currentColor" fill-opacity="0.3" stroke="none" />
    </g>

    <!-- Egg / Ternak / Unggas -->
    <g v-else-if="name === 'egg' || name === 'ternak' || name === 'telur'">
      <path d="M12 2C8 2 5 7 5 13a7 7 0 0 0 14 0c0-6-3-11-7-11Z" />
      <ellipse v-if="duotone" cx="12" cy="14" rx="4" ry="5" fill="currentColor" fill-opacity="0.2" stroke="none" />
    </g>

    <!-- Pill / Apotek / Obat / Herbal -->
    <g v-else-if="name === 'pill' || name === 'apotek' || name === 'herbal' || name === 'toga'">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
      <path v-if="duotone" d="M3.5 13.5a4.95 4.95 0 0 0 7 7l5-5-7-7-5 5Z" fill="currentColor" fill-opacity="0.2" stroke="none" />
    </g>

    <!-- Utensils / Dapur / Konsumsi -->
    <g v-else-if="name === 'utensils' || name === 'dapur' || name === 'konsumsi' || name === 'food'">
      <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
      <path d="M15 2v18" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z" />
      <path v-if="duotone" d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" fill="currentColor" fill-opacity="0.15" stroke="none" />
    </g>

    <!-- Heart Handshake / Sedekah / Berbagi -->
    <g v-else-if="name === 'heart-handshake' || name === 'sedekah' || name === 'berbagi'">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9" />
      <path d="m14 13 2.5-2.5a2.17 2.17 0 0 1 3.08 0v0c.85.85.85 2.23 0 3.08L16 17" />
      <path v-if="duotone" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" fill="currentColor" fill-opacity="0.15" stroke="none" />
    </g>

    <!-- Package / Box / Olahan RPP / Produk -->
    <g v-else-if="name === 'package' || name === 'box' || name === 'rpp' || name === 'produk'">
      <path d="M12 3 3.5 7.5 12 12l8.5-4.5L12 3Z" :fill="duotone ? 'currentColor' : 'none'" :fill-opacity="duotone ? '0.15' : '0'" />
      <path d="m3.5 7.5 8.5 4.5v9l-8.5-4.5v-9Z" />
      <path d="m20.5 7.5-8.5 4.5v9l8.5-4.5v-9Z" />
      <path d="M12 12v9" opacity="0.35" />
    </g>

    <!-- Flame / Fire / Semangat / Giat -->
    <g v-else-if="name === 'flame' || name === 'fire' || name === 'semangat' || name === 'giat'">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      <path v-if="duotone" d="M12 18a3 3 0 0 0 3-3c0-1.5-1.5-2.5-1.5-2.5S12 14 12 15a1 1 0 0 1-1 1c-.5 0-1-.5-1-1 0 0-1 1-1 2a3 3 0 0 0 3 3z" fill="currentColor" fill-opacity="0.3" stroke="none" />
    </g>

    <!-- Sparkles / Berkah / AI / Magic -->
    <g v-else-if="name === 'sparkles' || name === 'berkah' || name === 'magic' || name === 'doa'">
      <path d="m12 3 1.9 4.7L18.5 9.5l-4.6 1.8L12 16l-1.9-4.7L5.5 9.5l4.6-1.8L12 3Z" />
      <path v-if="duotone" d="m12 3 1.9 4.7L18.5 9.5l-4.6 1.8L12 16l-1.9-4.7L5.5 9.5l4.6-1.8L12 3Z" fill="currentColor" fill-opacity="0.22" stroke="none" />
      <path d="m19 15 .8 1.8 1.7.7-1.7.7-.8 1.8-.8-1.8-1.7-.7 1.7-.7.8-1.8Z" />
    </g>

    <!-- Heart / MasyaAllah / Cinta -->
    <g v-else-if="name === 'heart' || name === 'masyaallah' || name === 'love'">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      <path v-if="duotone" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor" fill-opacity="0.2" stroke="none" />
    </g>

    <!-- Trophy / Liga / Juara -->
    <g v-else-if="name === 'trophy' || name === 'liga' || name === 'juara'">
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
      <path d="M6 3h12v7a6 6 0 0 1-12 0V3ZM12 16v3M8 21h8" />
      <path v-if="duotone" d="M12 6v4" opacity="0.4" />
    </g>

    <!-- Crown / Mahkota / Juara 1 -->
    <g v-else-if="name === 'crown' || name === 'mahkota'">
      <path d="M3.5 17 4.5 7.5 8.5 12 12 4.5 15.5 12 19.5 7.5 20.5 17H3.5Z" stroke-linejoin="round" />
      <path v-if="duotone" d="M3.5 17 4.5 7.5 8.5 12 12 4.5 15.5 12 19.5 7.5 20.5 17H3.5Z" fill="currentColor" fill-opacity="0.18" stroke="none" />
      <circle cx="12" cy="4.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="19.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <rect x="3" y="17" width="18" height="3" rx="1" />
    </g>

    <!-- Medal / Medali / Juara 2 & 3 -->
    <g v-else-if="name === 'medal' || name === 'medali'">
      <path d="M7 2.5h4l1.5 6-2 1.5-4-6.5a1 1 0 0 1 .5-1Z" :fill="duotone ? 'currentColor' : 'none'" :fill-opacity="duotone ? '0.22' : '0'" />
      <path d="M17 2.5h-4l-1.5 6 2 1.5 4-6.5a1 1 0 0 0-.5-1Z" :fill="duotone ? 'currentColor' : 'none'" :fill-opacity="duotone ? '0.14' : '0'" />
      <path d="m6.5 2.5 5.5 9 5.5-9" />
      <circle cx="12" cy="15" r="6.5" />
      <circle v-if="duotone" cx="12" cy="15" r="5" fill="currentColor" fill-opacity="0.25" stroke="none" />
    </g>

    <!-- ================= 3. CAMERA & CONTROLS ================= -->

    <!-- Camera / Kamera -->
    <g v-else-if="name === 'camera' || name === 'kamera'">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
      <circle v-if="duotone" cx="12" cy="13" r="1.5" fill="currentColor" />
    </g>

    <!-- Flip Camera / Switch / Refresh -->
    <g v-else-if="name === 'refresh' || name === 'flip' || name === 'sync' || name === 'switch-camera'">
      <path d="M3 12a9 9 0 0 1 15.5-6.36L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.36L3 16M3 21v-5h5" />
    </g>

    <!-- Image / Gallery / Foto -->
    <g v-else-if="name === 'image' || name === 'gallery' || name === 'foto'">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <path d="m21 15-5-5L5 21" />
      <path v-if="duotone" d="m14 14 2.5-2.5 4.5 4.5" opacity="0.4" />
    </g>

    <!-- Plus / Add -->
    <g v-else-if="name === 'plus' || name === 'add'">
      <path d="M12 5v14M5 12h14" />
    </g>

    <!-- Check / Success -->
    <g v-else-if="name === 'check' || name === 'success'">
      <path d="m5 12 5 5L20 7" />
    </g>

    <!-- X / Close -->
    <g v-else-if="name === 'x' || name === 'close'">
      <path d="M18 6 6 18M6 6l12 12" />
    </g>

    <!-- Send / Kirim -->
    <g v-else-if="name === 'send' || name === 'kirim'">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
      <polygon v-if="duotone" points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" fill-opacity="0.15" stroke="none" />
    </g>

    <!-- Chat / Message / WhatsApp Sapa -->
    <g v-else-if="name === 'chat' || name === 'message' || name === 'sapa'">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <path v-if="duotone" d="M8 12h8M8 9h5" stroke-width="1.5" opacity="0.4" />
    </g>

    <!-- Radio / Broadcast / Kabar -->
    <g v-else-if="name === 'radio' || name === 'broadcast' || name === 'kabar'">
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" />
    </g>

    <!-- Building / Landmark / Ranting / MWC -->
    <g v-else-if="name === 'building' || name === 'landmark' || name === 'ranting' || name === 'mwc'">
      <path d="m3 9 9-5 9 5v2H3V9zM4 11v8M8 11v8M12 11v8M16 11v8M20 11v8M2 19h20v3H2v-3z" />
      <polygon v-if="duotone" points="12 4 3 9 21 9 12 4" fill="currentColor" fill-opacity="0.2" stroke="none" />
    </g>

    <!-- Star / Bintang -->
    <g v-else-if="name === 'star'">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      <polygon v-if="duotone" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 12 2" fill="currentColor" fill-opacity="0.3" stroke="none" />
    </g>

    <!-- Save / Simpan -->
    <g v-else-if="name === 'save' || name === 'simpan'">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </g>

    <!-- Arrow Right -->
    <g v-else-if="name === 'arrow-right'">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </g>

    <!-- Trash / Hapus -->
    <g v-else-if="name === 'trash' || name === 'delete'">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </g>

    <!-- Search / Cari -->
    <g v-else-if="name === 'search' || name === 'cari'">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </g>

    <!-- Alert / Warning -->
    <g v-else-if="name === 'alert' || name === 'warning'">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2.5" />
    </g>

    <!-- Default Fallback: Generic Dot -->
    <g v-else>
      <circle cx="12" cy="12" r="6" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number | string;
  strokeWidth?: number | string;
  duotone?: boolean;
  viewBox?: string;
  color?: string;
}>(), {
  size: 'md',
  strokeWidth: 1.85,
  duotone: true,
  viewBox: '0 0 24 24',
  color: ''
});

const pixelSizes: Record<string, number> = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 24,
  '2xl': 32
};

const numericPixelSize = computed(() => {
  if (typeof props.size === 'number') return props.size;
  if (!props.size) return 18;
  if (pixelSizes[props.size]) return pixelSizes[props.size];
  const parsed = parseInt(String(props.size), 10);
  return isNaN(parsed) ? 18 : parsed;
});

const iconInlineStyles = computed(() => {
  const px = `${numericPixelSize.value}px`;
  const style: Record<string, string> = {
    width: px,
    height: px,
    minWidth: px,
    minHeight: px
  };
  if (props.color) {
    style.color = props.color;
  }
  return style;
});
</script>

<style scoped>
.app-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
  box-sizing: content-box;
}
</style>
