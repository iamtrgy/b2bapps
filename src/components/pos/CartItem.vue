<template>
  <div class="px-4 py-4 border-b last:border-0 hover:bg-muted/30 transition-colors touch-manipulation">
    <!-- Top Row: Image, Name, Remove -->
    <div class="flex gap-4 items-start">
      <!-- Product Image -->
      <div class="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
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
          <p class="text-base font-medium text-foreground leading-relaxed flex-1">{{ item.name }}</p>
          <button
            type="button"
            class="p-2 min-h-[44px] min-w-[44px] -mr-2 -mt-1 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0 touch-manipulation"
            @click="$emit('remove')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="flex items-baseline flex-wrap gap-x-2 gap-y-1 mt-1">
          <span class="text-base font-semibold text-primary">{{ formatPrice(item.price) }}</span>
          <span
            v-if="item.total_discount_percent > 0"
            class="text-sm text-muted-foreground/70 line-through"
          >
            {{ formatPrice(item.base_price) }}
          </span>
          <span class="text-sm text-muted-foreground">/{{ item.unit_type === 'box' ? 'koli' : 'adet' }}</span>
          <span
            v-if="item.total_discount_percent > 0"
            class="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded"
          >
            -{{ Math.round(item.total_discount_percent) }}%
          </span>
        </div>
        <!-- Piece price for boxes -->
        <p v-if="item.unit_type === 'box' && item.pieces_per_box > 1" class="text-sm text-muted-foreground mt-1">
          {{ formatPrice(item.price / item.pieces_per_box) }}/adet ({{ item.pieces_per_box }} adet)
        </p>
      </div>
    </div>

    <!-- Bottom Row: Quantity Controls and Total -->
    <div class="flex items-center justify-between mt-3 ml-[80px]">
      <div class="flex items-center gap-1 bg-muted rounded-lg">
        <button
          type="button"
          class="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-l-lg disabled:opacity-50 transition-colors touch-manipulation"
          :disabled="item.quantity <= 1"
          @click="$emit('update', item.quantity - 1)"
        >
          <Minus class="h-5 w-5" />
        </button>
        <span class="w-12 text-center text-base font-semibold">{{ item.quantity }}</span>
        <button
          type="button"
          class="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-r-lg transition-colors touch-manipulation"
          @click="$emit('update', item.quantity + 1)"
        >
          <Plus class="h-5 w-5" />
        </button>
      </div>

      <span class="text-lg font-bold text-foreground">
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
