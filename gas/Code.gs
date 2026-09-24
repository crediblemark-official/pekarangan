/**
 * ============================================================================
 * PEKARANGAN - BACKEND GOOGLE APPS SCRIPT (GAS) v2.0
 * ============================================================================
 * Backend Web App untuk aplikasi kedaulatan pangan Pekarangan tingkat RT/Komunitas.
 * Mengintegrasikan Google Sheets sebagai database relasional flat-sheet
 * dan Google Drive untuk penyimpanan foto lahan terstruktur.
 *
 * Mendukung sinkronisasi 2 arah:
 * - tbl_anggota (Identitas Warga)
 * - tbl_pekarangan (Profil & Karakteristik Lahan)
 * - tbl_aset_produksi (4 Pilar Aset Pekarangan)
 * - tbl_tanaman (Jurnal & Pemantauan Tanaman Aktif)
 * - tbl_ternak (Inventaris & Kelompok Ternak Produktif)
 * - tbl_log_aktivitas (Catatan Harian Panen, Rawat, Tanam, Telur)
 * - tbl_buku_kas (Rekor Penghematan Belanja Dapur Riil)
 * - tbl_master_options (Daftar Pilihan Dinamis / Dropdown Tambah Baru)
 */

const CONFIG = {
  SPREADSHEET_ID: "", // Isi jika script standalone; biarkan kosong jika bound to spreadsheet
  ROOT_FOLDER_NAME: "Pekarangan_DB"
};

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "ping";
    const ss = getSpreadsheet();
    initDatabaseSheets(ss);

    if (action === "ping") {
      return jsonResponse({
        status: "success",
        message: "Pekarangan API v2.0 siap digunakan!",
        timestamp: new Date().toISOString()
      });
    }

    if (action === "init_sheets") {
      return jsonResponse({
        status: "success",
        message: "Inisialisasi 8 tabel database Google Sheets berhasil."
      });
    }

    if (action === "get_all" || action === "get_data") {
      const data = fetchAllDatabase(ss);
      return jsonResponse({
        status: "success",
        data: data,
        timestamp: new Date().toISOString()
      });
    }

    if (action === "get_stats") {
      const stats = computeStats(ss);
      return jsonResponse({
        status: "success",
        stats: stats
      });
    }

    return jsonResponse({
      status: "success",
      message: "Endpoint Pekarangan GAS aktif.",
      availableActions: ["ping", "init_sheets", "get_all", "get_stats"]
    });
  } catch (err) {
    return jsonResponse({
      status: "error",
      message: err.toString()
    }, 500);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return jsonResponse({
      status: "error",
      message: "Server sedang sibuk, silakan coba beberapa saat lagi."
    }, 429);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Payload kosong atau format request tidak valid.");
    }

    const payload = JSON.parse(e.postData.contents);
    const ss = getSpreadsheet();
    initDatabaseSheets(ss);

    // 1. SURVEI PROFIL LAHAN (FASE 1)
    if (payload.member_data && payload.yard_data) {
      return handleSurveySubmission(ss, payload);
    }

    // 2. AKSI-AKSI PENCATATAN HARIAN & DATABASE
    const action = payload.action;

    if (action === "save_plant") {
      return handleSavePlant(ss, payload.plant);
    }

    if (action === "update_plant_phase") {
      return handleUpdatePlantPhase(ss, payload.plantId, payload.phase, payload.progressPercent);
    }

    if (action === "save_livestock") {
      return handleSaveLivestock(ss, payload.livestock);
    }

    if (action === "log_egg") {
      return handleLogEgg(ss, payload.livestockId, payload.count, payload.note);
    }

    if (action === "log_harvest") {
      return handleLogHarvest(ss, payload.harvest);
    }

    if (action === "log_consume") {
      return handleLogConsume(ss, payload.consume);
    }

    if (action === "add_option") {
      return handleAddOption(ss, payload.category, payload.value, payload.extra);
    }

    if (action === "sync_batch") {
      return handleBatchSync(ss, payload.items || []);
    }

    return jsonResponse({
      status: "error",
      message: "Aksi tidak dikenali: " + action
    }, 400);

  } catch (err) {
    Logger.log("Error doPost: " + err.toString());
    return jsonResponse({
      status: "error",
      message: err.toString()
    }, 500);
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// HANDLER FUNGSI-FUNGSI BISNIS
// ============================================================================

function handleSurveySubmission(ss, payload) {
  const memberData = payload.member_data || {};
  const yardData = payload.yard_data || {};
  const assetsData = payload.assets_data || [];
  const imageBase64 = payload.image_base64 || "";

  if (!memberData.nama_lengkap || !memberData.nomor_wa) {
    throw new Error("Nama lengkap dan nomor WhatsApp wajib diisi.");
  }

  const todayStr = getFormattedDateCompact();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  const memberId = memberData.member_id || `MBR-${todayStr}-${randomSuffix}`;
  const yardId = yardData.yard_id || `YRD-${todayStr}-${randomSuffix}`;

  // Upload Foto ke Google Drive
  let drivePhotoUrl = "-";
  if (imageBase64 && imageBase64.length > 50) {
    try {
      drivePhotoUrl = savePhotoToDrive({
        rtRw: memberData.rt_rw || "Umum",
        memberId: memberId,
        base64Data: imageBase64
      });
    } catch (uploadErr) {
      Logger.log("Gagal upload foto ke Drive: " + uploadErr.toString());
      drivePhotoUrl = "Upload Gagal: " + uploadErr.message;
    }
  }

  const now = new Date();

  // Sheet 1: tbl_anggota
  const sheetAnggota = ss.getSheetByName("tbl_anggota");
  sheetAnggota.appendRow([
    memberId,
    now,
    memberData.nama_lengkap || "",
    memberData.nama_panggilan || "",
    "'" + cleanPhoneNumber(memberData.nomor_wa || ""),
    memberData.rt_rw || "",
    memberData.alamat_catatan || "",
    memberData.gps_lat_long || "",
    memberData.status_verifikasi || "VERIFIED"
  ]);

  // Sheet 2: tbl_pekarangan
  const sheetPekarangan = ss.getSheetByName("tbl_pekarangan");
  sheetPekarangan.appendRow([
    yardId,
    memberId,
    yardData.status_lahan || "",
    Array.isArray(yardData.tipe_permukaan) ? yardData.tipe_permukaan.join(", ") : (yardData.tipe_permukaan || ""),
    yardData.estimasi_luas || "",
    Array.isArray(yardData.zonasi_posisi) ? yardData.zonasi_posisi.join(", ") : (yardData.zonasi_posisi || ""),
    yardData.paparan_sinar || "",
    yardData.sumber_air || "",
    Array.isArray(yardData.fasilitas_limbah) ? yardData.fasilitas_limbah.join(", ") : (yardData.fasilitas_limbah || ""),
    drivePhotoUrl
  ]);

  // Sheet 3: tbl_aset_produksi (4 Pilar Resmi)
  const sheetAset = ss.getSheetByName("tbl_aset_produksi");
  if (Array.isArray(assetsData) && assetsData.length > 0) {
    assetsData.forEach((asset) => {
      const assetId = asset.asset_id || `AST-${todayStr}-${Math.floor(1000 + Math.random() * 9000)}`;
      sheetAset.appendRow([
        assetId,
        yardId,
        asset.pilar_kategori || asset.kategori || "",
        asset.nama_komoditas || "",
        Number(asset.jumlah_estimasi) || 0,
        asset.media_tanam || "",
        asset.catatan_produksi || ""
      ]);
    });
  }

  // Juga catat log aktivitas
  const sheetLog = ss.getSheetByName("tbl_log_aktivitas");
  sheetLog.appendRow([
    `LOG-${todayStr}-${randomSuffix}`,
    now,
    `Pendataan Lahan: ${memberData.nama_lengkap}`,
    "survei",
    "Hari ini",
    `RT/RW ${memberData.rt_rw || "-"} • Luas: ${yardData.estimasi_luas || "-"} (${assetsData.length} aset pilar)`
  ]);

  return jsonResponse({
    status: "success",
    message: "Data pekarangan berhasil disimpan ke Google Sheets.",
    member_id: memberId,
    yard_id: yardId,
    drive_photo_url: drivePhotoUrl,
    assets_count: assetsData.length
  });
}

function handleSavePlant(ss, plant) {
  if (!plant || !plant.name) throw new Error("Nama tanaman wajib diisi.");
  const sheet = ss.getSheetByName("tbl_tanaman");
  const plantId = plant.id || "P-" + Date.now();
  const now = new Date();

  sheet.appendRow([
    plantId,
    now,
    plant.name || "",
    plant.variety || "Lokal Unggul",
    plant.location || "Teras Depan",
    plant.qty || "1 Polybag",
    plant.plantedDate || "Hari ini",
    Number(plant.hst) || 1,
    Number(plant.targetHst) || 60,
    plant.phase || "🌱 Baru Ditanam / Semai",
    plant.icon || "🌱",
    Number(plant.progressPercent) || 5
  ]);

  // Log Aktivitas
  const sheetLog = ss.getSheetByName("tbl_log_aktivitas");
  sheetLog.appendRow([
    "LOG-" + Date.now(),
    now,
    `Tanam Baru: ${plant.name}`,
    "tanam",
    "Hari ini",
    `${plant.variety || "Lokal"} • Lokasi: ${plant.location || "-"} (${plant.qty || "-"})`
  ]);

  return jsonResponse({ status: "success", plant_id: plantId });
}

function handleUpdatePlantPhase(ss, plantId, phase, progressPercent) {
  const sheet = ss.getSheetByName("tbl_tanaman");
  const data = sheet.getDataRange().getValues();
  let found = false;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(plantId)) {
      sheet.getRange(i + 1, 10).setValue(phase); // Col 10: phase
      sheet.getRange(i + 1, 12).setValue(progressPercent); // Col 12: progressPercent
      found = true;
      break;
    }
  }

  return jsonResponse({ status: "success", updated: found });
}

function handleSaveLivestock(ss, livestock) {
  if (!livestock || !livestock.type) throw new Error("Data ternak tidak valid.");
  const sheet = ss.getSheetByName("tbl_ternak");
  const liveId = livestock.id || "L-" + Date.now();

  sheet.appendRow([
    liveId,
    new Date(),
    livestock.type || "",
    livestock.name || "",
    livestock.qty || "",
    livestock.housing || "",
    Number(livestock.todayYield) || 0,
    Number(livestock.weekYield) || 0,
    livestock.icon || "🐔",
    livestock.note || ""
  ]);

  return jsonResponse({ status: "success", livestock_id: liveId });
}

function handleLogEgg(ss, livestockId, count, note) {
  const sheet = ss.getSheetByName("tbl_ternak");
  const data = sheet.getDataRange().getValues();
  let liveName = "Ternak";

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(livestockId)) {
      liveName = data[i][2] + " (" + data[i][3] + ")";
      const curToday = Number(data[i][6]) || 0;
      const curWeek = Number(data[i][7]) || 0;
      sheet.getRange(i + 1, 7).setValue(curToday + Number(count));
      sheet.getRange(i + 1, 8).setValue(curWeek + Number(count));
      break;
    }
  }

  // Tambahkan ke log aktivitas
  const sheetLog = ss.getSheetByName("tbl_log_aktivitas");
  sheetLog.appendRow([
    "LOG-" + Date.now(),
    new Date(),
    `Kumpul Telur ${liveName} (+${count} butir)`,
    "ternak",
    "Hari ini",
    note || `Panen harian ${count} butir telur`
  ]);

  return jsonResponse({ status: "success", count: count });
}

function handleLogHarvest(ss, harvest) {
  const sheetLog = ss.getSheetByName("tbl_log_aktivitas");
  sheetLog.appendRow([
    "LOG-" + Date.now(),
    new Date(),
    `Panen ${harvest.plantName || "Sayur"} (${harvest.qty || "-"})`,
    "panen",
    "Hari ini",
    harvest.note || "Panen pekarangan"
  ]);

  return jsonResponse({ status: "success" });
}

function handleLogConsume(ss, consume) {
  const sheetKas = ss.getSheetByName("tbl_buku_kas");
  const savedVal = Number(consume.savedValue) || (Number(consume.qty) * Number(consume.pricePerUnit));
  const now = new Date();

  sheetKas.appendRow([
    "KAS-" + Date.now(),
    now,
    consume.item || "",
    consume.meal || "🍳 Sarapan Pagi",
    consume.note || "",
    "Hari ini",
    savedVal
  ]);

  const sheetLog = ss.getSheetByName("tbl_log_aktivitas");
  sheetLog.appendRow([
    "LOG-" + Date.now(),
    now,
    `Konsumsi Mandiri: ${consume.item}`,
    "panen",
    "Hari ini",
    `${consume.meal} • Hemat Rp ${savedVal.toLocaleString()}`
  ]);

  return jsonResponse({ status: "success", saved_value: savedVal });
}

function handleAddOption(ss, category, value, extra) {
  const sheet = ss.getSheetByName("tbl_master_options");
  sheet.appendRow([
    category || "umum",
    value || "",
    extra ? JSON.stringify(extra) : ""
  ]);

  return jsonResponse({ status: "success", category: category, value: value });
}

function handleBatchSync(ss, items) {
  let count = 0;
  items.forEach(item => {
    if (item.member_data && item.yard_data) {
      handleSurveySubmission(ss, item);
      count++;
    }
  });
  return jsonResponse({ status: "success", synced_count: count });
}

// ============================================================================
// DATA RETRIEVAL (GET)
// ============================================================================

function fetchAllDatabase(ss) {
  const result = {
    members: readSheetToObjects(ss, "tbl_anggota"),
    yards: readSheetToObjects(ss, "tbl_pekarangan"),
    assets: readSheetToObjects(ss, "tbl_aset_produksi"),
    plants: readSheetToObjects(ss, "tbl_tanaman"),
    livestocks: readSheetToObjects(ss, "tbl_ternak"),
    activityLogs: readSheetToObjects(ss, "tbl_log_aktivitas"),
    kasLogs: readSheetToObjects(ss, "tbl_buku_kas"),
    masterOptions: readSheetToObjects(ss, "tbl_master_options")
  };
  return result;
}

function readSheetToObjects(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const list = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    headers.forEach((h, colIdx) => {
      obj[h] = row[colIdx];
    });
    list.push(obj);
  }
  return list;
}

function computeStats(ss) {
  const sheetAnggota = ss.getSheetByName("tbl_anggota");
  const sheetTanaman = ss.getSheetByName("tbl_tanaman");
  const sheetKas = ss.getSheetByName("tbl_buku_kas");

  const totalMembers = sheetAnggota ? Math.max(0, sheetAnggota.getLastRow() - 1) : 0;
  const totalPlants = sheetTanaman ? Math.max(0, sheetTanaman.getLastRow() - 1) : 0;

  let totalKasHemat = 0;
  if (sheetKas && sheetKas.getLastRow() > 1) {
    const kasValues = sheetKas.getRange(2, 7, sheetKas.getLastRow() - 1, 1).getValues();
    kasValues.forEach(r => {
      totalKasHemat += Number(r[0]) || 0;
    });
  }

  return {
    total_members: totalMembers,
    total_plants: totalPlants,
    total_kas_hemat: totalKasHemat
  };
}

// ============================================================================
// HELPER & SCHEMA CREATOR
// ============================================================================

function savePhotoToDrive({ rtRw, memberId, base64Data }) {
  let mimeType = "image/jpeg";
  let rawBase64 = base64Data;

  const match = base64Data.match(/^data:(image\/[a-zA-Z0-9.+]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    rawBase64 = match[2];
  }

  const decodedBytes = Utilities.base64Decode(rawBase64);
  const fileName = `PEKARANGAN_${memberId}_${Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd_HHmmss")}.jpg`;
  const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

  const rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), CONFIG.ROOT_FOLDER_NAME);
  const safeRtRw = "RT_RW_" + (rtRw || "Umum").replace(/[^a-zA-Z0-9_-]/g, "_");
  const rtFolder = getOrCreateFolder(rootFolder, safeRtRw);
  const memberFolder = getOrCreateFolder(rtFolder, memberId);

  const file = memberFolder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log("Tidak dapat mengubah permission sharing: " + e.toString());
  }

  return file.getUrl();
}

function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

function getSpreadsheet() {
  const propId = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  const targetId = propId || CONFIG.SPREADSHEET_ID;

  if (targetId && targetId.trim() !== "") {
    return SpreadsheetApp.openById(targetId.trim());
  }

  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    throw new Error("Spreadsheet ID belum diatur di CONFIG.SPREADSHEET_ID atau Script Properties.");
  }
}

function initDatabaseSheets(spreadsheetInstance) {
  const ss = spreadsheetInstance || getSpreadsheet();

  const schemas = [
    {
      name: "tbl_anggota",
      headers: ["member_id", "timestamp", "nama_lengkap", "nama_panggilan", "nomor_wa", "rt_rw", "alamat_catatan", "gps_lat_long", "status_verifikasi"],
      headerBg: "#2d6a4f"
    },
    {
      name: "tbl_pekarangan",
      headers: ["yard_id", "member_id", "status_lahan", "tipe_permukaan", "estimasi_luas", "zonasi_posisi", "paparan_sinar", "sumber_air", "fasilitas_limbah", "drive_foto_url"],
      headerBg: "#1b4332"
    },
    {
      name: "tbl_aset_produksi",
      headers: ["asset_id", "yard_id", "pilar_kategori", "nama_komoditas", "jumlah_estimasi", "media_tanam", "catatan_produksi"],
      headerBg: "#40916c"
    },
    {
      name: "tbl_tanaman",
      headers: ["id", "timestamp", "name", "variety", "location", "qty", "plantedDate", "hst", "targetHst", "phase", "icon", "progressPercent"],
      headerBg: "#15803d"
    },
    {
      name: "tbl_ternak",
      headers: ["id", "timestamp", "type", "name", "qty", "housing", "todayYield", "weekYield", "icon", "note"],
      headerBg: "#b45309"
    },
    {
      name: "tbl_log_aktivitas",
      headers: ["id", "timestamp", "title", "type", "date", "note"],
      headerBg: "#0369a1"
    },
    {
      name: "tbl_buku_kas",
      headers: ["id", "timestamp", "item", "meal", "note", "date", "savedValue"],
      headerBg: "#047857"
    },
    {
      name: "tbl_master_options",
      headers: ["category", "value", "extra_json"],
      headerBg: "#475569"
    }
  ];

  schemas.forEach(schema => {
    let sheet = ss.getSheetByName(schema.name);
    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(schema.headers);
      const headerRange = sheet.getRange(1, 1, 1, schema.headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setFontColor("#ffffff");
      headerRange.setBackground(schema.headerBg);
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }
  });

  const defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Lembar1");
  if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (ignore) {}
  }
}

function cleanPhoneNumber(phone) {
  let cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.startsWith("62")) {
    cleaned = "0" + cleaned.substring(2);
  } else if (!cleaned.startsWith("0") && cleaned.length > 0) {
    cleaned = "0" + cleaned;
  }
  return cleaned;
}

function getFormattedDateCompact() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function jsonResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupDatabase() {
  const ss = getSpreadsheet();
  initDatabaseSheets(ss);
  Logger.log("Database Sheets berhasil diinisialisasi pada: " + ss.getName() + " (" + ss.getUrl() + ")");
}
