<template>
  <div class="border-t p-4 md:p-3 safe-area-bottom">
    <!-- Items Count -->
    <div class="flex items-center justify-between mb-3 md:mb-2 pb-3 md:pb-2 border-b">
      <span class="text-sm md:text-xs text-muted-foreground">{{ itemCount }} ürün</span>
      <div class="text-sm md:text-xs text-muted-foreground">
        <span v-if="boxCount > 0">{{ boxCount }} koli</span>
        <span v-if="boxCount > 0 && pieceCount > 0"> · </span>
        <span v-if="pieceCount > 0">{{ pieceCount }} adet</span>
      </div>
    </div>

    <!-- Summary Lines -->
    <div class="space-y-2.5 md:space-y-1.5 mb-4 md:mb-3">
      <div class="flex justify-between text-base md:text-sm">
        <span class="text-muted-foreground">Ara Toplam</span>
        <span>{{ formatPrice(subtotal) }}</span>
      </div>
      <div v-if="discount > 0" class="flex justify-between text-base md:text-sm">
        <span class="text-muted-foreground">İndirim</span>
        <span class="text-green-600">-{{ formatPrice(discount) }}</span>
      </div>
      <template v-if="vatBreakdown.length > 0">
        <div v-for="vat in vatBreakdown" :key="vat.rate" class="flex justify-between text-base md:text-sm">
          <span class="text-muted-foreground">KDV (%{{ vat.rate }})</span>
          <span>{{ formatPrice(vat.amount) }}</span>
        </div>
      </template>
      <Separator class="my-2 md:my-1.5" />
      <div class="flex justify-between text-lg md:text-base font-bold">
        <span>Toplam</span>
        <span class="text-primary">{{ formatPrice(total) }}</span>
      </div>
    </div>

    <!-- Notes -->
    <div class="mb-4 md:mb-3">
      <Input
        :model-value="notes"
        type="text"
        placeholder="Sipariş notları..."
        class="h-10 md:h-8 text-sm md:text-xs"
        @update:model-value="$emit('update:notes', String($event ?? ''))"
      />
    </div>

    <!-- Checkout Button -->
    <Button
      variant="primary"
      size="lg"
      :disabled="!canCheckout || isSubmitting"
      class="w-full md:h-9 md:text-sm"
      @click="$emit('checkout')"
    >
      <Loader2 v-if="isSubmitting" class="h-5 w-5 md:h-4 md:w-4 mr-2 animate-spin" />
      Sipariş Ver
    </Button>
  </div>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'

interface VatBreakdownItem {
  rate: number
  amount: number
}

interface Props {
  subtotal: number
  discount: number
  vatTotal: number
  vatBreakdown: VatBreakdownItem[]
  total: number
  itemCount: number
  boxCount: number
  pieceCount: number
  notes?: string
  canCheckout?: boolean
  isSubmitting?: boolean
}

withDefaults(defineProps<Props>(), {
  notes: '',
  canCheckout: true,
  isSubmitting: false,
  vatTotal: 0,
  vatBreakdown: () => [],
  itemCount: 0,
  boxCount: 0,
  pieceCount: 0,
})

defineEmits<{
  checkout: []
  'update:notes': [value: string]
}>()

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}
</script>
