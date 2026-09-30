/**
 * ============================================================================
 * PEKARANGAN - BIOMETRIC & SCREEN LOCK SECURITY SERVICE (Capacitor + Android)
 * ============================================================================
 * Mengamankan akses multi-user tanpa login password/email, memanfaatkan:
 * 1. Android BiometricPrompt (Fingerprint / Face Unlock)
 * 2. Android Device Credential (PIN / Pola / Sandi Layar HP)
 * 3. Device-Bound Identity (UUID kriptografis per perangkat)
 */

import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { Capacitor } from '@capacitor/core';
import { StorageService } from './storage';

const DEVICE_ID_KEY = 'pekarangan_device_id_v2';

export interface BiometryStatus {
  isAvailable: boolean;
  biometryType: string;
  hasDeviceCredential: boolean;
}

export class SecurityService {
  private static cachedDeviceId: string | null = null;
  private static isSessionAuthenticated = false;

  /**
   * Cek apakah berjalan di HP asli (Android / iOS)
   */
  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Mengambil atau membuat Device ID unik untuk perangkat ini (UUID v4).
   * Digunakan untuk menandatangani data kepemilikan pekarangan warga.
   */
  static getDeviceId(): string {
    if (this.cachedDeviceId) return this.cachedDeviceId;

    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      // Buat UUID v4 unik berbasis kriptografi
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        deviceId = crypto.randomUUID();
      } else {
        deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
      }
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    this.cachedDeviceId = deviceId;
    return deviceId;
  }

  /**
   * Cek apakah sensor biometrik atau kunci layar tersedia di HP
   */
  static async checkBiometry(): Promise<BiometryStatus> {
    if (!Capacitor.isNativePlatform()) {
      return {
        isAvailable: true,
        biometryType: 'Mode Desktop Browser',
        hasDeviceCredential: true
      };
    }

    try {
      const info = await BiometricAuth.checkBiometry();
      
      let typeLabel = 'Kunci Layar HP (PIN / Pola)';
      if (info.biometryType === BiometryType.fingerprintAuthentication) {
        typeLabel = 'Sidik Jari (Fingerprint)';
      } else if (info.biometryType === BiometryType.faceAuthentication) {
        typeLabel = 'Face Unlock';
      } else if (info.biometryType === BiometryType.irisAuthentication) {
        typeLabel = 'Iris Scanner';
      }

      return {
        isAvailable: info.isAvailable || info.deviceIsSecure,
        biometryType: typeLabel,
        hasDeviceCredential: info.deviceIsSecure
      };
    } catch {
      return {
        isAvailable: true,
        biometryType: 'Kunci Layar HP',
        hasDeviceCredential: true
      };
    }
  }

  /**
   * Verifikasi identitas menggunakan Sidik Jari atau Kunci Layar (PIN/Pola) Android
   */
  static async authenticate(reason = 'Buka akses data pekarangan Anda'): Promise<{ success: boolean; message?: string }> {
    // Jika di desktop/browser, langsung buka otomatis tanpa halangan
    if (!Capacitor.isNativePlatform()) {
      this.isSessionAuthenticated = true;
      return { success: true };
    }

    try {
      await BiometricAuth.authenticate({
        reason: reason,
        cancelTitle: 'Batal',
        allowDeviceCredential: true, // Wajib TRUE agar bisa fallback ke PIN/Pola layar HP jika sidik jari belum didaftarkan
        androidTitle: 'Keamanan Pekarangan',
        androidSubtitle: 'Verifikasi sidik jari atau kunci layar HP'
      });

      this.isSessionAuthenticated = true;
      return { success: true };
    } catch (err: any) {
      // Deteksi jika user membatalkan
      const errMsg = err?.message || '';
      if (errMsg.toLowerCase().includes('cancel') || errMsg.toLowerCase().includes('user')) {
        return { success: false, message: 'Verifikasi dibatalkan oleh pengguna' };
      }

      return { 
        success: false, 
        message: err?.message || 'Gagal memverifikasi sidik jari/kunci layar' 
      };
    }
  }

  /**
   * Cek status kunci sesi aplikasi
   */
  static isUnlocked(): boolean {
    // Di desktop/browser, selalu otomatis terbuka
    if (!Capacitor.isNativePlatform()) {
      return true;
    }

    const settings = StorageService.getSettings();
    if (settings.isBiometricLockEnabled === false) {
      return true;
    }
    return this.isSessionAuthenticated;
  }

  /**
   * Kunci kembali sesi aplikasi (misal saat app ditutup atau tombol kunci ditekan)
   */
  static lockSession(): void {
    this.isSessionAuthenticated = false;
  }

  /**
   * Beri tanda bahwa sesi telah diverifikasi
   */
  static unlockSession(): void {
    this.isSessionAuthenticated = true;
  }

  /**
   * Validasi apakah data milik perangkat ini (Mencegah anggota/warga lain ikut campur)
   */
  static isOwner(itemOwnerDeviceId?: string): boolean {
    if (!itemOwnerDeviceId) return true; // Legacy items tanpa deviceId diizinkan
    return itemOwnerDeviceId === this.getDeviceId();
  }
}
