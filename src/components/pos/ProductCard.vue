<template>
  <button
    type="button"
    class="bg-card rounded-lg md:rounded-md border overflow-hidden text-left hover:shadow-elevation-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-elevation-1 touch-manipulation"
    :disabled="!product.can_purchase"
    @click="handleClick"
  >
    <!-- Product Image -->
    <div class="relative aspect-square bg-white p-4 md:p-3">
      <img
        v-if="product.image_url"
        :src="product.image_url"
        :alt="product.name"
        class="w-full h-full object-contain"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <ImageIcon class="h-8 w-8 md:h-6 md:w-6 text-muted-foreground/30" />
      </div>

      <!-- Quick View Button -->
      <button
        type="button"
        class="absolute top-1.5 left-1.5 md:top-1 md:left-1 p-1.5 md:p-1 min-h-[32px] min-w-[32px] md:min-h-[24px] md:min-w-[24px] flex items-center justify-center bg-background/90 hover:bg-background rounded-full shadow-sm transition-all z-10 touch-manipulation"
        @click.stop="emit('quickView', product)"
      >
        <Eye class="h-4 w-4 md:h-3 md:w-3 text-muted-foreground" />
      </button>

      <!-- Discount Badge -->
      <div
        v-if="hasDiscount"
        class="absolute top-1.5 right-1.5 md:top-1 md:right-1 bg-destructive text-destructive-foreground text-xs md:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm"
      >
        -{{ discountPercentage }}%
      </div>

      <!-- Stock Status -->
      <div
        v-if="!product.can_purchase"
        class="absolute inset-0 bg-background/80 flex items-center justify-center"
      >
        <span class="text-xs font-medium text-muted-foreground bg-background/90 px-2 py-1 rounded">Stokta Yok</span>
      </div>
    </div>

    <!-- Product Info -->
    <div class="p-2 md:p-1.5">
      <p class="text-[10px] md:text-[9px] text-muted-foreground mb-0.5">{{ product.sku }}</p>
      <h3 class="text-xs md:text-[11px] font-medium text-foreground line-clamp-2 leading-snug min-h-[2rem] md:min-h-[1.75rem]">
        {{ product.name }}
      </h3>

      <!-- Box Price -->
      <div v-if="hasBox" class="mt-1.5 md:mt-1 space-y-0.5">
        <div class="flex items-baseline gap-1 flex-wrap">
          <span class="text-sm md:text-xs font-bold text-primary">{{ formatPrice(product.box_price) }}</span>
          <span class="text-[10px] md:text-[9px] text-muted-foreground">/koli</span>
          <span v-if="hasDiscount" class="text-[10px] md:text-[9px] text-muted-foreground/70 line-through">
            {{ formatPrice(boxOriginalPrice) }}
          </span>
        </div>
        <p class="text-[10px] md:text-[9px] text-muted-foreground">
          {{ formatPrice(product.piece_price) }}/adet
          <span class="text-muted-foreground/60">({{ product.pieces_per_box }})</span>
        </p>
      </div>

      <!-- Piece Price Only -->
      <div v-else class="mt-1.5 md:mt-1">
        <div class="flex items-baseline gap-1">
          <span class="text-sm md:text-xs font-bold text-primary">{{ formatPrice(product.piece_price) }}</span>
          <span class="text-[10px] md:text-[9px] text-muted-foreground">/adet</span>
          <span v-if="hasDiscount" class="text-[10px] md:text-[9px] text-muted-foreground/70 line-through">
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
