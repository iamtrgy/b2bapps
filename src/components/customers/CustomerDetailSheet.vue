<template>
  <Sheet :open="open" @update:open="$emit('update:open', $event)">
    <SheetContent side="right" class="w-full sm:max-w-md flex flex-col p-0">
      <!-- Header -->
      <SheetHeader class="p-4 border-b text-center">
        <Avatar class="mx-auto h-14 w-14 mb-2">
          <AvatarFallback :class="tierColorClass" class="text-lg font-semibold">
            {{ initials }}
          </AvatarFallback>
        </Avatar>
        <SheetTitle class="text-base">{{ customer?.company_name }}</SheetTitle>
        <Badge variant="secondary" :class="['capitalize mx-auto mt-1 text-xs', tierBadgeClass]">
          {{ customer?.customer_tier }}
        </Badge>
      </SheetHeader>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <Tabs v-model="activeTab" class="w-full">
          <TabsList class="grid w-full grid-cols-2 h-10 mb-4">
            <TabsTrigger value="info" class="text-sm">{{ UI_TEXT.infoTab }}</TabsTrigger>
            <TabsTrigger value="orders" class="text-sm">
              {{ UI_TEXT.ordersTab }} ({{ customer?.total_orders ?? 0 }})
            </TabsTrigger>
          </TabsList>

          <!-- Info Tab -->
          <TabsContent value="info" class="space-y-4 mt-0">
            <!-- Contact -->
            <div class="space-y-2">
              <h4 class="text-xs font-medium text-muted-foreground uppercase">
                {{ UI_TEXT.contact }}
              </h4>
              <InfoRow :label="UI_TEXT.name" :value="customer?.contact_name" />
              <InfoRow :label="UI_TEXT.email" :value="customer?.contact_email" />
              <InfoRow :label="UI_TEXT.phone" :value="customer?.contact_phone" />
            </div>

            <Separator />

            <!-- Address -->
            <div v-if="customer?.shipping_address || customer?.billing_address" class="space-y-2">
              <h4 class="text-xs font-medium text-muted-foreground uppercase">Adres</h4>
              <template v-if="customer?.shipping_address">
                <InfoRow label="Şehir" :value="customer.shipping_address.city" />
                <InfoRow label="Adres" :value="customer.shipping_address.address" />
                <InfoRow label="Posta Kodu" :value="customer.shipping_address.postal_code" />
              </template>
              <template v-else-if="customer?.billing_address">
                <InfoRow label="Şehir" :value="customer.billing_address.city" />
                <InfoRow label="Adres" :value="customer.billing_address.address" />
                <InfoRow label="Posta Kodu" :value="customer.billing_address.postal_code" />
              </template>
            </div>

            <Separator v-if="customer?.shipping_address || customer?.billing_address" />

            <!-- Credit Info -->
            <div class="space-y-2">
              <h4 class="text-xs font-medium text-muted-foreground uppercase">Kredi Bilgisi</h4>
              <InfoRow label="Kredi Limiti" :value="formatPrice(Number(customer?.credit_limit) || 0)" />
              <InfoRow label="Mevcut Bakiye" :value="formatPrice(Number(customer?.current_balance) || 0)" />
              <InfoRow
                label="Kullanılabilir"
                :value="formatPrice(Number(customer?.available_credit) || 0)"
                value-class="text-green-600"
              />
            </div>

            <Separator />

            <!-- Statistics -->
            <div class="space-y-2">
              <h4 class="text-xs font-medium text-muted-foreground uppercase">
                {{ UI_TEXT.statistics }}
              </h4>
              <InfoRow :label="UI_TEXT.totalOrders" :value="customer?.total_orders ?? 0" />
              <InfoRow
                :label="UI_TEXT.totalSpent"
                :value="formatPrice(customer?.total_spent ?? 0)"
                value-class="text-green-600"
              />
              <InfoRow v-if="customer?.vat_number" label="KDV No" :value="customer.vat_number" />
            </div>
          </TabsContent>

          <!-- Orders Tab -->
          <TabsContent value="orders" class="mt-0">
            <div v-if="isLoadingOrders && orders.length === 0" class="py-8 flex items-center justify-center">
              <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="orders.length === 0" class="py-8 text-center">
              <p class="text-sm text-muted-foreground">{{ UI_TEXT.noOrders }}</p>
            </div>
            <div v-else class="space-y-2">
              <button
                v-for="order in orders"
                :key="order.id"
                class="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                @click="$emit('view-order', order.id)"
              >
                <div>
                  <p class="text-sm font-medium">{{ order.order_number }}</p>
                  <p class="text-xs text-muted-foreground">{{ formatDate(order.created_at) }}</p>
                </div>
                <div class="text-right">
                  <span class="text-sm font-medium">{{ formatPrice(order.total) }}</span>
                </div>
              </button>

              <!-- Load More Orders -->
              <div v-if="hasMoreOrders" class="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  :disabled="isLoadingOrders"
                  @click="$emit('load-more-orders')"
                >
                  <Loader2 v-if="isLoadingOrders" class="h-4 w-4 mr-2 animate-spin" />
                  {{ UI_TEXT.loadMoreOrders }}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <!-- Footer -->
      <div class="border-t p-4">
        <Button class="w-full h-11 text-sm" @click="$emit('select-for-pos')">
          {{ UI_TEXT.selectForPOS }}
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import InfoRow from './InfoRow.vue'
import { useFormatters } from '@/composables/useFormatters'
import { useCustomerCache } from '@/composables/useCustomerCache'
import { TIER_COLORS, TIER_BADGE_COLORS, UI_TEXT } from '@/constants/customers'
import type { Customer, Order, CustomerRecentOrder } from '@/types'

const props = defineProps<{
  open: boolean
  customer: Customer | null
  orders: (Order | CustomerRecentOrder)[]
  isLoadingOrders: boolean
  hasMoreOrders: boolean
}>()

defineEmits<{
  'update:open': [value: boolean]
  'view-order': [orderId: number]
  'load-more-orders': []
  'select-for-pos': []
}>()

const { formatPrice, formatDate } = useFormatters()
const { getInitials } = useCustomerCache()

const activeTab = ref<string>('info')

// Reset tab when sheet opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    activeTab.value = 'info'
  }
})

const initials = computed(() =>
  props.customer ? getInitials(props.customer.company_name) : ''
)

const tierColorClass = computed(() =>
  props.customer ? TIER_COLORS[props.customer.customer_tier] || 'bg-muted' : 'bg-muted'
)

const tierBadgeClass = computed(() =>
  props.customer ? TIER_BADGE_COLORS[props.customer.customer_tier] || '' : ''
)
</script>
