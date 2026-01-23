<template>
  <AppLayout>
    <div class="flex-1 flex flex-col lg:flex-row overflow-hidden h-full min-h-0">
      <!-- Products Panel -->
      <div class="flex-1 flex flex-col bg-muted/30 min-w-0 min-h-0">
        <!-- Customer & Search (only when customer selected) -->
        <div v-if="selectedCustomer" class="p-4 bg-background border-b space-y-4">
          <!-- Selected Customer -->
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="flex items-center gap-3 flex-1 min-w-0 text-left"
              @click="openCustomerDetail"
            >
              <Avatar class="h-9 w-9">
                <AvatarFallback :class="tierColors[selectedCustomer.customer_tier]">
                  {{ getInitials(selectedCustomer.company_name) }}
                </AvatarFallback>
              </Avatar>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm text-foreground truncate">{{ selectedCustomer.company_name }}</p>
                <p class="text-xs text-muted-foreground truncate">{{ selectedCustomer.contact_name }}</p>
              </div>
            </button>
            <Button variant="ghost" size="sm" @click="clearCustomer">
              <X class="h-4 w-4" />
            </Button>
          </div>

          <!-- Search -->
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              type="text"
              placeholder="Ürün adı, SKU veya barkod ile ara..."
              class="pl-10 pr-12 h-11 text-sm"
              @input="handleSearchInput"
              @keyup.enter="handleSearch(searchQuery)"
            />
            <Button
              variant="ghost"
              size="icon"
              class="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9"
              @click="showScanner = true"
            >
              <QrCode class="h-5 w-5" />
            </Button>
          </div>

          <!-- Quick Tabs -->
          <Tabs :model-value="activeTab" @update:model-value="handleTabChange($event as any)">
            <TabsList class="h-10">
              <TabsTrigger v-for="tab in tabs" :key="tab.id" :value="tab.id" class="text-sm px-4">
                {{ tab.label }}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <!-- Product Grid / Customer List -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Customer Selection Grid -->
          <div v-if="!selectedCustomer">
            <h2 class="text-lg font-semibold mb-4">Müşteri Seçin</h2>

            <!-- Customer Search -->
            <div class="relative mb-4">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                v-model="customerSearchQuery"
                type="text"
                placeholder="Müşteri ara..."
                class="pl-10 h-11 text-sm"
                @input="handleCustomerSearch"
              />
            </div>

            <div v-if="customerStore.isLoading" class="flex items-center justify-center py-12">
              <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
            </div>

            <div v-else-if="customerStore.customers.length === 0" class="text-center py-12">
              <Users class="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p class="text-sm text-muted-foreground">Müşteri bulunamadı</p>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                v-for="customer in customerStore.customers"
                :key="customer.id"
                class="flex items-center gap-3 p-4 rounded-xl border bg-card text-left hover:bg-accent active:scale-[0.98] transition-all shadow-sm"
                @click="handleCustomerSelect(customer)"
              >
                <Avatar class="h-11 w-11">
                  <AvatarFallback :class="tierColors[customer.customer_tier]" class="text-sm font-semibold">
                    {{ getInitials(customer.company_name) }}
                  </AvatarFallback>
                </Avatar>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold truncate">{{ customer.company_name }}</p>
                  <p class="text-sm text-muted-foreground truncate">{{ customer.contact_name }}</p>
                </div>
              </button>
            </div>
          </div>

          <div v-else-if="productStore.isLoading" class="h-full flex items-center justify-center">
            <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>

          <div
            v-else-if="!productStore.hasProducts"
            class="h-full flex items-center justify-center"
          >
            <div class="text-center">
              <Search class="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <p class="text-muted-foreground">
                {{ searchQuery ? 'Ürün bulunamadı' : 'Ürün arayın veya barkod okutun' }}
              </p>
            </div>
          </div>

          <template v-else>
            <!-- Results Count -->
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm text-muted-foreground">
                {{ productStore.productCount }} ürün bulundu
              </p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <ProductCard
                v-for="product in productStore.displayProducts"
                :key="product.id"
                :product="product"
                @add="handleAddToCart"
                @quick-view="openProductDetail"
              />
            </div>
          </template>
        </div>
      </div>

      <!-- Cart Panel - Desktop only (hidden on mobile) -->
      <div
        v-if="selectedCustomer"
        class="hidden lg:flex w-96 bg-background border-l flex-col h-full min-h-0"
      >
        <!-- Cart Header -->
        <div class="px-4 py-3 border-b flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">Sepet</span>
            <Badge v-if="cartStore.itemCount > 0" variant="secondary" class="h-5 px-1.5 text-xs">
              {{ cartStore.itemCount }}
            </Badge>
          </div>
          <Button
            v-if="!cartStore.isEmpty"
            variant="ghost"
            size="sm"
            class="h-7 text-xs text-muted-foreground hover:text-destructive"
            @click="showClearCartConfirm = true"
          >
            Temizle
          </Button>
        </div>

        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="cartStore.isEmpty" class="h-full flex items-center justify-center p-4">
            <p class="text-xs text-muted-foreground">Sepetiniz boş</p>
          </div>

          <div v-else>
            <CartItem
              v-for="(item, index) in cartStore.items"
              :key="`${item.product_id}-${item.unit_type}`"
              :item="item"
              @update="(qty) => cartStore.updateQuantity(index, qty)"
              @remove="handleRemoveItem(index)"
            />
          </div>
        </div>

        <!-- Cart Summary -->
        <CartSummary
          v-if="!cartStore.isEmpty"
          :subtotal="cartStore.subtotal"
          :discount="cartStore.totalDiscount"
          :vat-total="cartStore.vatTotal"
          :vat-breakdown="cartStore.vatBreakdown"
          :total="cartStore.total"
          :item-count="cartStore.itemCount"
          :box-count="cartStore.boxCount"
          :piece-count="cartStore.pieceCount"
          :notes="cartStore.notes"
          :can-checkout="canCheckout"
          :is-submitting="isSubmitting"
          @update:notes="cartStore.setNotes"
          @checkout="handleCheckout"
        />
      </div>

      <!-- Mobile Cart Button (floating) -->
      <button
        v-if="selectedCustomer"
        type="button"
        class="lg:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-elevation-4 flex items-center justify-center touch-manipulation z-40"
        @click="showMobileCart = true"
      >
        <ShoppingCart class="h-6 w-6" />
        <Badge
          v-if="cartStore.itemCount > 0"
          class="absolute -top-1 -right-1 h-6 min-w-6 px-1.5 text-xs bg-destructive text-destructive-foreground"
        >
          {{ cartStore.itemCount }}
        </Badge>
      </button>

      <!-- Mobile Cart Sheet -->
      <Sheet v-model:open="showMobileCart">
        <SheetContent side="bottom" class="h-[85vh] flex flex-col p-0">
          <SheetHeader class="px-4 py-3 border-b">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <SheetTitle class="text-base">Sepet</SheetTitle>
                <Badge v-if="cartStore.itemCount > 0" variant="secondary" class="h-5 px-1.5 text-xs">
                  {{ cartStore.itemCount }}
                </Badge>
              </div>
              <Button
                v-if="!cartStore.isEmpty"
                variant="ghost"
                size="sm"
                class="h-8 text-xs text-muted-foreground hover:text-destructive"
                @click="showClearCartConfirm = true"
              >
                Temizle
              </Button>
            </div>
          </SheetHeader>

          <!-- Cart Items -->
          <div class="flex-1 overflow-y-auto">
            <div v-if="cartStore.isEmpty" class="h-full flex items-center justify-center p-4">
              <div class="text-center">
                <ShoppingCart class="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p class="text-sm text-muted-foreground">Sepetiniz boş</p>
              </div>
            </div>

            <div v-else>
              <CartItem
                v-for="(item, index) in cartStore.items"
                :key="`mobile-${item.product_id}-${item.unit_type}`"
                :item="item"
                @update="(qty) => cartStore.updateQuantity(index, qty)"
                @remove="handleRemoveItem(index)"
              />
            </div>
          </div>

          <!-- Cart Summary -->
          <CartSummary
            v-if="!cartStore.isEmpty"
            :subtotal="cartStore.subtotal"
            :discount="cartStore.totalDiscount"
            :vat-total="cartStore.vatTotal"
            :vat-breakdown="cartStore.vatBreakdown"
            :total="cartStore.total"
            :item-count="cartStore.itemCount"
            :box-count="cartStore.boxCount"
            :piece-count="cartStore.pieceCount"
            :notes="cartStore.notes"
            :can-checkout="canCheckout"
            :is-submitting="isSubmitting"
            @update:notes="cartStore.setNotes"
            @checkout="handleMobileCheckout"
          />
        </SheetContent>
      </Sheet>
    </div>

    <!-- Barcode Scanner Modal -->
    <BarcodeScanner
      v-if="showScanner"
      @scan="handleBarcodeScan"
      @close="showScanner = false"
    />

    <!-- Customer Detail Modal -->
    <Dialog v-model:open="showCustomerDetail">
      <DialogContent class="max-w-md">
        <DialogHeader class="text-center">
          <Avatar class="h-16 w-16 mx-auto mb-2">
            <AvatarFallback :class="tierColors[customerDetail?.customer_tier || '']" class="text-xl">
              {{ customerDetail ? getInitials(customerDetail.company_name) : '' }}
            </AvatarFallback>
          </Avatar>
          <DialogTitle>{{ customerDetail?.company_name }}</DialogTitle>
          <Badge variant="secondary" class="mx-auto capitalize">
            {{ customerDetail?.customer_tier }}
          </Badge>
        </DialogHeader>

        <!-- Tabs -->
        <Tabs v-model="customerDetailTab" class="mt-4">
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="info">Bilgi</TabsTrigger>
            <TabsTrigger value="orders">Siparişler ({{ customerDetail?.total_orders ?? 0 }})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" class="space-y-4 max-h-64 overflow-y-auto">
            <div class="space-y-2">
              <h4 class="text-xs font-semibold text-muted-foreground uppercase">İletişim</h4>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Ad</span>
                <span class="text-sm font-medium">{{ customerDetail?.contact_name }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">E-posta</span>
                <span class="text-sm font-medium">{{ customerDetail?.contact_email }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Telefon</span>
                <span class="text-sm font-medium">{{ customerDetail?.contact_phone || '-' }}</span>
              </div>
            </div>

            <Separator />

            <div class="space-y-2">
              <h4 class="text-xs font-semibold text-muted-foreground uppercase">İstatistikler</h4>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Toplam Sipariş</span>
                <span class="text-sm font-medium">{{ customerDetail?.total_orders ?? 0 }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Toplam Harcama</span>
                <span class="text-sm font-medium text-green-600">{{ formatPrice(customerDetail?.total_spent ?? 0) }}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders" class="max-h-64 overflow-y-auto">
            <div v-if="!customerDetail?.recent_orders?.length" class="py-8 text-center">
              <p class="text-sm text-muted-foreground">Henüz sipariş yok</p>
            </div>
            <div v-else class="space-y-2">
              <router-link
                v-for="order in customerDetail.recent_orders"
                :key="order.id"
                :to="`/orders/${order.id}`"
                class="flex items-center justify-between py-3 px-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                @click="showCustomerDetail = false"
              >
                <div>
                  <p class="text-sm font-medium">{{ order.order_number }}</p>
                  <p class="text-xs text-muted-foreground">{{ formatDate(order.created_at) }}</p>
                </div>
                <div class="text-right">
                  <span class="text-sm font-semibold">{{ formatPrice(order.total) }}</span>
                  <p class="text-xs text-muted-foreground capitalize">{{ order.status }}</p>
                </div>
              </router-link>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button class="w-full" @click="showCustomerDetail = false">Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Order Success Modal -->
    <Dialog v-model:open="showOrderSuccess">
      <DialogContent class="max-w-sm text-center">
        <div class="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle class="h-10 w-10 text-green-600" />
        </div>

        <DialogHeader>
          <DialogTitle>Sipariş Verildi!</DialogTitle>
          <DialogDescription>
            Sipariş <span class="font-semibold text-foreground">{{ lastOrderNumber }}</span> başarıyla oluşturuldu
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="flex-col gap-2 sm:flex-col">
          <Button class="w-full" @click="viewOrder">Siparişi Görüntüle</Button>
          <Button variant="outline" class="w-full" @click="handleOrderSuccessClose">Alışverişe Devam Et</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Clear Cart Confirmation Modal -->
    <Dialog v-model:open="showClearCartConfirm">
      <DialogContent class="max-w-sm text-center">
        <div class="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <Trash2 class="h-10 w-10 text-destructive" />
        </div>

        <DialogHeader>
          <DialogTitle>Sepeti Temizle</DialogTitle>
          <DialogDescription>
            Sepetinizdeki {{ cartStore.itemCount }} ürün silinecek. Bu işlem geri alınamaz.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="flex-col gap-2 sm:flex-col">
          <Button variant="destructive" class="w-full" @click="confirmClearCart">Sepeti Temizle</Button>
          <Button variant="outline" class="w-full" @click="showClearCartConfirm = false">Vazgeç</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Product Detail Modal -->
    <Dialog v-model:open="showProductDetail">
      <DialogContent class="max-w-md">
        <div class="flex gap-4">
          <div class="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            <img
              v-if="productDetail?.image_url"
              :src="productDetail.image_url"
              :alt="productDetail.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <ImageIcon class="h-8 w-8 text-muted-foreground/30" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs text-muted-foreground mb-1">{{ productDetail?.sku }}</p>
            <DialogTitle class="text-base leading-snug">{{ productDetail?.name }}</DialogTitle>
          </div>
        </div>

        <Separator />

        <!-- Pricing -->
        <div class="space-y-3">
          <div v-if="productDetail && productDetail.pieces_per_box > 1" class="flex justify-between items-baseline">
            <span class="text-sm text-muted-foreground">Koli Fiyatı</span>
            <div class="text-right">
              <span class="text-lg font-bold text-primary">{{ formatPrice(productDetail.box_price || 0) }}</span>
              <span v-if="productDetail.total_discount_percent > 0" class="text-sm text-muted-foreground line-through ml-2">
                {{ formatPrice(productDetail.base_price * productDetail.pieces_per_box) }}
              </span>
            </div>
          </div>
          <div class="flex justify-between items-baseline">
            <span class="text-sm text-muted-foreground">Adet Fiyatı</span>
            <div class="text-right">
              <span class="text-base font-semibold">{{ formatPrice(productDetail?.piece_price || 0) }}</span>
              <span v-if="productDetail && productDetail.total_discount_percent > 0" class="text-sm text-muted-foreground line-through ml-2">
                {{ formatPrice(productDetail.base_price) }}
              </span>
            </div>
          </div>
          <div v-if="productDetail && productDetail.allow_broken_case && productDetail.broken_case_piece_price !== productDetail.piece_price" class="flex justify-between items-baseline">
            <span class="text-sm text-muted-foreground">Tek Adet Fiyatı</span>
            <span class="text-base font-semibold text-amber-600">{{ formatPrice(productDetail.broken_case_piece_price) }}</span>
          </div>
          <div v-if="productDetail && productDetail.pieces_per_box > 1" class="flex justify-between text-sm">
            <span class="text-muted-foreground">Koli İçeriği</span>
            <span>{{ productDetail.pieces_per_box }} adet</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Stok Durumu</span>
            <span :class="productDetail?.can_purchase ? 'text-green-600' : 'text-destructive'">
              {{ productDetail?.can_purchase ? 'Stokta Var' : 'Stokta Yok' }}
            </span>
          </div>
        </div>

        <DialogFooter class="pt-2">
          <Button
            class="w-full"
            :disabled="!productDetail?.can_purchase"
            @click="addProductFromDetail"
          >
            Sepete Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Add to Cart Toast -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="showAddedToast"
        class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2"
      >
        <CheckCircle class="h-4 w-4" />
        <span class="text-sm font-medium">Sepete eklendi</span>
      </div>
    </Transition>

    <!-- Undo Remove Toast -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="showUndoToast"
        class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-3"
      >
        <span class="text-sm">Ürün silindi</span>
        <button
          type="button"
          class="text-sm font-bold hover:underline px-2 py-1 -my-1 rounded hover:bg-white/20 transition-colors"
          @click.stop="handleUndoRemove"
        >
          Geri Al
        </button>
      </div>
    </Transition>

    <!-- Low Stock Warning Toast -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="showLowStockWarning"
        class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2"
      >
        <AlertTriangle class="h-4 w-4" />
        <span class="text-sm font-medium">{{ lowStockMessage }}</span>
      </div>
    </Transition>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Search,
  Users,
  CheckCircle,
  X,
  QrCode,
  Loader2,
  Trash2,
  ImageIcon,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import ProductCard from '@/components/pos/ProductCard.vue'
import CartItem from '@/components/pos/CartItem.vue'
import CartSummary from '@/components/pos/CartSummary.vue'
import BarcodeScanner from '@/components/pos/BarcodeScanner.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useCartStore } from '@/stores/cart'
import { useProductStore } from '@/stores/products'
import { useCustomerStore } from '@/stores/customer'
import { orderApi, customerApi, productApi } from '@/services/api'
import type { Customer, Product } from '@/types'

const router = useRouter()
const route = useRoute()
const cartStore = useCartStore()
const productStore = useProductStore()
const customerStore = useCustomerStore()

const tierColors: Record<string, string> = {
  bronze: 'bg-orange-100 text-orange-700',
  silver: 'bg-gray-200 text-gray-700',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

const selectedCustomer = ref<Customer | null>(null)
const searchQuery = ref('')
const customerSearchQuery = ref('')
const activeTab = ref<'search' | 'best-sellers' | 'favorites' | 'discounted'>('search')
const showScanner = ref(false)
const showCustomerDetail = ref(false)
const customerDetailTab = ref('info')
const customerDetail = ref<Customer | null>(null)
const isSubmitting = ref(false)
const showOrderSuccess = ref(false)
const lastOrderId = ref<number | null>(null)
const lastOrderNumber = ref('')

// New UX features
const showMobileCart = ref(false)
const showClearCartConfirm = ref(false)
const showProductDetail = ref(false)
const productDetail = ref<Product | null>(null)
const showAddedToast = ref(false)
const showUndoToast = ref(false)
const showLowStockWarning = ref(false)
const lowStockMessage = ref('')
let addedToastTimeout: ReturnType<typeof setTimeout> | null = null
let undoToastTimeout: ReturnType<typeof setTimeout> | null = null
let lowStockTimeout: ReturnType<typeof setTimeout> | null = null

const CUSTOMER_STORAGE_KEY = 'pos_selected_customer'

let barcodeBuffer = ''
let barcodeTimeout: ReturnType<typeof setTimeout> | null = null
const BARCODE_TIMEOUT = 100

function saveCustomerToStorage(customer: Customer | null) {
  if (customer) {
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer))
  } else {
    localStorage.removeItem(CUSTOMER_STORAGE_KEY)
  }
}

function loadCustomerFromStorage(): Customer | null {
  const stored = localStorage.getItem(CUSTOMER_STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }
  return null
}

const tabs = [
  { id: 'search', label: 'Ara' },
  { id: 'best-sellers', label: 'Çok Satanlar' },
  { id: 'favorites', label: 'Favoriler' },
  { id: 'discounted', label: 'İndirimli' },
] as const

const canCheckout = computed(() => {
  return !!selectedCustomer.value && !cartStore.isEmpty
})

watch(selectedCustomer, (customer) => {
  if (customer) {
    cartStore.setCustomer(customer.id)
    productStore.loadBestSellers(customer.id)
    activeTab.value = 'best-sellers'
  }
})

function handleCustomerSelect(customer: Customer) {
  selectedCustomer.value = customer
  saveCustomerToStorage(customer)
}

async function openCustomerDetail() {
  if (!selectedCustomer.value) return
  // Show modal immediately with existing data
  customerDetail.value = selectedCustomer.value
  customerDetailTab.value = 'info'
  showCustomerDetail.value = true

  // Fetch full details in background
  try {
    const fullData = await customerApi.get(selectedCustomer.value.id)
    customerDetail.value = fullData
  } catch (error) {
    console.error('Failed to fetch customer detail:', error)
  }
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function clearCustomer() {
  selectedCustomer.value = null
  saveCustomerToStorage(null)
  searchQuery.value = ''
  productStore.reset()
  cartStore.clear()
}

let customerSearchTimeout: ReturnType<typeof setTimeout> | null = null
let searchDebounceTimeout: ReturnType<typeof setTimeout> | null = null

function handleCustomerSearch() {
  if (customerSearchTimeout) {
    clearTimeout(customerSearchTimeout)
  }
  customerSearchTimeout = setTimeout(() => {
    customerStore.searchCustomers(customerSearchQuery.value)
  }, 300)
}

function handleSearchInput() {
  if (searchDebounceTimeout) {
    clearTimeout(searchDebounceTimeout)
  }
  searchDebounceTimeout = setTimeout(() => {
    handleSearch(searchQuery.value)
  }, 300)
}

function handleSearch(query: string) {
  if (!selectedCustomer.value) return
  activeTab.value = 'search'
  productStore.searchProducts(query, selectedCustomer.value.id)
}

function handleTabChange(tab: typeof activeTab.value) {
  if (!selectedCustomer.value) return
  activeTab.value = tab

  switch (tab) {
    case 'best-sellers':
      productStore.loadBestSellers(selectedCustomer.value.id)
      break
    case 'favorites':
      productStore.loadFavorites(selectedCustomer.value.id)
      break
    case 'discounted':
      productStore.loadDiscounted(selectedCustomer.value.id)
      break
    case 'search':
      if (searchQuery.value) {
        productStore.searchProducts(searchQuery.value, selectedCustomer.value.id)
      }
      break
  }
}

function handleAddToCart(product: Product) {
  // Default to box if product has multiple pieces per box
  const piecesPerBox = product.pieces_per_box || 1
  const unitType = piecesPerBox > 1 ? 'box' : 'piece'
  const quantity = product.moq_quantity || 1

  // Check stock level
  const existingItem = cartStore.items.find(
    item => item.product_id === product.id && item.unit_type === unitType
  )
  const currentQty = existingItem ? existingItem.quantity : 0
  const totalQty = currentQty + quantity
  const totalPieces = unitType === 'box' ? totalQty * piecesPerBox : totalQty

  if (product.stock_quantity > 0 && totalPieces > product.stock_quantity) {
    // Show low stock warning
    lowStockMessage.value = `Stokta sadece ${product.stock_quantity} adet var`
    showLowStockWarning.value = true
    if (lowStockTimeout) clearTimeout(lowStockTimeout)
    lowStockTimeout = setTimeout(() => {
      showLowStockWarning.value = false
    }, 3000)
  }

  cartStore.addItem(product, quantity, unitType)

  // Show success toast
  showAddedToast.value = true
  if (addedToastTimeout) clearTimeout(addedToastTimeout)
  addedToastTimeout = setTimeout(() => {
    showAddedToast.value = false
  }, 2000)
}

function openProductDetail(product: Product) {
  productDetail.value = product
  showProductDetail.value = true
}

function addProductFromDetail() {
  if (productDetail.value) {
    handleAddToCart(productDetail.value)
    showProductDetail.value = false
  }
}

function handleRemoveItem(index: number) {
  cartStore.removeItem(index)

  // Show undo toast
  showUndoToast.value = true
  if (undoToastTimeout) clearTimeout(undoToastTimeout)
  undoToastTimeout = setTimeout(() => {
    showUndoToast.value = false
    cartStore.clearLastRemoved()
  }, 5000)
}

function handleUndoRemove() {
  cartStore.undoRemove()
  showUndoToast.value = false
  if (undoToastTimeout) clearTimeout(undoToastTimeout)
}

function confirmClearCart() {
  cartStore.clear()
  showClearCartConfirm.value = false
}

async function handleBarcodeScan(barcode: string) {
  if (!selectedCustomer.value) return

  showScanner.value = false
  const result = await productStore.findByBarcode(barcode, selectedCustomer.value.id)

  if (result.success && result.product) {
    const product = result.product
    const unitType = result.scanned_unit || product.moq_unit || 'box'
    const quantity = product.moq_quantity || 1
    cartStore.addItem(product, quantity, unitType)
  } else {
    console.error('Product not found for barcode:', barcode)
  }
}

function handleKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return
  }

  if (barcodeTimeout) {
    clearTimeout(barcodeTimeout)
  }

  if (event.key === 'Enter' && barcodeBuffer.length >= 4) {
    const barcode = barcodeBuffer
    barcodeBuffer = ''
    handleBarcodeScan(barcode)
    return
  }

  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    barcodeBuffer += event.key

    barcodeTimeout = setTimeout(() => {
      barcodeBuffer = ''
    }, BARCODE_TIMEOUT)
  }
}

async function handleCheckout() {
  if (!canCheckout.value) return

  isSubmitting.value = true

  try {
    const payload = cartStore.getOrderPayload()
    const result = await orderApi.create(payload)

    if (result.success) {
      lastOrderId.value = result.order_id
      lastOrderNumber.value = result.order_number
      showOrderSuccess.value = true
      cartStore.clear()
    }
  } catch (error) {
    console.error('Failed to create order:', error)
  } finally {
    isSubmitting.value = false
  }
}

async function handleMobileCheckout() {
  showMobileCart.value = false
  await handleCheckout()
}

function handleOrderSuccessClose() {
  showOrderSuccess.value = false
  lastOrderId.value = null
  lastOrderNumber.value = ''
}

function viewOrder() {
  if (lastOrderId.value) {
    router.push(`/orders/${lastOrderId.value}`)
  }
  handleOrderSuccessClose()
}

onMounted(async () => {
  const storedCustomer = loadCustomerFromStorage()
  if (storedCustomer) {
    selectedCustomer.value = storedCustomer
    cartStore.setCustomer(storedCustomer.id)
    productStore.loadBestSellers(storedCustomer.id)
    activeTab.value = 'best-sellers'
  }

  if (customerStore.customers.length === 0) {
    customerStore.fetchCustomers()
  }

  // Handle reorder from Orders page
  if (route.query.reorder === 'true') {
    const reorderData = sessionStorage.getItem('reorder_items')
    if (reorderData) {
      try {
        const { customer_id, items } = JSON.parse(reorderData)
        sessionStorage.removeItem('reorder_items')

        // Find and set customer if different
        if (customer_id && (!selectedCustomer.value || selectedCustomer.value.id !== customer_id)) {
          const customer = customerStore.customers.find(c => c.id === customer_id)
          if (customer) {
            selectedCustomer.value = customer
            saveCustomerToStorage(customer)
            cartStore.setCustomer(customer.id)
          }
        }

        // Add items to cart
        if (items && items.length > 0 && selectedCustomer.value) {
          for (const item of items) {
            // Fetch product details
            const response = await productApi.search(String(item.product_id), selectedCustomer.value.id)
            const product = response.products?.find((p: any) => p.id === item.product_id)
            if (product) {
              cartStore.addItem(product, item.quantity, item.unit_type || 'box')
            }
          }
        }

        // Clear the query param
        router.replace({ path: '/pos' })
      } catch (error) {
        console.error('Failed to process reorder:', error)
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (barcodeTimeout) {
    clearTimeout(barcodeTimeout)
  }
})
</script>
