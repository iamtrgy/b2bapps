<template>
  <div>
    <button
      type="button"
      class="flex items-start gap-3 py-4 border-b last:border-0 w-full text-left hover:bg-muted/50 -mx-3 px-3 transition-colors"
      @click="openEditModal"
    >
      <!-- Product Image -->
      <div class="w-14 h-14 bg-white rounded-lg overflow-hidden flex-shrink-0 border">
        <img
          v-if="item.image_url"
          :src="item.image_url"
          :alt="item.name"
          class="w-full h-full object-contain p-1"
        />
        <div v-else class="w-full h-full flex items-center justify-center">
          <ImageIcon class="h-5 w-5 text-muted-foreground/30" />
        </div>
      </div>

      <!-- Product Info -->
      <div class="flex-1 min-w-0">
        <!-- Name & Badges -->
        <div class="flex items-center gap-1.5">
          <h4 class="text-sm font-semibold text-foreground line-clamp-1">{{ item.name }}</h4>
          <!-- Backorder Badge -->
          <span
            v-if="item.allow_backorder && item.availability_status === 'backorder'"
            class="bg-amber-500 text-white text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0"
          >
            Stoğa Bağlı
          </span>
          <!-- Preorder Badge -->
          <span
            v-if="item.is_preorder && item.availability_status === 'preorder'"
            class="bg-blue-500 text-white text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0"
          >
            Ön Sipariş
          </span>
        </div>

        <!-- Price & Quantity Row -->
        <div class="flex items-center gap-2 mt-1">
          <span class="text-sm font-bold text-foreground">{{ formatPrice(item.price) }}</span>
          <span v-if="item.total_discount_percent > 0" class="text-xs text-muted-foreground line-through">
            {{ formatPrice(item.base_price * (item.unit_type === 'box' ? item.pieces_per_box : 1)) }}
          </span>
          <span
            v-if="item.total_discount_percent > 0"
            class="bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
          >
            -{{ Math.round(item.total_discount_percent) }}%
          </span>
          <span class="text-sm text-muted-foreground ml-auto">× {{ item.quantity }}</span>
        </div>

        <!-- Unit Info -->
        <div class="flex items-center gap-1.5 mt-0.5">
          <span v-if="item.unit_type === 'piece'" class="bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
            Tekli Adet
          </span>
          <span v-else class="text-xs text-muted-foreground">
            Koli
            <template v-if="item.pieces_per_box > 1">
              • {{ item.pieces_per_box }} adet/koli
            </template>
          </span>
        </div>
      </div>
    </button>

    <!-- Edit Modal -->
    <Dialog :open="showModal" @update:open="showModal = $event">
      <DialogContent class="sm:max-w-[400px] p-0 gap-0">
        <!-- Header with product info -->
        <div class="flex gap-4 p-5 pr-14 border-b">
          <div class="w-20 h-20 bg-white rounded-xl overflow-hidden flex-shrink-0 border">
            <img
              v-if="item.image_url"
              :src="item.image_url"
              :alt="item.name"
              class="w-full h-full object-contain p-2"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <ImageIcon class="h-8 w-8 text-muted-foreground/30" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <DialogTitle class="text-base font-semibold leading-snug line-clamp-2">
              {{ item.name }}
            </DialogTitle>
            <div class="flex items-baseline gap-1.5 mt-2">
              <span class="text-xl font-bold text-primary">{{ formatPrice(currentPrice) }}</span>
              <span class="text-sm text-muted-foreground">/{{ sellAsPiece ? 'Adet' : 'Koli' }}</span>
            </div>
            <p v-if="item.pieces_per_box > 1" class="text-xs text-muted-foreground mt-1">
              {{ item.pieces_per_box }} Adet/Koli • {{ formatPrice(piecePrice) }}/Adet
            </p>
          </div>
        </div>

        <!-- Broken case section -->
        <div v-if="item.pieces_per_box > 1" class="mx-5 mt-5">
          <!-- Enable broken case checkbox (when not allowed by default) -->
          <div
            v-if="!item.allow_broken_case && !brokenCaseEnabled"
            class="p-4 rounded-xl border-2 border-muted hover:border-primary/30 cursor-pointer transition-colors"
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
            <p class="text-xs text-muted-foreground font-medium">Satış Birimi</p>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                class="p-4 rounded-xl border-2 text-center transition-colors"
                :class="!sellAsPiece ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'"
                @click="sellAsPiece = false"
              >
                <p class="text-sm font-semibold">KOLİ</p>
                <p class="text-lg font-bold text-primary mt-1">{{ formatPrice(item.box_price || item.price) }}</p>
              </button>
              <button
                type="button"
                class="p-4 rounded-xl border-2 text-center transition-colors"
                :class="sellAsPiece ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'"
                @click="sellAsPiece = true"
              >
                <p class="text-sm font-semibold">ADET</p>
                <p class="text-lg font-bold text-primary mt-1">{{ formatPrice(item.broken_case_piece_price || piecePrice) }}</p>
              </button>
            </div>
          </div>
        </div>

        <!-- Quantity section -->
        <div class="p-5 space-y-4">
          <p class="text-sm font-medium text-muted-foreground">Miktar</p>

          <!-- Main quantity controls -->
          <div class="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              class="h-12 w-12 rounded-xl"
              @click="adjustQuantity(-10)"
            >
              -10
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-12 w-12 rounded-xl"
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
              class="w-20 h-12 text-center text-xl font-bold rounded-xl"
              @keyup.enter="confirmQuantity"
            />
            <Button
              variant="outline"
              size="icon"
              class="h-12 w-12 rounded-xl"
              @click="adjustQuantity(1)"
            >
              <Plus class="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-12 w-12 rounded-xl"
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
              class="h-9 w-12 rounded-lg"
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
        <div class="flex items-center gap-3 p-5 border-t bg-muted/30">
          <Button
            variant="ghost"
            class="text-destructive hover:text-destructive hover:bg-destructive/10"
            @click="handleRemove"
          >
            <Trash2 class="h-4 w-4 mr-2" />
            Kaldır
          </Button>
          <Button class="flex-1 h-12 rounded-xl" @click="confirmQuantity">
            Güncelle
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Remove Confirmation Dialog -->
    <Dialog :open="showRemoveConfirm" @update:open="showRemoveConfirm = $event">
      <DialogContent class="sm:max-w-[320px]">
        <div class="text-center">
          <div class="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <Trash2 class="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle class="text-base">Ürünü Kaldır</DialogTitle>
          <p class="text-sm text-muted-foreground mt-2">
            {{ item.name }} sepetten kaldırılacak. Onaylıyor musunuz?
          </p>
        </div>
        <div class="flex gap-2 mt-4">
          <Button variant="outline" class="flex-1" @click="showRemoveConfirm = false">
            Vazgeç
          </Button>
          <Button variant="destructive" class="flex-1" @click="confirmRemove">
            Kaldır
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ImageIcon, Minus, Plus, Trash2 } from 'lucide-vue-next'
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
const showRemoveConfirm = ref(false)
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


function openEditModal() {
  editValue.value = String(props.item.quantity)
  sellAsPiece.value = props.item.unit_type === 'piece'
  // If item is already being sold as piece, broken case was enabled
  brokenCaseEnabled.value = props.item.unit_type === 'piece'
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
  showRemoveConfirm.value = true
}

function confirmRemove() {
  showRemoveConfirm.value = false
  emit('remove')
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}
</script>
