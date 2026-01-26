<template>
  <div class="border-t bg-muted/30 safe-area-bottom">
    <!-- Summary Lines -->
    <div class="p-4 md:p-3 space-y-2">
      <div class="flex justify-between text-sm">
        <span class="text-muted-foreground">Ara Toplam</span>
        <span class="font-medium">{{ formatPrice(subtotal) }}</span>
      </div>
      <div v-if="discount > 0" class="flex justify-between text-sm">
        <span class="text-muted-foreground">İndirim</span>
        <span class="font-medium text-green-600">-{{ formatPrice(discount) }}</span>
      </div>
      <template v-if="vatBreakdown.length > 0">
        <div v-for="vat in vatBreakdown" :key="vat.rate" class="flex justify-between text-sm">
          <span class="text-muted-foreground">KDV (%{{ vat.rate }})</span>
          <span class="font-medium">{{ formatPrice(vat.amount) }}</span>
        </div>
      </template>
    </div>

    <!-- Total & Actions -->
    <div class="p-4 md:p-3 pt-0 space-y-3">
      <!-- Total -->
      <div class="flex items-center justify-between pt-3 border-t">
        <div>
          <span class="text-sm text-muted-foreground">Toplam</span>
          <p class="text-xs text-muted-foreground">
            <span v-if="boxCount > 0">{{ boxCount }} koli</span>
            <span v-if="boxCount > 0 && pieceCount > 0"> · </span>
            <span v-if="pieceCount > 0">{{ pieceCount }} adet</span>
          </p>
        </div>
        <span class="text-xl font-bold">{{ formatPrice(total) }}</span>
      </div>

      <!-- Notes -->
      <Input
        :model-value="notes"
        type="text"
        placeholder="Sipariş notları..."
        class="h-10 md:h-9 text-sm"
        @update:model-value="$emit('update:notes', String($event ?? ''))"
      />

      <!-- Checkout Button -->
      <Button
        :disabled="!canCheckout || isSubmitting"
        class="w-full h-12 rounded-xl text-base font-medium"
        @click="$emit('checkout')"
      >
        <Loader2 v-if="isSubmitting" class="h-5 w-5 mr-2 animate-spin" />
        Sipariş Ver
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
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
