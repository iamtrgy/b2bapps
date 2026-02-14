<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-sm text-center">
      <div
        class="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
        :class="savedOffline ? 'bg-amber-100' : (isReturn ? 'bg-red-100' : 'bg-green-100')"
      >
        <CloudOff v-if="savedOffline" class="h-10 w-10 text-amber-600" />
        <RotateCcw v-else-if="isReturn" class="h-10 w-10 text-red-600" />
        <CheckCircle v-else class="h-10 w-10 text-green-600" />
      </div>

      <DialogHeader>
        <DialogTitle>{{ savedOffline ? 'Sipariş Kaydedildi!' : (isUpdate ? 'Sipariş Güncellendi!' : (isReturn ? 'İade Oluşturuldu!' : 'Sipariş Verildi!')) }}</DialogTitle>
        <DialogDescription>
          <template v-if="savedOffline">
            Sipariş çevrimdışı olarak kaydedildi. İnternet bağlantısı sağlandığında otomatik olarak gönderilecek.
          </template>
          <template v-else-if="isReturn">
            İade <span class="font-semibold text-foreground">{{ orderNumber }}</span> başarıyla oluşturuldu
          </template>
          <template v-else>
            Sipariş <span class="font-semibold text-foreground">{{ orderNumber }}</span> başarıyla {{ isUpdate ? 'güncellendi' : 'oluşturuldu' }}
          </template>
        </DialogDescription>
      </DialogHeader>

      <DialogFooter class="flex-col gap-2 sm:flex-col">
        <Button class="w-full" @click="$emit('close')">Alışverişe Devam Et</Button>
        <Button v-if="!savedOffline" variant="outline" class="w-full" @click="$emit('viewOrder')">Siparişi Görüntüle</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { CheckCircle, CloudOff, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const open = defineModel<boolean>('open', { required: true })

defineProps<{
  orderNumber: string
  savedOffline: boolean
  isUpdate: boolean
  isReturn: boolean
}>()

defineEmits<{
  close: []
  viewOrder: []
}>()
</script>
