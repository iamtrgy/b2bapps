<template>
  <Sheet :open="open" @update:open="$emit('update:open', $event)">
    <SheetContent side="right" class="w-full sm:max-w-md flex flex-col p-0">
      <!-- Header -->
      <SheetHeader class="p-4 md:p-3 border-b">
        <SheetTitle class="text-base md:text-sm">{{ order?.order_number }}</SheetTitle>
        <div class="flex items-center gap-2">
          <Badge variant="secondary" class="text-xs md:text-[10px]">
            {{ formatStatus(order?.status) }}
          </Badge>
          <span class="text-sm md:text-xs text-muted-foreground">
            {{ formatDate(order?.created_at) }}
          </span>
        </div>
      </SheetHeader>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-4 md:p-3 space-y-4 md:space-y-3">
        <!-- Loading State -->
        <div v-if="isLoading" class="py-12 md:py-8 flex items-center justify-center">
          <Loader2 class="h-6 w-6 md:h-5 md:w-5 animate-spin text-muted-foreground" />
        </div>

        <!-- Items -->
        <div v-else class="space-y-2 md:space-y-1.5">
          <h3 class="text-xs md:text-[10px] font-medium text-muted-foreground uppercase">
            {{ UI_TEXT.products }}
          </h3>
          <OrderItemCard
            v-for="(item, index) in order?.items"
            :key="item.id || index"
            :item="item"
          />
        </div>
      </div>

      <!-- Footer with Summary -->
      <div class="border-t p-4 md:p-3 bg-muted/30 pb-[calc(3.5rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]">
        <!-- Items Count -->
        <div class="flex items-center justify-between mb-3 md:mb-2 pb-3 md:pb-2 border-b">
          <span class="text-sm md:text-xs text-muted-foreground">{{ order?.items_count ?? order?.items?.length ?? 0 }} ürün</span>
        </div>

        <!-- Summary Lines -->
        <div class="space-y-2 md:space-y-1.5 mb-4 md:mb-3">
          <div class="flex justify-between text-sm md:text-xs">
            <span class="text-muted-foreground">{{ UI_TEXT.subtotal }}</span>
            <span>{{ formatPrice(order?.subtotal ?? 0) }}</span>
          </div>

          <div v-if="(order?.discount_total ?? 0) > 0" class="flex justify-between text-sm md:text-xs">
            <span class="text-muted-foreground">{{ UI_TEXT.discount }}</span>
            <span class="text-green-600">-{{ formatPrice(order?.discount_total ?? 0) }}</span>
          </div>

          <!-- VAT by rate -->
          <div
            v-for="vat in vatByRate"
            :key="vat.rate"
            class="flex justify-between text-sm md:text-xs"
          >
            <span class="text-muted-foreground">{{ UI_TEXT.vat }} (%{{ vat.rate }})</span>
            <span>{{ formatPrice(vat.amount) }}</span>
          </div>

          <Separator class="my-2 md:my-1.5" />

          <div class="flex justify-between text-base md:text-sm font-bold">
            <span>{{ UI_TEXT.total }}</span>
            <span class="text-primary">{{ formatPrice(order?.total ?? 0) }}</span>
          </div>
        </div>

        <Button variant="outline" class="w-full h-11 md:h-9 text-sm md:text-xs" @click="$emit('update:open', false)">
          {{ UI_TEXT.back }}
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import OrderItemCard from './OrderItemCard.vue'
import { useFormatters } from '@/composables/useFormatters'
import { UI_TEXT } from '@/constants/customers'
import type { Order } from '@/types'

const props = defineProps<{
  open: boolean
  order: Order | null
  isLoading: boolean
}>()

defineEmits<{
  'update:open': [value: boolean]
}>()

const { formatPrice, formatDate, formatStatus } = useFormatters()

// Group VAT by rate for display (using item vat_rate from API)
const vatByRate = computed(() => {
  if (!props.order?.items) return []

  const rateMap = new Map<number, number>()

  props.order.items.forEach(item => {
    if (item.vat_rate > 0) {
      const vatAmount = (item.line_total * item.vat_rate) / (100 + item.vat_rate)
      rateMap.set(item.vat_rate, (rateMap.get(item.vat_rate) ?? 0) + vatAmount)
    }
  })

  return Array.from(rateMap.entries())
    .map(([rate, amount]) => ({ rate, amount }))
    .sort((a, b) => a.rate - b.rate)
})
</script>
