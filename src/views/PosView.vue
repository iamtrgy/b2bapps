<template>
  <AppLayout>
    <div class="flex-1 flex flex-col md:flex-row overflow-hidden h-full min-h-0">
      <!-- Products Panel -->
      <div class="flex-1 flex flex-col bg-background min-w-0 min-h-0">
        <!-- Header (only when customer selected) -->
        <div v-if="selectedCustomer" class="bg-card border-b">
          <!-- Top Bar: Customer & Search -->
          <div class="flex items-center gap-3 p-3">
            <!-- Selected Customer Pill -->
            <div class="flex items-center gap-1 px-2 py-1.5 bg-muted rounded-lg">
              <button
                type="button"
                class="flex items-center gap-2 hover:opacity-80 transition-opacity"
                @click="openCustomerDetail"
              >
                <Avatar class="h-7 w-7">
                  <AvatarFallback :class="tierColors[selectedCustomer.customer_tier]" class="text-[10px] font-semibold">
                    {{ getInitials(selectedCustomer.company_name) }}
                  </AvatarFallback>
                </Avatar>
                <span class="text-sm font-medium text-foreground truncate max-w-[100px] hidden sm:block">
                  {{ selectedCustomer.company_name }}
                </span>
              </button>
              <button
                type="button"
                class="p-1 rounded hover:bg-background/50 transition-colors"
                @click="clearCustomer"
              >
                <X class="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            <!-- Search -->
            <div class="relative flex-1">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                v-model="searchQuery"
                type="text"
                placeholder="Ürün ara..."
                class="pl-9 pr-10 h-10 text-sm bg-muted border-0"
                @input="handleSearchInput"
                @keyup.enter="handleSearch(searchQuery)"
              />
              <Button
                variant="ghost"
                size="icon"
                class="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                @click="showScanner = true"
              >
                <QrCode class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <!-- Category Tabs -->
          <div class="px-3 pb-3">
            <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              <!-- Quick Filters -->
              <button
                type="button"
                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                :class="activeCategoryTab === 'best-sellers'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'"
                @click="handleCategorySelect('best-sellers')"
              >
                <TrendingUp class="h-5 w-5" />
                Çok Satanlar
              </button>

              <button
                type="button"
                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                :class="activeCategoryTab === 'favorites'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'"
                @click="handleCategorySelect('favorites')"
              >
                <Heart class="h-5 w-5" />
                Favoriler
              </button>

              <button
                type="button"
                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                :class="activeCategoryTab === 'discounted'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'"
                @click="handleCategorySelect('discounted')"
              >
                <Percent class="h-5 w-5" />
                İndirimli
              </button>

              <!-- Divider -->
              <div class="w-px bg-border self-stretch my-1" />

              <!-- All Products Tab -->
              <button
                type="button"
                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                :class="activeCategoryTab === 'all'
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'"
                @click="handleCategorySelect('all')"
              >
                Tümü
              </button>

              <!-- Category Tabs -->
              <button
                v-for="category in categoryStore.categories"
                :key="category.id"
                type="button"
                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                :class="activeCategoryTab === category.id
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'"
                @click="handleCategorySelect(category.id)"
              >
                {{ category.name }}
                <span
                  class="text-xs"
                  :class="activeCategoryTab === category.id ? 'opacity-60' : 'opacity-50'"
                >
                  {{ category.product_count }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Product Grid / Customer List -->
        <div
          ref="productGridRef"
          class="flex-1 overflow-y-auto p-4 md:p-3"
          @scroll="handleProductScroll"
        >
          <!-- Customer Selection Grid -->
          <div v-if="!selectedCustomer">
            <h2 class="text-lg font-semibold mb-4">Müşteri Seçin</h2>

            <!-- Customer Search -->
            <div class="relative mb-4">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                v-model="customerSearchQuery"
                type="text"
                placeholder="Müşteri ara..."
                class="pl-10 h-11 text-sm"
                @input="handleCustomerSearch"
              />
            </div>

            <div v-if="customerStore.isLoading" class="flex items-center justify-center py-12">
              <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
            </div>

            <div v-else-if="customerStore.customers.length === 0" class="text-center py-12">
              <Users class="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p class="text-sm text-muted-foreground">Müşteri bulunamadı</p>
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                v-for="customer in customerStore.customers"
                :key="customer.id"
                class="flex items-center gap-3 p-4 rounded-xl border bg-card text-left hover:bg-accent active:scale-[0.99] transition-all"
                @click="handleCustomerSelect(customer)"
              >
                <Avatar class="h-11 w-11">
                  <AvatarFallback :class="tierColors[customer.customer_tier]" class="text-sm font-semibold">
                    {{ getInitials(customer.company_name) }}
                  </AvatarFallback>
                </Avatar>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold truncate">{{ customer.company_name }}</p>
                  <p class="text-xs text-muted-foreground truncate">{{ customer.shipping_address?.city || customer.billing_address?.city || '-' }}</p>
                </div>
                <Badge variant="secondary" :class="['text-xs capitalize', TIER_BADGE_COLORS[customer.customer_tier]]">
                  {{ customer.customer_tier }}
                </Badge>
              </button>
            </div>

            <!-- Customer Load More -->
            <div v-if="customerStore.isLoading && customerStore.customers.length > 0" class="flex justify-center py-4">
              <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="customerStore.hasMore" class="flex justify-center py-4">
              <Button variant="outline" size="sm" @click="customerStore.loadMore()">
                <ChevronDown class="h-4 w-4 mr-1" />
                Daha Fazla Yükle
              </Button>
            </div>
          </div>

          <div v-else-if="productStore.isLoading" class="h-full flex items-center justify-center">
            <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>

          <div
            v-else-if="!productStore.hasProducts"
            class="h-full flex items-center justify-center"
          >
            <div class="text-center">
              <Search class="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <p class="text-muted-foreground">
                {{ searchQuery ? 'Ürün bulunamadı' : 'Ürün arayın veya barkod okutun' }}
              </p>
            </div>
          </div>

          <template v-else>
            <!-- Results Count -->
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm text-muted-foreground">
                {{ productStore.productCount }}<span v-if="productStore.totalCount > 0"> / {{ productStore.totalCount }}</span> ürün
              </p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
              <ProductCard
                v-for="product in productStore.displayProducts"
                :key="product.id"
                :product="product"
                @add="handleAddToCart"
                @quick-view="openProductDetail"
              />
            </div>

            <!-- Load More Button -->
            <div v-if="productStore.isLoadingMore" class="flex justify-center py-6">
              <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="productStore.hasMore && selectedCustomer" class="flex justify-center py-4">
              <Button
                variant="outline"
                size="sm"
                @click="productStore.loadMore(selectedCustomer!.id)"
              >
                <ChevronDown class="h-4 w-4 mr-1" />
                Daha Fazla Yükle
              </Button>
            </div>
          </template>
        </div>
      </div>

      <!-- Cart Panel - Desktop/Tablet (hidden on mobile) -->
      <div
        v-if="selectedCustomer"
        class="hidden md:flex md:w-80 lg:w-[340px] xl:w-[380px] bg-card border-l flex-col h-full min-h-0 pb-[calc(1rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]"
      >
        <!-- Cart Header -->
        <div class="px-4 py-3 border-b flex items-center justify-between">
          <div class="flex items-center gap-2">
            <ShoppingCart class="h-4 w-4 text-muted-foreground" />
            <span class="text-sm font-semibold">Sipariş Detayları</span>
            <Badge v-if="cartStore.itemCount > 0" class="h-5 min-w-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
              {{ cartStore.itemCount }}
            </Badge>
          </div>
          <Button
            v-if="!cartStore.isEmpty"
            variant="ghost"
            size="sm"
            class="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            @click="showClearCartConfirm = true"
          >
            Temizle
          </Button>
        </div>

        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto px-3">
          <div v-if="cartStore.isEmpty" class="h-full flex flex-col items-center justify-center p-4 text-center">
            <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
              <ShoppingCart class="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p class="text-sm text-muted-foreground">Sepetiniz boş</p>
            <p class="text-xs text-muted-foreground/70 mt-1">Ürün eklemek için tıklayın</p>
          </div>

          <div v-else>
            <CartItem
              v-for="(item, index) in cartStore.items"
              :key="`${item.product_id}-${item.unit_type}`"
              :item="item"
              @update="(qty) => handleUpdateQuantity(index, qty)"
              @remove="handleRemoveItem(index)"
              @unit-type-change="(type) => cartStore.updateItemUnitType(index, type)"
            />
          </div>
        </div>

        <!-- Cart Summary -->
        <CartSummary
          v-if="!cartStore.isEmpty"
          :subtotal="cartStore.subtotal"
          :discount="cartStore.totalDiscount"
          :vat-total="cartStore.vatTotal"
          :vat-breakdown="cartStore.vatBreakdown"
          :total="cartStore.total"
          :item-count="cartStore.itemCount"
          :box-count="cartStore.boxCount"
          :piece-count="cartStore.pieceCount"
          :notes="cartStore.notes"
          :can-checkout="canCheckout"
          :is-submitting="isSubmitting"
          @update:notes="cartStore.setNotes"
          @checkout="handleCheckout"
        />
      </div>

      <!-- Mobile Cart Button (floating) -->
      <button
        v-if="selectedCustomer"
        type="button"
        class="md:hidden fixed right-4 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-elevation-4 flex items-center justify-center touch-manipulation z-40 bottom-[calc(5rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]"
        @click="showMobileCart = true"
      >
        <ShoppingCart class="h-6 w-6" />
        <Badge
          v-if="cartStore.itemCount > 0"
          class="absolute -top-1 -right-1 h-6 min-w-6 px-1.5 text-xs bg-destructive text-destructive-foreground"
        >
          {{ cartStore.itemCount }}
        </Badge>
      </button>

      <!-- Mobile Cart Sheet -->
      <Sheet v-model:open="showMobileCart">
        <SheetContent side="bottom" class="h-[85vh] flex flex-col p-0">
          <SheetHeader class="px-4 py-3 border-b">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <ShoppingCart class="h-4 w-4 text-muted-foreground" />
                <SheetTitle class="text-base font-semibold">Sipariş Detayları</SheetTitle>
                <Badge v-if="cartStore.itemCount > 0" class="h-5 min-w-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                  {{ cartStore.itemCount }}
                </Badge>
              </div>
              <Button
                v-if="!cartStore.isEmpty"
                variant="ghost"
                size="sm"
                class="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                @click="showClearCartConfirm = true"
              >
                Temizle
              </Button>
            </div>
          </SheetHeader>

          <!-- Cart Items -->
          <div class="flex-1 overflow-y-auto px-3">
            <div v-if="cartStore.isEmpty" class="h-full flex flex-col items-center justify-center p-4 text-center">
              <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                <ShoppingCart class="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p class="text-sm text-muted-foreground">Sepetiniz boş</p>
              <p class="text-xs text-muted-foreground/70 mt-1">Ürün eklemek için tıklayın</p>
            </div>

            <div v-else>
              <CartItem
                v-for="(item, index) in cartStore.items"
                :key="`mobile-${item.product_id}-${item.unit_type}`"
                :item="item"
                @update="(qty) => handleUpdateQuantity(index, qty)"
                @remove="handleRemoveItem(index)"
                @unit-type-change="(type) => cartStore.updateItemUnitType(index, type)"
              />
            </div>
          </div>

          <!-- Cart Summary -->
          <div>
            <CartSummary
              v-if="!cartStore.isEmpty"
              :subtotal="cartStore.subtotal"
              :discount="cartStore.totalDiscount"
              :vat-total="cartStore.vatTotal"
              :vat-breakdown="cartStore.vatBreakdown"
              :total="cartStore.total"
              :item-count="cartStore.itemCount"
              :box-count="cartStore.boxCount"
              :piece-count="cartStore.pieceCount"
              :notes="cartStore.notes"
              :can-checkout="canCheckout"
              :is-submitting="isSubmitting"
              @update:notes="cartStore.setNotes"
              @checkout="handleMobileCheckout"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>

    <!-- Barcode Scanner Modal -->
    <BarcodeScanner
      v-if="showScanner"
      @scan="handleBarcodeScan"
      @close="showScanner = false"
    />

    <!-- Customer Detail Modal -->
    <Dialog v-model:open="showCustomerDetail">
      <DialogContent class="max-w-md">
        <DialogHeader class="text-center">
          <Avatar class="h-16 w-16 mx-auto mb-2">
            <AvatarFallback :class="customerDetail?.customer_tier ? tierColors[customerDetail.customer_tier] : 'bg-muted'" class="text-xl">
              {{ customerDetail ? getInitials(customerDetail.company_name) : '' }}
            </AvatarFallback>
          </Avatar>
          <DialogTitle>{{ customerDetail?.company_name }}</DialogTitle>
          <Badge variant="secondary" class="mx-auto capitalize">
            {{ customerDetail?.customer_tier }}
          </Badge>
        </DialogHeader>

        <!-- Tabs -->
        <Tabs v-model="customerDetailTab" class="mt-4">
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="info">Bilgi</TabsTrigger>
            <TabsTrigger value="orders">Siparişler ({{ customerDetail?.total_orders ?? 0 }})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" class="space-y-4 max-h-80 overflow-y-auto">
            <!-- Contact -->
            <div class="space-y-2">
              <h4 class="text-xs font-semibold text-muted-foreground uppercase">İletişim</h4>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Ad</span>
                <span class="text-sm font-medium">{{ customerDetail?.contact_name || '-' }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">E-posta</span>
                <span class="text-sm font-medium">{{ customerDetail?.contact_email || '-' }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Telefon</span>
                <span class="text-sm font-medium">{{ customerDetail?.contact_phone || '-' }}</span>
              </div>
            </div>

            <Separator />

            <!-- Address -->
            <div v-if="customerDetail?.shipping_address || customerDetail?.billing_address" class="space-y-2">
              <h4 class="text-xs font-semibold text-muted-foreground uppercase">Adres</h4>
              <template v-if="customerDetail?.shipping_address">
                <div class="flex justify-between py-1">
                  <span class="text-sm text-muted-foreground">Şehir</span>
                  <span class="text-sm font-medium">{{ customerDetail.shipping_address.city || '-' }}</span>
                </div>
                <div class="flex justify-between py-1">
                  <span class="text-sm text-muted-foreground">Adres</span>
                  <span class="text-sm font-medium text-right max-w-[200px]">{{ customerDetail.shipping_address.address || '-' }}</span>
                </div>
                <div class="flex justify-between py-1">
                  <span class="text-sm text-muted-foreground">Posta Kodu</span>
                  <span class="text-sm font-medium">{{ customerDetail.shipping_address.postal_code || '-' }}</span>
                </div>
              </template>
              <template v-else-if="customerDetail?.billing_address">
                <div class="flex justify-between py-1">
                  <span class="text-sm text-muted-foreground">Şehir</span>
                  <span class="text-sm font-medium">{{ customerDetail.billing_address.city || '-' }}</span>
                </div>
                <div class="flex justify-between py-1">
                  <span class="text-sm text-muted-foreground">Adres</span>
                  <span class="text-sm font-medium text-right max-w-[200px]">{{ customerDetail.billing_address.address || '-' }}</span>
                </div>
                <div class="flex justify-between py-1">
                  <span class="text-sm text-muted-foreground">Posta Kodu</span>
                  <span class="text-sm font-medium">{{ customerDetail.billing_address.postal_code || '-' }}</span>
                </div>
              </template>
            </div>

            <Separator v-if="customerDetail?.shipping_address || customerDetail?.billing_address" />

            <!-- Credit Info -->
            <div class="space-y-2">
              <h4 class="text-xs font-semibold text-muted-foreground uppercase">Kredi Bilgisi</h4>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Kredi Limiti</span>
                <span class="text-sm font-medium">{{ formatPrice(Number(customerDetail?.credit_limit) || 0) }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Mevcut Bakiye</span>
                <span class="text-sm font-medium">{{ formatPrice(Number(customerDetail?.current_balance) || 0) }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Kullanılabilir</span>
                <span class="text-sm font-medium text-green-600">{{ formatPrice(Number(customerDetail?.available_credit) || 0) }}</span>
              </div>
            </div>

            <Separator />

            <!-- Statistics -->
            <div class="space-y-2">
              <h4 class="text-xs font-semibold text-muted-foreground uppercase">İstatistikler</h4>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Toplam Sipariş</span>
                <span class="text-sm font-medium">{{ customerDetail?.total_orders ?? 0 }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">Toplam Harcama</span>
                <span class="text-sm font-medium text-green-600">{{ formatPrice(customerDetail?.total_spent ?? 0) }}</span>
              </div>
              <div v-if="customerDetail?.vat_number" class="flex justify-between py-1">
                <span class="text-sm text-muted-foreground">KDV No</span>
                <span class="text-sm font-medium">{{ customerDetail.vat_number }}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders" class="max-h-64 overflow-y-auto">
            <div v-if="!customerDetail?.recent_orders?.length" class="py-8 text-center">
              <p class="text-sm text-muted-foreground">Henüz sipariş yok</p>
            </div>
            <div v-else class="space-y-2">
              <router-link
                v-for="order in customerDetail.recent_orders"
                :key="order.id"
                :to="`/orders/${order.id}`"
                class="flex items-center justify-between py-3 px-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                @click="showCustomerDetail = false"
              >
                <div>
                  <p class="text-sm font-medium">{{ order.order_number }}</p>
                  <p class="text-xs text-muted-foreground">{{ formatDate(order.created_at) }}</p>
                </div>
                <div class="text-right">
                  <span class="text-sm font-semibold">{{ formatPrice(order.total) }}</span>
                  <p class="text-xs text-muted-foreground capitalize">{{ order.status }}</p>
                </div>
              </router-link>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button class="w-full" @click="showCustomerDetail = false">Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Order Success Modal -->
    <Dialog v-model:open="showOrderSuccess">
      <DialogContent class="max-w-sm text-center">
        <div
          class="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
          :class="savedOffline ? 'bg-amber-100' : 'bg-green-100'"
        >
          <CloudOff v-if="savedOffline" class="h-10 w-10 text-amber-600" />
          <CheckCircle v-else class="h-10 w-10 text-green-600" />
        </div>

        <DialogHeader>
          <DialogTitle>{{ savedOffline ? 'Sipariş Kaydedildi!' : 'Sipariş Verildi!' }}</DialogTitle>
          <DialogDescription>
            <template v-if="savedOffline">
              Sipariş çevrimdışı olarak kaydedildi. İnternet bağlantısı sağlandığında otomatik olarak gönderilecek.
            </template>
            <template v-else>
              Sipariş <span class="font-semibold text-foreground">{{ lastOrderNumber }}</span> başarıyla oluşturuldu
            </template>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="flex-col gap-2 sm:flex-col">
          <Button v-if="!savedOffline" class="w-full" @click="viewOrder">Siparişi Görüntüle</Button>
          <Button variant="outline" class="w-full" @click="handleOrderSuccessClose">Alışverişe Devam Et</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Clear Cart Confirmation Modal -->
    <Dialog v-model:open="showClearCartConfirm">
      <DialogContent class="max-w-sm text-center">
        <div class="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <Trash2 class="h-10 w-10 text-destructive" />
        </div>

        <DialogHeader>
          <DialogTitle>Sepeti Temizle</DialogTitle>
          <DialogDescription>
            Sepetinizdeki {{ cartStore.itemCount }} ürün silinecek. Bu işlem geri alınamaz.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter class="flex-col gap-2 sm:flex-col">
          <Button variant="destructive" class="w-full" @click="confirmClearCart">Sepeti Temizle</Button>
          <Button variant="outline" class="w-full" @click="showClearCartConfirm = false">Vazgeç</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Out of Stock Modal -->
    <Dialog v-model:open="showOutOfStockModal">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <div class="mx-auto w-14 h-14 bg-amber-100 dark:bg-amber-950 rounded-full flex items-center justify-center mb-3">
            <AlertTriangle class="h-7 w-7 text-amber-600" />
          </div>
          <DialogTitle class="text-center">Stokta Yok</DialogTitle>
          <p class="text-sm text-muted-foreground text-center">
            {{ outOfStockProduct?.name }}
          </p>
        </DialogHeader>

        <p class="text-sm text-muted-foreground text-center">
          Bu ürün şu anda stokta yok. Sepete eklemek için stoğa bağlı sipariş veya ön sipariş seçeneğini etkinleştirebilirsiniz.
        </p>

        <div class="space-y-2 mt-4">
          <!-- Backorder Option -->
          <button
            type="button"
            class="w-full flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
            :disabled="isUpdatingAvailability"
            @click="handleSetAvailability('backorder')"
          >
            <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Clock class="h-5 w-5 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold">Stoğa Bağlı</p>
              <p class="text-xs text-muted-foreground">Şimdi sipariş kabul et, stok gelince gönder</p>
            </div>
            <ChevronRight class="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </button>

          <!-- Preorder Option -->
          <button
            type="button"
            class="w-full flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
            :disabled="isUpdatingAvailability"
            @click="handleSetAvailability('preorder')"
          >
            <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Package class="h-5 w-5 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold">Ön Sipariş</p>
              <p class="text-xs text-muted-foreground">Yakında çıkacak ürün için sipariş kabul et</p>
            </div>
            <ChevronRight class="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </button>
        </div>

        <div class="pt-2">
          <Button
            variant="ghost"
            class="w-full"
            :disabled="isUpdatingAvailability"
            @click="showOutOfStockModal = false"
          >
            İptal
          </Button>
        </div>

        <!-- Loading overlay -->
        <div
          v-if="isUpdatingAvailability"
          class="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg"
        >
          <Loader2 class="h-6 w-6 animate-spin" />
        </div>
      </DialogContent>
    </Dialog>

    <!-- Product Detail Modal -->
    <Dialog v-model:open="showProductDetail">
      <DialogContent class="max-w-md">
        <div class="flex gap-4">
          <div class="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            <img
              v-if="productDetail?.image_url"
              :src="productDetail.image_url"
              :alt="productDetail.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <ImageIcon class="h-8 w-8 text-muted-foreground/30" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs text-muted-foreground mb-1">{{ productDetail?.sku }}</p>
            <DialogTitle class="text-base leading-snug">{{ productDetail?.name }}</DialogTitle>
          </div>
        </div>

        <Separator />

        <!-- Pricing -->
        <div class="space-y-3">
          <div v-if="productDetail && productDetail.pieces_per_box > 1" class="flex justify-between items-baseline">
            <span class="text-sm text-muted-foreground">Koli Fiyatı</span>
            <div class="text-right">
              <span class="text-lg font-bold text-primary">{{ formatPrice(productDetail.box_price || 0) }}</span>
              <span v-if="productDetail.total_discount_percent > 0" class="text-sm text-muted-foreground line-through ml-2">
                {{ formatPrice(productDetail.base_price * productDetail.pieces_per_box) }}
              </span>
            </div>
          </div>
          <div class="flex justify-between items-baseline">
            <span class="text-sm text-muted-foreground">Adet Fiyatı</span>
            <div class="text-right">
              <span class="text-base font-semibold">{{ formatPrice(productDetail?.piece_price || 0) }}</span>
              <span v-if="productDetail && productDetail.total_discount_percent > 0" class="text-sm text-muted-foreground line-through ml-2">
                {{ formatPrice(productDetail.base_price) }}
              </span>
            </div>
          </div>
          <div v-if="productDetail && productDetail.allow_broken_case && productDetail.broken_case_piece_price !== productDetail.piece_price" class="flex justify-between items-baseline">
            <span class="text-sm text-muted-foreground">Tek Adet Fiyatı</span>
            <span class="text-base font-semibold text-amber-600">{{ formatPrice(productDetail.broken_case_piece_price) }}</span>
          </div>
          <div v-if="productDetail && productDetail.pieces_per_box > 1" class="flex justify-between text-sm">
            <span class="text-muted-foreground">Koli İçeriği</span>
            <span>{{ productDetail.pieces_per_box }} adet</span>
          </div>
          <div class="flex justify-between text-sm items-center">
            <span class="text-muted-foreground">Stok Durumu</span>
            <div class="flex items-center gap-2">
              <span
                v-if="productDetail?.availability_status === 'backorder'"
                class="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
              >
                Stoğa Bağlı
              </span>
              <span
                v-else-if="productDetail?.availability_status === 'preorder'"
                class="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
              >
                Ön Sipariş
              </span>
              <span
                v-else
                :class="productDetail?.availability_status === 'in_stock' || productDetail?.availability_status === 'low_stock' ? 'text-green-600' : 'text-destructive'"
              >
                {{ productDetail?.availability_status === 'in_stock' || productDetail?.availability_status === 'low_stock' ? 'Stokta Var' : 'Stokta Yok' }}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter class="pt-2">
          <Button
            class="w-full"
            :disabled="!productDetail?.can_purchase"
            @click="addProductFromDetail"
          >
            Sepete Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Add to Cart Toast -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="showAddedToast"
        class="fixed left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 bottom-[calc(1rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]"
      >
        <CheckCircle class="h-4 w-4" />
        <span class="text-sm font-medium">Sepete eklendi</span>
      </div>
    </Transition>

    <!-- Undo Remove Toast -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="showUndoToast"
        class="fixed left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-3 bottom-[calc(1rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]"
      >
        <span class="text-sm">Ürün silindi</span>
        <button
          type="button"
          class="text-sm font-bold hover:underline px-2 py-1 -my-1 rounded hover:bg-white/20 transition-colors"
          @click.stop="handleUndoRemove"
        >
          Geri Al
        </button>
      </div>
    </Transition>

    <!-- Low Stock Warning Toast -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="showLowStockWarning"
        class="fixed left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 bottom-[calc(1rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]"
      >
        <AlertTriangle class="h-4 w-4" />
        <span class="text-sm font-medium">{{ lowStockMessage }}</span>
      </div>
    </Transition>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Search,
  Users,
  CheckCircle,
  X,
  QrCode,
  Loader2,
  Trash2,
  ImageIcon,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  Heart,
  Percent,
  Clock,
  Package,
  ChevronRight,
  ChevronDown,
  CloudOff,
} from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import ProductCard from '@/components/pos/ProductCard.vue'
import CartItem from '@/components/pos/CartItem.vue'
import CartSummary from '@/components/pos/CartSummary.vue'
import BarcodeScanner from '@/components/pos/BarcodeScanner.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useCartStore } from '@/stores/cart'
import { useProductStore } from '@/stores/products'
import { useCustomerStore } from '@/stores/customer'
import { useCategoryStore } from '@/stores/category'
import { useOfflineStore } from '@/stores/offline'
import { orderApi, customerApi, productApi } from '@/services/api'
import type { Customer, Product } from '@/types'

const router = useRouter()
const route = useRoute()
const cartStore = useCartStore()
const productStore = useProductStore()
const customerStore = useCustomerStore()
const categoryStore = useCategoryStore()
const offlineStore = useOfflineStore()

// Import tier colors from constants for consistency
import { TIER_COLORS, TIER_BADGE_COLORS } from '@/constants/customers'
const tierColors = TIER_COLORS

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

const selectedCustomer = ref<Customer | null>(null)
const searchQuery = ref('')
const customerSearchQuery = ref('')
const activeCategoryTab = ref<'search' | 'all' | 'best-sellers' | 'favorites' | 'discounted' | number>('best-sellers')
const showScanner = ref(false)
const showCustomerDetail = ref(false)
const customerDetailTab = ref('info')
const customerDetail = ref<Customer | null>(null)
const isSubmitting = ref(false)
const showOrderSuccess = ref(false)
const lastOrderId = ref<number | null>(null)
const lastOrderNumber = ref('')

// New UX features
const showMobileCart = ref(false)
const showClearCartConfirm = ref(false)
const showProductDetail = ref(false)
const productDetail = ref<Product | null>(null)
const showAddedToast = ref(false)
const showUndoToast = ref(false)
const showLowStockWarning = ref(false)
const lowStockMessage = ref('')
const productGridRef = ref<HTMLElement | null>(null)
let addedToastTimeout: ReturnType<typeof setTimeout> | null = null
let undoToastTimeout: ReturnType<typeof setTimeout> | null = null
let lowStockTimeout: ReturnType<typeof setTimeout> | null = null

// Out of stock modal
const showOutOfStockModal = ref(false)
const outOfStockProduct = ref<Product | null>(null)
const isUpdatingAvailability = ref(false)

const CUSTOMER_STORAGE_KEY = 'pos_selected_customer'

// Infinite scroll handler
function handleProductScroll(event: Event) {
  const target = event.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target

  // Load more when user is 200px from bottom
  if (scrollHeight - scrollTop - clientHeight < 200) {
    if (selectedCustomer.value && productStore.hasMore && !productStore.isLoadingMore) {
      productStore.loadMore(selectedCustomer.value.id)
    }
  }
}

let barcodeBuffer = ''
let barcodeTimeout: ReturnType<typeof setTimeout> | null = null
const BARCODE_TIMEOUT = 100

function handleCategorySelect(tab: 'all' | 'best-sellers' | 'favorites' | 'discounted' | number) {
  activeCategoryTab.value = tab
  searchQuery.value = ''

  if (!selectedCustomer.value) return

  if (tab === 'all') {
    productStore.loadAll(selectedCustomer.value.id)
  } else if (tab === 'best-sellers') {
    productStore.loadBestSellers(selectedCustomer.value.id)
  } else if (tab === 'favorites') {
    productStore.loadFavorites(selectedCustomer.value.id)
  } else if (tab === 'discounted') {
    productStore.loadDiscounted(selectedCustomer.value.id)
  } else {
    productStore.loadByCategory(selectedCustomer.value.id, tab)
  }
}

function saveCustomerToStorage(customer: Customer | null) {
  if (customer) {
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer))
  } else {
    localStorage.removeItem(CUSTOMER_STORAGE_KEY)
  }
}

function loadCustomerFromStorage(): Customer | null {
  const stored = localStorage.getItem(CUSTOMER_STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }
  return null
}

const canCheckout = computed(() => {
  return !!selectedCustomer.value && !cartStore.isEmpty
})

watch(selectedCustomer, (customer) => {
  if (customer) {
    cartStore.setCustomer(customer)
    categoryStore.fetchCategories()
    productStore.loadBestSellers(customer.id)
    activeCategoryTab.value = 'best-sellers'
  }
})

function handleCustomerSelect(customer: Customer) {
  selectedCustomer.value = customer
  saveCustomerToStorage(customer)
}

async function openCustomerDetail() {
  if (!selectedCustomer.value) return
  // Show modal immediately with existing data
  customerDetail.value = selectedCustomer.value
  customerDetailTab.value = 'info'
  showCustomerDetail.value = true

  // Fetch full details in background
  try {
    const fullData = await customerApi.get(selectedCustomer.value.id)
    customerDetail.value = fullData
  } catch (error) {
    console.error('Failed to fetch customer detail:', error)
  }
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function clearCustomer() {
  selectedCustomer.value = null
  saveCustomerToStorage(null)
  searchQuery.value = ''
  productStore.reset()
  cartStore.clear()
}

let customerSearchTimeout: ReturnType<typeof setTimeout> | null = null
let searchDebounceTimeout: ReturnType<typeof setTimeout> | null = null

function handleCustomerSearch() {
  if (customerSearchTimeout) {
    clearTimeout(customerSearchTimeout)
  }
  customerSearchTimeout = setTimeout(() => {
    customerStore.searchCustomers(customerSearchQuery.value)
  }, 300)
}

function handleSearchInput() {
  if (searchDebounceTimeout) {
    clearTimeout(searchDebounceTimeout)
  }
  searchDebounceTimeout = setTimeout(() => {
    handleSearch(searchQuery.value)
  }, 300)
}

function handleSearch(query: string) {
  if (!selectedCustomer.value) return
  activeCategoryTab.value = 'search'
  productStore.searchProducts(query, selectedCustomer.value.id)
}

function handleAddToCart(product: Product) {
  // Check if product is out of stock and can't be purchased
  if (!product.can_purchase) {
    outOfStockProduct.value = product
    showOutOfStockModal.value = true
    return
  }

  addProductToCart(product)
}

function addProductToCart(product: Product) {
  // Default to box if product has multiple pieces per box
  const piecesPerBox = product.pieces_per_box || 1
  const unitType = piecesPerBox > 1 ? 'box' : 'piece'
  const quantity = product.moq_quantity || 1

  // Check if product already exists in cart (any unit type)
  const existingItem = cartStore.items.find(
    item => item.product_id === product.id
  )

  // Calculate total pieces based on existing item's unit type
  const currentQty = existingItem ? existingItem.quantity : 0
  const existingUnitType = existingItem ? existingItem.unit_type : unitType
  const existingPiecesPerBox = existingItem?.pieces_per_box || piecesPerBox
  const currentPieces = existingUnitType === 'box' ? currentQty * existingPiecesPerBox : currentQty
  const addingPieces = unitType === 'box' ? quantity * piecesPerBox : quantity
  const totalPieces = currentPieces + addingPieces

  if (product.stock_quantity > 0 && totalPieces > product.stock_quantity) {
    // Show low stock warning and block add
    lowStockMessage.value = `Stokta sadece ${product.stock_quantity} adet var`
    showLowStockWarning.value = true
    if (lowStockTimeout) clearTimeout(lowStockTimeout)
    lowStockTimeout = setTimeout(() => {
      showLowStockWarning.value = false
    }, 3000)
    return // Don't add to cart
  }

  cartStore.addItem(product, quantity, unitType)

  // Show success toast
  showAddedToast.value = true
  if (addedToastTimeout) clearTimeout(addedToastTimeout)
  addedToastTimeout = setTimeout(() => {
    showAddedToast.value = false
  }, 2000)
}

async function handleSetAvailability(type: 'backorder' | 'preorder') {
  if (!outOfStockProduct.value) return

  isUpdatingAvailability.value = true

  try {
    const result = await productApi.updateAvailability(outOfStockProduct.value.id, type)
    console.log('Availability update result:', result)

    if (result.success) {
      // Update the product with new availability - it can now be purchased
      const updatedProduct: Product = {
        ...outOfStockProduct.value,
        ...(result.product || {}),
        // Ensure these are set even if API doesn't return them
        can_purchase: result.product?.can_purchase ?? true,
        allow_backorder: result.product?.allow_backorder ?? (type === 'backorder'),
        is_preorder: result.product?.is_preorder ?? (type === 'preorder'),
        availability_status: result.product?.availability_status ?? type,
      }

      productStore.updateProduct(updatedProduct)

      // Close modal and add to cart
      showOutOfStockModal.value = false
      addProductToCart(updatedProduct)
    } else {
      console.error('API returned success: false', result)
      // Show error toast
      lowStockMessage.value = result.message || 'Güncelleme başarısız oldu'
      showLowStockWarning.value = true
      if (lowStockTimeout) clearTimeout(lowStockTimeout)
      lowStockTimeout = setTimeout(() => {
        showLowStockWarning.value = false
      }, 3000)
    }
  } catch (error: any) {
    console.error('Failed to update availability:', error)
    // Show error toast
    lowStockMessage.value = error.response?.data?.message || 'Bir hata oluştu'
    showLowStockWarning.value = true
    if (lowStockTimeout) clearTimeout(lowStockTimeout)
    lowStockTimeout = setTimeout(() => {
      showLowStockWarning.value = false
    }, 3000)
  } finally {
    isUpdatingAvailability.value = false
  }
}

function openProductDetail(product: Product) {
  productDetail.value = product
  showProductDetail.value = true
}

function addProductFromDetail() {
  if (productDetail.value) {
    handleAddToCart(productDetail.value)
    showProductDetail.value = false
  }
}

function handleRemoveItem(index: number) {
  cartStore.removeItem(index)

  // Show undo toast
  showUndoToast.value = true
  if (undoToastTimeout) clearTimeout(undoToastTimeout)
  undoToastTimeout = setTimeout(() => {
    showUndoToast.value = false
    cartStore.clearLastRemoved()
  }, 5000)
}

function handleUpdateQuantity(index: number, newQty: number) {
  const item = cartStore.items[index]
  if (!item) return

  // Decreasing is always allowed
  if (newQty < item.quantity) {
    cartStore.updateQuantity(index, newQty)
    return
  }

  // Increasing - check stock only if product found with stock limit
  const product = productStore.displayProducts.find(p => p.id === item.product_id)

  if (product && product.stock_quantity > 0) {
    const piecesPerBox = item.pieces_per_box || 1
    const totalPieces = item.unit_type === 'box' ? newQty * piecesPerBox : newQty

    if (totalPieces > product.stock_quantity) {
      lowStockMessage.value = `Stokta sadece ${product.stock_quantity} adet var`
      showLowStockWarning.value = true
      if (lowStockTimeout) clearTimeout(lowStockTimeout)
      lowStockTimeout = setTimeout(() => {
        showLowStockWarning.value = false
      }, 3000)
      return
    }
  }

  cartStore.updateQuantity(index, newQty)
}

function handleUndoRemove() {
  cartStore.undoRemove()
  showUndoToast.value = false
  if (undoToastTimeout) clearTimeout(undoToastTimeout)
}

function confirmClearCart() {
  cartStore.clear()
  showClearCartConfirm.value = false
}

async function handleBarcodeScan(barcode: string) {
  if (!selectedCustomer.value) return

  showScanner.value = false
  const result = await productStore.findByBarcode(barcode, selectedCustomer.value.id)

  if (result.success && result.product) {
    const product = result.product
    const unitType = result.scanned_unit || product.moq_unit || 'box'
    const quantity = product.moq_quantity || 1
    cartStore.addItem(product, quantity, unitType)
  } else {
    console.error('Product not found for barcode:', barcode)
  }
}

function handleKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return
  }

  if (barcodeTimeout) {
    clearTimeout(barcodeTimeout)
  }

  if (event.key === 'Enter' && barcodeBuffer.length >= 4) {
    const barcode = barcodeBuffer
    barcodeBuffer = ''
    handleBarcodeScan(barcode)
    return
  }

  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    barcodeBuffer += event.key

    barcodeTimeout = setTimeout(() => {
      barcodeBuffer = ''
    }, BARCODE_TIMEOUT)
  }
}

const savedOffline = ref(false)

async function handleCheckout() {
  if (!canCheckout.value || !selectedCustomer.value) return

  isSubmitting.value = true
  savedOffline.value = false

  try {
    if (offlineStore.isOnline) {
      // Online: send to server
      const payload = cartStore.getOrderPayload()
      const result = await orderApi.create(payload)

      if (result.success) {
        lastOrderId.value = result.order_id
        lastOrderNumber.value = result.order_number
        showOrderSuccess.value = true
        cartStore.clear()
      }
    } else {
      // Offline: save locally
      const localId = await offlineStore.saveOrderOffline({
        customerId: selectedCustomer.value.id,
        customerName: selectedCustomer.value.company_name,
        items: cartStore.items.map(item => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          base_price: item.base_price,
          unit_type: item.unit_type,
          pieces_per_box: item.pieces_per_box,
          vat_rate: item.vat_rate,
        })),
        subtotal: cartStore.subtotal,
        vatTotal: cartStore.vatTotal,
        total: cartStore.total,
        notes: cartStore.notes,
      })

      lastOrderId.value = null
      lastOrderNumber.value = `OFFLINE-${localId}`
      savedOffline.value = true
      showOrderSuccess.value = true
      cartStore.clear()
    }
  } catch (error) {
    console.error('Failed to create order:', error)

    // If online request fails, try saving offline
    if (selectedCustomer.value) {
      try {
        const localId = await offlineStore.saveOrderOffline({
          customerId: selectedCustomer.value.id,
          customerName: selectedCustomer.value.company_name,
          items: cartStore.items.map(item => ({
            product_id: item.product_id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            base_price: item.base_price,
            unit_type: item.unit_type,
            pieces_per_box: item.pieces_per_box,
            vat_rate: item.vat_rate,
          })),
          subtotal: cartStore.subtotal,
          vatTotal: cartStore.vatTotal,
          total: cartStore.total,
          notes: cartStore.notes,
        })

        lastOrderId.value = null
        lastOrderNumber.value = `OFFLINE-${localId}`
        savedOffline.value = true
        showOrderSuccess.value = true
        cartStore.clear()
      } catch (offlineError) {
        console.error('Failed to save order offline:', offlineError)
      }
    }
  } finally {
    isSubmitting.value = false
  }
}

async function handleMobileCheckout() {
  showMobileCart.value = false
  await handleCheckout()
}

function handleOrderSuccessClose() {
  showOrderSuccess.value = false
  lastOrderId.value = null
  lastOrderNumber.value = ''
}

function viewOrder() {
  if (lastOrderId.value) {
    router.push(`/orders/${lastOrderId.value}`)
  }
  handleOrderSuccessClose()
}

onMounted(async () => {
  const storedCustomer = loadCustomerFromStorage()
  if (storedCustomer) {
    selectedCustomer.value = storedCustomer
    cartStore.setCustomer(storedCustomer)
    categoryStore.fetchCategories()
    productStore.loadBestSellers(storedCustomer.id)
    activeCategoryTab.value = 'best-sellers'
  }

  if (customerStore.customers.length === 0) {
    customerStore.fetchCustomers()
  }

  // Handle reorder from Orders page
  if (route.query.reorder === 'true') {
    const reorderData = sessionStorage.getItem('reorder_items')
    if (reorderData) {
      try {
        const { customer_id, items } = JSON.parse(reorderData)
        sessionStorage.removeItem('reorder_items')

        // Find and set customer if different
        if (customer_id && (!selectedCustomer.value || selectedCustomer.value.id !== customer_id)) {
          const customer = customerStore.customers.find(c => c.id === customer_id)
          if (customer) {
            selectedCustomer.value = customer
            saveCustomerToStorage(customer)
            cartStore.setCustomer(customer)
          }
        }

        // Add items to cart
        if (items && items.length > 0 && selectedCustomer.value) {
          for (const item of items) {
            // Fetch product details
            const response = await productApi.search(String(item.product_id), selectedCustomer.value.id)
            const product = response.products?.find((p: any) => p.id === item.product_id)
            if (product) {
              cartStore.addItem(product, item.quantity, item.unit_type || 'box')
            }
          }
        }

        // Clear the query param
        router.replace({ path: '/pos' })
      } catch (error) {
        console.error('Failed to process reorder:', error)
      }
    }
  }

  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (barcodeTimeout) {
    clearTimeout(barcodeTimeout)
  }
})
</script>
