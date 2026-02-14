<template>
  <Sheet :open="open" @update:open="$emit('update:open', $event)">
    <SheetContent side="right" class="w-full sm:max-w-md flex flex-col !px-0 !pt-0">
      <!-- Header -->
      <SheetHeader class="p-4 border-b">
        <div class="flex items-center gap-2">
          <Wifi v-if="offlineStore.isOnline" class="h-5 w-5 text-green-500 shrink-0" />
          <WifiOff v-else class="h-5 w-5 text-red-500 shrink-0" />
          <SheetTitle class="text-base">Çevrimdışı Modu</SheetTitle>
        </div>
        <div class="flex items-center gap-2 mt-1">
          <p class="text-sm text-muted-foreground">
            {{ offlineStore.isOnline ? 'Bağlantı aktif' : 'İnternet bağlantısı yok' }}
          </p>
          <button
            class="inline-flex items-center justify-center rounded-full h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            :disabled="offlineStore.isCheckingConnection"
            @click="handleCheckConnection"
          >
            <Loader2 v-if="offlineStore.isCheckingConnection" class="h-3.5 w-3.5 animate-spin" />
            <RefreshCw v-else class="h-3.5 w-3.5" />
          </button>
        </div>
      </SheetHeader>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- Product Cache Section -->
        <div class="p-4 rounded-xl border bg-card">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <Package class="h-5 w-5 text-primary" />
              <h3 class="font-semibold">Ürün Önbelleği</h3>
            </div>
            <span v-if="offlineStore.cachedProductCount > 0" class="text-xs text-muted-foreground">
              ~{{ formatSize(offlineStore.cachedProductCount * 1500) }}
            </span>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span v-if="offlineStore.cachedProductCount > 0" class="text-green-600 font-medium">
                {{ offlineStore.cachedProductCount }} ürün
              </span>
              <span v-else class="text-amber-600">Henüz indirilmedi</span>
              <span v-if="offlineStore.lastProductSync" class="text-xs text-muted-foreground">
                {{ formatRelativeTime(offlineStore.lastProductSync) }}
              </span>
            </div>
            <div v-if="offlineStore.isDownloading && offlineStore.downloadType === 'products'" class="space-y-1">
              <div class="flex justify-between text-xs text-muted-foreground">
                <span>İndiriliyor...</span>
                <span>{{ offlineStore.downloadProgress }}%</span>
              </div>
              <div class="h-1.5 bg-muted rounded-full overflow-hidden">
                <div class="h-full bg-primary transition-all duration-300" :style="{ width: offlineStore.downloadProgress + '%' }" />
              </div>
            </div>
            <Button v-else size="sm" class="w-full" :disabled="!offlineStore.isOnline || offlineStore.isDownloading" @click="handleDownloadProducts">
              <Download class="h-3 w-3 mr-1" />
              İndir
            </Button>
          </div>
        </div>

        <!-- Customer Cache Section -->
        <div class="p-4 rounded-xl border bg-card">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <Users class="h-5 w-5 text-primary" />
              <h3 class="font-semibold">Müşteri Önbelleği</h3>
            </div>
            <span v-if="offlineStore.cachedCustomerCount > 0" class="text-xs text-muted-foreground">
              ~{{ formatSize(offlineStore.cachedCustomerCount * 300) }}
            </span>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span v-if="offlineStore.cachedCustomerCount > 0" class="text-green-600 font-medium">
                {{ offlineStore.cachedCustomerCount }} müşteri
              </span>
              <span v-else class="text-amber-600">Henüz indirilmedi</span>
              <span v-if="offlineStore.lastCustomerSync" class="text-xs text-muted-foreground">
                {{ formatRelativeTime(offlineStore.lastCustomerSync) }}
              </span>
            </div>
            <div v-if="offlineStore.isDownloading && offlineStore.downloadType === 'customers'" class="space-y-1">
              <div class="flex justify-between text-xs text-muted-foreground">
                <span>İndiriliyor...</span>
                <span>{{ offlineStore.downloadProgress }}%</span>
              </div>
              <div class="h-1.5 bg-muted rounded-full overflow-hidden">
                <div class="h-full bg-primary transition-all duration-300" :style="{ width: offlineStore.downloadProgress + '%' }" />
              </div>
            </div>
            <Button v-else size="sm" class="w-full" :disabled="!offlineStore.isOnline || offlineStore.isDownloading" @click="handleDownloadCustomers">
              <Download class="h-3 w-3 mr-1" />
              İndir
            </Button>
          </div>
        </div>

        <!-- Order Cache Section -->
        <div class="p-4 rounded-xl border bg-card">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <ClipboardList class="h-5 w-5 text-primary" />
              <h3 class="font-semibold">Sipariş Önbelleği</h3>
            </div>
            <span v-if="offlineStore.cachedOrderCount > 0" class="text-xs text-muted-foreground">
              ~{{ formatSize(offlineStore.cachedOrderCount * 800) }}
            </span>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span v-if="offlineStore.cachedOrderCount > 0" class="text-green-600 font-medium">
                {{ offlineStore.cachedOrderCount }} sipariş
              </span>
              <span v-else class="text-amber-600">Henüz indirilmedi</span>
              <span v-if="offlineStore.lastOrderSync" class="text-xs text-muted-foreground">
                {{ formatRelativeTime(offlineStore.lastOrderSync) }}
              </span>
            </div>
            <div v-if="offlineStore.isDownloading && offlineStore.downloadType === 'orders'" class="space-y-1">
              <div class="flex justify-between text-xs text-muted-foreground">
                <span>İndiriliyor...</span>
                <span>{{ offlineStore.downloadProgress }}%</span>
              </div>
              <div class="h-1.5 bg-muted rounded-full overflow-hidden">
                <div class="h-full bg-primary transition-all duration-300" :style="{ width: offlineStore.downloadProgress + '%' }" />
              </div>
            </div>
            <Button v-else size="sm" class="w-full" :disabled="!offlineStore.isOnline || offlineStore.isDownloading" @click="handleDownloadOrders">
              <Download class="h-3 w-3 mr-1" />
              İndir
            </Button>
          </div>
        </div>

        <!-- Pending Orders Section -->
        <div class="p-4 rounded-xl border bg-card">
          <div class="flex items-center gap-2 mb-3">
            <CloudOff class="h-5 w-5 text-amber-500" />
            <h3 class="font-semibold">Bekleyen Siparişler</h3>
            <Badge v-if="pendingOrders.length > 0" class="bg-amber-500">
              {{ pendingOrders.length }}
            </Badge>
          </div>

          <!-- Loading -->
          <div v-if="isLoading" class="py-6 flex items-center justify-center">
            <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
          </div>

          <!-- Empty State -->
          <div v-else-if="pendingOrders.length === 0" class="py-4 text-center">
            <CheckCircle class="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p class="text-sm text-muted-foreground">Tüm siparişler gönderildi</p>
          </div>

          <!-- Orders List -->
          <div v-else class="space-y-3 max-h-[200px] overflow-y-auto">
            <div
              v-for="order in pendingOrders"
              :key="order.local_id"
              class="p-3 rounded-lg border bg-background"
            >
              <div class="flex items-center justify-between mb-2">
                <div>
                  <p class="font-medium text-sm">{{ order.customer_name }}</p>
                  <p class="text-xs text-muted-foreground">{{ formatDate(order.created_at) }}</p>
                </div>
                <Badge :variant="order.sync_status === 'failed' ? 'destructive' : 'secondary'" class="text-xs">
                  <Loader2 v-if="order.sync_status === 'syncing'" class="h-3 w-3 mr-1 animate-spin" />
                  <AlertCircle v-else-if="order.sync_status === 'failed'" class="h-3 w-3 mr-1" />
                  <Clock v-else class="h-3 w-3 mr-1" />
                  {{ statusLabels[order.sync_status] }}
                </Badge>
              </div>
              <div v-if="order.sync_error" class="mb-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                {{ order.sync_error }}
              </div>
              <div class="flex justify-between items-center text-sm">
                <span class="text-muted-foreground">{{ order.items.length }} ürün</span>
                <span class="font-bold text-primary">{{ formatPrice(order.total) }}</span>
              </div>
            </div>
          </div>

          <!-- Sync Button -->
          <Button
            v-if="pendingOrders.length > 0 && offlineStore.isOnline"
            class="w-full mt-3"
            :disabled="offlineStore.isSyncing"
            @click="handleSync"
          >
            <Loader2 v-if="offlineStore.isSyncing" class="h-4 w-4 mr-2 animate-spin" />
            <Cloud v-else class="h-4 w-4 mr-2" />
            {{ offlineStore.isSyncing ? 'Gönderiliyor...' : 'Siparişleri Gönder' }}
          </Button>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t p-4 bg-muted/30 space-y-2">
        <Button
          v-if="offlineStore.isOnline && !offlineStore.isDownloading"
          class="w-full"
          variant="outline"
          @click="handleDownloadAll"
        >
          <Download class="h-4 w-4 mr-2" />
          Tümünü İndir
        </Button>
        <div v-else-if="offlineStore.isDownloading" class="text-sm text-center text-muted-foreground">
          <Loader2 class="h-4 w-4 inline mr-1 animate-spin" />
          İndiriliyor...
        </div>
        <p v-else class="text-sm text-center text-muted-foreground">
          <WifiOff class="h-4 w-4 inline mr-1" />
          İnternet bağlantısı yok
        </p>
        <Button
          variant="ghost"
          size="sm"
          class="w-full text-xs text-muted-foreground"
          @click="handleResetCache"
        >
          <Trash2 class="h-3 w-3 mr-1" />
          Önbelleği Sıfırla
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Clock, Cloud, CloudOff, Wifi, WifiOff, Loader2, CheckCircle, AlertCircle, Package, Download, Users, ClipboardList, Trash2, RefreshCw } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useOfflineStore } from '@/stores/offline'
import { useCategoryStore } from '@/stores/category'
import { logger } from '@/utils/logger'
import { useCustomerStore } from '@/stores/customer'
import { deleteDatabase, type PendingOrder } from '@/services/db'

const props = defineProps<{
  open: boolean
}>()

defineEmits<{
  'update:open': [value: boolean]
}>()

const offlineStore = useOfflineStore()
const customerStore = useCustomerStore()
const categoryStore = useCategoryStore()
const pendingOrders = ref<PendingOrder[]>([])
const isLoading = ref(false)

const statusLabels: Record<string, string> = {
  pending: 'Bekliyor',
  syncing: 'Gönderiliyor',
  failed: 'Başarısız',
}

const defaultCustomerId = () => customerStore.customers[0]?.id

async function loadPendingOrders() {
  isLoading.value = true
  try {
    pendingOrders.value = await offlineStore.getAllPendingOrders()
  } catch (error) {
    logger.error('Failed to load pending orders:', error)
  } finally {
    isLoading.value = false
  }
}

async function loadCacheCounts() {
  await Promise.all([
    offlineStore.getCachedProductCount(0),
    offlineStore.getCachedCustomerCount(),
    offlineStore.getCachedOrderCount(),
  ])
}

async function handleDownloadProducts() {
  const customerId = defaultCustomerId()
  if (!customerId) return
  await offlineStore.downloadAllProducts(customerId, 0)
}

async function handleDownloadCustomers() {
  await offlineStore.downloadAllCustomers()
}

async function handleDownloadOrders() {
  await offlineStore.downloadRecentOrders()
}

async function handleDownloadAll() {
  const customerId = defaultCustomerId()
  if (customerId) {
    await offlineStore.downloadAllProducts(customerId, 0)
  }
  await offlineStore.downloadAllCustomers()
  await offlineStore.downloadRecentOrders()
  // Also cache categories for offline use
  await categoryStore.fetchCategories()
}

async function handleCheckConnection() {
  await offlineStore.forceCheckConnection()
}

async function handleSync() {
  await offlineStore.syncPendingOrders()
  await loadPendingOrders()
}

async function handleResetCache() {
  if (confirm('Tüm önbellek silinecek. Emin misiniz?')) {
    try {
      // Clear localStorage sync times
      localStorage.removeItem('lastProductSync')
      localStorage.removeItem('lastCustomerSync')
      localStorage.removeItem('lastOrderSync')

      // Delete the database
      await deleteDatabase()

      // Reload to reinitialize with new schema
      window.location.reload()
    } catch (error) {
      logger.error('Failed to reset cache:', error)
      // Try reload anyway
      window.location.reload()
    }
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'az önce'
  if (minutes < 60) return `${minutes} dk önce`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} saat önce`
  const days = Math.floor(hours / 24)
  return `${days} gün önce`
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    loadPendingOrders()
    loadCacheCounts()
  }
})

onMounted(() => {
  if (props.open) {
    loadPendingOrders()
    loadCacheCounts()
  }
})
</script>
