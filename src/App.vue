<template>
  <router-view />
</template>

<script setup lang="ts">
import { useSafeArea } from '@/composables/useSafeArea'

// Load native safe area insets on Android, CSS env() fallback on other platforms
useSafeArea()
</script>
