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
        <div class="flex gap-3 p-4 pr-12 border-b">
          <div class="w-16 h-16 bg-white rounded-lg overflow-hidden flex-shrink-0 border">
            <img
              v-if="item.image_url"
              :src="item.image_url"
              :alt="item.name"
              class="w-full h-full object-contain p-1"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <ImageIcon class="h-6 w-6 text-muted-foreground/30" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <DialogTitle class="text-sm font-semibold leading-snug line-clamp-2">
              {{ item.name }}
            </DialogTitle>
            <div class="flex items-baseline gap-1.5 mt-1">
              <span class="text-lg font-bold text-primary">{{ formatPrice(currentPrice) }}</span>
              <span class="text-xs text-muted-foreground">/{{ sellAsPiece ? 'Adet' : 'Koli' }}</span>
            </div>
            <p v-if="item.pieces_per_box > 1" class="text-[11px] text-muted-foreground">
              {{ item.pieces_per_box }} Adet/Koli • {{ formatPrice(piecePrice) }}/Adet
            </p>
          </div>
        </div>

        <!-- Purchase History & Unit Toggle -->
        <div class="px-4 pt-4 space-y-3">
          <!-- Purchase History Section -->
          <div v-if="customerId" class="p-3 rounded-lg border bg-muted/30">
            <div class="flex items-center gap-1.5 mb-2">
              <Clock class="h-3.5 w-3.5 text-muted-foreground" />
              <span class="text-xs font-medium">Son Alımlar</span>
            </div>
            <div v-if="isLoadingHistory" class="flex justify-center py-1">
              <Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="purchaseHistory.length === 0" class="text-[11px] text-muted-foreground text-center py-1">
              Alım yok
            </div>
            <div v-else class="space-y-1">
              <div
                v-for="(purchase, index) in purchaseHistory.slice(0, 2)"
                :key="index"
                class="flex items-center justify-between text-xs gap-2"
              >
                <span class="text-muted-foreground whitespace-nowrap">{{ purchase.date }}</span>
                <span class="whitespace-nowrap">{{ purchase.quantity }} {{ purchase.unit_type === 'box' ? 'koli' : 'adet' }}</span>
                <div class="text-right whitespace-nowrap">
                  <span class="font-medium text-primary">€{{ purchase.line_total_formatted }}</span>
                  <span class="text-[10px] text-muted-foreground ml-1">(€{{ purchase.per_piece_price_formatted }}/ad)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Box/Piece toggle (when broken case allowed or enabled) -->
          <div v-if="item.pieces_per_box > 1 && (item.allow_broken_case || brokenCaseEnabled)" class="space-y-2">
            <p class="text-xs text-muted-foreground font-medium">Satış Birimi & Fiyat</p>
            <div class="grid grid-cols-2 gap-2">
              <div
                class="p-2 rounded-lg border-2 text-center transition-colors cursor-pointer"
                :class="!sellAsPiece ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'"
                @click="sellAsPiece = false"
              >
                <p class="text-xs font-semibold">KOLİ</p>
                <div class="flex items-center justify-center gap-1 mt-1">
                  <span class="text-xs text-muted-foreground">€</span>
                  <input
                    v-model="editBoxPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-16 h-7 text-center text-sm font-bold text-primary bg-transparent border rounded focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    @click.stop
                    @change="onBoxPriceChange"
                  />
                </div>
              </div>
              <div
                class="p-2 rounded-lg border-2 text-center transition-colors cursor-pointer"
                :class="sellAsPiece ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'"
                @click="sellAsPiece = true"
              >
                <p class="text-xs font-semibold">ADET</p>
                <div class="flex items-center justify-center gap-1 mt-1">
                  <span class="text-xs text-muted-foreground">€</span>
                  <input
                    v-model="editPiecePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-16 h-7 text-center text-sm font-bold text-primary bg-transparent border rounded focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    @click.stop
                    @change="onPiecePriceChange"
                  />
                </div>
              </div>
            </div>
            <!-- Discount badge -->
            <div v-if="discountPercent > 0" class="mt-1.5 flex items-center justify-center">
              <span class="bg-destructive text-white text-xs font-bold px-2 py-0.5 rounded">
                -%{{ discountPercent }} İndirim
              </span>
            </div>
          </div>

          <!-- Price edit for box products (no broken case) -->
          <div v-else-if="item.pieces_per_box > 1" class="space-y-2">
            <p class="text-xs text-muted-foreground font-medium">Fiyat</p>
            <div class="grid grid-cols-2 gap-2">
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-muted-foreground">€</span>
                <input
                  v-model="editBoxPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full h-8 text-center text-sm font-bold text-primary bg-transparent border rounded-lg focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  @change="onBoxPriceChange"
                />
                <span class="text-xs text-muted-foreground whitespace-nowrap">/koli</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-muted-foreground">€</span>
                <input
                  v-model="editPiecePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full h-8 text-center text-sm font-bold text-primary bg-transparent border rounded-lg focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  @change="onPiecePriceChange"
                />
                <span class="text-xs text-muted-foreground whitespace-nowrap">/adet</span>
              </div>
            </div>
            <!-- Discount badge -->
            <div v-if="discountPercent > 0" class="flex items-center">
              <span class="bg-destructive text-white text-xs font-bold px-2 py-0.5 rounded">
                -%{{ discountPercent }} İndirim
              </span>
            </div>
            <!-- Enable broken case checkbox -->
            <div
              v-if="!item.allow_broken_case && !brokenCaseEnabled"
              class="p-2 rounded-lg border border-dashed border-muted hover:border-primary/30 cursor-pointer transition-colors"
              @click="brokenCaseEnabled = true; sellAsPiece = true"
            >
              <div class="flex items-center gap-2">
                <Checkbox :checked="false" class="h-4 w-4" />
                <p class="text-xs text-muted-foreground">Tekli ürün sat</p>
              </div>
            </div>
          </div>

          <!-- Price edit for single unit products -->
          <div v-else class="space-y-2">
            <p class="text-xs text-muted-foreground font-medium">Fiyat</p>
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted-foreground">€</span>
              <input
                v-model="editBoxPrice"
                type="number"
                step="0.01"
                min="0"
                class="w-24 h-9 text-center text-base font-bold text-primary bg-transparent border rounded-lg focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span class="text-xs text-muted-foreground">/adet</span>
              <span v-if="discountPercent > 0" class="bg-destructive text-white text-xs font-bold px-2 py-0.5 rounded ml-2">
                -%{{ discountPercent }}
              </span>
            </div>
          </div>
        </div>

        <!-- Quantity section -->
        <div class="p-4 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-medium text-muted-foreground">Miktar</p>
            <div class="text-right">
              <span class="text-lg font-bold">{{ formatPrice(lineTotal) }}</span>
              <p class="text-[10px] text-muted-foreground">
                {{ editValue }} {{ sellAsPiece ? 'Adet' : 'Koli' }} × {{ formatPrice(currentPrice) }}
              </p>
            </div>
          </div>

          <!-- Main quantity controls -->
          <div class="flex items-center justify-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              class="h-10 w-10 rounded-lg text-xs"
              @click="adjustQuantity(-10)"
            >
              -10
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-10 w-10 rounded-lg"
              :disabled="parseInt(editValue) <= 1"
              @click="adjustQuantity(-1)"
            >
              <Minus class="h-4 w-4" />
            </Button>
            <Input
              v-model="editValue"
              type="number"
              min="1"
              inputmode="numeric"
              class="w-16 h-10 text-center text-lg font-bold rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              @keyup.enter="confirmQuantity"
            />
            <Button
              variant="outline"
              size="icon"
              class="h-10 w-10 rounded-lg"
              @click="adjustQuantity(1)"
            >
              <Plus class="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-10 w-10 rounded-lg text-xs"
              @click="adjustQuantity(10)"
            >
              +10
            </Button>
          </div>
        </div>

        <!-- Footer buttons -->
        <div class="flex items-center gap-2 p-4 border-t bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            class="text-destructive hover:text-destructive hover:bg-destructive/10"
            @click="handleRemove"
          >
            <Trash2 class="h-4 w-4 mr-1" />
            Kaldır
          </Button>
          <Button class="flex-1 h-10 rounded-lg" @click="confirmQuantity">
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
import { ImageIcon, Minus, Plus, Trash2, Clock, Loader2 } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { productApi } from '@/services/api'
import type { CartItem } from '@/types'

interface PurchaseHistoryItem {
  order_number: string
  status: string
  date: string
  date_iso: string
  quantity: number
  unit_type: 'box' | 'piece'
  unit_price: number
  unit_price_formatted: string
  per_piece_price: number
  per_piece_price_formatted: string
  line_total: number
  line_total_formatted: string
}

interface Props {
  item: CartItem
  customerId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  update: [quantity: number, customPrice?: number, boxPrice?: number, piecePrice?: number]
  remove: []
  unitTypeChange: [unitType: 'piece' | 'box']
}>()

const showModal = ref(false)
const showRemoveConfirm = ref(false)
const editValue = ref('')
const sellAsPiece = ref(false)
const brokenCaseEnabled = ref(false)

// Price editing
const editBoxPrice = ref('')
const editPiecePrice = ref('')

// Sync prices on blur/enter (not on every keystroke)
function onBoxPriceChange() {
  const boxVal = parseFloat(editBoxPrice.value)
  const ppb = props.item.pieces_per_box || 1
  if (!isNaN(boxVal) && boxVal >= 0 && ppb > 1) {
    editPiecePrice.value = (boxVal / ppb).toFixed(2)
  }
}

function onPiecePriceChange() {
  const pieceVal = parseFloat(editPiecePrice.value)
  const ppb = props.item.pieces_per_box || 1
  if (!isNaN(pieceVal) && pieceVal >= 0 && ppb > 1) {
    editBoxPrice.value = (pieceVal * ppb).toFixed(2)
  }
}

// Purchase history
const purchaseHistory = ref<PurchaseHistoryItem[]>([])
const isLoadingHistory = ref(false)

// Computed prices
const currentPrice = computed(() => {
  if (sellAsPiece.value) {
    const editedPiece = parseFloat(editPiecePrice.value)
    if (!isNaN(editedPiece) && editedPiece > 0) return editedPiece
    return props.item.broken_case_piece_price || props.item.price
  }
  const editedBox = parseFloat(editBoxPrice.value)
  if (!isNaN(editedBox) && editedBox > 0) return editedBox
  return props.item.box_price || props.item.price
})

const piecePrice = computed(() => {
  const editedPiece = parseFloat(editPiecePrice.value)
  if (!isNaN(editedPiece) && editedPiece > 0) return editedPiece
  if (props.item.broken_case_piece_price) {
    return props.item.broken_case_piece_price
  }
  return (props.item.box_price || props.item.price) / (props.item.pieces_per_box || 1)
})

const lineTotal = computed(() => {
  const qty = parseInt(editValue.value) || 0
  return qty * currentPrice.value
})

// Original prices for discount calculation
const originalBoxPrice = computed(() => props.item.box_price || props.item.price)
const discountPercent = computed(() => {
  const editedBox = parseFloat(editBoxPrice.value)
  if (isNaN(editedBox) || editedBox <= 0 || editedBox >= originalBoxPrice.value) return 0
  return Math.round(((originalBoxPrice.value - editedBox) / originalBoxPrice.value) * 100)
})


async function openEditModal() {
  editValue.value = String(props.item.quantity)
  sellAsPiece.value = props.item.unit_type === 'piece'
  // If item is already being sold as piece, broken case was enabled
  brokenCaseEnabled.value = props.item.unit_type === 'piece'
  // Initialize price values
  editBoxPrice.value = String(props.item.box_price || props.item.price)
  editPiecePrice.value = String(props.item.broken_case_piece_price || (props.item.box_price || props.item.price) / (props.item.pieces_per_box || 1))
  showModal.value = true

  // Fetch purchase history
  if (props.customerId) {
    isLoadingHistory.value = true
    purchaseHistory.value = []
    try {
      const response = await productApi.getPurchaseHistory(props.customerId, props.item.product_id)
      purchaseHistory.value = response.history || []
    } catch (error) {
      console.error('Failed to fetch purchase history:', error)
    } finally {
      isLoadingHistory.value = false
    }
  }
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
    // Get custom prices
    const customPrice = currentPrice.value
    const boxP = parseFloat(editBoxPrice.value) || undefined
    const pieceP = parseFloat(editPiecePrice.value) || undefined
    emit('update', newQty, customPrice, boxP, pieceP)
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
