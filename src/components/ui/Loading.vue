<template>
  <div class="inline-flex items-center justify-center" role="status">
    <svg
      :class="sizeClass"
      class="animate-spin text-gray-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const sizeClass = computed(() => {
  const map = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }
  return map[props.size]
})
</script>
