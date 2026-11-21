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
const isInAppBrowser = ref(false);
const showManualGuide = ref(false);
const installState = ref<'idle' | 'installing' | 'success' | 'manual'>('idle');

onMounted(() => {
  const ua = navigator.userAgent || '';
  isIos.value = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
  isInAppBrowser.value = /FBAN|FBAV|Instagram|WhatsApp|Line|Telegram|MicroMessenger/i.test(ua);

  if (isIos.value || isInAppBrowser.value) {
    showManualGuide.value = true;
    installState.value = 'manual';
  }
});

const handleInstallClick = async () => {
  if (isIos.value || isInAppBrowser.value) {
    showManualGuide.value = true;
    installState.value = 'manual';
    return;
  }

  installState.value = 'installing';
  try {
    const result = await promptInstall();
    if (result === 'success') {
      installState.value = 'success';
      emit('installed');
    } else if (result === 'dismissed') {
      installState.value = 'idle';
    } else {
      // unsupported / prompt tidak tersedia otomatis
      showManualGuide.value = true;
      installState.value = 'manual';
    }
  } catch {
    showManualGuide.value = true;
    installState.value = 'manual';
  }
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
    <div class="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
      
      <!-- 1. SUCCESS STATE: Aplikasi Sudah Terpasang -->
      <div v-if="installState === 'success' || isInstalled" class="space-y-4 py-2">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
          <AppIcon name="check" size="lg" color="#15803d" />
        </div>
        <div class="space-y-1">
          <h3 class="text-lg font-black text-slate-900 tracking-tight">Aplikasi Berhasil Dipasang!</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Ikon <strong>Pekarangan</strong> kini sudah aktif di layar utama HP Anda. Buka melalui ikon tersebut untuk pengalaman offline-first penuh.
          </p>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-sm shadow-md transition cursor-pointer"
        >
          Buka Pekarangan
        </button>
      </div>

      <!-- 2. IN-APP BROWSER WARNING (WhatsApp, Telegram, IG, dll) -->
      <div v-else-if="isInAppBrowser" class="space-y-4">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
          <AppIcon name="alert-triangle" size="md" color="#92400e" />
        </div>
        <div class="space-y-1 text-center">
          <h3 class="text-base font-black text-slate-900">Buka di Browser Utama</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Aplikasi obrolan mengunci fitur pemasangan aplikasi. Untuk memasang Pekarangan ke layar HP:
          </p>
        </div>
        <div class="bg-amber-50 rounded-xl p-3 text-left border border-amber-200 text-xs text-amber-900 space-y-1.5">
          <p class="font-bold">Langkah mudah:</p>
          <ol class="list-decimal pl-4 space-y-1 text-slate-700">
            <li>Ketuk menu <strong>titik tiga (⋮)</strong> di pojok kanan atas browser ini.</li>
            <li>Pilih <strong>"Buka di Browser"</strong> atau <strong>"Open in Chrome / Safari"</strong>.</li>
            <li>Setelah terbuka di browser utama, pasang langsung dari sana.</li>
          </ol>
        </div>
        <div class="pt-1 flex flex-col gap-2">
          <a
            href="https://github.com/crediblemark-official/pekarangan/releases/tag/v2.1.0"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition inline-flex items-center justify-center gap-1.5"
          >
            <AppIcon name="download" size="xs" color="#ffffff" />
            <span>Atau Unduh File APK Android Langsung</span>
          </a>
          <button
            type="button"
            @click="emit('close')"
            class="w-full py-2 text-slate-400 text-xs hover:text-slate-600"
          >
            Tutup
          </button>
        </div>
      </div>

      <!-- 3. iOS SAFARI INSTRUCTIONS -->
      <div v-else-if="isIos" class="space-y-4">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
          <img src="/pwa-192x192.png" alt="Pekarangan" class="w-12 h-12 rounded-xl object-cover" />
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-black text-slate-900">Pasang di iPhone / iPad</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Gunakan fitur bawaan Safari untuk memasang Pekarangan ke layar utama:
          </p>
        </div>
        <div class="bg-slate-50 rounded-xl p-3 text-left border border-slate-200 text-xs text-slate-700 space-y-1.5">
          <ol class="list-decimal pl-4 space-y-1.5">
            <li>Ketuk tombol <strong>Bagikan (Share)</strong> — ikon kotak dengan panah ke atas di bilah bawah Safari.</li>
            <li>Gulir ke bawah dan ketuk <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.</li>
            <li>Ketuk <strong>"Tambah" (Add)</strong> di pojok kanan atas. Selesai!</li>
          </ol>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition"
        >
          Saya Mengerti, Masuk Aplikasi
        </button>
      </div>

      <!-- 4. MANUAL FALLBACK (Jika browser menolak / cooldown / Firefox / browser desktop) -->
      <div v-else-if="installState === 'manual' || showManualGuide" class="space-y-4">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
          <img src="/pwa-192x192.png" alt="Pekarangan" class="w-12 h-12 rounded-xl object-cover" />
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-black text-slate-900">Pasang Aplikasi ke HP</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Browser Anda mengunci dialog otomatis. Pasang manual dalam 2 detik:
          </p>
        </div>
        <div class="bg-slate-50 rounded-xl p-3.5 text-left border border-slate-200 text-xs text-slate-800 space-y-2">
          <div class="flex items-start gap-2">
            <span class="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
            <p>Ketuk menu <strong>titik tiga (⋮)</strong> di pojok kanan atas browser Chrome Anda.</p>
          </div>
          <div class="flex items-start gap-2">
            <span class="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
            <p>Pilih menu <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar utama"</strong>.</p>
          </div>
        </div>
        <div class="space-y-2 pt-1">
          <a
            href="https://github.com/crediblemark-official/pekarangan/releases/tag/v2.1.0"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full min-h-[44px] py-2.5 rounded-xl bg-slate-900 hover:bg-black active:scale-[0.98] text-white font-bold text-xs transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <AppIcon name="download" size="xs" color="#ffffff" />
            <span>Atau Unduh File APK Android Resmi</span>
          </a>
          <button
            type="button"
            @click="emit('close')"
            class="w-full py-2 text-slate-500 font-semibold text-xs hover:text-slate-800 transition"
          >
            Lanjut Menggunakan Versi Web
          </button>
        </div>
      </div>

      <!-- 5. DEFAULT PROMPT (Direct 1-Click Install via beforeinstallprompt) -->
      <div v-else class="space-y-4">
        <div class="w-16 h-16 mx-auto rounded-2xl overflow-hidden shadow-md border border-slate-100 bg-emerald-50 flex items-center justify-center">
          <img src="/pwa-192x192.png" alt="Pekarangan" class="w-full h-full object-cover" />
        </div>

        <div class="space-y-1.5">
          <h3 class="text-lg font-black text-slate-900 tracking-tight">Pasang Aplikasi Pekarangan</h3>
          <p class="text-xs text-slate-600 leading-relaxed">
            Pasang langsung ke layar utama HP Anda. Berjalan offline tanpa kuota internet &amp; bebas iklan.
          </p>
        </div>

        <!-- Highlight badges -->
        <div class="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1.5 text-left border border-slate-100 font-medium">
          <div class="flex items-center gap-2">
            <AppIcon name="check" size="xs" color="#15803d" />
            <span>100% Offline-ready (catat panen tanpa sinyal)</span>
          </div>
          <div class="flex items-center gap-2">
            <AppIcon name="check" size="xs" color="#15803d" />
            <span>Sangat ringan (~2MB) &amp; tanpa Play Store</span>
          </div>
          <div class="flex items-center gap-2">
            <AppIcon name="check" size="xs" color="#15803d" />
            <span>Gratis selamanya, privasi tersimpan di HP</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-2 pt-1">
          <button
            type="button"
            @click="handleInstallClick"
            :disabled="installState === 'installing'"
            class="w-full min-h-[46px] py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <AppIcon name="download" size="sm" color="#ffffff" />
            <span>{{ installState === 'installing' ? 'Menyiapkan...' : 'Pasang Sekarang ke HP' }}</span>
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
