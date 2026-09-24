<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
  sub?: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: (string | SelectOption)[];
    placeholder?: string;
    allowAdd?: boolean;
    addLabel?: string;
    disabled?: boolean;
    required?: boolean;
  }>(),
  {
    placeholder: '-- Pilih atau cari --',
    allowAdd: true,
    addLabel: 'Tambah',
    disabled: false,
    required: false
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'addOption', newOption: SelectOption): void;
  (e: 'change', value: string): void;
}>();

const isOpen = ref(false);
const searchQuery = ref('');
const rootRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);

// Normalize options to SelectOption[]
const normalizedOptions = computed<SelectOption[]>(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });
});

// Currently selected option object
const selectedOption = computed<SelectOption | undefined>(() => {
  return normalizedOptions.value.find((o) => o.value === props.modelValue);
});

// Filtered options based on search query
const filteredOptions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return normalizedOptions.value;
  return normalizedOptions.value.filter(
    (o) =>
      o.label.toLowerCase().includes(query) ||
      o.value.toLowerCase().includes(query) ||
      (o.sub && o.sub.toLowerCase().includes(query))
  );
});

// Check if search query exact match exists
const hasExactMatch = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return true;
  return normalizedOptions.value.some((o) => o.label.toLowerCase() === q || o.value.toLowerCase() === q);
});

const toggleDropdown = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    searchQuery.value = '';
    setTimeout(() => {
      searchInputRef.value?.focus();
    }, 50);
  }
};

const selectOption = (opt: SelectOption) => {
  emit('update:modelValue', opt.value);
  emit('change', opt.value);
  isOpen.value = false;
  searchQuery.value = '';
};

const handleAddNew = () => {
  const query = searchQuery.value.trim();
  if (!query) return;

  const newOpt: SelectOption = {
    value: query,
    label: query,
    icon: '✨'
  };

  emit('addOption', newOpt);
  emit('update:modelValue', query);
  emit('change', query);
  isOpen.value = false;
  searchQuery.value = '';
};

const handleClickOutside = (e: MouseEvent) => {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div ref="rootRef" class="searchable-select" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <!-- Trigger Button -->
    <div
      class="select-trigger"
      :class="{ 'has-value': !!modelValue }"
      @click="toggleDropdown"
      tabindex="0"
      @keydown.enter.prevent="toggleDropdown"
      @keydown.space.prevent="toggleDropdown"
      @keydown.down.prevent="isOpen = true"
    >
      <div class="trigger-content">
        <span v-if="selectedOption?.icon" class="trigger-icon">{{ selectedOption.icon }}</span>
        <span v-if="selectedOption" class="trigger-label">{{ selectedOption.label }}</span>
        <span v-else-if="modelValue" class="trigger-label">{{ modelValue }}</span>
        <span v-else class="trigger-placeholder">{{ placeholder }}</span>
      </div>

      <div class="trigger-badges">
        <span v-if="selectedOption?.sub" class="trigger-sub">{{ selectedOption.sub }}</span>
        <span class="trigger-arrow">{{ isOpen ? '▲' : '▼' }}</span>
      </div>
    </div>

    <!-- Dropdown Menu -->
    <div v-if="isOpen" class="select-dropdown">
      <!-- Search Box with Add Button -->
      <div class="select-search-bar">
        <span class="search-icon">🔍</span>
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          class="search-input"
          :placeholder="'Cari atau ketik baru...'"
          @keydown.enter.prevent="!hasExactMatch && allowAdd ? handleAddNew() : null"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="search-clear-btn"
          @click="searchQuery = ''"
          title="Hapus pencarian"
        >
          ✕
        </button>
      </div>

      <!-- Add New Quick Action if query has no exact match -->
      <div
        v-if="allowAdd && searchQuery.trim() && !hasExactMatch"
        class="add-new-option-row"
        @click="handleAddNew"
      >
        <div class="add-new-icon">➕</div>
        <div class="add-new-text">
          <span class="add-new-title">{{ addLabel }} "<strong>{{ searchQuery.trim() }}</strong>"</span>
          <span class="add-new-desc">Klik untuk menambahkan sebagai pilihan baru</span>
        </div>
      </div>

      <!-- Option List -->
      <div class="select-options-list">
        <div
          v-for="opt in filteredOptions"
          :key="opt.value"
          class="select-option-item"
          :class="{ 'is-selected': modelValue === opt.value }"
          @click="selectOption(opt)"
        >
          <span v-if="opt.icon" class="option-icon">{{ opt.icon }}</span>
          <div class="option-text-wrapper">
            <span class="option-label">{{ opt.label }}</span>
            <span v-if="opt.sub" class="option-sub">{{ opt.sub }}</span>
          </div>
          <span v-if="modelValue === opt.value" class="option-check">✓</span>
        </div>

        <!-- Empty search state -->
        <div v-if="filteredOptions.length === 0 && !searchQuery.trim()" class="select-empty-msg">
          Belum ada pilihan tersedia.
        </div>

        <div v-if="filteredOptions.length === 0 && searchQuery.trim() && !allowAdd" class="select-empty-msg">
          Pilihan tidak ditemukan.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.searchable-select {
  position: relative;
  width: 100%;
  font-family: inherit;
  user-select: none;
}

.select-trigger {
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  background: var(--bg-card, #ffffff);
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-sm, 10px);
  color: var(--text-main, #1e293b);
  font-size: 0.88rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.select-trigger:hover,
.searchable-select.is-open .select-trigger {
  border-color: var(--primary, #16a34a);
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
}

.searchable-select.is-disabled .select-trigger {
  opacity: 0.6;
  cursor: not-allowed;
  background: #f1f5f9;
}

.trigger-content {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trigger-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.trigger-label {
  font-weight: 600;
  color: var(--text-main, #1e293b);
}

.trigger-placeholder {
  color: var(--text-muted, #94a3b8);
  font-weight: 400;
}

.trigger-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.trigger-sub {
  font-size: 0.7rem;
  background: rgba(22, 163, 74, 0.1);
  color: var(--primary, #16a34a);
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 600;
}

.trigger-arrow {
  font-size: 0.65rem;
  color: var(--text-muted, #94a3b8);
  margin-left: 2px;
}

/* Dropdown Menu */
.select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1050;
  background: var(--bg-card, #ffffff);
  border: 1.5px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-sm, 12px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
  padding: 6px;
  overflow: hidden;
  animation: fadeInDown 0.18s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Search Bar */
.select-search-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-main, #f8fafc);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  padding: 4px 8px;
  margin-bottom: 6px;
}

.search-icon {
  font-size: 0.85rem;
  color: var(--text-muted, #94a3b8);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.82rem;
  color: var(--text-main, #1e293b);
  padding: 4px 0;
  font-family: inherit;
}

.search-clear-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0 4px;
}

/* Add New Option Row */
.add-new-option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #f0fdf4;
  border: 1.5px dashed var(--primary, #16a34a);
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 6px;
  transition: all 0.15s ease;
}

.add-new-option-row:hover {
  background: #dcfce7;
  transform: translateY(-1px);
}

.add-new-icon {
  font-size: 1rem;
  color: var(--primary, #16a34a);
}

.add-new-text {
  display: flex;
  flex-direction: column;
}

.add-new-title {
  font-size: 0.8rem;
  color: var(--primary-dark, #15803d);
}

.add-new-desc {
  font-size: 0.66rem;
  color: var(--text-muted, #64748b);
}

/* Options List */
.select-options-list {
  max-height: 220px;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.select-option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.select-option-item:hover {
  background: var(--bg-main, #f1f5f9);
}

.select-option-item.is-selected {
  background: #f0fdf4;
  color: var(--primary, #16a34a);
  font-weight: 600;
}

.option-icon {
  font-size: 1.05rem;
  line-height: 1;
}

.option-text-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.option-label {
  font-size: 0.82rem;
  color: var(--text-main, #1e293b);
}

.select-option-item.is-selected .option-label {
  color: var(--primary, #16a34a);
}

.option-sub {
  font-size: 0.68rem;
  color: var(--text-muted, #64748b);
}

.option-check {
  font-size: 0.85rem;
  color: var(--primary, #16a34a);
  font-weight: 800;
}

.select-empty-msg {
  padding: 12px;
  text-align: center;
  font-size: 0.78rem;
  color: var(--text-muted, #94a3b8);
}
</style>
