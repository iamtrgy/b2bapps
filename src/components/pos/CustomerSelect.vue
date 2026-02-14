<template>
  <Combobox v-model="selectedCustomer" @update:model-value="handleSelect">
    <div class="relative">
      <div class="relative">
        <UserGroupIcon
          class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
        />
        <ComboboxInput
          class="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
          :display-value="(item: unknown) => (item as Customer | undefined)?.company_name || ''"
          placeholder="Search and select a customer..."
          @change="handleSearch"
        />
        <ComboboxButton class="absolute right-3 top-1/2 -translate-y-1/2">
          <ChevronUpDownIcon class="h-5 w-5 text-gray-400" />
        </ComboboxButton>
      </div>

      <TransitionRoot
        leave="transition ease-in duration-100"
        leave-from="opacity-100"
        leave-to="opacity-0"
        @after-leave="query = ''"
      >
        <ComboboxOptions
          class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          <div
            v-if="isLoading"
            class="px-4 py-3 text-sm text-gray-500 text-center"
          >
            <Loading size="sm" />
          </div>

          <div
            v-else-if="filteredCustomers.length === 0 && query !== ''"
            class="px-4 py-3 text-sm text-gray-500 text-center"
          >
            No customers found.
          </div>

          <ComboboxOption
            v-for="customer in filteredCustomers"
            :key="customer.id"
            v-slot="{ selected, active }"
            :value="customer"
            as="template"
          >
            <li
              :class="[
                'relative cursor-pointer select-none py-3 px-4',
                active ? 'bg-blue-50' : '',
              ]"
            >
              <div class="flex items-center gap-3">
                <div
                  :class="[
                    'h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium',
                    tierColors[customer.customer_tier] || 'bg-gray-200 text-gray-600',
                  ]"
                >
                  {{ getInitials(customer.company_name) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p
                    :class="[
                      'text-sm font-medium truncate',
                      selected ? 'text-blue-600' : 'text-gray-900',
                    ]"
                  >
                    {{ customer.company_name }}
                  </p>
                  <p class="text-xs text-gray-500 truncate">
                    <span v-if="hasAfas && customer.afas_debtor_id">{{ customer.afas_debtor_id }} &bull; </span>
                    {{ customer.contact_name }} &bull; {{ customer.contact_email }}
                  </p>
                </div>
                <CheckIcon
                  v-if="selected"
                  class="h-5 w-5 text-blue-600 flex-shrink-0"
                />
              </div>
            </li>
          </ComboboxOption>
        </ComboboxOptions>
      </TransitionRoot>
    </div>
  </Combobox>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  TransitionRoot,
} from '@headlessui/vue'
import { UserGroupIcon, ChevronUpDownIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { useCustomerStore } from '@/stores/customer'
import { useAuthStore } from '@/stores/auth'
import Loading from '@/components/ui/Loading.vue'
import type { Customer } from '@/types'

const emit = defineEmits<{
  'update:modelValue': [customer: Customer | null]
  select: [customer: Customer]
}>()

const customerStore = useCustomerStore()
const authStore = useAuthStore()

const hasAfas = computed(() => authStore.tenant?.afas_enabled ?? false)
const query = ref('')
const selectedCustomer = ref<Customer | null>(null)

const isLoading = computed(() => customerStore.isLoading)

const filteredCustomers = computed(() => customerStore.customers)

const tierColors: Record<string, string> = {
  bronze: 'bg-orange-100 text-orange-700',
  silver: 'bg-gray-200 text-gray-700',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null

function handleSearch(event: Event) {
  const target = event.target as HTMLInputElement
  query.value = target.value

  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    customerStore.searchCustomers(query.value)
  }, 300)
}

function handleSelect(customer: Customer | null) {
  if (customer) {
    emit('update:modelValue', customer)
    emit('select', customer)
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

onMounted(() => {
  customerStore.fetchCustomers()
})
</script>
