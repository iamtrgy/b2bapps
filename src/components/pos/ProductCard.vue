<template>
  <button
    type="button"
    class="bg-card rounded-xl border overflow-hidden text-left hover:shadow-elevation-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-elevation-1 touch-manipulation"
    :disabled="!product.can_purchase"
    @click="handleClick"
  >
    <!-- Product Image -->
    <div class="relative aspect-square bg-muted">
      <img
        v-if="product.image_url"
        :src="product.image_url"
        :alt="product.name"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <ImageIcon class="h-12 w-12 text-muted-foreground/30" />
      </div>

      <!-- Quick View Button -->
      <button
        type="button"
        class="absolute top-2 left-2 p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center bg-background/90 hover:bg-background rounded-full shadow-elevation-2 hover:shadow-elevation-3 transition-all z-10 touch-manipulation"
        @click.stop="emit('quickView', product)"
      >
        <Eye class="h-5 w-5 text-muted-foreground" />
      </button>

      <!-- Discount Badge -->
      <div
        v-if="hasDiscount"
        class="absolute top-2 right-2 bg-destructive text-destructive-foreground text-sm font-bold px-2.5 py-1.5 rounded-lg shadow-sm"
      >
        -{{ discountPercentage }}%
      </div>

      <!-- Stock Status -->
      <div
        v-if="!product.can_purchase"
        class="absolute inset-0 bg-background/80 flex items-center justify-center"
      >
        <span class="text-sm font-medium text-muted-foreground bg-background/90 px-4 py-2 rounded-lg">Stokta Yok</span>
      </div>
    </div>

    <!-- Product Info -->
    <div class="p-4">
      <p class="text-sm text-muted-foreground mb-1">{{ product.sku }}</p>
      <h3 class="text-base font-medium text-foreground line-clamp-2 leading-relaxed min-h-[3rem]">
        {{ product.name }}
      </h3>

      <!-- Box Price -->
      <div v-if="hasBox" class="mt-3 space-y-1.5">
        <div class="flex items-baseline gap-2">
          <span class="text-lg font-bold text-primary">{{ formatPrice(product.box_price) }}</span>
          <span class="text-sm text-muted-foreground">/koli</span>
          <span v-if="hasDiscount" class="text-sm text-muted-foreground/70 line-through">
            {{ formatPrice(boxOriginalPrice) }}
          </span>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ formatPrice(product.piece_price) }}/adet
          <span class="text-muted-foreground/60">({{ product.pieces_per_box }} adet)</span>
        </p>
        <!-- Broken case price if different -->
        <p v-if="product.allow_broken_case && product.broken_case_piece_price !== product.piece_price" class="text-sm text-amber-600">
          Tek adet: {{ formatPrice(product.broken_case_piece_price) }}
        </p>
      </div>

      <!-- Piece Price Only -->
      <div v-else class="mt-3">
        <div class="flex items-baseline gap-2">
          <span class="text-lg font-bold text-primary">{{ formatPrice(product.piece_price) }}</span>
          <span class="text-sm text-muted-foreground">/adet</span>
          <span v-if="hasDiscount" class="text-sm text-muted-foreground/70 line-through">
            {{ formatPrice(product.base_price) }}
          </span>
        </div>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ImageIcon, Eye } from 'lucide-vue-next'
import type { Product } from '@/types'

interface Props {
  product: Product
}

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

const boxOriginalPrice = computed(() => {
  return props.product.base_price * props.product.pieces_per_box
})

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function handleClick() {
  if (props.product.can_purchase) {
    emit('add', props.product)
  }
}
</script>
