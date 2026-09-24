/**
 * ============================================================================
 * PEKARANGAN - GEOLOCATION SERVICE (TypeScript)
 * ============================================================================
 */

export interface GeoLocationResult {
  lat: number;
  lng: number;
  accuracy: number;
  formatted: string;
  mapsUrl: string;
}

export const GeoService = {
  async getCurrentPosition(options: PositionOptions = {}): Promise<GeoLocationResult> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error("Perangkat tidak mendukung fitur Geolocation GPS."));
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        ...options
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy || 0);
          const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

          resolve({
            lat,
            lng,
            accuracy,
            formatted,
            mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`
          });
        },
        (error) => {
          let message = "Gagal mengambil koordinat lokasi.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Izin GPS ditolak. Silakan izinkan akses lokasi di pengaturan HP / browser.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Sinyal GPS tidak tersedia.";
              break;
            case error.TIMEOUT:
              message = "Waktu pencarian GPS habis (timeout). Silakan coba lagi.";
              break;
          }
          reject(new Error(message));
        },
        defaultOptions
      );
    });
  }
};
