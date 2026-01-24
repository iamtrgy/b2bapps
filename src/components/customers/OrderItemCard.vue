<template>
  <div class="flex items-start gap-3 md:gap-2 p-3 md:p-2.5 rounded-lg bg-muted/50">
    <!-- Product Image -->
    <div class="w-14 h-14 md:w-10 md:h-10 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
      <img
        v-if="item.product?.image_url"
        :src="item.product.image_url"
        :alt="productName"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <ImageIcon class="h-6 w-6 md:h-5 md:w-5 text-muted-foreground/30" />
      </div>
    </div>

    <!-- Product Info -->
    <div class="flex-1 min-w-0">
      <p class="text-sm md:text-xs font-medium truncate">{{ productName }}</p>

      <!-- Price and Unit -->
      <div class="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5">
        <span class="text-sm md:text-xs font-semibold text-primary">
          {{ formatPrice(item.unit_price) }}
        </span>
        <span v-if="hasDiscount" class="text-xs md:text-[10px] text-muted-foreground/70 line-through">
          {{ formatPrice(item.original_price) }}
        </span>
        <span class="text-xs md:text-[10px] text-muted-foreground">/{{ unitLabel }}</span>
        <span
          v-if="hasDiscount"
          class="bg-destructive text-destructive-foreground text-[10px] md:text-[9px] font-bold px-1.5 py-0.5 rounded"
        >
          -{{ discountPercentage }}%
        </span>
      </div>

      <!-- Piece price for boxes -->
      <p v-if="item.unit_type === 'box' && piecesPerBox > 1" class="text-xs md:text-[10px] text-muted-foreground mt-0.5">
        {{ formatPrice(item.unit_price / piecesPerBox) }}/adet
      </p>

      <!-- Quantity -->
      <div class="flex items-center justify-between mt-1">
        <span class="text-xs md:text-[10px] text-muted-foreground">
          {{ item.quantity_ordered }} {{ unitLabel }}
          <template v-if="item.unit_type === 'box' && piecesPerBox > 1">
            ({{ item.quantity_ordered * piecesPerBox }} adet)
          </template>
        </span>
        <span class="text-sm md:text-xs font-bold text-foreground">{{ formatPrice(item.line_total) }}</span>
      </div>
    </div>

    <!-- Line Total -->
    <span class="text-sm md:text-xs font-semibold flex-shrink-0">
      {{ formatPrice(item.line_total) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ImageIcon } from 'lucide-vue-next'
import { useFormatters } from '@/composables/useFormatters'
import { UI_TEXT } from '@/constants/customers'
import type { OrderItem } from '@/types'

const props = defineProps<{
  item: OrderItem
}>()

const { formatPrice } = useFormatters()

const productName = computed(() => props.item.product?.name || UI_TEXT.product)

const unitLabel = computed(() =>
  props.item.unit_type === 'box' ? UI_TEXT.box : UI_TEXT.piece
)

const piecesPerBox = computed(() =>
  props.item.pieces_per_box || (props.item.product as any)?.pieces_per_box || 1
)

const hasDiscount = computed(() =>
  props.item.discount && props.item.discount > 0
)

const discountPercentage = computed(() => {
  if (!props.item.discount || props.item.original_price === 0) return 0
  return Math.round((props.item.discount / props.item.original_price) * 100)
})
</script>
