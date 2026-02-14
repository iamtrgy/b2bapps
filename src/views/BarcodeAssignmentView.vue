<template>
  <AppLayout>
    <div class="flex-1 p-4 lg:p-6 overflow-y-auto">
      <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Barcode Assignment</h1>
          <p class="text-gray-500 mt-1">Assign or update product barcodes</p>
        </div>

        <!-- Search -->
        <div class="mb-6">
          <Input
            v-model="searchQuery"
            type="search"
            placeholder="Search products by name or SKU..."
            @input="handleSearch"
          >
            <template #prefix>
              <MagnifyingGlassIcon class="h-5 w-5 text-gray-400" />
            </template>
          </Input>
        </div>

        <!-- Products List -->
        <div v-if="isLoading && products.length === 0" class="py-12">
          <Loading text="Loading products..." />
        </div>

        <div v-else-if="products.length === 0" class="py-12 text-center">
          <QrCodeIcon class="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p class="text-gray-500">
            {{ searchQuery ? 'No products found' : 'Search for products to assign barcodes' }}
          </p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="product in products"
            :key="product.id"
            class="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div class="flex items-start gap-4">
              <!-- Product Image -->
              <div class="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  v-if="product.image_url"
                  :src="product.image_url"
                  :alt="product.name"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <PhotoIcon class="h-6 w-6 text-gray-300" />
                </div>
              </div>

              <!-- Product Info -->
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-gray-900">{{ product.name }}</h3>
                <p class="text-sm text-gray-500">{{ product.sku }}</p>
              </div>
            </div>

            <!-- Barcode Fields -->
            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Piece Barcode -->
              <div class="bg-blue-50 rounded-lg p-3">
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">PIECE</span>
                  <span class="text-sm font-medium text-gray-700">Single Unit Barcode</span>
                </div>
                <div class="flex gap-2">
                  <Input
                    v-model="barcodeInputs[product.id]!.piece"
                    :placeholder="product.barcode || 'Enter barcode...'"
                    size="sm"
                    class="flex-1"
                  />
                  <Button
                    size="sm"
                    :disabled="!barcodeInputs[product.id]?.piece"
                    :loading="savingBarcode === `${product.id}-piece`"
                    @click="saveBarcode(product.id, 'piece')"
                  >
                    Save
                  </Button>
                  <Button
                    v-if="product.barcode"
                    size="sm"
                    variant="danger"
                    :loading="savingBarcode === `${product.id}-piece-clear`"
                    @click="clearBarcode(product.id, 'piece')"
                  >
                    Clear
                  </Button>
                </div>
                <p v-if="product.barcode" class="text-xs text-green-600 mt-2 font-medium">
                  Current: {{ product.barcode }}
                </p>
                <p v-else class="text-xs text-gray-400 mt-2">No barcode assigned</p>
              </div>

              <!-- Box Barcode -->
              <div class="bg-orange-50 rounded-lg p-3">
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-2 py-0.5 bg-orange-600 text-white text-xs font-medium rounded">BOX</span>
                  <span class="text-sm font-medium text-gray-700">Box/Case Barcode</span>
                  <span v-if="product.pieces_per_box > 1" class="text-xs text-gray-500">({{ product.pieces_per_box }} pcs)</span>
                </div>
                <div class="flex gap-2">
                  <Input
                    v-model="barcodeInputs[product.id]!.box"
                    :placeholder="product.barcode_box || 'Enter barcode...'"
                    size="sm"
                    class="flex-1"
                  />
                  <Button
                    size="sm"
                    :disabled="!barcodeInputs[product.id]?.box"
                    :loading="savingBarcode === `${product.id}-box`"
                    @click="saveBarcode(product.id, 'box')"
                  >
                    Save
                  </Button>
                  <Button
                    v-if="product.barcode_box"
                    size="sm"
                    variant="danger"
                    :loading="savingBarcode === `${product.id}-box-clear`"
                    @click="clearBarcode(product.id, 'box')"
                  >
                    Clear
                  </Button>
                </div>
                <p v-if="product.barcode_box" class="text-xs text-green-600 mt-2 font-medium">
                  Current: {{ product.barcode_box }}
                </p>
                <p v-else class="text-xs text-gray-400 mt-2">No barcode assigned</p>
              </div>
            </div>
          </div>

          <!-- Load More -->
          <div v-if="hasMore" class="text-center py-4">
            <Button
              variant="secondary"
              :loading="isLoading"
              @click="loadMore"
            >
              Load More
            </Button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { MagnifyingGlassIcon, QrCodeIcon, PhotoIcon } from '@heroicons/vue/24/outline'
import AppLayout from '@/components/layout/AppLayout.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Loading from '@/components/ui/Loading.vue'
import { barcodeApi } from '@/services/api'
import { logger } from '@/utils/logger'
import type { Product } from '@/types'

const products = ref<Product[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const lastPage = ref(1)
const hasMore = ref(false)
const savingBarcode = ref<string | null>(null)

const barcodeInputs = reactive<Record<number, { piece: string; box: string }>>({})

let searchTimeout: ReturnType<typeof setTimeout> | null = null

async function fetchProducts(page = 1, search?: string) {
  isLoading.value = true
  try {
    const response = await barcodeApi.getProducts(page, search)

    if (page === 1) {
      products.value = response.data
    } else {
      products.value = [...products.value, ...response.data]
    }

    // Initialize barcode inputs
    response.data.forEach((product) => {
      if (!barcodeInputs[product.id]) {
        barcodeInputs[product.id] = { piece: '', box: '' }
      }
    })

    currentPage.value = response.meta.current_page
    lastPage.value = response.meta.last_page
    hasMore.value = currentPage.value < lastPage.value
  } catch (error) {
    logger.error('Failed to fetch products:', error)
  } finally {
    isLoading.value = false
  }
}

function handleSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    fetchProducts(1, searchQuery.value || undefined)
  }, 300)
}

function loadMore() {
  if (hasMore.value && !isLoading.value) {
    fetchProducts(currentPage.value + 1, searchQuery.value || undefined)
  }
}

async function saveBarcode(productId: number, type: 'piece' | 'box') {
  const barcode = barcodeInputs[productId]?.[type]
  if (!barcode) return

  savingBarcode.value = `${productId}-${type}`
  try {
    await barcodeApi.update(productId, barcode, type)

    // Update local product data
    const product = products.value.find((p) => p.id === productId)
    if (product) {
      if (type === 'piece') {
        product.barcode = barcode
      } else {
        product.barcode_box = barcode
      }
    }

    // Clear input
    barcodeInputs[productId]![type] = ''
  } catch (error) {
    logger.error('Failed to save barcode:', error)
  } finally {
    savingBarcode.value = null
  }
}

async function clearBarcode(productId: number, type: 'piece' | 'box') {
  savingBarcode.value = `${productId}-${type}-clear`
  try {
    await barcodeApi.clear(productId, type)

    // Update local product data
    const product = products.value.find((p) => p.id === productId)
    if (product) {
      if (type === 'piece') {
        product.barcode = null
      } else {
        product.barcode_box = null
      }
    }
  } catch (error) {
    logger.error('Failed to clear barcode:', error)
  } finally {
    savingBarcode.value = null
  }
}

onMounted(() => {
  fetchProducts()
})
</script>
