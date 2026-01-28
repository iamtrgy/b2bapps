<template>
  <button
    type="button"
    class="bg-card rounded-xl overflow-hidden transition-all hover:shadow-md active:scale-[0.98] group text-left w-full"
    @click="handleClick"
  >
    <!-- Product Image -->
    <div class="relative aspect-[4/3] bg-white p-3">
      <img
        v-if="product.image_url && isOnline"
        :src="product.image_url"
        :alt="product.name"
        class="w-full h-full object-contain"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <ImageIcon class="h-10 w-10 text-muted-foreground/20" />
      </div>

      <!-- Quick View Button -->
      <button
        type="button"
        class="absolute top-2 right-2 p-1.5 bg-black/5 hover:bg-black/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        @click.stop="emit('quickView', product)"
      >
        <Info class="h-4 w-4 text-muted-foreground" />
      </button>

      <!-- Out of Stock Overlay -->
      <div
        v-if="!product.can_purchase"
        class="absolute inset-0 bg-white/70 flex items-center justify-center"
      >
        <span class="text-xs font-medium text-muted-foreground bg-white px-2 py-1 rounded-md shadow-sm">
          Stokta Yok
        </span>
      </div>

      <!-- Badges Container (top-left) -->
      <div class="absolute top-2 left-2 flex flex-col gap-1">
        <!-- Discount Badge -->
        <div
          v-if="hasDiscount"
          class="bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md"
        >
          -{{ discountPercentage }}%
        </div>
        <!-- Backorder Badge -->
        <div
          v-if="product.allow_backorder && product.availability_status === 'backorder'"
          class="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md"
        >
          Stoğa Bağlı
        </div>
        <!-- Preorder Badge -->
        <div
          v-if="product.is_preorder && product.availability_status === 'preorder'"
          class="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md"
        >
          Ön Sipariş
        </div>
      </div>
    </div>

    <!-- Product Info -->
    <div class="p-2.5">
      <h3 class="text-sm font-medium text-foreground line-clamp-2 leading-tight min-h-[2.25rem]">
        {{ product.name }}
      </h3>

      <!-- Price Row -->
      <div class="flex items-baseline gap-1.5 mt-2">
        <span class="text-base font-bold text-foreground">{{ formatPrice(mainPrice) }}</span>
        <span class="text-[10px] text-muted-foreground">/{{ hasBox ? 'koli' : 'adet' }}</span>
        <span v-if="hasDiscount" class="text-[10px] text-muted-foreground line-through ml-auto">
          {{ formatPrice(originalPrice) }}
        </span>
      </div>

      <!-- Unit Info -->
      <p v-if="hasBox" class="text-[10px] text-muted-foreground mt-1">
        {{ formatPrice(product.piece_price) }}/adet · {{ product.pieces_per_box }} adet/koli
      </p>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { ImageIcon, Info } from 'lucide-vue-next'
import type { Product } from '@/types'
import { useOfflineStore } from '@/stores/offline'

interface Props {
  product: Product
}

const { isOnline } = storeToRefs(useOfflineStore())

const props = defineProps<Props>()

const emit = defineEmits<{
  add: [product: Product]
  quickView: [product: Product]
}>()

const hasDiscount = computed(() => {
  return props.product.total_discount_percent > 0
})

const discountPercentage = computed(() => {
  return Math.round(props.product.total_discount_percent)
})

const hasBox = computed(() => {
  return props.product.pieces_per_box > 1
})

const mainPrice = computed(() => {
  return hasBox.value ? props.product.box_price : props.product.piece_price
})

const originalPrice = computed(() => {
  if (hasBox.value) {
    return props.product.base_price * props.product.pieces_per_box
  }
  return props.product.base_price
})

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function handleClick() {
  // Always emit - PosView will handle showing out-of-stock modal if needed
  emit('add', props.product)
}
</script>
