<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-md">
      <div class="flex gap-4">
        <div class="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
          <img
            v-if="product?.image_url"
            :src="product.image_url"
            :alt="product.name"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <ImageIcon class="h-8 w-8 text-muted-foreground/30" />
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs text-muted-foreground mb-1">{{ product?.sku }}</p>
          <DialogTitle class="text-base !leading-snug line-clamp-2">{{ product?.name }}</DialogTitle>
        </div>
      </div>

      <Separator />

      <!-- Pricing -->
      <div class="space-y-3">
        <div v-if="product && product.pieces_per_box > 1" class="flex justify-between items-baseline">
          <span class="text-sm text-muted-foreground">Koli Fiyatı</span>
          <div class="text-right">
            <span class="text-lg font-bold text-primary">{{ formatPrice(product.box_price || 0) }}</span>
            <span v-if="product.total_discount_percent > 0" class="text-sm text-muted-foreground line-through ml-2">
              {{ formatPrice(product.base_price * product.pieces_per_box) }}
            </span>
          </div>
        </div>
        <div class="flex justify-between items-baseline">
          <span class="text-sm text-muted-foreground">Adet Fiyatı</span>
          <div class="text-right">
            <span class="text-base font-semibold">{{ formatPrice(product?.piece_price || 0) }}</span>
            <span v-if="product && product.total_discount_percent > 0" class="text-sm text-muted-foreground line-through ml-2">
              {{ formatPrice(product.base_price) }}
            </span>
          </div>
        </div>
        <div v-if="product && product.allow_broken_case && product.broken_case_piece_price !== product.piece_price" class="flex justify-between items-baseline">
          <span class="text-sm text-muted-foreground">Tek Adet Fiyatı</span>
          <span class="text-base font-semibold text-amber-600">{{ formatPrice(product.broken_case_piece_price) }}</span>
        </div>
        <div v-if="product && product.pieces_per_box > 1" class="flex justify-between text-sm">
          <span class="text-muted-foreground">Koli İçeriği</span>
          <span>{{ product.pieces_per_box }} adet</span>
        </div>
        <div class="flex justify-between text-sm items-center">
          <span class="text-muted-foreground">Stok Durumu</span>
          <div class="flex items-center gap-2">
            <span
              v-if="product?.availability_status === 'backorder'"
              class="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
            >
              Stoğa Bağlı
            </span>
            <span
              v-else-if="product?.availability_status === 'preorder'"
              class="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
            >
              Ön Sipariş
            </span>
            <span
              v-else
              :class="product?.availability_status === 'in_stock' || product?.availability_status === 'low_stock' ? 'text-green-600' : 'text-destructive'"
            >
              {{ product?.availability_status === 'in_stock' || product?.availability_status === 'low_stock' ? 'Stokta Var' : 'Stokta Yok' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Purchase History Section -->
      <div class="p-4 rounded-xl border bg-muted/30">
        <div class="flex items-center gap-2 mb-3">
          <Clock class="h-4 w-4 text-muted-foreground" />
          <span class="text-sm font-medium">Son Alımlar</span>
        </div>
        <div v-if="isLoadingHistory" class="flex justify-center py-2">
          <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
        <div v-else-if="history.length === 0" class="text-xs text-muted-foreground text-center py-2">
          Daha önce alım yapılmamış
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="(purchase, index) in history.slice(0, 3)"
            :key="index"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-muted-foreground">{{ purchase.date }}</span>
            <span>{{ purchase.quantity }} {{ purchase.unit_type === 'box' ? 'koli' : 'adet' }}</span>
            <div class="text-right">
              <span class="font-medium text-primary">&euro;{{ purchase.line_total_formatted }}</span>
              <span class="text-[10px] text-muted-foreground ml-1">(&euro;{{ purchase.per_piece_price_formatted }}/ad)</span>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="pt-2">
        <Button
          class="w-full"
          :disabled="!product?.can_purchase"
          @click="$emit('addToCart')"
        >
          Sepete Ekle
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ImageIcon, Clock, Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { useFormatters } from '@/composables/useFormatters'
import type { Product } from '@/types'

const { formatPrice } = useFormatters()
const open = defineModel<boolean>('open', { required: true })

defineProps<{
  product: Product | null
  history: Array<{
    date: string
    quantity: number
    unit_type: 'box' | 'piece'
    line_total_formatted: string
    per_piece_price_formatted: string
  }>
  isLoadingHistory: boolean
}>()

defineEmits<{
  addToCart: []
}>()
</script>
