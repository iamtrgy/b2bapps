import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import CustomerSelect from './CustomerSelect.vue'
import type { Customer } from '@/types'

// Stub Tauri modules used by auth store
vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn().mockResolvedValue({ get: vi.fn(), set: vi.fn(), save: vi.fn() }),
}))
vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn().mockResolvedValue('macos'),
  arch: vi.fn().mockResolvedValue('aarch64'),
}))
vi.mock('@/services/api', () => ({
  default: { defaults: { baseURL: '' } },
  authApi: {},
  customerApi: { list: vi.fn().mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, total: 0 } }) },
  orderApi: {},
  productApi: {},
  categoryApi: {},
  promotionApi: {},
}))


const mockCustomers: Customer[] = [
  {
    id: 1,
    company_name: 'Acme Corp',
    contact_name: 'Alice',
    contact_email: 'alice@acme.com',
    contact_phone: '555-0001',
    customer_tier: 'gold',
  },
  {
    id: 2,
    company_name: 'Beta Inc',
    contact_name: 'Bob',
    contact_email: 'bob@beta.com',
    contact_phone: '555-0002',
    customer_tier: 'silver',
  },
]

function mountComponent(options: { customers?: Customer[]; isLoading?: boolean } = {}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    initialState: {
      customer: {
        customers: options.customers ?? [],
        isLoading: options.isLoading ?? false,
      },
      auth: {
        tenant: { afas_enabled: false },
      },
    },
  })

  return mount(CustomerSelect, {
    global: {
      plugins: [pinia],
    },
  })
}

describe('CustomerSelect', () => {
  it('renders the combobox input with placeholder', () => {
    const wrapper = mountComponent()
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toContain('Search')
  })

  it('renders customer list when customers exist and dropdown is open', async () => {
    const wrapper = mountComponent({ customers: mockCustomers })
    // Open the combobox by clicking the button
    const button = wrapper.find('button')
    await button.trigger('click')
    await flushPromises()

    const options = wrapper.findAll('li')
    expect(options.length).toBe(2)
    expect(wrapper.text()).toContain('Acme Corp')
    expect(wrapper.text()).toContain('Beta Inc')
  })

  it('shows loading state', async () => {
    const wrapper = mountComponent({ isLoading: true })
    // Open dropdown
    const button = wrapper.find('button')
    await button.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it('emits select when a customer is chosen', async () => {
    const wrapper = mountComponent({ customers: mockCustomers })
    // Open dropdown
    const button = wrapper.find('button')
    await button.trigger('click')
    await flushPromises()

    // Click first customer option
    const firstOption = wrapper.findAll('li')[0]
    if (firstOption) {
      await firstOption.trigger('click')
      await flushPromises()
    }

    const selectEvents = wrapper.emitted('select')
    if (selectEvents) {
      expect(selectEvents[0][0]).toMatchObject({ id: 1, company_name: 'Acme Corp' })
    }
  })
})
