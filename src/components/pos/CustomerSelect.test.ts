import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CustomerSelect from './CustomerSelect.vue'
import { useCustomerStore } from '@/stores/customer'
import type { Customer } from '@/types'

vi.mock('@/stores/customer', () => ({
  useCustomerStore: vi.fn(),
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    tenant: { afas_enabled: false },
  })),
}))

vi.mock('@headlessui/vue', () => ({
  Combobox: { template: '<div><slot /></div>', props: ['modelValue'] },
  ComboboxButton: { template: '<div><slot /></div>' },
  ComboboxInput: { template: '<input v-bind="$attrs" />', inheritAttrs: true },
  ComboboxOption: { template: '<div><slot v-bind="{ selected: false, active: false }" /></div>', props: ['value'] },
  ComboboxOptions: { template: '<div><slot /></div>' },
  TransitionRoot: { template: '<div><slot /></div>' },
}))

vi.mock('@heroicons/vue/24/outline', () => ({
  UserGroupIcon: { template: '<span />' },
  ChevronUpDownIcon: { template: '<span />' },
  CheckIcon: { template: '<span />' },
}))
vi.mock('@/components/ui/Loading.vue', () => ({
  default: { template: '<span class="loading" />' },
}))

const mockCustomerStore = {
  customers: [] as Customer[],
  isLoading: false,
  fetchCustomers: vi.fn(),
  searchCustomers: vi.fn(),
}

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: 1,
    company_name: 'Test Company',
    contact_name: 'John Doe',
    contact_email: 'john@test.com',
    contact_phone: '+31612345678',
    customer_tier: 'gold',
    ...overrides,
  }
}

describe('CustomerSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    setActivePinia(createPinia())

    // Reset mock store state
    mockCustomerStore.customers = []
    mockCustomerStore.isLoading = false
    mockCustomerStore.fetchCustomers = vi.fn()
    mockCustomerStore.searchCustomers = vi.fn()

    vi.mocked(useCustomerStore).mockReturnValue(mockCustomerStore as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mountComponent() {
    return mount(CustomerSelect)
  }

  it('mounts and renders the combobox', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('handleSelect emits update:modelValue and select when customer is selected', async () => {
    const customer = makeCustomer()
    const wrapper = mountComponent()

    // Call handleSelect directly via the component's exposed internals
    const vm = wrapper.vm as any
    vm.handleSelect(customer)
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([customer])
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual([customer])
  })

  it('handleSelect does not emit when customer is null', async () => {
    const wrapper = mountComponent()
    const vm = wrapper.vm as any
    vm.handleSelect(null)
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    expect(wrapper.emitted('select')).toBeFalsy()
  })

  it('handleSearch debounces and calls customerStore.searchCustomers after 300ms', async () => {
    const wrapper = mountComponent()
    const vm = wrapper.vm as any

    // Call handleSearch directly with a mock event
    vm.handleSearch({ target: { value: 'test query' } })
    await flushPromises()

    // Should not be called immediately
    expect(mockCustomerStore.searchCustomers).not.toHaveBeenCalled()

    // Advance past the 300ms debounce
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(mockCustomerStore.searchCustomers).toHaveBeenCalledWith('test query')
  })

  it('handleSearch clears previous timeout on rapid input', async () => {
    const wrapper = mountComponent()
    const vm = wrapper.vm as any

    // First input
    vm.handleSearch({ target: { value: 'first' } })

    // Advance 200ms (less than debounce)
    vi.advanceTimersByTime(200)

    // Second input before debounce completes
    vm.handleSearch({ target: { value: 'second' } })

    // Advance another 300ms
    vi.advanceTimersByTime(300)
    await flushPromises()

    // Only the second search should have been called
    expect(mockCustomerStore.searchCustomers).toHaveBeenCalledTimes(1)
    expect(mockCustomerStore.searchCustomers).toHaveBeenCalledWith('second')
  })

  it('calls customerStore.fetchCustomers on mount', () => {
    mountComponent()
    expect(mockCustomerStore.fetchCustomers).toHaveBeenCalled()
  })

  it('shows loading state when customerStore.isLoading is true', () => {
    mockCustomerStore.isLoading = true
    const wrapper = mountComponent()
    expect(wrapper.find('.loading').exists()).toBe(true)
  })

  it('shows "No customers found." when empty results with search query', async () => {
    mockCustomerStore.customers = []
    const wrapper = mountComponent()

    // Set the query via handleSearch so query ref is non-empty
    const vm = wrapper.vm as any
    vm.handleSearch({ target: { value: 'nonexistent' } })
    await flushPromises()

    expect(wrapper.text()).toContain('No customers found.')
  })

  it('renders customer list when customers are available', () => {
    mockCustomerStore.customers = [
      makeCustomer({ id: 1, company_name: 'Alpha Corp' }),
      makeCustomer({ id: 2, company_name: 'Beta Inc' }),
    ]
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Alpha Corp')
    expect(wrapper.text()).toContain('Beta Inc')
  })
})
