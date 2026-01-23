<template>
  <header class="bg-white border-b border-gray-200 safe-area-top">
    <div class="flex items-center justify-between px-4 py-3">
      <!-- Logo / Tenant Info -->
      <div class="flex items-center gap-3">
        <img
          v-if="authStore.tenant?.logo_url"
          :src="authStore.tenant.logo_url"
          :alt="authStore.tenant.name"
          class="h-8 w-auto"
        />
        <template v-else>
          <div class="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-sm">{{ tenantInitials }}</span>
          </div>
          <span class="font-semibold text-gray-900 hidden sm:block">
            {{ authStore.tenant?.name }}
          </span>
        </template>
      </div>

      <!-- Navigation -->
      <nav class="flex items-center gap-1">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="[
            'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isActive(item.to)
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          ]"
        >
          <component :is="item.icon" class="h-5 w-5 sm:hidden" />
          <span class="hidden sm:inline">{{ item.label }}</span>
        </router-link>
      </nav>

      <!-- User Menu -->
      <Menu as="div" class="relative">
        <MenuButton class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
          <div class="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
            <UserIcon class="h-5 w-5 text-gray-500" />
          </div>
          <span class="hidden sm:block text-sm font-medium text-gray-700">
            {{ authStore.user?.name }}
          </span>
          <ChevronDownIcon class="h-4 w-4 text-gray-500" />
        </MenuButton>

        <transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <MenuItems
            class="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          >
            <div class="py-1">
              <div class="px-4 py-2 border-b border-gray-100">
                <p class="text-sm font-medium text-gray-900">{{ authStore.user?.name }}</p>
                <p class="text-xs text-gray-500">{{ authStore.user?.email }}</p>
              </div>
              <MenuItem v-slot="{ active }">
                <button
                  :class="[
                    'w-full px-4 py-2 text-left text-sm',
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                  ]"
                  @click="handleLogout"
                >
                  <ArrowRightOnRectangleIcon class="h-4 w-4 inline-block mr-2" />
                  Sign out
                </button>
              </MenuItem>
            </div>
          </MenuItems>
        </transition>
      </Menu>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import {
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  UserIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const navItems = [
  { to: '/pos', label: 'POS', icon: ShoppingCartIcon },
  { to: '/orders', label: 'Orders', icon: ClipboardDocumentListIcon },
  { to: '/customers', label: 'Customers', icon: UserGroupIcon },
]

const tenantInitials = computed(() => {
  const name = authStore.tenant?.name || ''
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

async function handleLogout() {
  await authStore.logout()
  router.push('/tenant')
}
</script>
