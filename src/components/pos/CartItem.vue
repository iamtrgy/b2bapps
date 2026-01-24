<template>
  <div class="px-3 py-2 md:px-2 md:py-1.5 border-b last:border-0 hover:bg-muted/30 transition-colors touch-manipulation">
    <!-- Top Row: Image, Name, Remove -->
    <div class="flex gap-3 md:gap-2 items-start">
      <!-- Product Image -->
      <div class="w-14 h-14 md:w-10 md:h-10 bg-muted rounded-lg overflow-hidden flex-shrink-0">
        <img
          v-if="item.image_url"
          :src="item.image_url"
          :alt="item.name"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full flex items-center justify-center">
          <ImageIcon class="h-6 w-6 text-muted-foreground/30" />
        </div>
      </div>

      <!-- Product Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start gap-2">
          <p class="text-sm md:text-xs font-medium text-foreground leading-snug flex-1 line-clamp-2">{{ item.name }}</p>
          <button
            type="button"
            class="p-1.5 md:p-1 min-h-[36px] min-w-[36px] md:min-h-[28px] md:min-w-[28px] -mr-1 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0 touch-manipulation"
            @click="$emit('remove')"
          >
            <X class="h-4 w-4 md:h-3.5 md:w-3.5" />
          </button>
        </div>
        <div class="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5">
          <span class="text-sm md:text-xs font-semibold text-primary">{{ formatPrice(item.price) }}</span>
          <span
            v-if="item.total_discount_percent > 0"
            class="text-xs text-muted-foreground/70 line-through"
          >
            {{ formatPrice(item.base_price) }}
          </span>
          <span class="text-xs text-muted-foreground">/{{ item.unit_type === 'box' ? 'koli' : 'adet' }}</span>
          <span
            v-if="item.total_discount_percent > 0"
            class="bg-destructive text-destructive-foreground text-[10px] md:text-[9px] font-bold px-1.5 py-0.5 rounded"
          >
            -{{ Math.round(item.total_discount_percent) }}%
          </span>
        </div>
        <!-- Piece price for boxes -->
        <p v-if="item.unit_type === 'box' && item.pieces_per_box > 1" class="text-xs text-muted-foreground mt-0.5 hidden md:block">
          {{ formatPrice(item.price / item.pieces_per_box) }}/adet
        </p>
      </div>
    </div>

    <!-- Bottom Row: Quantity Controls and Total -->
    <div class="flex items-center justify-between mt-2 md:mt-1 ml-[68px] md:ml-[48px]">
      <div class="flex items-center bg-muted rounded-md">
        <button
          type="button"
          class="p-2 md:p-1 min-h-[32px] min-w-[32px] md:min-h-[24px] md:min-w-[24px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-l-md disabled:opacity-50 transition-colors touch-manipulation"
          :disabled="item.quantity <= 1"
          @click="$emit('update', item.quantity - 1)"
        >
          <Minus class="h-4 w-4 md:h-3 md:w-3" />
        </button>
        <span class="w-8 md:w-6 text-center text-sm md:text-xs font-semibold">{{ item.quantity }}</span>
        <button
          type="button"
          class="p-2 md:p-1 min-h-[32px] min-w-[32px] md:min-h-[24px] md:min-w-[24px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-r-md transition-colors touch-manipulation"
          @click="$emit('update', item.quantity + 1)"
        >
          <Plus class="h-4 w-4 md:h-3 md:w-3" />
        </button>
      </div>

      <span class="text-sm md:text-xs font-bold text-foreground">
        {{ formatPrice(item.price * item.quantity) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ImageIcon, X, Minus, Plus } from 'lucide-vue-next'
import type { CartItem } from '@/types'

interface Props {
  item: CartItem
}

defineProps<Props>()

defineEmits<{
  update: [quantity: number]
  remove: []
}>()

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}
</script>
