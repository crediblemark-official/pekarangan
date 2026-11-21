import { ref } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Module-level Singleton State
// Disimpan di luar fungsi agar event `beforeinstallprompt` langsung ditangkap
// saat file di-import oleh browser, sebelum komponen apapun sempat me-mount.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const isInstallable = ref(false);
const isInstalled = ref(false);
const installError = ref<string | null>(null);

if (typeof window !== 'undefined') {
  // Cek apakah sudah berjalan dalam mode standalone (terpasang sebagai PWA)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  if (isStandalone) {
    isInstalled.value = true;
  }

  // Cek dukungan Web Install API modern
  if (typeof (Navigator.prototype as any).install === 'function') {
    isInstallable.value = true;
  }

  // Tangkap event sebelum komponen me-mount agar tidak terlewat
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    isInstallable.value = true;
    console.log('[PWA] beforeinstallprompt event ditangkap');
  });

  window.addEventListener('appinstalled', () => {
    isInstalled.value = true;
    isInstallable.value = false;
    deferredPrompt = null;
    console.log('[PWA] Aplikasi berhasil dipasang');
  });
}

export function usePwaInstall() {
  const promptInstall = async (): Promise<'success' | 'dismissed' | 'unsupported'> => {
    installError.value = null;

    // 1. Dukungan Web Install API modern (Chrome 129+)
    const supportsWebInstall = typeof (Navigator.prototype as any).install === 'function';
    if (supportsWebInstall) {
      try {
        await (navigator as any).install();
        isInstalled.value = true;
        isInstallable.value = false;
        return 'success';
      } catch (err: any) {
        if (err.name === 'AbortError') return 'dismissed';
        console.warn('[PWA] navigator.install gagal, fallback ke deferredPrompt:', err);
      }
    }

    // 2. Dukungan deferred BeforeInstallPromptEvent
    if (deferredPrompt) {
      try {
        const promptEvent = deferredPrompt;
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          isInstalled.value = true;
          isInstallable.value = false;
          deferredPrompt = null;
          return 'success';
        } else {
          return 'dismissed';
        }
      } catch (err: any) {
        console.error('[PWA] prompt() error:', err);
        installError.value = err.message || 'Gagal memanggil prompt instalasi.';
        return 'unsupported';
      }
    }

    // 3. Browser tidak menyediakan prompt otomatis (misal Safari, Firefox, WebView, atau cooldown)
    return 'unsupported';
  };

  const hasDeferredPrompt = () => !!deferredPrompt;

  return {
    isInstallable,
    isInstalled,
    installError,
    promptInstall,
    hasDeferredPrompt
  };
}
