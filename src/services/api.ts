/**
 * ============================================================================
 * PEKARANGAN - API SERVICE (TypeScript) v2.0
 * ============================================================================
 */

import type { SurveyPayload, PlantItem, LivestockItem } from "../types";

export interface ApiResponse {
  status: "success" | "error";
  message: string;
  member_id?: string;
  yard_id?: string;
  drive_photo_url?: string;
  assets_count?: number;
  data?: any;
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
  }
};
