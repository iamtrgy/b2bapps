<template>
  <div
    :class="[
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      typeClasses,
    ]"
  >
    <TagIcon class="h-3.5 w-3.5" />
    <span>{{ promotion.name }}</span>
    <span v-if="promotion.discount_amount" class="font-bold">
      -{{ formatPrice(promotion.discount_amount) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TagIcon } from '@heroicons/vue/24/outline'
import type { Promotion } from '@/types'

interface Props {
  promotion: Promotion
}

const props = defineProps<Props>()

const typeClasses = computed(() => {
  switch (props.promotion.type) {
    case 'percentage':
      return 'bg-green-100 text-green-800'
    case 'fixed':
      return 'bg-blue-100 text-blue-800'
    case 'buy_x_get_y':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
})

function formatPrice(price: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}
</script>
