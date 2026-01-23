<template>
  <div class="relative">
    <div class="relative">
      <Search
        class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
      />
      <Input
        ref="inputRef"
        v-model="searchQuery"
        type="text"
        placeholder="Ürün adı, SKU veya barkod ile ara..."
        class="pl-10 pr-20"
        @input="handleInput"
        @keyup.enter="handleEnter"
      />
      <button
        v-if="searchQuery"
        type="button"
        class="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
        @click="clearSearch"
      >
        <X class="h-5 w-5" />
      </button>
      <button
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary"
        @click="$emit('scan')"
      >
        <QrCode class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Search, X, QrCode } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'

interface Props {
  modelValue: string
  autofocus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autofocus: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  scan: []
  search: [value: string]
}>()

const inputRef = ref<InstanceType<typeof Input> | null>(null)
const searchQuery = ref(props.modelValue)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.modelValue,
  (value) => {
    searchQuery.value = value
  }
)

function handleInput() {
  emit('update:modelValue', searchQuery.value)

  // Debounce search
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    emit('search', searchQuery.value)
  }, 300)
}

function handleEnter() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  emit('search', searchQuery.value)
}

function clearSearch() {
  searchQuery.value = ''
  emit('update:modelValue', '')
  emit('search', '')
  // Focus the input after clearing
  const inputEl = inputRef.value?.$el?.querySelector('input') || inputRef.value?.$el
  inputEl?.focus()
}

onMounted(() => {
  if (props.autofocus) {
    const inputEl = inputRef.value?.$el?.querySelector('input') || inputRef.value?.$el
    inputEl?.focus()
  }
})
</script>
