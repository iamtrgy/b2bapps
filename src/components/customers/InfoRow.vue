<template>
  <div class="flex justify-between py-2">
    <span class="text-sm text-muted-foreground">{{ label }}</span>
    <span class="text-sm" :class="valueClass">{{ displayValue }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  value: string | number | null | undefined
  fallback?: string
  valueClass?: string
}>(), {
  fallback: '-',
  valueClass: '',
})

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') {
    return props.fallback
  }
  return props.value
})
</script>
