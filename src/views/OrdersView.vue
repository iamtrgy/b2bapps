<template>
  <AppLayout>
    <div class="flex-1 p-4 md:p-3 overflow-y-auto">
      <div class="max-w-3xl md:max-w-none mx-auto">
        <!-- Title -->
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-lg font-semibold">Siparişler</h1>
          <Button
            variant="ghost"
            size="icon-sm"
            :disabled="isLoading"
            aria-label="Yenile"
            @click="fetchOrders(1)"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          </Button>
        </div>

        <!-- Search -->
        <div class="relative mb-4">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Sipariş no veya müşteri ara..."
            class="pl-10 h-11 text-sm"
            @focus="(e: FocusEvent) => { const el = e.target as HTMLInputElement; el.select(); el.addEventListener('mouseup', (m) => m.preventDefault(), { once: true }) }"
            @input="handleSearchInput"
          />
        </div>

        <!-- Filter Tabs -->
        <div class="flex items-center gap-3 mb-4 md:mb-3 flex-wrap">
          <Tabs v-model="statusFilter">
            <TabsList class="h-10">
              <TabsTrigger value="all" class="text-sm px-4">Tümü</TabsTrigger>
              <TabsTrigger value="pending" class="text-sm px-4">Beklemede</TabsTrigger>
              <TabsTrigger value="processing" class="text-sm px-4">İşleniyor</TabsTrigger>
              <TabsTrigger value="completed" class="text-sm px-4">Tamamlandı</TabsTrigger>
            </TabsList>
          </Tabs>

          <!-- Sync Filter (AFAS only) -->
          <Tabs v-if="hasAfas" v-model="syncFilter">
            <TabsList class="h-10">
              <TabsTrigger value="all" class="text-sm px-4">Tümü</TabsTrigger>
              <TabsTrigger value="unsynced" class="text-sm px-4 gap-2">
                <CloudOff class="h-5 w-5" />
                Bekliyor
              </TabsTrigger>
              <TabsTrigger value="synced" class="text-sm px-4 gap-2">
                <Cloud class="h-5 w-5" />
                Gönderildi
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <!-- Bulk Selection Toolbar (AFAS only) -->
        <div
          v-if="hasAfas && selectedCount > 0"
          class="flex items-center gap-3 p-3 rounded-lg bg-muted border mb-4"
        >
          <Checkbox
            :checked="allSelected"
            @update:checked="toggleSelectAll"
          />
          <span class="text-sm font-medium">{{ selectedCount }} seçili</span>
          <div class="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            class="h-8 text-xs"
            @click="selectAllUnsynced"
          >
            Gönderilmemişleri Seç
          </Button>
          <Button
            size="sm"
            class="h-8 text-xs gap-1.5"
            :disabled="isBulkSyncing"
            @click="handleBulkSync"
          >
            <Loader2 v-if="isBulkSyncing" class="h-4 w-4 animate-spin" />
            <Cloud v-else class="h-4 w-4" />
            {{ isBulkSyncing ? `${bulkSyncProgress.current}/${bulkSyncProgress.total}` : "AFAS'a Gönder" }}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            @click="clearSelection"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>

        <!-- Loading -->
        <div v-if="isLoading && isInitialLoad" class="py-12 flex items-center justify-center">
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>

        <!-- Empty State -->
        <div v-else-if="orders.length === 0" class="py-12 text-center">
          <Package class="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p class="text-sm text-muted-foreground">Henüz sipariş yok</p>
        </div>

        <!-- No Results (after filter) -->
        <div v-else-if="filteredOrders.length === 0" class="py-12 text-center">
          <Search class="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p class="text-sm text-muted-foreground">Sonuç bulunamadı</p>
        </div>

        <!-- Orders Grid -->
        <div v-else>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              v-for="order in filteredOrders"
              :key="order.id"
              class="flex items-center gap-3 p-4 rounded-xl border bg-card text-left hover:bg-accent active:scale-[0.99] transition-all shadow-sm"
              @click="viewOrder(order)"
            >
              <!-- Checkbox (AFAS only) -->
              <Checkbox
                v-if="hasAfas"
                :checked="selectedOrders.has(order.id)"
                class="h-5 w-5 flex-shrink-0"
                @click.stop
                @update:checked="toggleOrderSelection(order.id)"
              />

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="text-sm font-semibold">{{ order.order_number }}</span>
                  <Badge variant="secondary" class="text-xs">
                    {{ formatStatus(order.status) }}
                  </Badge>
                  <!-- AFAS Sync Badge -->
                  <template v-if="hasAfas">
                    <Badge v-if="order.afas_synced" variant="outline" class="gap-1 text-xs">
                      <Cloud class="h-3 w-3" />
                      Gönderildi
                    </Badge>
                    <Badge v-else variant="outline" class="gap-1 text-xs text-amber-600">
                      <CloudOff class="h-3 w-3" />
                      Bekliyor
                    </Badge>
                  </template>
                </div>
                <p class="text-sm text-muted-foreground truncate">
                  {{ order.customer?.company_name || 'Bilinmeyen Müşteri' }}
                </p>
                <div class="flex items-center justify-between mt-1">
                  <p class="text-xs text-muted-foreground">
                    {{ formatDate(order.created_at) }}
                  </p>
                  <p class="text-sm font-semibold text-primary">{{ formatPrice(order.total) }}</p>
                </div>
              </div>

              <ChevronRight class="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </button>
          </div>

          <!-- Load More -->
          <div v-if="hasMore" class="text-center py-4">
            <Button
              variant="outline"
              size="sm"
              :disabled="isLoading"
              @click="loadMore"
            >
              <Loader2 v-if="isLoading" class="h-3 w-3 mr-2 animate-spin" />
              Daha Fazla Yükle
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Order Detail Sidebar -->
    <Sheet :open="showOrderDetail" @update:open="showOrderDetail = $event">
      <SheetContent side="right" class="w-full sm:max-w-md flex flex-col !px-0 !pt-0">
        <!-- Header -->
        <SheetHeader class="p-4 border-b">
          <div class="flex items-center justify-between">
            <SheetTitle class="text-base">{{ orderDetail?.order_number }}</SheetTitle>
            <Button v-if="hasAfas && !orderDetail?.afas_synced" size="sm" class="h-8 text-xs gap-1.5" :disabled="isSyncing" @click="handleSyncToAfas">
              <Loader2 v-if="isSyncing" class="h-3 w-3 animate-spin" />
              <Cloud v-else class="h-3 w-3" />
              AFAS'a Gönder
            </Button>
            <Badge v-else-if="hasAfas && orderDetail?.afas_synced" variant="outline" class="text-xs text-green-600 border-green-300">
              <Check class="h-3 w-3 mr-1" />
              AFAS
            </Badge>
          </div>
          <div class="flex items-center gap-2">
            <Badge variant="secondary" class="text-xs">
              {{ formatStatus(orderDetail?.status) }}
            </Badge>
            <span class="text-sm text-muted-foreground">{{ formatDate(orderDetail?.created_at) }}</span>
          </div>
        </SheetHeader>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <!-- Customer -->
          <div class="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar class="h-10 w-10">
              <AvatarFallback class="text-sm font-semibold bg-zinc-600 text-white">
                {{ orderDetail?.customer ? getInitials(orderDetail.customer.company_name) : '' }}
              </AvatarFallback>
            </Avatar>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">{{ orderDetail?.customer?.company_name }}</p>
              <p class="text-sm text-muted-foreground truncate">{{ orderDetail?.customer?.contact_name }}</p>
            </div>
          </div>

          <!-- Items -->
          <div class="space-y-2">
            <h3 class="text-xs font-medium text-muted-foreground uppercase">Ürünler</h3>
            <div v-if="isLoadingDetail" class="py-8 flex items-center justify-center">
              <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="!orderDetailItems?.length" class="py-8 text-center">
              <p class="text-sm text-muted-foreground">Ürün bulunamadı</p>
            </div>
            <div
              v-else
              v-for="item in orderDetailItems"
              :key="item.id"
              class="flex gap-3 p-3 rounded-lg bg-muted/50"
            >
              <!-- Product Image -->
              <div class="w-14 h-14 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                <img
                  v-if="item.product?.image_url"
                  :src="item.product.image_url"
                  :alt="item.product?.name"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <ImageIcon class="h-6 w-6 text-muted-foreground/30" />
                </div>
              </div>

              <!-- Product Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <p class="text-sm font-medium text-foreground leading-snug line-clamp-2">{{ item.product?.name || 'Ürün' }}</p>
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
                <div class="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5">
                  <span class="text-sm font-semibold text-primary">{{ formatPrice(item.unit_price) }}</span>
                  <span
                    v-if="item.original_price && item.original_price > item.unit_price"
                    class="text-xs text-muted-foreground/70 line-through"
                  >
                    {{ formatPrice(item.original_price) }}
                  </span>
                  <span class="text-xs text-muted-foreground">/{{ item.unit_type === 'box' ? 'koli' : 'adet' }}</span>
                  <span
                    v-if="item.original_price && item.original_price > item.unit_price"
                    class="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded"
                  >
                    -{{ Math.round(((item.original_price - item.unit_price) / item.original_price) * 100) }}%
                  </span>
                </div>
                <!-- Piece price for boxes -->
                <p v-if="item.unit_type === 'box' && (item.pieces_per_box || item.product?.pieces_per_box) > 1" class="text-xs text-muted-foreground mt-0.5">
                  {{ formatPrice(item.unit_price / (item.pieces_per_box || item.product?.pieces_per_box)) }}/adet
                </p>
                <div class="flex items-center justify-between mt-1">
                  <span class="text-xs text-muted-foreground">
                    {{ item.quantity_ordered }} {{ item.unit_type === 'box' ? 'koli' : 'adet' }}
                    <template v-if="item.unit_type === 'box' && (item.pieces_per_box || item.product?.pieces_per_box) > 1">
                      ({{ item.quantity_ordered * (item.pieces_per_box || item.product?.pieces_per_box) }} adet)
                    </template>
                  </span>
                  <span class="text-sm font-bold text-foreground">{{ formatPrice(item.line_total) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="orderDetail?.notes" class="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p class="text-sm text-amber-800 dark:text-amber-200">{{ orderDetail.notes }}</p>
          </div>
        </div>

        <!-- Footer with Summary & Actions -->
        <div class="border-t p-4 pb-8 space-y-3 bg-muted/30">
          <!-- Summary -->
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Ara Toplam</span>
              <span>{{ formatPrice(orderDetail?.subtotal ?? 0) }}</span>
            </div>
            <div v-if="(orderDetail?.discount_total ?? 0) > 0" class="flex justify-between text-sm">
              <span class="text-muted-foreground">İndirim</span>
              <span class="text-green-600">-{{ formatPrice(orderDetail?.discount_total ?? 0) }}</span>
            </div>
            <div v-if="(orderDetail?.vat_total ?? 0) > 0" class="flex justify-between text-sm">
              <span class="text-muted-foreground">KDV</span>
              <span>{{ formatPrice(orderDetail?.vat_total ?? 0) }}</span>
            </div>
            <Separator />
            <div class="flex justify-between text-base font-bold">
              <span>Toplam</span>
              <span class="text-primary">{{ formatPrice(orderDetail?.total ?? 0) }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <Button variant="outline" class="flex-1 h-10 text-sm gap-1.5" @click="handlePrint">
              <Printer class="h-4 w-4" />
              Yazdır
            </Button>
            <Button variant="outline" class="flex-1 h-10 text-sm gap-1.5" @click="handleShare">
              <Share2 class="h-4 w-4" />
              Paylaş
            </Button>
            <Button variant="outline" class="flex-1 h-10 text-sm gap-1.5" @click="handleReorder">
              <RotateCcw class="h-4 w-4" />
              Tekrarla
            </Button>
          </div>
          <Button variant="outline" class="w-full h-10 text-sm gap-1.5" @click="goToOrderDetail">
            <ExternalLink class="h-4 w-4" />
            Detay Sayfası
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    <!-- Print Content (teleported to body, hidden on screen, visible only when printing) -->
    <Teleport to="body">
      <div v-if="orderDetail" class="print-content">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #333;">
          <div>
            <h1 style="font-size: 24px; margin: 0 0 5px 0; font-weight: bold;">{{ orderDetail.order_number }}</h1>
            <p style="color: #666; margin: 0;">{{ formatDate(orderDetail.created_at) }}</p>
          </div>
          <div style="background: #f0f0f0; padding: 6px 12px; border-radius: 4px; font-size: 14px;">
            {{ formatStatus(orderDetail.status) }}
          </div>
        </div>

        <!-- Customer Info -->
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <strong style="font-size: 16px;">{{ orderDetail.customer?.company_name }}</strong><br>
          <span style="color: #666;">{{ orderDetail.customer?.contact_name }}</span>
          <span v-if="orderDetail.customer?.contact_email" style="color: #666;"> · {{ orderDetail.customer?.contact_email }}</span>
        </div>

        <!-- Items -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f9f9f9;">
              <th style="text-align: left; padding: 12px 8px; border-bottom: 2px solid #333; font-size: 13px;">Ürün</th>
              <th style="text-align: center; padding: 12px 8px; border-bottom: 2px solid #333; font-size: 13px;">Birim</th>
              <th style="text-align: center; padding: 12px 8px; border-bottom: 2px solid #333; font-size: 13px;">Adet</th>
              <th style="text-align: right; padding: 12px 8px; border-bottom: 2px solid #333; font-size: 13px;">Birim Fiyat</th>
              <th style="text-align: right; padding: 12px 8px; border-bottom: 2px solid #333; font-size: 13px;">Toplam</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in orderDetailItems" :key="item.id">
              <td style="padding: 10px 8px; border-bottom: 1px solid #eee; vertical-align: top;">
                <div style="font-weight: 500;">{{ item.product?.name || item.name || 'Ürün' }}</div>
                <div v-if="item.original_price && item.original_price > (item.unit_price || item.price)" style="font-size: 12px; margin-top: 2px;">
                  <span style="text-decoration: line-through; color: #999;">{{ formatPrice(item.original_price) }}</span>
                  <span style="background: #dc2626; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; margin-left: 5px;">
                    -{{ Math.round(((item.original_price - (item.unit_price || item.price)) / item.original_price) * 100) }}%
                  </span>
                </div>
              </td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: center; color: #666; font-size: 13px;">
                {{ (item.unit_type || 'box') === 'box' ? 'Koli' : 'Adet' }}
              </td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: center; font-weight: 500;">
                {{ item.quantity_ordered || item.quantity }}
              </td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right;">
                {{ formatPrice(item.unit_price || item.price) }}
              </td>
              <td style="padding: 10px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">
                {{ formatPrice(item.line_total || (item.quantity_ordered || item.quantity) * (item.unit_price || item.price)) }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Summary -->
        <div style="max-width: 300px; margin-left: auto;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; color: #666;">
            <span>{{ orderDetailStats.itemCount }} ürün</span>
            <span>
              <template v-if="orderDetailStats.boxCount > 0">{{ orderDetailStats.boxCount }} koli</template>
              <template v-if="orderDetailStats.boxCount > 0 && orderDetailStats.pieceCount > 0"> · </template>
              <template v-if="orderDetailStats.pieceCount > 0">{{ orderDetailStats.pieceCount }} adet</template>
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
            <span style="color: #666;">Ara Toplam</span>
            <span>{{ formatPrice(orderDetail.subtotal ?? 0) }}</span>
          </div>
          <div v-if="(orderDetail.discount_total ?? 0) > 0" style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
            <span style="color: #666;">İndirim</span>
            <span style="color: #16a34a;">-{{ formatPrice(orderDetail.discount_total ?? 0) }}</span>
          </div>
          <template v-if="orderDetailVatBreakdown.length > 0">
            <div v-for="vat in orderDetailVatBreakdown" :key="vat.rate" style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
              <span style="color: #666;">KDV (%{{ vat.rate }})</span>
              <span>{{ formatPrice(vat.amount) }}</span>
            </div>
          </template>
          <div v-else-if="(orderDetail.vat_total ?? 0) > 0" style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px;">
            <span style="color: #666;">KDV</span>
            <span>{{ formatPrice(orderDetail.vat_total ?? 0) }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; margin-top: 8px; border-top: 2px solid #333; font-size: 18px; font-weight: bold;">
            <span>Toplam</span>
            <span>{{ formatPrice(orderDetail.total ?? 0) }}</span>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="orderDetail.notes" style="margin-top: 25px; padding: 15px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px;">
          <strong style="font-size: 13px; color: #92400e;">Not:</strong>
          <p style="margin: 5px 0 0 0; color: #78350f;">{{ orderDetail.notes }}</p>
        </div>
      </div>
    </Teleport>

    <!-- Sync Result Modal -->
    <Dialog :open="!!syncMessage" @update:open="syncMessage = null">
      <DialogContent class="sm:max-w-sm text-center">
        <div
          :class="[
            'mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4',
            syncMessage?.type === 'success' ? 'bg-green-100 dark:bg-green-950' : 'bg-destructive/10'
          ]"
        >
          <CheckCircle v-if="syncMessage?.type === 'success'" class="h-10 w-10 text-green-600 dark:text-green-400" />
          <AlertCircle v-else class="h-10 w-10 text-destructive" />
        </div>

        <DialogHeader>
          <DialogTitle>
            {{ syncMessage?.type === 'success' ? 'Gönderim Başarılı' : 'Gönderim Başarısız' }}
          </DialogTitle>
        </DialogHeader>

        <p class="text-sm text-muted-foreground">{{ syncMessage?.text }}</p>

        <DialogFooter class="pt-4">
          <Button class="w-full" @click="syncMessage = null">Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  Cloud,
  CloudOff,
  Search,
  X,
  Printer,
  Share2,
  RotateCcw,
  Package,
  ImageIcon,
  ExternalLink,
  Check,
  RefreshCw,
} from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { orderApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Order } from '@/types'

const router = useRouter()
const authStore = useAuthStore()

// Check if tenant has AFAS enabled
const hasAfas = computed(() => authStore.tenant?.afas_enabled ?? false)

const orders = ref<Order[]>([])
const isLoading = ref(false)
const isInitialLoad = ref(true)
const currentPage = ref(1)
const lastPage = ref(1)
const hasMore = ref(false)

// Search & Filter
const searchQuery = ref('')
const statusFilter = ref<string>('all')
const syncFilter = ref<string>('all')
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Bulk Selection
const selectedOrders = ref<Set<number>>(new Set())
const isBulkSyncing = ref(false)
const bulkSyncProgress = ref({ current: 0, total: 0 })

const showOrderDetail = ref(false)
const orderDetail = ref<Order | null>(null)
const isLoadingDetail = ref(false)
const isSyncing = ref(false)
const syncMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const statusLabels: Record<string, string> = {
  pending: 'Beklemede',
  processing: 'İşleniyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
}

// Computed: Filtered orders
const filteredOrders = computed(() => {
  let result = orders.value

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(order =>
      order.order_number.toLowerCase().includes(query) ||
      order.customer?.company_name?.toLowerCase().includes(query) ||
      order.customer?.contact_name?.toLowerCase().includes(query)
    )
  }

  // Status filter
  if (statusFilter.value !== 'all') {
    result = result.filter(order => order.status === statusFilter.value)
  }

  // Sync filter
  if (syncFilter.value === 'synced') {
    result = result.filter(order => order.afas_synced)
  } else if (syncFilter.value === 'unsynced') {
    result = result.filter(order => !order.afas_synced)
  }

  return result
})

// Computed: Unsynced orders for bulk operations
const unsyncedOrders = computed(() => orders.value.filter(o => !o.afas_synced))
const selectedCount = computed(() => selectedOrders.value.size)
const allSelected = computed(() =>
  filteredOrders.value.length > 0 &&
  filteredOrders.value.every(o => selectedOrders.value.has(o.id))
)

// Handle different API response formats for order items
const orderDetailItems = computed(() => {
  if (!orderDetail.value) return []
  const detail = orderDetail.value as any
  return detail.items || detail.order_items || detail.lines || []
})

// Order detail stats (like cart)
const orderDetailStats = computed(() => {
  const items = orderDetailItems.value
  let boxCount = 0
  let pieceCount = 0

  items.forEach((item: any) => {
    const qty = item.quantity_ordered || item.quantity || 0
    const unitType = item.unit_type || 'box'
    if (unitType === 'box') {
      boxCount += qty
    } else {
      pieceCount += qty
    }
  })

  return {
    itemCount: items.length,
    boxCount,
    pieceCount,
  }
})

// VAT breakdown for order detail
const orderDetailVatBreakdown = computed(() => {
  const items = orderDetailItems.value
  const rateMap = new Map<number, number>()

  items.forEach((item: any) => {
    const vatRate = item.vat_rate || 0
    const lineTotal = item.line_total || ((item.quantity_ordered || item.quantity || 0) * (item.unit_price || item.price || 0))
    const basePrice = lineTotal / (1 + vatRate / 100)
    const vatAmount = lineTotal - basePrice

    const current = rateMap.get(vatRate) || 0
    rateMap.set(vatRate, current + vatAmount)
  })

  const breakdown: { rate: number; amount: number }[] = []
  rateMap.forEach((amount, rate) => {
    if (amount > 0 && rate > 0) {
      breakdown.push({ rate, amount })
    }
  })

  return breakdown.sort((a, b) => a.rate - b.rate)
})

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

async function fetchOrders(page = 1) {
  isLoading.value = true
  try {
    const response = await orderApi.list(page)

    if (page === 1) {
      orders.value = response.data
    } else {
      orders.value = [...orders.value, ...response.data]
    }

    currentPage.value = response.meta.current_page
    lastPage.value = response.meta.last_page
    hasMore.value = currentPage.value < lastPage.value
  } catch (error) {
    console.error('Failed to fetch orders:', error)
  } finally {
    isLoading.value = false
    isInitialLoad.value = false
  }
}

function loadMore() {
  if (hasMore.value && !isLoading.value) {
    fetchOrders(currentPage.value + 1)
  }
}

function handleSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    // Search is client-side for now
  }, 300)
}

function toggleOrderSelection(orderId: number) {
  if (selectedOrders.value.has(orderId)) {
    selectedOrders.value.delete(orderId)
  } else {
    selectedOrders.value.add(orderId)
  }
  selectedOrders.value = new Set(selectedOrders.value)
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedOrders.value.clear()
  } else {
    filteredOrders.value.forEach(o => selectedOrders.value.add(o.id))
  }
  selectedOrders.value = new Set(selectedOrders.value)
}

function selectAllUnsynced() {
  unsyncedOrders.value.forEach(o => selectedOrders.value.add(o.id))
  selectedOrders.value = new Set(selectedOrders.value)
}

function clearSelection() {
  selectedOrders.value.clear()
  selectedOrders.value = new Set(selectedOrders.value)
}

async function handleBulkSync() {
  const toSync = orders.value.filter(o => selectedOrders.value.has(o.id) && !o.afas_synced)
  if (toSync.length === 0) return

  isBulkSyncing.value = true
  bulkSyncProgress.value = { current: 0, total: toSync.length }

  let successCount = 0
  let failCount = 0

  for (const order of toSync) {
    try {
      const result = await orderApi.sendToAfas(order.id)
      if (result.success) {
        const index = orders.value.findIndex(o => o.id === order.id)
        if (index !== -1) {
          orders.value[index] = { ...orders.value[index], afas_synced: true }
        }
        successCount++
      } else {
        failCount++
      }
    } catch {
      failCount++
    }
    bulkSyncProgress.value.current++
  }

  isBulkSyncing.value = false
  clearSelection()

  if (failCount === 0) {
    syncMessage.value = { type: 'success', text: `${successCount} sipariş AFAS'a gönderildi` }
  } else {
    syncMessage.value = { type: 'error', text: `${successCount} başarılı, ${failCount} başarısız` }
  }
}

async function viewOrder(order: Order) {
  orderDetail.value = order
  showOrderDetail.value = true
  isLoadingDetail.value = true

  try {
    const fullData = await orderApi.get(order.id)
    orderDetail.value = fullData
  } catch (error) {
    console.error('Failed to fetch order detail:', error)
  } finally {
    isLoadingDetail.value = false
  }
}

async function handleSyncToAfas() {
  if (!orderDetail.value) return

  isSyncing.value = true
  syncMessage.value = null

  try {
    const result = await orderApi.sendToAfas(orderDetail.value.id)
    if (result.success) {
      syncMessage.value = { type: 'success', text: result.message || 'Sipariş AFAS\'a gönderildi' }
      const fullData = await orderApi.get(orderDetail.value.id)
      orderDetail.value = fullData
      const index = orders.value.findIndex(o => o.id === orderDetail.value?.id)
      if (index !== -1) {
        orders.value[index] = fullData
      }
    } else {
      syncMessage.value = { type: 'error', text: result.message || 'Sipariş gönderilemedi' }
    }
  } catch (error: any) {
    console.error('Failed to sync order:', error)
    syncMessage.value = {
      type: 'error',
      text: error.response?.data?.message || error.message || 'AFAS\'a gönderim başarısız'
    }
  } finally {
    isSyncing.value = false
  }
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return 'Bilinmiyor'
  return statusLabels[status] || status
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function handlePrint() {
  if (!orderDetail.value) return
  window.print()
}

async function handleShare() {
  if (!orderDetail.value) return

  const shareText = `Sipariş: ${orderDetail.value.order_number}\nMüşteri: ${orderDetail.value.customer?.company_name}\nToplam: ${formatPrice(orderDetail.value.total)}`

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Sipariş ${orderDetail.value.order_number}`,
        text: shareText,
      })
    } catch {
      // User cancelled or error
    }
  } else {
    await navigator.clipboard.writeText(shareText)
    syncMessage.value = { type: 'success', text: 'Sipariş bilgileri kopyalandı' }
  }
}

function handleReorder() {
  if (!orderDetail.value) return

  const items = orderDetailItems.value
  sessionStorage.setItem('reorder_items', JSON.stringify({
    customer_id: orderDetail.value.customer?.id,
    items: items.map((item: any) => ({
      product_id: item.product_id || item.product?.id,
      quantity: item.quantity_ordered || item.quantity,
      unit_type: item.unit_type || 'box',
    }))
  }))
  showOrderDetail.value = false
  router.push('/pos?reorder=true')
}

function goToOrderDetail() {
  if (!orderDetail.value) return
  showOrderDetail.value = false
  router.push(`/orders/${orderDetail.value.id}`)
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
/* Hide scrollbar for tabs on mobile */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
