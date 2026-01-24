<template>
  <div class="px-3 py-2 md:px-2 md:py-1.5 border-b last:border-0 hover:bg-muted/30 transition-colors touch-manipulation">
    <!-- Top Row: Image, Name, Remove -->
    <div class="flex gap-3 md:gap-2 items-start">
      <!-- Product Image -->
      <button
        type="button"
        class="w-14 h-14 md:w-10 md:h-10 bg-muted rounded-lg overflow-hidden flex-shrink-0"
        @click="openEditModal"
      >
        <img
          v-if="item.image_url"
          :src="item.image_url"
          :alt="item.name"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full flex items-center justify-center">
          <ImageIcon class="h-6 w-6 md:h-5 md:w-5 text-muted-foreground/30" />
        </div>
      </button>

      <!-- Product Info (clickable) -->
      <button
        type="button"
        class="flex-1 min-w-0 text-left"
        @click="openEditModal"
      >
        <p class="text-sm md:text-xs font-medium text-foreground leading-snug line-clamp-2">{{ item.name }}</p>
        <div class="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5">
          <span class="text-sm md:text-xs font-semibold text-primary">{{ formatPrice(item.price) }}</span>
          <span
            v-if="item.total_discount_percent > 0"
            class="text-xs text-muted-foreground/70 line-through"
          >
            {{ formatPrice(item.base_price) }}
          </span>
          <span class="text-xs text-muted-foreground">/{{ item.unit_type === 'box' ? 'koli' : 'adet' }}</span>
          <span
            v-if="item.total_discount_percent > 0"
            class="bg-destructive text-destructive-foreground text-[10px] md:text-[9px] font-bold px-1.5 py-0.5 rounded"
          >
            -{{ Math.round(item.total_discount_percent) }}%
          </span>
        </div>
        <!-- Piece price for boxes -->
        <p v-if="item.unit_type === 'box' && item.pieces_per_box > 1" class="text-xs text-muted-foreground mt-0.5 hidden md:block">
          {{ formatPrice(item.price / item.pieces_per_box) }}/adet
        </p>
      </button>

      <!-- Remove button -->
      <button
        type="button"
        class="p-1.5 md:p-1 min-h-[36px] min-w-[36px] md:min-h-[28px] md:min-w-[28px] -mr-1 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0 touch-manipulation"
        @click="$emit('remove')"
      >
        <X class="h-4 w-4 md:h-3.5 md:w-3.5" />
      </button>
    </div>

    <!-- Bottom Row: Quantity Controls and Total -->
    <div class="flex items-center justify-between mt-2 md:mt-1 ml-[68px] md:ml-[48px]">
      <div class="flex items-center bg-muted rounded-md">
        <button
          type="button"
          class="p-2 md:p-1 min-h-[32px] min-w-[32px] md:min-h-[24px] md:min-w-[24px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-l-md disabled:opacity-50 transition-colors touch-manipulation"
          :disabled="item.quantity <= 1"
          @click="$emit('update', item.quantity - 1)"
        >
          <Minus class="h-4 w-4 md:h-3 md:w-3" />
        </button>

        <!-- Tap to edit quantity -->
        <button
          type="button"
          class="w-10 md:w-8 h-8 md:h-6 text-center text-sm md:text-xs font-semibold hover:bg-background/50 transition-colors"
          @click="openEditModal"
        >
          {{ item.quantity }}
        </button>

        <button
          type="button"
          class="p-2 md:p-1 min-h-[32px] min-w-[32px] md:min-h-[24px] md:min-w-[24px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-r-md transition-colors touch-manipulation"
          @click="$emit('update', item.quantity + 1)"
        >
          <Plus class="h-4 w-4 md:h-3 md:w-3" />
        </button>
      </div>

      <span class="text-sm md:text-xs font-bold text-foreground">
        {{ formatPrice(item.price * item.quantity) }}
      </span>
    </div>

    <!-- Edit Modal -->
    <Dialog :open="showModal" @update:open="showModal = $event">
      <DialogContent class="sm:max-w-[400px] p-0 gap-0">
        <!-- Header with product info -->
        <div class="flex gap-4 p-4 pr-14 border-b">
          <div class="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            <img
              v-if="item.image_url"
              :src="item.image_url"
              :alt="item.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <ImageIcon class="h-8 w-8 text-muted-foreground/30" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <DialogTitle class="text-base font-semibold leading-snug line-clamp-2">
              {{ item.name }}
            </DialogTitle>
            <div class="flex items-baseline gap-1.5 mt-1">
              <span class="text-lg font-bold text-primary">{{ formatPrice(currentPrice) }}</span>
              <span class="text-sm text-muted-foreground">/{{ sellAsPiece ? 'Adet' : 'Koli' }}</span>
            </div>
            <p v-if="item.pieces_per_box > 1" class="text-xs text-muted-foreground mt-0.5">
              {{ item.pieces_per_box }} Adet/Koli • {{ formatPrice(piecePrice) }}/Adet
            </p>
          </div>
        </div>

        <!-- Broken case section -->
        <div v-if="item.pieces_per_box > 1" class="mx-4 mt-4">
          <!-- Enable broken case checkbox (when not allowed by default) -->
          <div
            v-if="!item.allow_broken_case && !brokenCaseEnabled"
            class="p-3 rounded-lg border-2 border-muted hover:border-muted-foreground/30 cursor-pointer transition-colors"
            @click="brokenCaseEnabled = true"
          >
            <div class="flex items-start gap-3">
              <Checkbox :checked="false" class="mt-0.5" />
              <div>
                <p class="text-sm font-medium">Tekli satışı etkinleştir</p>
                <p class="text-xs text-muted-foreground mt-0.5">
                  Bu kutudan tekli ürün satışı yap
                </p>
              </div>
            </div>
          </div>

          <!-- Box/Piece toggle (when allowed or enabled) -->
          <div v-if="item.allow_broken_case || brokenCaseEnabled" class="space-y-2">
            <p class="text-xs text-muted-foreground">Satış Birimi</p>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="p-3 rounded-lg border-2 text-center transition-colors"
                :class="!sellAsPiece ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'"
                @click="sellAsPiece = false"
              >
                <p class="text-sm font-semibold">KOLİ</p>
                <p class="text-lg font-bold text-primary">{{ formatPrice(item.box_price || item.price) }}</p>
              </button>
              <button
                type="button"
                class="p-3 rounded-lg border-2 text-center transition-colors"
                :class="sellAsPiece ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'"
                @click="sellAsPiece = true"
              >
                <p class="text-sm font-semibold">ADET</p>
                <p class="text-lg font-bold text-primary">{{ formatPrice(item.broken_case_piece_price || piecePrice) }}</p>
              </button>
            </div>
          </div>
        </div>

        <!-- Quantity section -->
        <div class="p-4 space-y-4">
          <p class="text-sm font-medium text-muted-foreground">Miktar</p>

          <!-- Main quantity controls -->
          <div class="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              class="h-12 w-12"
              @click="adjustQuantity(-10)"
            >
              -10
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-12 w-12"
              :disabled="parseInt(editValue) <= 1"
              @click="adjustQuantity(-1)"
            >
              <Minus class="h-5 w-5" />
            </Button>
            <Input
              v-model="editValue"
              type="number"
              min="1"
              inputmode="numeric"
              class="w-20 h-12 text-center text-xl font-bold"
              @keyup.enter="confirmQuantity"
            />
            <Button
              variant="outline"
              size="icon"
              class="h-12 w-12"
              @click="adjustQuantity(1)"
            >
              <Plus class="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-12 w-12"
              @click="adjustQuantity(10)"
            >
              +10
            </Button>
          </div>

          <!-- Quick preset buttons -->
          <div class="flex justify-center gap-2">
            <Button
              v-for="qty in [1, 5, 10, 25, 50, 100]"
              :key="qty"
              :variant="parseInt(editValue) === qty ? 'default' : 'outline'"
              size="sm"
              class="h-9 w-12"
              @click="editValue = String(qty)"
            >
              {{ qty }}
            </Button>
          </div>

          <!-- Line total -->
          <div class="flex items-center justify-between pt-4 border-t">
            <span class="text-sm text-muted-foreground">Satır Toplamı</span>
            <div class="text-right">
              <p class="text-xl font-bold">{{ formatPrice(lineTotal) }}</p>
              <p class="text-xs text-muted-foreground">
                {{ editValue }} {{ sellAsPiece ? 'Adet' : 'Koli' }} × {{ formatPrice(currentPrice) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Footer buttons -->
        <div class="flex items-center gap-3 p-4 border-t bg-muted/30">
          <Button
            variant="ghost"
            class="text-destructive hover:text-destructive hover:bg-destructive/10"
            @click="handleRemove"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            Kaldır
          </Button>
          <Button class="flex-1 h-11" @click="confirmQuantity">
            Miktarı Güncelle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ImageIcon, X, Minus, Plus, Trash2 } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import type { CartItem } from '@/types'

interface Props {
  item: CartItem
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [quantity: number]
  remove: []
  unitTypeChange: [unitType: 'piece' | 'box']
}>()

const showModal = ref(false)
const editValue = ref('')
const sellAsPiece = ref(false)
const brokenCaseEnabled = ref(false)

// Computed prices
const currentPrice = computed(() => {
  if (sellAsPiece.value) {
    return props.item.broken_case_piece_price || props.item.price
  }
  return props.item.box_price || props.item.price
})

const piecePrice = computed(() => {
  if (props.item.broken_case_piece_price) {
    return props.item.broken_case_piece_price
  }
  return (props.item.box_price || props.item.price) / (props.item.pieces_per_box || 1)
})

const lineTotal = computed(() => {
  const qty = parseInt(editValue.value) || 0
  return qty * currentPrice.value
})

// Watch for sell as piece changes to emit unit type change
watch(sellAsPiece, (newVal) => {
  emit('unitTypeChange', newVal ? 'piece' : 'box')
})

function openEditModal() {
  editValue.value = String(props.item.quantity)
  sellAsPiece.value = props.item.unit_type === 'piece'
  showModal.value = true
}

function adjustQuantity(delta: number) {
  const current = parseInt(editValue.value) || 1
  const newQty = Math.max(1, current + delta)
  editValue.value = String(newQty)
}

function confirmQuantity() {
  const newQty = parseInt(editValue.value, 10)
  if (!isNaN(newQty) && newQty >= 1) {
    // Emit unit type change first if changed
    const newUnitType = sellAsPiece.value ? 'piece' : 'box'
    if (newUnitType !== props.item.unit_type) {
      emit('unitTypeChange', newUnitType)
    }
    emit('update', newQty)
  }
  showModal.value = false
}

function handleRemove() {
  showModal.value = false
  emit('remove')
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}
</script>
