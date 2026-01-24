<template>
  <button
    class="absolute left-0 right-0 w-full flex items-center gap-4 p-4 rounded-xl border bg-card text-left hover:bg-accent active:scale-[0.99] transition-all shadow-sm"
    :style="itemStyle"
    role="listitem"
    :aria-label="`${customer.company_name} - ${customer.shipping_address?.city || customer.billing_address?.city || ''}`"
    @click="$emit('click')"
  >
    <Avatar class="h-11 w-11">
      <AvatarFallback :class="tierColorClass" class="text-sm font-semibold">
        {{ initials }}
      </AvatarFallback>
    </Avatar>

    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold truncate">{{ customer.company_name }}</p>
      <p class="text-sm text-muted-foreground truncate">{{ customer.shipping_address?.city || customer.billing_address?.city || '-' }}</p>
    </div>

    <Badge variant="secondary" :class="['text-xs capitalize', tierBadgeClass]">
      {{ customer.customer_tier }}
    </Badge>

    <ChevronRight class="h-5 w-5 text-muted-foreground flex-shrink-0" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useCustomerCache } from '@/composables/useCustomerCache'
import { TIER_COLORS, TIER_BADGE_COLORS, ITEM_HEIGHT, ITEM_GAP } from '@/constants/customers'
import type { Customer } from '@/types'

const props = defineProps<{
  customer: Customer
  virtualStart: number
}>()

defineEmits<{
  click: []
}>()

const { getInitials } = useCustomerCache()

const initials = computed(() => getInitials(props.customer.company_name))

const tierColorClass = computed(() =>
  TIER_COLORS[props.customer.customer_tier] || 'bg-muted'
)

const tierBadgeClass = computed(() =>
  TIER_BADGE_COLORS[props.customer.customer_tier] || ''
)

const itemStyle = computed(() => ({
  height: `${ITEM_HEIGHT - ITEM_GAP}px`,
  transform: `translateY(${props.virtualStart}px)`,
}))
</script>
