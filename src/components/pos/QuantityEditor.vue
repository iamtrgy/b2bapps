<template>
  <div class="flex items-center gap-2">
    <button
      type="button"
      :class="[
        'p-2 rounded-lg transition-colors',
        size === 'lg' ? 'p-3' : 'p-2',
        disabled ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      ]"
      :disabled="disabled || modelValue <= min"
      @click="decrement"
    >
      <MinusIcon :class="size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'" />
    </button>

    <input
      :value="modelValue"
      type="number"
      :min="min"
      :max="max"
      :disabled="disabled"
      :class="[
        'text-center font-semibold bg-transparent border-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
        size === 'lg' ? 'w-16 text-lg' : 'w-12 text-base',
        disabled ? 'text-gray-400' : 'text-gray-900',
      ]"
      @change="handleChange"
    />

    <button
      type="button"
      :class="[
        'rounded-lg transition-colors',
        size === 'lg' ? 'p-3' : 'p-2',
        disabled || (max && modelValue >= max) ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700',
      ]"
      :disabled="disabled || (max !== undefined && modelValue >= max)"
      @click="increment"
    >
      <PlusIcon :class="size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { MinusIcon, PlusIcon } from '@heroicons/vue/24/outline'

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  size?: 'md' | 'lg'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  min: 1,
  step: 1,
  size: 'md',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function increment() {
  if (props.max === undefined || props.modelValue < props.max) {
    emit('update:modelValue', props.modelValue + props.step)
  }
}

function decrement() {
  if (props.modelValue > props.min) {
    emit('update:modelValue', props.modelValue - props.step)
  }
}

function handleChange(event: Event) {
  const target = event.target as HTMLInputElement
  let value = parseInt(target.value, 10)

  if (isNaN(value) || value < props.min) {
    value = props.min
  } else if (props.max !== undefined && value > props.max) {
    value = props.max
  }

  emit('update:modelValue', value)
}
</script>
