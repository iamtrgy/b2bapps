<template>
  <div v-if="showIndicator" class="fixed top-0 left-0 right-0 z-[100]">
    <!-- Offline Banner -->
    <div
      v-if="!offlineStore.isOnline"
      class="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium"
    >
      <WifiOff class="h-4 w-4" />
      <span>Çevrimdışı Mod - Siparişler yerel olarak kaydedilecek</span>
    </div>

    <!-- Syncing Banner -->
    <div
      v-else-if="offlineStore.isSyncing"
      class="bg-blue-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium"
    >
      <Loader2 class="h-4 w-4 animate-spin" />
      <span>Siparişler gönderiliyor...</span>
    </div>

    <!-- Pending Orders Banner (clickable) -->
    <button
      v-else-if="offlineStore.hasUnsyncedOrders && offlineStore.isOnline"
      type="button"
      class="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
      @click="handleSyncClick"
    >
      <CloudOff class="h-4 w-4" />
      <span>{{ offlineStore.pendingOrderCount }} bekleyen sipariş var</span>
      <span class="underline ml-1">Şimdi gönder</span>
    </button>

    <!-- Sync Error Banner -->
    <div
      v-else-if="offlineStore.syncError"
      class="bg-destructive text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium"
    >
      <AlertCircle class="h-4 w-4" />
      <span>{{ offlineStore.syncError }}</span>
      <button
        type="button"
        class="ml-2 underline hover:no-underline"
        @click="offlineStore.syncPendingOrders()"
      >
        Tekrar dene
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WifiOff, CloudOff, Loader2, AlertCircle } from 'lucide-vue-next'
import { useOfflineStore } from '@/stores/offline'

const offlineStore = useOfflineStore()

const showIndicator = computed(() => {
  return (
    !offlineStore.isOnline ||
    offlineStore.isSyncing ||
    offlineStore.hasUnsyncedOrders ||
    offlineStore.syncError
  )
})

async function handleSyncClick() {
  await offlineStore.syncPendingOrders()
}
</script>
