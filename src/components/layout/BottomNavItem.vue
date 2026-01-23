<template>
  <component
    :is="to ? 'router-link' : 'button'"
    :to="to"
    :class="[
      'flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] min-h-[56px] rounded-lg transition-all touch-manipulation',
      isActive
        ? 'text-primary bg-primary/10'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent',
    ]"
    @click="!to && $emit('click')"
  >
    <component :is="icon" class="h-6 w-6" />
    <span class="text-xs font-medium">{{ label }}</span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface Props {
  to?: string
  icon: object
  label: string
}

const props = defineProps<Props>()

defineEmits<{
  click: []
}>()

const route = useRoute()

const isActive = computed(() => {
  if (!props.to) return false
  return route.path === props.to || route.path.startsWith(props.to + '/')
})
</script>
