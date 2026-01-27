<template>
  <!-- Desktop Sidebar - Hidden on mobile -->
  <aside class="hidden md:flex w-14 h-full bg-background border-r border-border flex-col pb-[var(--safe-area-bottom,env(safe-area-inset-bottom,0px))]">
    <!-- Network Status Indicator -->
    <div class="flex justify-center py-3 border-b border-border">
      <button
        @click="showPendingOrders = true"
        class="relative flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
        :title="offlineStore.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'"
      >
        <Wifi v-if="offlineStore.isOnline" class="h-5 w-5 text-green-500" />
        <WifiOff v-else class="h-5 w-5 text-red-500" />
        <!-- Pending orders badge -->
        <span
          v-if="offlineStore.pendingOrderCount > 0"
          class="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
        >
          {{ offlineStore.pendingOrderCount > 9 ? '9+' : offlineStore.pendingOrderCount }}
        </span>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 py-3 space-y-0.5">
      <SidebarItem
        to="/pos"
        :icon="ShoppingCart"
        label="Satış"
      />
      <SidebarItem
        to="/orders"
        :icon="ClipboardList"
        label="Siparişler"
      />
      <SidebarItem
        to="/customers"
        :icon="Users"
        label="Müşteriler"
      />
    </nav>

    <!-- Bottom Actions -->
    <div class="py-2 border-t border-border">
      <SidebarItem
        :icon="LogOut"
        label="Çıkış"
        @click="handleLogout"
      />
    </div>
  </aside>

  <!-- Pending Orders Sheet -->
  <PendingOrdersSheet v-model:open="showPendingOrders" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ShoppingCart, ClipboardList, Users, LogOut, Wifi, WifiOff } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useOfflineStore } from '@/stores/offline'
import SidebarItem from './SidebarItem.vue'
import PendingOrdersSheet from '@/components/offline/PendingOrdersSheet.vue'

const router = useRouter()
const authStore = useAuthStore()
const offlineStore = useOfflineStore()

const showPendingOrders = ref(false)

async function handleLogout() {
  await authStore.logout()
  router.push('/tenant')
}
</script>
