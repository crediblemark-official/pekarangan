/**
 * ============================================================================
 * PEKARANGAN - DEVICE IDENTITY & SECURITY SERVICE
 * ============================================================================
 * Menyediakan Device-Bound Identity (UUID per perangkat) untuk menandai
 * kepemilikan data lokal dan deteksi platform tanpa friksi biometrik.
 */

import { Capacitor } from '@capacitor/core';

const DEVICE_ID_KEY = 'pekarangan_device_id_v2';

export class SecurityService {
  private static cachedDeviceId: string | null = null;

  /**
   * Cek apakah berjalan di HP fisik native (Android / iOS)
   */
  static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Mengambil atau membuat Device ID unik untuk perangkat ini (UUID v4).
   * Digunakan untuk menandai kepemilikan data pekarangan warga.
   */
  static getDeviceId(): string {
    if (this.cachedDeviceId) return this.cachedDeviceId;

    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
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
   * Kompatibilitas mundur: selalu kembalikan status terbuka agar tidak membebani kader/warga
   */
  static isUnlocked(): boolean {
    return true;
  }

  static lockSession(): void {}
  static unlockSession(): void {}

  static async authenticate(_reason?: string): Promise<{ success: boolean; message?: string }> {
    return { success: true };
  }

  static async checkBiometry(): Promise<{ isAvailable: boolean; biometryType: string; hasDeviceCredential: boolean }> {
    return {
      isAvailable: false,
      biometryType: 'Nonaktif (Akses Langsung)',
      hasDeviceCredential: false
    };
  }
}
