<template>
  <!-- Desktop Sidebar - Hidden on mobile -->
  <aside class="hidden md:flex w-[60px] h-screen bg-background border-r border-border flex-col safe-area-top safe-area-bottom">
    <!-- Navigation -->
    <nav class="flex-1 py-4 space-y-1">
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
    <div class="py-3 border-t border-border space-y-1">
      <SidebarItem
        :icon="LogOut"
        label="Çıkış"
        @click="handleLogout"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ShoppingCart, ClipboardList, Users, LogOut } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import SidebarItem from './SidebarItem.vue'

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  await authStore.logout()
  router.push('/tenant')
}
</script>
