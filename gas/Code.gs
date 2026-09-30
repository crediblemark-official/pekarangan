/**
 * ============================================================================
 * PEKARANGAN - BACKEND GOOGLE APPS SCRIPT (GAS) v2.1
 * ============================================================================
 * Backend Web App untuk aplikasi kedaulatan pangan Pekarangan tingkat RT/Komunitas.
 * Mengintegrasikan Google Sheets sebagai database relasional flat-sheet
 * dan Google Drive untuk penyimpanan foto lahan terstruktur.
 *
 * Mendukung sinkronisasi 2 arah:
 * - tbl_anggota        (Identitas Warga)
 * - tbl_pekarangan     (Profil & Karakteristik Lahan)
 * - tbl_aset_produksi  (4 Pilar Aset Pekarangan)
 * - tbl_tanaman        (Jurnal & Pemantauan Tanaman Aktif)
 * - tbl_ternak         (Inventaris & Kelompok Ternak Produktif)
 * - tbl_log_aktivitas  (Catatan Harian Panen, Rawat, Tanam, Telur)
 * - tbl_penghematan    (Rekor Penghematan Belanja Dapur Riil — qty, harga satuan)
 * - tbl_master_options (Daftar Pilihan Dinamis / Dropdown Tambah Baru)
 *
 * Changelog v2.1:
 * - handleBatchSync: mendukung semua action type (bukan hanya survei)
 * - handleLogHarvest: menyimpan plantId & alokasi panen
 * - handleLogConsume: menyimpan qty & pricePerUnit
 * - tbl_penghematan: tambah kolom qty & price_per_unit
 */

const CONFIG = {
  // ID Spreadsheet Database Pekarangan
  SPREADSHEET_ID: "1fCkUEfRBte8FSxrEXF0I3T9t0oNHn-SiUFkrLE0Y5yU",
  // ID Folder Google Drive untuk Penyimpanan Foto Lahan Pekarangan
  DRIVE_FOLDER_ID: "1kF4E-YXOKp7Gi-cBVof7ZP03mofuWTMH",
  ROOT_FOLDER_NAME: "MEDIA"
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

    if (action === "lookup_account") {
      const phone = (e && e.parameter && (e.parameter.phone || e.parameter.nomor_wa)) || "";
      const deviceId = (e && e.parameter && e.parameter.device_id) || "";
      return handleLookupAccount(ss, { phone: phone, device_id: deviceId });
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

    // 1. PENDAFTARAN & PEMULIHAN AKUN (DEVICE BINDING)
    if (payload.action === "register_account") {
      return handleRegisterAccount(ss, payload);
    }

    if (payload.action === "lookup_account") {
      return handleLookupAccount(ss, payload);
    }

    // 2. SURVEI PROFIL LAHAN (FASE 1)
    if (payload.member_data && payload.yard_data) {
      return handleSurveySubmission(ss, payload);
    }

    // 3. AKSI-AKSI PENCATATAN HARIAN & DATABASE
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

function handleRegisterAccount(ss, payload) {
  const account = payload.account || payload;
  const namaLengkap = (account.nama_lengkap || "").trim();
  const nomorWa = cleanPhoneNumber(account.nomor_wa || "");
  const rtRw = (account.rt_rw || "").trim();
  const alamat = (account.alamat_catatan || "").trim();
  const deviceId = (account.device_id || "").trim();
  const forceTakeover = !!(account.force_takeover || payload.force_takeover);

  if (!namaLengkap) {
    throw new Error("Nama lengkap wajib diisi untuk pendaftaran akun.");
  }
  if (!nomorWa) {
    throw new Error("Nomor WhatsApp wajib diisi sebagai identitas akun.");
  }

  const sheetAnggota = ss.getSheetByName("tbl_anggota");
  const data = sheetAnggota.getDataRange().getValues();

  let existingRow = -1;
  let existingMember = null;

  for (let i = 1; i < data.length; i++) {
    const rowWa = cleanPhoneNumber(data[i][4]);
    if (rowWa && rowWa === nomorWa) {
      existingRow = i + 1; // 1-indexed row number
      existingMember = {
        member_id: String(data[i][0] || ""),
        nama_lengkap: String(data[i][2] || ""),
        nama_panggilan: String(data[i][3] || ""),
        nomor_wa: String(data[i][4] || ""),
        rt_rw: String(data[i][5] || ""),
        alamat_catatan: String(data[i][6] || ""),
        status_verifikasi: String(data[i][8] || "VERIFIED"),
        device_id: String(data[i][9] || ""),
        status_sesi: String(data[i][10] || "AKTIF"),
        last_active: String(data[i][11] || "")
      };
      break;
    }
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const allData = fetchAllDatabase(ss);

  if (existingRow !== -1 && existingMember) {
    const prevDevice = existingMember.device_id;

    // KEBIJAKAN 1 HP: Jika akun sedang aktif di HP lain dan belum disetujui takeover:
    if (prevDevice && prevDevice !== deviceId && !forceTakeover) {
      return jsonResponse({
        status: "conflict",
        message: "Akun ini sedang aktif di perangkat lain. Kebijakan sistem: 1 akun hanya boleh aktif di 1 HP.",
        isOtherDeviceActive: true,
        existing_device_id: prevDevice,
        member: existingMember
      });
    }

    // Pindahkan / aktifkan sesi di perangkat baru ini
    if (deviceId) {
      sheetAnggota.getRange(existingRow, 10).setValue(deviceId);
      existingMember.device_id = deviceId;
    }
    // Kolom 11: status_sesi = AKTIF
    sheetAnggota.getRange(existingRow, 11).setValue("AKTIF");
    existingMember.status_sesi = "AKTIF";
    // Kolom 12: last_active
    sheetAnggota.getRange(existingRow, 12).setValue(nowIso);
    existingMember.last_active = nowIso;

    if (namaLengkap) {
      sheetAnggota.getRange(existingRow, 3).setValue(namaLengkap);
      existingMember.nama_lengkap = namaLengkap;
    }
    if (rtRw && rtRw !== "-") {
      sheetAnggota.getRange(existingRow, 6).setValue("'" + rtRw);
      existingMember.rt_rw = rtRw;
    }
    if (alamat && alamat !== "-") {
      sheetAnggota.getRange(existingRow, 7).setValue(alamat);
      existingMember.alamat_catatan = alamat;
    }

    const memberYards = (allData.yards || []).filter(y => y.member_id === existingMember.member_id);

    return jsonResponse({
      status: "success",
      message: forceTakeover 
        ? "Sesi berhasil dipindahkan ke perangkat ini! Perangkat lama telah dinonaktifkan."
        : "Akun aktif pada perangkat ini.",
      isExisting: true,
      member: existingMember,
      yards: memberYards
    });
  }

  // Akun baru
  const todayStr = getFormattedDateCompact();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const memberId = account.member_id || `MBR-${todayStr}-${randomSuffix}`;

  sheetAnggota.appendRow([
    memberId,
    now,
    namaLengkap,
    account.nama_panggilan || namaLengkap.split(" ")[0] || namaLengkap,
    "'" + nomorWa,
    "'" + (rtRw || "-"),
    alamat || "-",
    account.gps_lat_long || "",
    "VERIFIED",
    deviceId,
    "AKTIF",
    nowIso
  ]);

  return jsonResponse({
    status: "success",
    message: "Akun baru berhasil didaftarkan dan aktif!",
    isExisting: false,
    member: {
      member_id: memberId,
      nama_lengkap: namaLengkap,
      nomor_wa: nomorWa,
      rt_rw: rtRw || "-",
      alamat_catatan: alamat || "-",
      device_id: deviceId,
      status_sesi: "AKTIF",
      last_active: nowIso
    },
    yards: []
  });
}

function handleLookupAccount(ss, payloadOrQuery) {
  const phone = cleanPhoneNumber(payloadOrQuery.phone || payloadOrQuery.nomor_wa || "");
  const deviceId = String(payloadOrQuery.device_id || "").trim();

  if (!phone && !deviceId) {
    return jsonResponse({
      status: "error",
      message: "Nomor WhatsApp atau Device ID harus disediakan."
    }, 400);
  }

  const sheetAnggota = ss.getSheetByName("tbl_anggota");
  if (!sheetAnggota || sheetAnggota.getLastRow() < 2) {
    return jsonResponse({
      status: "success",
      found: false,
      message: "Belum ada akun terdaftar."
    });
  }

  const data = sheetAnggota.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowWa = cleanPhoneNumber(data[i][4]);
    const rowDev = String(data[i][9] || "").trim();

    const matchPhone = phone && rowWa === phone;
    const matchDevice = deviceId && rowDev === deviceId;

    if (matchPhone || matchDevice) {
      const isOtherDevice = deviceId && rowDev && rowDev !== deviceId;
      const member = {
        member_id: String(data[i][0] || ""),
        nama_lengkap: String(data[i][2] || ""),
        nama_panggilan: String(data[i][3] || ""),
        nomor_wa: String(data[i][4] || ""),
        rt_rw: String(data[i][5] || ""),
        alamat_catatan: String(data[i][6] || ""),
        status_verifikasi: String(data[i][8] || "VERIFIED"),
        device_id: rowDev,
        status_sesi: String(data[i][10] || "AKTIF"),
        last_active: String(data[i][11] || "")
      };

      const allData = fetchAllDatabase(ss);
      const memberYards = (allData.yards || []).filter(y => y.member_id === member.member_id);

      return jsonResponse({
        status: "success",
        found: true,
        isOtherDeviceActive: isOtherDevice,
        member: member,
        yards: memberYards
      });
    }
  }

  return jsonResponse({
    status: "success",
    found: false,
    message: "Akun belum terdaftar."
  });
}

function handleSurveySubmission(ss, payload) {
  const memberData = payload.member_data || {};
  const yardData = payload.yard_data || {};
  const assetsData = payload.assets_data || [];
  const imageBase64 = payload.image_base64 || "";

  if (!memberData.nama_lengkap || memberData.nama_lengkap.trim() === "") {
    throw new Error("Nama lengkap wajib diisi.");
  }
  if (!memberData.nomor_wa || memberData.nomor_wa.trim() === "") {
    memberData.nomor_wa = "-";
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
    "'" + (memberData.rt_rw || ""),
    memberData.alamat_catatan || "",
    memberData.gps_lat_long || "",
    memberData.status_verifikasi || "VERIFIED",
    memberData.device_id || ""
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
    [
      harvest.note || "Panen pekarangan",
      harvest.allocation ? `Alokasi: ${harvest.allocation}` : "",
      harvest.plantId ? `ID: ${harvest.plantId}` : ""
    ].filter(Boolean).join(" • ")
  ]);

  return jsonResponse({ status: "success" });
}

function handleLogConsume(ss, consume) {
  const sheetPenghematan = ss.getSheetByName("tbl_penghematan");
  const qty = Number(consume.qty) || 1;
  const pricePerUnit = Number(consume.pricePerUnit) || 0;
  const savedVal = Number(consume.savedValue) || (qty * pricePerUnit);
  const now = new Date();

  sheetPenghematan.appendRow([
    "HEMAT-" + Date.now(),
    now,
    consume.item || "",
    consume.meal || "🍳 Sarapan Pagi",
    consume.note || "",
    "Hari ini",
    qty,
    pricePerUnit,
    savedVal
  ]);

  const sheetLog = ss.getSheetByName("tbl_log_aktivitas");
  sheetLog.appendRow([
    "LOG-" + Date.now(),
    now,
    `Konsumsi Mandiri: ${consume.item}`,
    "konsumsi",
    "Hari ini",
    `${consume.meal} • ${qty} × Rp${pricePerUnit.toLocaleString()} = Hemat Rp ${savedVal.toLocaleString()}`
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
  const errors = [];

  items.forEach(item => {
    try {
      // Survei pendataan lahan
      if (item.member_data && item.yard_data) {
        handleSurveySubmission(ss, item);
        count++;
        return;
      }

      // Semua action type dari antrian offline
      const action = item.action;
      if (action === "save_plant") {
        handleSavePlant(ss, item.plant);
      } else if (action === "update_plant_phase") {
        handleUpdatePlantPhase(ss, item.plantId, item.phase, item.progressPercent);
      } else if (action === "save_livestock") {
        handleSaveLivestock(ss, item.livestock);
      } else if (action === "log_egg") {
        handleLogEgg(ss, item.livestockId, item.count, item.note);
      } else if (action === "log_harvest") {
        handleLogHarvest(ss, item.harvest);
      } else if (action === "log_consume") {
        handleLogConsume(ss, item.consume);
      } else if (action === "add_option") {
        handleAddOption(ss, item.category, item.value, item.extra);
      }
      count++;
    } catch (e) {
      errors.push({ item: item.action || "survei", error: e.toString() });
    }
  });

  return jsonResponse({
    status: errors.length === 0 ? "success" : "partial",
    synced_count: count,
    errors: errors
  });
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
    penghematanLogs: readSheetToObjects(ss, "tbl_penghematan"),
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
  const sheetPenghematan = ss.getSheetByName("tbl_penghematan");

  const totalMembers = sheetAnggota ? Math.max(0, sheetAnggota.getLastRow() - 1) : 0;
  const totalPlants = sheetTanaman ? Math.max(0, sheetTanaman.getLastRow() - 1) : 0;

  let totalPenghematan = 0;
  if (sheetPenghematan && sheetPenghematan.getLastRow() > 1) {
    // Col 9: savedValue (id, timestamp, item, meal, note, date, qty, price_per_unit, savedValue)
    const pengValues = sheetPenghematan.getRange(2, 9, sheetPenghematan.getLastRow() - 1, 1).getValues();
    pengValues.forEach(r => {
      totalPenghematan += Number(r[0]) || 0;
    });
  }

  return {
    total_members: totalMembers,
    total_plants: totalPlants,
    total_penghematan: totalPenghematan
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

  const rootFolder = getRootDriveFolder();
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

function getRootDriveFolder() {
  const propId = PropertiesService.getScriptProperties().getProperty("DRIVE_FOLDER_ID");
  const targetId = propId || CONFIG.DRIVE_FOLDER_ID;

  if (targetId && targetId.trim() !== "") {
    try {
      return DriveApp.getFolderById(targetId.trim());
    } catch (e) {
      Logger.log("Gagal mengakses DRIVE_FOLDER_ID (" + targetId + "), fallback: " + e.toString());
    }
  }

  return getOrCreateFolder(DriveApp.getRootFolder(), CONFIG.ROOT_FOLDER_NAME);
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
      headers: ["member_id", "timestamp", "nama_lengkap", "nama_panggilan", "nomor_wa", "rt_rw", "alamat_catatan", "gps_lat_long", "status_verifikasi", "device_id", "status_sesi", "last_active"],
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
      name: "tbl_penghematan",
      headers: ["id", "timestamp", "item", "meal", "note", "date", "qty", "price_per_unit", "savedValue"],
      headerBg: "#047857"
    },
    {
      name: "tbl_master_options",
      headers: ["category", "value", "extra_json"],
      headerBg: "#475569"
    }
  ];

  const allSheets = ss.getSheets();
  const sheetMap = {};
  allSheets.forEach(s => {
    sheetMap[s.getName().trim().toLowerCase()] = s;
  });

  schemas.forEach(schema => {
    const key = schema.name.trim().toLowerCase();
    let sheet = sheetMap[key] || ss.getSheetByName(schema.name);
    if (!sheet) {
      try {
        sheet = ss.insertSheet(schema.name);
        sheetMap[key] = sheet;
      } catch (err) {
        sheet = ss.getSheets().find(s => s.getName().trim().toLowerCase() === key);
      }
    }

    if (sheet && sheet.getLastRow() === 0) {
      sheet.appendRow(schema.headers);
      const headerRange = sheet.getRange(1, 1, 1, schema.headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setFontColor("#ffffff");
      headerRange.setBackground(schema.headerBg);
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    } else if (sheet && sheet.getLastRow() >= 1) {
      // Periksa dan lengkapi kolom header baru jika sheet lama belum memilikinya
      const lastCol = sheet.getLastColumn();
      if (lastCol < schema.headers.length) {
        for (let c = lastCol; c < schema.headers.length; c++) {
          const cell = sheet.getRange(1, c + 1);
          cell.setValue(schema.headers[c]);
          cell.setFontWeight("bold");
          cell.setFontColor("#ffffff");
          cell.setBackground(schema.headerBg);
          cell.setHorizontalAlignment("center");
        }
      }
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
