<template>
  <TooltipProvider :delay-duration="0">
    <Tooltip>
      <TooltipTrigger asChild>
        <component
          :is="to ? 'router-link' : 'button'"
          :to="to"
          :class="[
            'flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] mx-auto rounded-lg transition-colors touch-manipulation',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          ]"
          @click="!to && $emit('click')"
        >
          <component :is="icon" class="h-5 w-5" />
        </component>
      </TooltipTrigger>
      <TooltipContent side="right" :side-offset="8">
        {{ label }}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
