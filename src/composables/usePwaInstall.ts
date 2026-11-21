import { ref } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Module-level Singleton State
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const isInstallable = ref(false);
const isInstalled = ref(false);
const installError = ref<string | null>(null);

if (typeof window !== 'undefined') {
  // 1. Cek apakah berjalan dalam mode standalone (sudah dibuka di window PWA)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  if (isStandalone) {
    isInstalled.value = true;
  }

  // 2. Cek getInstalledRelatedApps untuk mendeteksi apakah PWA sudah terinstal di PC/Desktop
  if (typeof navigator !== 'undefined' && 'getInstalledRelatedApps' in navigator) {
    (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
      if (apps && apps.length > 0) {
        isInstalled.value = true;
        console.log('[PWA] Aplikasi terdeteksi sudah terpasang di perangkat:', apps);
      }
    }).catch(() => {});
  }

  // 3. Cek dukungan Web Install API modern
  if (typeof (Navigator.prototype as any).install === 'function') {
    isInstallable.value = true;
  }

  // 4. Tangkap event beforeinstallprompt seketika saat bundle di-import
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

    // Tunggu sebentar jika event beforeinstallprompt masih dalam proses validasi ServiceWorker oleh Chrome (terutama di PC)
    if (!deferredPrompt && typeof window !== 'undefined') {
      await new Promise<void>((resolve) => {
        let timer: any;
        const onPrompt = () => {
          clearTimeout(timer);
          window.removeEventListener('beforeinstallprompt', onPrompt);
          resolve();
        };
        window.addEventListener('beforeinstallprompt', onPrompt, { once: true });
        timer = setTimeout(() => {
          window.removeEventListener('beforeinstallprompt', onPrompt);
          resolve();
        }, 800);
      });
    }

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

    // 2. Dukungan deferred BeforeInstallPromptEvent (Chrome PC & Android)
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

    // 3. Browser tidak menyediakan prompt otomatis (misal Safari, Firefox, atau sudah terinstal di PC)
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
