<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>İade Edilecek Sipariş</DialogTitle>
        <DialogDescription>
          Hangi siparişi iade etmek istiyorsunuz?
        </DialogDescription>
      </DialogHeader>

      <div class="max-h-80 overflow-y-auto space-y-2">
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="orders.length === 0" class="py-8 text-center">
          <RotateCcw class="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p class="text-sm text-muted-foreground">İade edilebilir sipariş bulunamadı</p>
        </div>

        <template v-else>
          <button
            v-for="order in orders"
            :key="order.id"
            type="button"
            class="w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors"
            :class="order.already_returned
              ? 'opacity-50 cursor-not-allowed bg-muted'
              : 'bg-card hover:bg-accent'"
            :disabled="order.already_returned"
            @click="!order.already_returned && $emit('select', order)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-medium">{{ order.order_number }}</p>
                <Badge
                  v-if="order.already_returned"
                  variant="secondary"
                  class="text-[10px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                >
                  Tamamı İade Edildi
                </Badge>
                <Badge
                  v-else-if="order.items.some(i => (i.quantity_returnable ?? i.quantity_ordered) < i.quantity_ordered)"
                  variant="secondary"
                  class="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                >
                  Kısmi İade
                </Badge>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                {{ formatDate(order.created_at) }} · {{ order.items.length }} ürün
              </p>
            </div>
            <span class="text-sm font-semibold ml-3">{{ formatPrice(order.total_amount) }}</span>
          </button>
        </template>
      </div>

      <DialogFooter class="flex-col gap-2 sm:flex-col">
        <Button
          variant="outline"
          class="w-full"
          @click="$emit('skip')"
        >
          Atla (ürünleri manuel ekle)
        </Button>
        <Button
          variant="ghost"
          class="w-full"
          @click="open = false"
        >
          Vazgeç
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Loader2, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useFormatters } from '@/composables/useFormatters'
import type { ReturnableOrder } from '@/types'

const { formatPrice, formatDate } = useFormatters()
const open = defineModel<boolean>('open', { required: true })

defineProps<{
  orders: ReturnableOrder[]
  isLoading: boolean
}>()

defineEmits<{
  select: [order: ReturnableOrder]
  skip: []
}>()
</script>
