<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { initPlatform, cleanupPlatform } from '@/utils/platform'

onMounted(() => {
  initPlatform()
})

onUnmounted(() => {
  cleanupPlatform()
})
</script>
