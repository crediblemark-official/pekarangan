<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePwaInstall } from '../composables/usePwaInstall';
import AppIcon from './AppIcon.vue';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'installed'): void;
}>();

const { isInstalled, promptInstall } = usePwaInstall();
const isIos = ref(false);
const showIosGuide = ref(false);
const installState = ref<'idle' | 'installing' | 'success' | 'dismissed'>('idle');

onMounted(() => {
  isIos.value = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
  if (isIos.value) {
    showIosGuide.value = true;
  }
});

const handleInstallClick = async () => {
  if (isIos.value) {
    showIosGuide.value = true;
    return;
  }

  installState.value = 'installing';
  try {
    const result = await promptInstall();
    if (result === 'success') {
      installState.value = 'success';
      emit('installed');
    } else {
      installState.value = 'dismissed';
    }
  } catch {
    installState.value = 'dismissed';
  }
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
    <div class="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 text-center">
      <!-- Success State -->
      <div v-if="installState === 'success' || isInstalled" class="space-y-4 py-2">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
          <AppIcon name="check" size="lg" color="#15803d" />
        </div>
        <div class="space-y-1">
          <h3 class="text-lg font-black text-slate-900 tracking-tight">Aplikasi Berhasil Dipasang!</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Ikon <strong>Pekarangan</strong> kini sudah terpasang di layar utama HP Anda. Buka melalui ikon tersebut untuk pengalaman offline-first penuh.
          </p>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-sm shadow-md transition cursor-pointer"
        >
          Masuk ke Aplikasi
        </button>
      </div>

      <!-- Main Install Prompt -->
      <div v-else class="space-y-4">
        <div class="w-16 h-16 mx-auto rounded-2xl overflow-hidden shadow-md border border-slate-100 bg-emerald-50 flex items-center justify-center">
          <img src="/pwa-192x192.png" alt="Pekarangan" class="w-full h-full object-cover" />
        </div>

        <div class="space-y-1.5">
          <h3 class="text-lg font-black text-slate-900 tracking-tight">Pasang Aplikasi Pekarangan</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Aplikasi mandiri pangan &amp; pencatatan hasil pekarangan keluarga. Dipasang langsung ke layar HP tanpa Play Store / App Store.
          </p>
        </div>

        <!-- Highlight badges -->
        <div class="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1.5 text-left border border-slate-100">
          <div class="flex items-center gap-2">
            <AppIcon name="check" size="xs" color="#15803d" />
            <span>100% Offline (tetap jalan saat tidak ada sinyal)</span>
          </div>
          <div class="flex items-center gap-2">
            <AppIcon name="check" size="xs" color="#15803d" />
            <span>Sangat ringan &amp; hemat memori HP</span>
          </div>
          <div class="flex items-center gap-2">
            <AppIcon name="check" size="xs" color="#15803d" />
            <span>Gratis selamanya, tanpa iklan</span>
          </div>
        </div>

        <!-- iOS Safari Instructions -->
        <div v-if="isIos && showIosGuide" class="bg-amber-50 rounded-xl p-3 text-xs text-amber-900 text-left border border-amber-200 space-y-1">
          <p class="font-bold">Cara pasang di iPhone / iPad (Safari):</p>
          <ol class="list-decimal pl-4 space-y-0.5 text-[11px] text-amber-800">
            <li>Ketuk tombol <strong>Share</strong> (kotak panah ke atas) di bilah Safari.</li>
            <li>Gulir ke bawah, pilih <strong>"Tambahkan ke Layar Utama"</strong>.</li>
            <li>Ketuk <strong>"Tambah"</strong> di pojok kanan atas.</li>
          </ol>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-2 pt-1">
          <button
            v-if="!isIos"
            type="button"
            @click="handleInstallClick"
            class="w-full min-h-[46px] py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <AppIcon name="download" size="sm" color="#ffffff" />
            <span>Pasang Sekarang ke HP</span>
          </button>

          <button
            type="button"
            @click="emit('close')"
            class="w-full py-2.5 rounded-xl hover:bg-slate-100 text-slate-500 font-semibold text-xs transition cursor-pointer"
          >
            Lanjut Menggunakan di Web Saja
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}
</style>
