<script setup lang="ts">
import { ref, computed } from 'vue';
import type { SedekahLog, KasLogItem } from '../types';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import SearchableSelect, { type SelectOption } from './SearchableSelect.vue';

const props = withDefaults(defineProps<{
  sedekahLogs?: SedekahLog[];
}>(), {
  sedekahLogs: () => []
});

const emit = defineEmits<{
  (e: 'showToast', message: string, type?: 'success' | 'error' | 'warning'): void;
}>();

const settings = StorageService.getSettings();

// Sub-Tab Switcher: 'poin' (Tabungan Poin) vs 'kas' (Buku Kas Penghematan)
const activeSubTab = ref<'poin' | 'kas'>('poin');

// --- TABUNGAN POIN STATE (COMING SOON OVERLAY) ---
const pointsBalance = ref(850);
const showDepositModal = ref(false);

const depositForm = ref({
  type: 'Sisa Sayuran Mentah & Kulit Buah',
  weight: 2,
  location: 'Komposter Komunal RT 01'
});

const rewards = ref([
  { id: 'r1', name: 'Pupuk Kompos Kasgot 5 Kg', points: 100, icon: '🌱', stock: 12 },
  { id: 'r2', name: 'Bibit Cabai Rawit (3 Pot)', points: 150, icon: '🌶️', stock: 8 },
  { id: 'r3', name: 'Maggot BSF Pakan Ternak 1 Kg', points: 200, icon: '🐛', stock: 5 },
  { id: 'r4', name: 'Pupuk Organik Cair (POC) 500ml', points: 120, icon: '🧪', stock: 15 },
  { id: 'r5', name: 'Benih Kangkung & Bayam (2 Bks)', points: 80, icon: '🥬', stock: 20 }
]);

const pointHistory = ref([
  { id: 'h1', title: 'Setor sisa dapur sayur & buah (2.5 kg)', points: '+250', date: 'Hari ini, 09:15', type: 'earn' },
  { id: 'h2', title: 'Tukar 3 Pot Bibit Cabai Rawit', points: '-150', date: 'Kemarin, 14:20', type: 'redeem' },
  { id: 'h3', title: 'Setor sisa kulit buah & dedaunan (1.0 kg)', points: '+100', date: '3 hari lalu', type: 'earn' }
]);

const redeemReward = (reward: any) => {
  if (pointsBalance.value < reward.points) {
    emit('showToast', 'Saldo Poin Anda belum mencukupi', 'warning');
    return;
  }
  pointsBalance.value -= reward.points;
  pointHistory.value.unshift({
    id: 'h' + Date.now(),
    title: `Tukar ${reward.name}`,
    points: `-${reward.points}`,
    date: 'Baru saja',
    type: 'redeem'
  });
  emit('showToast', `Sukses menukarkan ${reward.name}! Kupon penukaran siap diambil di pengurus lingkungan.`);
};

const submitDeposit = () => {
  const earned = depositForm.value.weight * 100;
  pointsBalance.value += earned;
  pointHistory.value.unshift({
    id: 'h' + Date.now(),
    title: `Setor ${depositForm.value.type} (${depositForm.value.weight} kg)`,
    points: `+${earned}`,
    date: 'Baru saja',
    type: 'earn'
  });
  showDepositModal.value = false;
  emit('showToast', `Terima kasih! Sisa dapur dicatat, Anda memperoleh +${earned} Poin!`);
};

// --- BUKU KAS PENGHEMATAN (DATABASE DINAMIS) ---
const consumedLogs = ref<KasLogItem[]>(StorageService.getKasLogs());
const realSavings = computed(() => {
  return consumedLogs.value.reduce((acc, curr) => acc + (Number(curr.savedValue) || 0), 0);
});

// Total Nilai Produksi Panen (estimasi total petik)
const totalHarvestValue = ref(385000);
const harvestLogs = ref([
  { commodity: '🌶️ Cabai Rawit', detail: '1.5 kg x Rp 60.000', value: 90000 },
  { commodity: '🥚 Telur Ayam/Bebek', detail: '45 butir x Rp 3.000', value: 135000 },
  { commodity: '🥬 Sayuran Hijau Segar', detail: '12 ikat x Rp 5.000', value: 60000 },
  { commodity: '🌿 Jamu Herbal TOGA', detail: 'Jahe merah & kunyit pekarangan', value: 100000 }
]);

const showConsumeModal = ref(false);

const masterOpts = StorageService.getMasterOptions();

const commodityOptions = ref<SelectOption[]>(
  masterOpts.komoditas_konsumsi.map(c => ({
    value: c.value,
    label: c.label,
    icon: c.icon,
    sub: `Rp ${c.price.toLocaleString()} / ${c.unit}`
  }))
);

const onAddCommodityOption = (newOpt: SelectOption) => {
  const itemObj = {
    label: newOpt.value,
    value: newOpt.value,
    unit: 'porsi',
    price: 5000,
    icon: '🥗'
  };
  StorageService.addCustomOption('komoditas_konsumsi', itemObj);
  commodityOptions.value.push({
    value: newOpt.value,
    label: newOpt.value,
    icon: '🥗',
    sub: 'Rp 5.000 / porsi'
  });
  ApiService.addCustomOption(settings.gasUrl, 'komoditas_konsumsi', newOpt.value, itemObj).catch(() => {});
};

const mealOptions = ref<SelectOption[]>(
  masterOpts.jenis_makan.map(m => ({ value: m, label: m }))
);

const onAddMealOption = (newOpt: SelectOption) => {
  StorageService.addCustomOption('jenis_makan', newOpt.value);
  mealOptions.value.push({ value: newOpt.value, label: newOpt.value });
  ApiService.addCustomOption(settings.gasUrl, 'jenis_makan', newOpt.value).catch(() => {});
};

const consumeForm = ref({
  commodity: commodityOptions.value[0]?.value || '🥚 Telur Ayam Pekarangan',
  qty: 2,
  unit: 'butir',
  pricePerUnit: 3000,
  mealType: mealOptions.value[0]?.value || '🍳 Sarapan Pagi',
  note: 'Telur dadar untuk sarapan anak'
});

const onCommoditySelected = (val: string) => {
  const match = masterOpts.komoditas_konsumsi.find(c => c.value === val);
  if (match) {
    consumeForm.value.unit = match.unit;
    consumeForm.value.pricePerUnit = match.price;
  }
};

const submitConsume = () => {
  if (consumeForm.value.qty <= 0) {
    emit('showToast', 'Jumlah konsumsi harus lebih dari 0', 'warning');
    return;
  }
  const savedAmount = consumeForm.value.qty * consumeForm.value.pricePerUnit;

  const newLog: KasLogItem = {
    id: 'c' + Date.now(),
    item: `${consumeForm.value.qty} ${consumeForm.value.unit} ${consumeForm.value.commodity}`,
    meal: consumeForm.value.mealType,
    note: consumeForm.value.note || 'Dimasak untuk konsumsi keluarga',
    date: 'Hari ini',
    savedValue: savedAmount
  };

  StorageService.addKasLog(newLog);
  consumedLogs.value.unshift(newLog);

  const consumePayload = {
    item: newLog.item,
    meal: newLog.meal,
    note: newLog.note,
    savedValue: savedAmount,
    qty: consumeForm.value.qty,
    pricePerUnit: consumeForm.value.pricePerUnit
  };

  // Sync to Sheet or save to offline queue
  if (!navigator.onLine) {
    StorageService.addToSyncQueue(consumePayload, 'consume', `🍽️ Konsumsi: ${newLog.item}`);
  } else {
    ApiService.logConsume(settings.gasUrl, consumePayload).catch(() => {
      StorageService.addToSyncQueue(consumePayload, 'consume', `🍽️ Konsumsi: ${newLog.item}`);
    });
  }

  showConsumeModal.value = false;
  emit('showToast', `🍽️ Konsumsi dicatat! Anda hemat Rp ${savedAmount.toLocaleString()} pengeluaran belanja.`);
};
</script>


<template>
  <div class="savings-kas-page">
    <!-- Header -->
    <div class="section-header">
      <h2>💰 Tabungan & Buku Kas</h2>
      <p>Akumulasi nilai ekonomi pekarangan: Poin dan penghematan riil konsumsi mandiri</p>
    </div>

    <!-- Dual Summary Metric Card (Top Overview) -->
    <div class="card"
      style="background: linear-gradient(135deg, #14532d, #15803d); color: #ffffff; padding: 18px; margin-bottom: 14px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div style="border-right: 1px solid rgba(255, 255, 255, 0.2); padding-right: 8px;">
          <span style="font-size: 0.68rem; opacity: 0.85; text-transform: uppercase;">
            Hemat Belanja Riil
          </span>
          <div style="font-size: 1.25rem; font-weight: 800; margin-top: 2px;">
            Rp {{ (realSavings / 1000).toLocaleString() }}k
          </div>
          <span style="font-size: 0.68rem; opacity: 0.85;">
            Dari konsumsi mandiri
          </span>
        </div>

        <div style="padding-left: 4px;">
          <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 2px;">
            <span style="font-size: 0.68rem; opacity: 0.85; text-transform: uppercase;">
              Saldo Poin
            </span>
            <span style="
              font-size: 0.52rem; font-weight: 800; letter-spacing: 0.8px;
              text-transform: uppercase; background: rgba(255,255,255,0.25);
              color: #bbf7d0; padding: 1px 6px; border-radius: 9999px;
              border: 1px solid rgba(255,255,255,0.3);
            ">Segera Hadir</span>
          </div>
          <div style="font-size: 1.25rem; font-weight: 800; margin-top: 2px; opacity: 0.4;">
            {{ pointsBalance.toLocaleString() }} <span style="font-size: 0.75rem;">POIN</span>
          </div>
          <span style="font-size: 0.68rem; opacity: 0.4;">
            ≈ {{ (pointsBalance / 100).toFixed(1) }} Kg sampah
          </span>
        </div>
      </div>
    </div>

    <!-- Sub-Tab Switcher -->
    <div class="main-tab-nav" style="margin-bottom: 14px;">
      <button type="button" :class="['main-tab-btn', { active: activeSubTab === 'poin' }]" style="opacity: 0.65;"
        @click="activeSubTab = 'poin'">
        ♻️ Tabungan Poin
        <span style="
          font-size: 0.5rem; font-weight: 800; letter-spacing: 0.8px;
          text-transform: uppercase; background: #16a34a;
          color: #fff; padding: 1px 5px; border-radius: 9999px;
          margin-left: 4px; vertical-align: middle;
        ">Segera</span>
      </button>
      <button type="button" :class="['main-tab-btn', { active: activeSubTab === 'kas' }]" @click="activeSubTab = 'kas'">
        📊 Kas Penghematan Mandiri
      </button>
    </div>

    <!-- ================= SUB-TAB 1: TABUNGAN POIN SIRKULAR ================= -->
    <div v-if="activeSubTab === 'poin'" style="position: relative; min-height: 400px;">
      <!-- ======= COMING SOON OVERLAY ======= -->
      <div style="
        position: fixed;
        inset: 0;
        z-index: 50;
        background: radial-gradient(ellipse at center, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.60) 45%, rgba(255,255,255,0) 100%);
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        border-radius: 12px;
        padding: 24px;
        text-align: center;
      ">
        <div style="font-size: 3rem; line-height: 1;">♻️</div>
        <div style="
          background: #14532d;
          color: #fff;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          padding: 3px 12px;
          border-radius: 9999px;
        ">Segera Hadir</div>
        <div style="font-size: 1.15rem; font-weight: 800; color: #052e16;">Tabungan Poin</div>
        <p style="font-size: 0.78rem; color: #374151; line-height: 1.5; max-width: 260px;">
          Pilah sisa organik rumah tangga menjadi Poin yang bisa ditukar bibit, pakan ayam, dan sarana pekarangan. Aktif
          segera setelah komunitas makin solid. Semangat! 💪
        </p>
        <div style="
          width: 100%;
          max-width: 240px;
          background: #d1fae5;
          border-radius: 9999px;
          height: 6px;
          overflow: hidden;
          margin-top: 4px;
        ">
          <div
            style="width: 60%; height: 100%; background: linear-gradient(90deg, #16a34a, #15803d); border-radius: 9999px;">
          </div>
        </div>

      </div>
      <!-- ===================================== -->

      <!-- Wallet Action Card -->
      <div class="card" style="background: #f0fdf4; border-color: var(--primary-border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div>
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--primary-dark);">
              Pilah Sampah Jadi Poin
            </div>
            <div style="font-size: 0.74rem; color: var(--text-muted);">
              Tiap 1 Kg sisa dapur = 100 Poin
            </div>
          </div>
          <span class="teaser-tag soon" style="background: #dcfce7; color: #166534; font-weight: 700;">
            Tier Hijau Lestari
          </span>
        </div>

        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-primary btn-sm btn-full" @click="showDepositModal = true">
            <span>📥 Setor Sisa Dapur</span>
          </button>
          <button type="button" class="btn btn-outline btn-sm btn-full"
            @click="emit('showToast', 'Titik Komposter: Pos RT 01 (Ember Tumpuk) & Gang 3 (Biopori)')">
            <span>📍 Peta Komposter</span>
          </button>
        </div>
      </div>

      <!-- Katalog Penukaran Hadiah -->
      <div class="card">
        <div class="card-title">
          <span>🎁 Tukar Poin dengan Sarana Pekarangan</span>
        </div>

        <div class="reward-grid">
          <div v-for="item in rewards" :key="item.id" class="reward-card">
            <div style="font-size: 1.8rem; text-align: center; margin-bottom: 2px;">
              {{ item.icon }}
            </div>
            <div>
              <div style="font-weight: 700; font-size: 0.8rem; line-height: 1.25;">
                {{ item.name }}
              </div>
              <div style="margin-top: 4px;">
                <span class="reward-points-badge">🪙 {{ item.points }} Poin</span>
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-sm btn-full" style="font-size: 0.74rem; padding: 6px;"
              :disabled="pointsBalance < item.points" @click="redeemReward(item)">
              Tukar
            </button>
          </div>
        </div>
      </div>

      <!-- Riwayat Poin -->
      <div class="card">
        <div class="card-title">
          <span>📜 Riwayat Aktivitas Poin</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div v-for="h in pointHistory" :key="h.id"
            style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border-subtle);">
            <div>
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-main);">
                {{ h.title }}
              </div>
              <div style="font-size: 0.68rem; color: var(--text-dim);">
                {{ h.date }}
              </div>
            </div>
            <span :style="{
              fontWeight: '800',
              fontSize: '0.85rem',
              color: h.type === 'earn' ? 'var(--primary)' : '#dc2626'
            }">
              {{ h.points }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= SUB-TAB 2: BUKU KAS PENGHEMATAN & SEDEKAH ================= -->
    <div v-if="activeSubTab === 'kas'">
      <!-- 1. Hero Card: Penghematan Riil Konsumsi Mandiri (Berdasarkan yang benar-benar dikonsumsi) -->
      <div class="card"
        style="background: #f0fdf4; border-left: 4px solid var(--primary); border: 1px solid var(--primary-border);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 0.72rem; color: var(--primary-dark); font-weight: 700; text-transform: uppercase;">
              PENGHEMATAN RIIL KONSUMSI MANDIRI
            </div>
            <div style="font-size: 1.85rem; font-weight: 800; color: var(--primary-dark); margin: 2px 0 4px 0;">
              Rp {{ realSavings.toLocaleString() }}
            </div>
          </div>
          <span
            style="font-size: 0.65rem; background: var(--primary); color: #fff; padding: 2px 8px; border-radius: 9999px; font-weight: 700;">
            Riil Konsumsi
          </span>
        </div>
        <p style="font-size: 0.76rem; color: var(--text-muted); line-height: 1.4; margin-bottom: 12px;">
          Uang belanja pasar/warung yang berhasil dihemat karena bahan makanan & herbal dipetik dan <b>benar-benar
            dikonsumsi</b> sendiri.
        </p>

        <!-- Tombol Catat Konsumsi Mandiri -->
        <button type="button" class="btn btn-primary btn-full"
          style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; font-weight: 700;"
          @click="showConsumeModal = true">
          <span>🍽️ + Catat Konsumsi Mandiri Hari Ini</span>
        </button>
      </div>

      <!-- 2. Rincian Konsumsi Mandiri (Log Penghematan Riil) -->
      <div class="card">
        <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span>🥗 Riwayat Konsumsi Pekarangan</span>
          <span style="font-size: 0.7rem; color: var(--primary); font-weight: 700;">{{ consumedLogs.length }} Kali
            Konsumsi</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div v-for="log in consumedLogs" :key="log.id"
            style="background: #ffffff; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-weight: 700; font-size: 0.82rem; color: var(--text-main);">{{ log.item }}</span>
                <span
                  style="font-size: 0.65rem; background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 4px; font-weight: 600;">
                  {{ log.meal }}
                </span>
              </div>
              <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">{{ log.note }}</div>
              <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">{{ log.date }}</div>
            </div>
            <div style="text-align: right; flex-shrink: 0; padding-left: 8px;">
              <span style="font-size: 0.85rem; font-weight: 800; color: var(--primary);">
                +Rp {{ log.savedValue.toLocaleString() }}
              </span>
              <div style="font-size: 0.62rem; color: var(--text-dim);">Hemat Belanja</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Rumus Lama (Diganti Nama): Total Nilai Produksi Panen -->
      <div class="card" style="background: #f8fafc; border: 1px dashed #cbd5e1;">
        <div class="card-title" style="margin-bottom: 4px;">
          <span>🌾 Total Nilai Produksi Panen</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
          <span style="font-size: 1.35rem; font-weight: 800; color: #334155;">
            Rp {{ totalHarvestValue.toLocaleString() }}
          </span>
          <span
            style="font-size: 0.68rem; color: var(--text-dim); background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">
            Total Petik
          </span>
        </div>
        <p style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.35; margin-bottom: 10px;">
          Estimasi nilai pasar seluruh komoditas yang berhasil dipanen pekarangan (sebelum dipilah untuk konsumsi
          mandiri, sedekah, atau barter).
        </p>

        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div v-for="(log, idx) in harvestLogs" :key="idx"
            style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; padding: 4px 0; border-bottom: 1px dotted var(--border-subtle);">
            <div>
              <span style="font-weight: 600; color: var(--text-main);">{{ log.commodity }}</span>
              <span style="font-size: 0.68rem; color: var(--text-dim); margin-left: 6px;">({{ log.detail }})</span>
            </div>
            <span style="font-weight: 700; color: #475569;">
              Rp {{ log.value.toLocaleString() }}
            </span>
          </div>
        </div>
      </div>

      <!-- 4. Catatan Sedekah Tetangga -->
      <div class="card" style="position: relative; overflow: hidden;">
        <!-- coming soon overlay -->
        <div style="
          position: absolute; inset: 0; z-index: 20;
          background: radial-gradient(ellipse at center, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.60) 45%, rgba(255,255,255,0) 100%);
          backdrop-filter: blur(1px); -webkit-backdrop-filter: blur(1px);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 8px; border-radius: inherit; text-align: center; padding: 20px;
        ">
          <div style="font-size: 2.2rem; line-height: 1;">❤️</div>
          <div style="
            background: #9d174d; color: #fff;
            font-size: 0.62rem; font-weight: 800; letter-spacing: 1.5px;
            text-transform: uppercase; padding: 2px 10px; border-radius: 9999px;
          ">Segera Hadir</div>
          <div style="font-size: 1rem; font-weight: 800; color: #500724;">Rekor Sedekah & Gotong Royong</div>
          <p style="font-size: 0.74rem; color: #374151; line-height: 1.45; max-width: 230px;">
            Catat sedekah hasil panen ke tetangga saat mencatat panen di menu Catat. Aktif segera setelah komunitas
            makin solid. Semangat! 💪
          </p>
        </div>

        <div class="card-title">
          <span>❤️ Rekor Sedekah & Gotong Royong</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div v-for="(sed, idx) in props.sedekahLogs" :key="idx"
            style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700;">
              <span>{{ sed.title }}</span>
              <span style="color: var(--text-dim); font-size: 0.7rem;">{{ sed.date }}</span>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
              {{ sed.note }}
            </div>
          </div>
        </div>

        <div
          style="margin-top: 12px; background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: var(--radius-sm); padding: 10px; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.4rem;">🏅</span>
          <div style="font-size: 0.75rem; color: #9d174d; font-weight: 600;">
            Lencana Aktif: "Pekarangan Berkah & Lestari"
          </div>
        </div>
      </div>
    </div>

    <!-- Modal 1: Catat Konsumsi Mandiri Hari Ini -->
    <div v-if="showConsumeModal" class="modal-backdrop" @click.self="showConsumeModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3>🍽️ Catat Konsumsi Mandiri</h3>
          <button class="btn-icon" @click="showConsumeModal = false">✕</button>
        </div>

        <p style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 12px;">
          Catat bahan hasil pekarangan yang dikonsumsi hari ini. Penghematan uang belanja dihitung otomatis!
        </p>

        <div class="form-group">
          <label class="form-label">Komoditas yang Dikonsumsi</label>
          <SearchableSelect
            v-model="consumeForm.commodity"
            :options="commodityOptions"
            placeholder="-- Cari atau tambah komoditas --"
            add-label="Tambah Komoditas"
            @add-option="onAddCommodityOption"
            @change="onCommoditySelected"
          />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="form-group">
            <label class="form-label">Jumlah ({{ consumeForm.unit }})</label>
            <input v-model.number="consumeForm.qty" type="number" min="1" class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Harga Warung / Satuan (Rp)</label>
            <input v-model.number="consumeForm.pricePerUnit" type="number" class="form-control" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Waktu & Jenis Konsumsi</label>
          <SearchableSelect
            v-model="consumeForm.mealType"
            :options="mealOptions"
            placeholder="-- Pilih Waktu Konsumsi --"
            add-label="Tambah Waktu Konsumsi"
            @add-option="onAddMealOption"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Catatan Konsumsi (Opsional)</label>
          <input v-model="consumeForm.note" type="text" placeholder="Misal: Dimakan bersama keluarga / diseduh hangat"
            class="form-control" />
        </div>

        <!-- Live Preview Perhitungan Penghematan -->
        <div
          style="background: #f0fdf4; border: 1px solid var(--primary-border); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.78rem; color: var(--primary-dark); font-weight: 600;">
            💵 Uang Belanja yang Dihemat:
          </span>
          <span style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">
            Rp {{ (consumeForm.qty * consumeForm.pricePerUnit).toLocaleString() }}
          </span>
        </div>

        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-outline btn-full" @click="showConsumeModal = false">Batal</button>
          <button type="button" class="btn btn-primary btn-full" @click="submitConsume">Simpan Penghematan</button>
        </div>
      </div>
    </div>

    <!-- Modal 2: Setor Sisa Dapur Mandiri (Poin) -->
    <div v-if="showDepositModal" class="modal-backdrop" @click.self="showDepositModal = false">
      <div class="modal-sheet">
        <div class="modal-header">
          <h3>📥 Setor Sisa Dapur Mandiri</h3>
          <button class="btn-icon" @click="showDepositModal = false">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label">Jenis Sisa Dapur</label>
          <select v-model="depositForm.type" class="form-control">
            <option value="Sisa Sayuran Mentah & Kulit Buah">Sisa Sayuran Mentah & Kulit Buah</option>
            <option value="Ampas Kopi & Teh">Ampas Kopi & Kantong Teh</option>
            <option value="Nasi Basi & Sisa Dapur">Nasi Basi & Sisa Makanan</option>
            <option value="Dedaunan Kering Pekarangan">Dedaunan Kering Pekarangan</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Estimasi Berat (Kg)</label>
          <input v-model.number="depositForm.weight" type="number" min="0.5" step="0.5" class="form-control" />
          <span style="font-size: 0.72rem; color: var(--text-dim); margin-top: 4px; display: block;">
            💡 Setiap 1 Kg sisa dapur bernilai 100 Poin
          </span>
        </div>

        <div class="form-group">
          <label class="form-label">Lokasi Fasilitas Penyetoran</label>
          <select v-model="depositForm.location" class="form-control">
            <option value="Komposter Komunal RT 01">Komposter Komunal RT 01</option>
            <option value="Biopori Bersama RT 02">Biopori Bersama RT 02</option>
            <option value="Kandang Maggot BSF RT 01">Kandang Maggot BSF RT 01</option>
          </select>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <button type="button" class="btn btn-outline btn-full" @click="showDepositModal = false">Batal</button>
          <button type="button" class="btn btn-primary btn-full" @click="submitDeposit">Konfirmasi Setor</button>
        </div>
      </div>
    </div>
  </div>
</template>
