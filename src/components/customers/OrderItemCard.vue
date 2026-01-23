<template>
  <div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
    <!-- Product Image -->
    <div class="h-12 w-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
      <img
        v-if="item.product?.image_url"
        :src="item.product.image_url"
        :alt="productName"
        class="h-full w-full object-cover"
      />
      <div v-else class="h-full w-full flex items-center justify-center">
        <ImageIcon class="h-5 w-5 text-muted-foreground/50" />
      </div>
    </div>

    <!-- Product Info -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium truncate">{{ productName }}</p>

      <!-- Price and Unit -->
      <div class="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
        <span class="text-sm font-semibold text-primary">
          {{ formatPrice(item.unit_price) }}
        </span>
        <span v-if="hasDiscount" class="text-xs text-muted-foreground/70 line-through">
          {{ formatPrice(item.original_price) }}
        </span>
        <span class="text-xs text-muted-foreground">/{{ unitLabel }}</span>
        <span
          v-if="hasDiscount"
          class="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded"
        >
          -{{ discountPercentage }}%
        </span>
      </div>

      <!-- Quantity and VAT -->
      <div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
        <span>{{ item.quantity_ordered }} {{ unitLabel }}</span>
        <span>•</span>
        <span>{{ UI_TEXT.vatRate }} %{{ item.vat_rate }}</span>
      </div>
    </div>

    <!-- Line Total -->
    <span class="text-sm font-semibold flex-shrink-0">
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

const hasDiscount = computed(() =>
  props.item.discount && props.item.discount > 0
)

const discountPercentage = computed(() => {
  if (!props.item.discount || props.item.original_price === 0) return 0
  return Math.round((props.item.discount / props.item.original_price) * 100)
})
</script>
