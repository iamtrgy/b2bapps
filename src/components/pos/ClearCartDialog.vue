<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-sm text-center">
      <div class="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
        <Trash2 class="h-10 w-10 text-destructive" />
      </div>

      <DialogHeader>
        <DialogTitle>Sepeti Temizle</DialogTitle>
        <DialogDescription>
          Sepetinizdeki {{ itemCount }} ürün silinecek. Bu işlem geri alınamaz.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter class="flex-col gap-2 sm:flex-col">
        <Button variant="destructive" class="w-full" @click="$emit('confirm')">Sepeti Temizle</Button>
        <Button variant="outline" class="w-full" @click="open = false">Vazgeç</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
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
  itemCount: number
}>()

defineEmits<{
  confirm: []
}>()
</script>
