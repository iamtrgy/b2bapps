<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-sm text-center">
      <div class="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
        :class="isReturnMode ? 'bg-red-100' : 'bg-primary/10'"
      >
        <ShoppingCart class="h-8 w-8" :class="isReturnMode ? 'text-red-600' : 'text-primary'" />
      </div>

      <DialogHeader>
        <DialogTitle>{{ isEditMode ? 'Siparişi Güncelle' : (isReturnMode ? 'İade Onayla' : 'Sipariş Onayla') }}</DialogTitle>
        <DialogDescription>
          {{ itemCount }} ürün · {{ isReturnMode ? `-${formatPrice(total)}` : formatPrice(total) }}
        </DialogDescription>
      </DialogHeader>

      <DialogFooter class="flex-col gap-2 sm:flex-col">
        <Button
          :variant="isReturnMode ? 'destructive' : 'default'"
          class="w-full"
          @click="$emit('confirm')"
        >
          {{ isEditMode ? 'Güncelle' : (isReturnMode ? 'İade Oluştur' : 'Onayla') }}
        </Button>
        <Button variant="outline" class="w-full" @click="open = false">Vazgeç</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ShoppingCart } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useFormatters } from '@/composables/useFormatters'

const { formatPrice } = useFormatters()
const open = defineModel<boolean>('open', { required: true })

defineProps<{
  isEditMode: boolean
  isReturnMode: boolean
  itemCount: number
  total: number
}>()

defineEmits<{
  confirm: []
}>()
</script>
