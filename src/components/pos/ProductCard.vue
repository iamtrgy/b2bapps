<template>
  <button
    type="button"
    class="bg-card rounded-xl overflow-hidden transition-all hover:shadow-md active:scale-[0.98] group text-left w-full"
    :class="cartQuantity > 0 ? 'ring-2 ring-primary/40' : ''"
    @click="handleClick"
  >
    <!-- Product Image (online only) -->
    <div v-if="isOnline" class="relative aspect-[4/3] bg-white p-3">
      <img
        v-if="product.image_url"
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
        class="absolute top-2 right-2 p-1.5 bg-black/5 hover:bg-black/10 rounded-lg opacity-60 group-hover:opacity-100 transition-opacity"
        @click.stop="emit('quickView', product)"
      >
        <Info class="h-4 w-4 text-muted-foreground" />
      </button>

      <!-- Out of Stock Overlay -->
      <div
        v-if="!product.can_purchase"
        class="absolute inset-0 bg-black/40 flex items-center justify-center"
      >
        <span class="text-xs font-semibold text-red-700 bg-white/90 px-2.5 py-1 rounded-md shadow-sm">
          Stokta Yok
        </span>
      </div>

      <!-- Cart quantity badge (top-right, below info button) -->
      <div
        v-if="cartQuantity > 0"
        class="absolute bottom-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm"
      >
        {{ cartQuantity }} {{ cartUnitLabel }}
      </div>

      <!-- Badges Container (top-left) -->
      <div class="absolute top-2 left-2 flex flex-col gap-1">
        <div
          v-if="hasDiscount"
          class="bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md"
        >
          -{{ discountPercentage }}%
        </div>
        <div
          v-if="product.allow_backorder && product.availability_status === 'backorder'"
          class="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md"
        >
          Stoğa Bağlı
        </div>
        <div
          v-if="product.is_preorder && product.availability_status === 'preorder'"
          class="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md"
        >
          Ön Sipariş
        </div>
      </div>
    </div>

    <!-- Offline: compact header with initial + SKU + badges -->
    <div v-else class="relative px-2.5 pt-2.5">
      <div class="flex items-center gap-2">
        <div class="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <span class="text-sm font-bold text-muted-foreground">{{ product.name.charAt(0) }}</span>
        </div>
        <span class="text-[10px] text-muted-foreground font-mono truncate">{{ product.sku }}</span>
        <div class="flex gap-1 ml-auto">
          <div v-if="cartQuantity > 0" class="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            {{ cartQuantity }} {{ cartUnitLabel }}
          </div>
          <div v-if="hasDiscount" class="bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{{ discountPercentage }}%
          </div>
          <div v-if="!product.can_purchase" class="bg-red-100 text-red-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
            Stokta Yok
          </div>
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
import { useCartStore } from '@/stores/cart'

interface Props {
  product: Product
}

const { isOnline } = storeToRefs(useOfflineStore())
const cartStore = useCartStore()

const props = defineProps<Props>()

const emit = defineEmits<{
  add: [product: Product]
  quickView: [product: Product]
}>()

const cartItem = computed(() => cartStore.items.find(i => i.product_id === props.product.id))
const cartQuantity = computed(() => cartItem.value?.quantity ?? 0)
const cartUnitLabel = computed(() => cartItem.value?.unit_type === 'piece' ? 'adet' : 'koli')

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
