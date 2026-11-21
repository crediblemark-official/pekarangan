/**
 * ============================================================================
 * PEKARANGAN - API SERVICE (TypeScript) v2.0
 * ============================================================================
 */

import type { SurveyPayload, PlantItem, LivestockItem, MemberData, AssetItem } from "../types";

export interface ApiResponse {
  status: "success" | "error";
  message: string;
  member_id?: string;
  yard_id?: string;
  drive_photo_url?: string;
  assets_count?: number;
  data?: any;
  found?: boolean;
  member?: any;
  isExisting?: boolean;
  isOtherDeviceActive?: boolean;
  yards?: any[];
  plants?: any[];
}

export function getEffectiveGasUrl(): string {
  const envUrl = (import.meta.env.VITE_GAS_URL as string) || '';
  return envUrl.trim();
}

export function getEffectiveMamasarUrl(): string {
  const envUrl = (import.meta.env.VITE_MAMASAR_URL as string) || '';
  if (envUrl.trim()) return envUrl.trim();
  return typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4321/api/pekarangan/sync'
    : 'https://mamasar.com/api/pekarangan/sync';
}

export const ApiService = {
  /**
   * Ping server Google Apps Script untuk memeriksa konektivitas
   */
  async pingServer(gasUrl: string): Promise<{ success: boolean; message: string }> {
    if (!gasUrl || !gasUrl.startsWith("http")) {
      return { success: false, message: "URL Google Apps Script belum diisi." };
    }

    try {
      const url = new URL(gasUrl);
      url.searchParams.set("action", "ping");

      const response = await fetch(url.toString(), {
        method: "GET",
        mode: "cors"
      });

      if (!response.ok) {
        throw new Error(`Server merespons dengan status ${response.status}`);
      }

      const data = await response.json();
      return {
        success: data.status === "success",
        message: data.message || "Koneksi berhasil."
      };
    } catch (err: any) {
      return {
        success: false,
        message: "Gagal terhubung ke server GAS: " + err.message
      };
    }
  },

  /**
   * Mengambil seluruh data dari Google Spreadsheet via GAS
   */
  async fetchAllData(gasUrl: string): Promise<any | null> {
    if (!gasUrl || !gasUrl.startsWith("http")) return null;

    try {
      const url = new URL(gasUrl);
      url.searchParams.set("action", "get_all");

      const response = await fetch(url.toString(), {
        method: "GET",
        mode: "cors"
      });

      if (!response.ok) return null;
      const data = await response.json();
      if (data.status === "success" && data.data) {
        return data.data;
      }
      return null;
    } catch (err) {
      console.warn("fetch database failed, using local storage:", err);
      return null;
    }
  },

  /**
   * Helper general POST request ke Google Apps Script
   */
  async postToGas(gasUrl: string, payload: any): Promise<ApiResponse> {
    if (!gasUrl || !gasUrl.startsWith("http")) {
      throw new Error("URL Web App Google Apps Script belum diatur.");
    }

    // Apps Script Web App menerima POST dengan format JSON text (text/plain menghindari preflight)
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data: ApiResponse = await response.json();
    if (data.status === "error") {
      throw new Error(data.message || "Terjadi kesalahan pada backend Apps Script.");
    }

    return data;
  },

  /**
   * Pendaftaran akun pemilik & device binding (Onboarding)
   */
  async registerAccount(
    gasUrl: string,
    account: {
      nama_lengkap: string;
      nomor_wa: string;
      rt_rw?: string;
      alamat_catatan?: string;
      device_id: string;
      force_takeover?: boolean;
    }
  ): Promise<ApiResponse> {
    return this.postToGas(gasUrl, {
      action: "register_account",
      account
    });
  },

  /**
   * Cari akun berdasarkan nomor WA atau Device ID (Ganti HP / Restore)
   */
  async lookupAccount(
    gasUrl: string,
    identifier: { phone?: string; device_id?: string }
  ): Promise<ApiResponse> {
    return this.postToGas(gasUrl, {
      action: "lookup_account",
      ...identifier
    });
  },

  /**
   * Mengirim seluruh data survei ke Google Apps Script Web App
   */
  async submitSurvey(gasUrl: string, payload: SurveyPayload): Promise<ApiResponse> {
    return this.postToGas(gasUrl, payload);
  },

  /**
   * Simpan tanaman baru ke sheet
   */
  async savePlant(gasUrl: string, plant: PlantItem): Promise<ApiResponse> {
    return this.postToGas(gasUrl, {
      action: "save_plant",
      plant
    });
  },

  /**
   * Update fase pertumbuhan tanaman
   */
  async updatePlantPhase(gasUrl: string, plantId: string, phase: string, progressPercent: number): Promise<ApiResponse> {
    return this.postToGas(gasUrl, {
      action: "update_plant_phase",
      plantId,
      phase,
      progressPercent
    });
  },

  /**
   * Simpan ternak baru
   */
  async saveLivestock(gasUrl: string, livestock: LivestockItem): Promise<ApiResponse> {
    return this.postToGas(gasUrl, {
      action: "save_livestock",
      livestock
    });
  },

  /**
   * Catat telur harian
   */
  async logEgg(gasUrl: string, livestockId: string, count: number, note?: string): Promise<ApiResponse> {
    return this.postToGas(gasUrl, {
      action: "log_egg",
      livestockId,
      count,
      note
    });
  },

  /**
   * Catat panen
   */
  async logHarvest(gasUrl: string, harvest: { plantId: string; plantName: string; qty: string; allocation: string; note?: string }): Promise<ApiResponse> {
    return this.postToGas(gasUrl, {
      action: "log_harvest",
      harvest
    });
  },

  /**
   * Catat konsumsi mandiri / buku kas
   */
  async logConsume(gasUrl: string, consume: { item: string; meal: string; note: string; savedValue: number; qty?: number; pricePerUnit?: number }): Promise<ApiResponse> {
    return this.postToGas(gasUrl, {
      action: "log_consume",
      consume
    });
  },

  /**
   * Simpan pilihan dropdown baru ke database master
   */
  async addCustomOption(gasUrl: string, category: string, value: string, extra?: any): Promise<ApiResponse> {
    return this.postToGas(gasUrl, {
      action: "add_option",
      category,
      value,
      extra
    });
  },

  /**
   * Mengirim produk olahan surplus Pilar 4 (RPP) ke Mamasar
   */
  async syncToMamasar(payload: {
    member_data: MemberData;
    assets_data: AssetItem[];
  }, customUrl?: string): Promise<{ success: boolean; message: string; data?: any }> {
    const url = customUrl || getEffectiveMamasarUrl();
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama_lengkap: payload.member_data.nama_lengkap,
          nama_panggilan: payload.member_data.nama_panggilan,
          nomor_wa: payload.member_data.nomor_wa,
          mwc_zone: payload.member_data.mwc_zone,
          ranting: payload.member_data.ranting,
          rt_rw: payload.member_data.rt_rw,
          alamat_catatan: payload.member_data.alamat_catatan,
          assets: payload.assets_data.map(a => ({
            pilar_kategori: a.pilar_kategori,
            nama_komoditas: a.nama_komoditas,
            jumlah_estimasi: a.jumlah_estimasi,
            media_tanam: a.media_tanam,
            catatan_produksi: a.catatan_produksi,
            publish_to_mamasar: a.publish_to_mamasar
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      console.warn("Gagal sinkronisasi ke Mamasar:", err);
      return {
        success: false,
        message: err.message || "Gagal menghubungi server Mamasar"
      };
    }
  }
};
