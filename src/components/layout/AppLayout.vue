<template>
  <div class="h-screen bg-background flex overflow-hidden pt-[var(--safe-area-top,env(safe-area-inset-top,0px))]">
    <!-- Desktop Sidebar -->
    <AppSidebar />

    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden pb-20 md:pb-[var(--safe-area-bottom,env(safe-area-inset-bottom,0px))]">
      <slot />
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border flex items-center justify-around z-50 h-20 pb-[var(--safe-area-bottom,env(safe-area-inset-bottom,4px))]">
      <!-- Network Status -->
      <button
        @click="showPendingOrders = true"
        class="relative flex flex-col items-center justify-center gap-1 py-2 px-3"
      >
        <div class="relative">
          <Wifi v-if="offlineStore.isOnline" class="h-5 w-5 text-green-500" />
          <WifiOff v-else class="h-5 w-5 text-red-500" />
          <span
            v-if="offlineStore.pendingOrderCount > 0"
            class="absolute -top-1 -right-2 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
          >
            {{ offlineStore.pendingOrderCount > 9 ? '9+' : offlineStore.pendingOrderCount }}
          </span>
        </div>
        <span class="text-[10px] text-muted-foreground">
          {{ offlineStore.isOnline ? 'Çevrimiçi' : 'Çevrimdışı' }}
        </span>
      </button>

      <BottomNavItem
        to="/pos"
        :icon="ShoppingCart"
        label="Satış"
      />
      <BottomNavItem
        to="/orders"
        :icon="ClipboardList"
        label="Siparişler"
      />
      <BottomNavItem
        to="/customers"
        :icon="Users"
        label="Müşteriler"
      />
      <BottomNavItem
        :icon="LogOut"
        label="Çıkış"
        @click="handleLogout"
      />
    </nav>

    <!-- Pending Orders Sheet -->
    <PendingOrdersSheet v-model:open="showPendingOrders" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ShoppingCart, ClipboardList, Users, LogOut, Wifi, WifiOff } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useOfflineStore } from '@/stores/offline'
import AppSidebar from './AppSidebar.vue'
import BottomNavItem from './BottomNavItem.vue'
import PendingOrdersSheet from '@/components/offline/PendingOrdersSheet.vue'

const router = useRouter()
const authStore = useAuthStore()
const offlineStore = useOfflineStore()

const showPendingOrders = ref(false)

onMounted(() => {
  offlineStore.initialize()
})

onUnmounted(() => {
  offlineStore.cleanup()
})

async function handleLogout() {
  await authStore.logout()
  router.push('/tenant')
}
</script>
