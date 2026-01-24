<template>
  <div class="h-screen bg-background flex overflow-hidden pt-[env(safe-area-inset-top)]">
    <!-- Desktop Sidebar -->
    <AppSidebar />

    <!-- Main Content -->
    <!-- Mobile: account for bottom nav + safe area. Tablet/Desktop: only safe area -->
    <main class="flex-1 flex flex-col overflow-hidden pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-[env(safe-area-inset-bottom)]">
      <slot />
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav class="md:hidden fixed bottom-[env(safe-area-inset-bottom)] left-0 right-0 bg-background border-t border-border flex items-center justify-around z-50 h-16">
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
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ShoppingCart, ClipboardList, Users, LogOut } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import AppSidebar from './AppSidebar.vue'
import BottomNavItem from './BottomNavItem.vue'

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  await authStore.logout()
  router.push('/tenant')
}
</script>
