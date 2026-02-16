<template>
  <AppLayout>
    <div class="flex-1 p-4 lg:p-6 overflow-y-auto">
      <div class="max-w-5xl mx-auto">
        <!-- Back Link -->
        <router-link
          to="/orders"
          class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft class="h-4 w-4" />
          Siparişlere Dön
        </router-link>

        <div v-if="isLoading" class="py-12 flex items-center justify-center">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="!order" class="py-12 text-center">
          <AlertCircle class="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p class="text-sm text-muted-foreground">Sipariş bulunamadı</p>
        </div>

        <div v-else class="space-y-4">
          <!-- Order Header -->
          <div class="p-4 rounded-lg border bg-card">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h1 class="text-lg font-semibold">{{ order.order_number }}</h1>
                <p class="text-xs text-muted-foreground mt-1">
                  {{ formatDate(order.created_at) }} tarihinde oluşturuldu
                </p>
              </div>
              <div class="flex items-center gap-2">
                <Badge :variant="statusVariants[order.status] || 'secondary'" class="text-xs">
                  {{ formatStatus(order.status) }}
                </Badge>
                <Button
                  v-if="order.status === 'pending' && !order.afas_synced"
                  variant="outline"
                  size="sm"
                  class="h-8 text-xs gap-1.5"
                  @click="router.push(`/pos?editOrderId=${order.id}`)"
                >
                  <Pencil class="h-3 w-3" />
                  Düzenle
                </Button>
                <Button
                  v-if="!order.afas_synced"
                  size="sm"
                  class="h-8 text-xs gap-1.5"
                  :disabled="isSyncing"
                  @click="handleSyncToAfas"
                >
                  <Loader2 v-if="isSyncing" class="h-3 w-3 animate-spin" />
                  <Cloud v-else class="h-3 w-3" />
                  AFAS'a Gönder
                </Button>
                <Badge v-else variant="outline" class="text-xs text-green-600 border-green-300 gap-1">
                  <CheckCircle class="h-3 w-3" />
                  AFAS
                </Badge>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-4">
              <div>
                <h3 class="text-xs text-muted-foreground mb-1">Müşteri</h3>
                <p class="text-sm font-medium">{{ order.customer?.company_name || 'Bilinmiyor' }}</p>
                <p class="text-xs text-muted-foreground">{{ order.customer?.contact_name }}</p>
              </div>
              <div>
                <h3 class="text-xs text-muted-foreground mb-1">Oluşturan</h3>
                <p class="text-sm">{{ order.created_by?.name || 'Bilinmiyor' }}</p>
              </div>
            </div>

            <div v-if="order.notes" class="mt-4">
              <h3 class="text-xs text-muted-foreground mb-1">Notlar</h3>
              <p class="text-sm">{{ order.notes }}</p>
            </div>
          </div>

          <!-- Order Items -->
          <div class="rounded-lg border bg-card">
            <div class="px-4 py-3 border-b">
              <h2 class="text-sm font-medium">Sipariş Kalemleri</h2>
            </div>
            <div class="divide-y">
              <div
                v-for="item in order.items"
                :key="item.id"
                class="px-4 py-3 flex gap-3"
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
                  <p v-if="item.unit_type === 'box' && getPiecesPerBox(item) > 1" class="text-xs text-muted-foreground mt-0.5">
                    {{ formatPrice(item.unit_price / getPiecesPerBox(item)) }}/adet
                  </p>
                  <div class="flex items-center justify-between mt-1">
                    <span class="text-xs text-muted-foreground">
                      {{ item.quantity_ordered }} {{ item.unit_type === 'box' ? 'koli' : 'adet' }}
                      <template v-if="item.unit_type === 'box' && getPiecesPerBox(item) > 1">
                        ({{ item.quantity_ordered * getPiecesPerBox(item) }} adet)
                      </template>
                    </span>
                    <span class="text-sm font-bold text-foreground">{{ formatPrice(item.line_total) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="px-4 py-3 bg-muted/50 border-t space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Ara Toplam</span>
                <span>{{ formatPrice(order.subtotal) }}</span>
              </div>
              <div v-if="order.discount_total > 0" class="flex justify-between text-sm">
                <span class="text-muted-foreground">İndirim</span>
                <span class="text-green-600">-{{ formatPrice(order.discount_total) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">KDV</span>
                <span>{{ formatPrice(order.vat_total) }}</span>
              </div>
              <Separator />
              <div class="flex justify-between text-base font-bold">
                <span>Toplam</span>
                <span class="text-primary">{{ formatPrice(order.total) }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Sync Result Modal -->
    <Dialog :open="!!syncMessage" @update:open="syncMessage = null">
      <DialogContent class="sm:max-w-sm text-center">
        <DialogHeader>
          <div
            :class="[
              'mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5',
              syncMessage?.type === 'success' ? 'bg-green-100' : 'bg-destructive/10'
            ]"
          >
            <CheckCircle v-if="syncMessage?.type === 'success'" class="h-10 w-10 text-green-600" />
            <AlertCircle v-else class="h-10 w-10 text-destructive" />
          </div>

          <DialogTitle class="text-xl">
            {{ syncMessage?.type === 'success' ? 'Gönderim Başarılı' : 'Gönderim Başarısız' }}
          </DialogTitle>

          <DialogDescription>
            {{ syncMessage?.text }}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="pt-4">
          <Button class="w-full" @click="syncMessage = null">
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, AlertCircle, ImageIcon, CheckCircle, Loader2, Cloud, Pencil } from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { orderApi } from '@/services/api'
import type { Order, OrderItem } from '@/types'
import { logger } from '@/utils/logger'
import { getErrorMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()

const order = ref<Order | null>(null)
const isLoading = ref(false)
const isSyncing = ref(false)
const syncMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  processing: 'default',
  completed: 'default',
  cancelled: 'destructive',
}

async function fetchOrder() {
  const id = parseInt(route.params.id as string, 10)
  if (isNaN(id)) return

  isLoading.value = true
  try {
    order.value = await orderApi.get(id)
  } catch (error) {
    logger.error('Failed to fetch order:', error)
    order.value = null
  } finally {
    isLoading.value = false
  }
}

async function handleSyncToAfas() {
  if (!order.value) return

  isSyncing.value = true
  syncMessage.value = null

  try {
    const result = await orderApi.sendToAfas(order.value.id)
    if (result.success) {
      syncMessage.value = { type: 'success', text: result.message || 'Order synced to AFAS successfully' }
      // Refresh order to get updated status
      await fetchOrder()
    } else {
      syncMessage.value = { type: 'error', text: result.message || 'Failed to sync order' }
    }
  } catch (error: unknown) {
    logger.error('Failed to sync order:', error)
    syncMessage.value = {
      type: 'error',
      text: getErrorMessage(error, 'Failed to sync order to AFAS')
    }
  } finally {
    isSyncing.value = false
  }
}

const statusLabels: Record<string, string> = {
  pending: 'Beklemede',
  processing: 'İşleniyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal Edildi',
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return 'Bilinmiyor'
  return statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function getPiecesPerBox(item: OrderItem): number {
  return item.pieces_per_box || item.product?.pieces_per_box || 1
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

onMounted(() => {
  fetchOrder()
})
</script>
