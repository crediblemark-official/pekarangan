import { ref, onMounted } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwaInstall() {
  const isInstallable = ref(false);
  const isInstalled = ref(false);
  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  onMounted(() => {
    // Check if running in standalone mode (already installed as PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      isInstalled.value = true;
      return;
    }

    const supportsWebInstall = typeof (Navigator.prototype as any).install === 'function';
    if (supportsWebInstall) {
      isInstallable.value = true;
    }

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      isInstallable.value = true;
    });

    window.addEventListener('appinstalled', () => {
      isInstalled.value = true;
      isInstallable.value = false;
      deferredPrompt = null;
    });
  });

  const promptInstall = async (): Promise<'success' | 'dismissed' | 'unsupported'> => {
    const supportsWebInstall = typeof (Navigator.prototype as any).install === 'function';
    if (supportsWebInstall) {
      try {
        await (navigator as any).install();
        isInstalled.value = true;
        isInstallable.value = false;
        return 'success';
      } catch (err: any) {
        if (err.name === 'AbortError') return 'dismissed';
        throw err;
      }
    }

    if (deferredPrompt) {
      const promptEvent = deferredPrompt;
      deferredPrompt = null;
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        isInstalled.value = true;
        isInstallable.value = false;
        return 'success';
      } else {
        return 'dismissed';
      }
    }

    return 'unsupported';
  };

  return {
    isInstallable,
    isInstalled,
    promptInstall
  };
}
