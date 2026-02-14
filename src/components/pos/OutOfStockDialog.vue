<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <div class="mx-auto w-14 h-14 bg-amber-100 dark:bg-amber-950 rounded-full flex items-center justify-center mb-3">
          <AlertTriangle class="h-7 w-7 text-amber-600" />
        </div>
        <DialogTitle class="text-center">Stokta Yok</DialogTitle>
        <p class="text-sm text-muted-foreground text-center">
          {{ product?.name }}
        </p>
      </DialogHeader>

      <p class="text-sm text-muted-foreground text-center">
        Bu ürün şu anda stokta yok. Sepete eklemek için stoğa bağlı sipariş veya ön sipariş seçeneğini etkinleştirebilirsiniz.
      </p>

      <div class="space-y-2 mt-4">
        <button
          type="button"
          class="w-full flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
          :disabled="isUpdating"
          @click="$emit('setAvailability', 'backorder')"
        >
          <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Clock class="h-5 w-5 text-muted-foreground" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">Stoğa Bağlı</p>
            <p class="text-xs text-muted-foreground">Şimdi sipariş kabul et, stok gelince gönder</p>
          </div>
          <ChevronRight class="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </button>

        <button
          type="button"
          class="w-full flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
          :disabled="isUpdating"
          @click="$emit('setAvailability', 'preorder')"
        >
          <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Package class="h-5 w-5 text-muted-foreground" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">Ön Sipariş</p>
            <p class="text-xs text-muted-foreground">Yakında çıkacak ürün için sipariş kabul et</p>
          </div>
          <ChevronRight class="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </button>
      </div>

      <div class="pt-2">
        <Button
          variant="ghost"
          class="w-full"
          :disabled="isUpdating"
          @click="open = false"
        >
          İptal
        </Button>
      </div>

      <div
        v-if="isUpdating"
        class="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg"
      >
        <Loader2 class="h-6 w-6 animate-spin" />
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { AlertTriangle, Clock, Package, ChevronRight, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Product } from '@/types'

const open = defineModel<boolean>('open', { required: true })

defineProps<{
  product: Product | null
  isUpdating: boolean
}>()

defineEmits<{
  setAvailability: [type: 'backorder' | 'preorder']
}>()
</script>
