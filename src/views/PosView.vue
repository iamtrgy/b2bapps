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
                v-if="!isEditMode && !isReturnMode"
                type="button"
                class="p-1 rounded hover:bg-background/50 transition-colors"
                @click="handleClearCustomer"
              >
                <X class="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            <!-- Satış / İade Toggle -->
            <div v-if="!isEditMode" class="flex items-center bg-muted rounded-lg p-0.5">
              <button
                type="button"
                class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                :class="!isReturnMode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'"
                @click="isReturnMode ? exitReturnMode() : null"
              >
                Satış
              </button>
              <button
                type="button"
                class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                :class="isReturnMode
                  ? 'bg-destructive text-destructive-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'"
                @click="!isReturnMode ? handleReturnToggle() : null"
              >
                İade
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
                @focus="handleSearchFocus"
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
          <div class="px-3 pb-3 relative">
            <div
              class="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
              @wheel.prevent="handleCategoryWheel"
            >
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

              <div class="w-px bg-border self-stretch my-1" />

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
            <div class="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none" />
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
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm text-muted-foreground">
                {{ productStore.productCount }}<span v-if="productStore.totalCount > 0"> / {{ productStore.totalCount }}</span> ürün
              </p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
              <ProductCard
                v-for="product in productStore.displayProducts"
                :key="product.id"
                v-memo="[product.id, product.can_purchase, product.total_discount_percent, product.piece_price, product.box_price, product.availability_status]"
                :product="product"
                @add="handleAddToCart"
                @quick-view="openProductDetail"
              />
            </div>

            <div v-if="productStore.isLoadingMore" class="flex justify-center py-6">
              <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
            <div v-else-if="productStore.hasMore && selectedCustomer" class="flex justify-center py-4">
              <Button
                variant="outline"
                size="sm"
                @click="productStore.loadMore(selectedCustomer.id)"
              >
                <ChevronDown class="h-4 w-4 mr-1" />
                Daha Fazla Yükle
              </Button>
            </div>
          </template>
        </div>
      </div>

      <!-- Cart Panel - Desktop/Tablet -->
      <div
        v-if="selectedCustomer"
        class="hidden md:flex md:w-80 lg:w-[340px] xl:w-[380px] bg-card border-l flex-col h-full min-h-0 pb-[calc(1rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]"
      >
        <!-- Edit Mode Banner -->
        <div v-if="isEditMode" class="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Pencil class="h-3.5 w-3.5 text-amber-600" />
            <span class="text-xs font-medium text-amber-800 dark:text-amber-200">Sipariş düzenleniyor</span>
          </div>
          <Button variant="ghost" size="sm" class="h-7 px-2 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900" @click="cancelEditMode">
            İptal
          </Button>
        </div>

        <!-- Return Mode Banner -->
        <div v-if="isReturnMode" class="px-4 py-2 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <RotateCcw class="h-3.5 w-3.5 text-red-600" />
            <span class="text-xs font-medium text-red-800 dark:text-red-200">
              İade Modu
              <span v-if="cartStore.returnReferenceOrderId" class="text-red-600 dark:text-red-400">
                (#{{ cartStore.returnReferenceOrderId }})
              </span>
            </span>
          </div>
          <Button variant="ghost" size="sm" class="h-7 px-2 text-xs text-red-700 dark:text-red-300 hover:text-red-900" @click="exitReturnMode">
            İptal
          </Button>
        </div>

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
              :customer-id="selectedCustomer?.id"
              :stock-warning="getStockWarning(item.product_id)"
              @update="(qty, price, boxP, pieceP) => handleUpdateQuantity(index, qty, price, boxP, pieceP)"
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
          :checkout-label="isEditMode ? 'Siparişi Güncelle' : 'Sipariş Ver'"
          :is-return-mode="isReturnMode"
          :stock-warnings="stockWarnings"
          @update:notes="cartStore.setNotes"
          @checkout="showCheckoutConfirm = true"
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
        <SheetContent side="bottom" class="h-[85vh] flex flex-col !px-0 !pt-0">
          <!-- Edit Mode Banner (Mobile) -->
          <div v-if="isEditMode" class="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Pencil class="h-3.5 w-3.5 text-amber-600" />
              <span class="text-xs font-medium text-amber-800 dark:text-amber-200">Sipariş düzenleniyor</span>
            </div>
            <Button variant="ghost" size="sm" class="h-7 px-2 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900" @click="cancelEditMode">
              İptal
            </Button>
          </div>

          <!-- Return Mode Banner (Mobile) -->
          <div v-if="isReturnMode" class="px-4 py-2 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <RotateCcw class="h-3.5 w-3.5 text-red-600" />
              <span class="text-xs font-medium text-red-800 dark:text-red-200">
                İade Modu
                <span v-if="cartStore.returnReferenceOrderId" class="text-red-600 dark:text-red-400">
                  (#{{ cartStore.returnReferenceOrderId }})
                </span>
              </span>
            </div>
            <Button variant="ghost" size="sm" class="h-7 px-2 text-xs text-red-700 dark:text-red-300 hover:text-red-900" @click="exitReturnMode">
              İptal
            </Button>
          </div>

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
                :customer-id="selectedCustomer?.id"
                :stock-warning="getStockWarning(item.product_id)"
                @update="(qty, price, boxP, pieceP) => handleUpdateQuantity(index, qty, price, boxP, pieceP)"
                @remove="handleRemoveItem(index)"
                @unit-type-change="(type) => cartStore.updateItemUnitType(index, type)"
              />
            </div>
          </div>

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
              :checkout-label="isEditMode ? 'Siparişi Güncelle' : 'Sipariş Ver'"
              :is-return-mode="isReturnMode"
              :stock-warnings="stockWarnings"
              @update:notes="cartStore.setNotes"
              @checkout="showMobileCheckoutConfirm"
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

        <Tabs v-model="customerDetailTab" class="mt-4">
          <TabsList class="grid w-full grid-cols-2">
            <TabsTrigger value="info">Bilgi</TabsTrigger>
            <TabsTrigger value="orders">Siparişler ({{ customerDetail?.total_orders ?? 0 }})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" class="space-y-4 max-h-80 overflow-y-auto">
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

    <!-- Extracted Dialog Components -->
    <OrderSuccessDialog
      v-model:open="showOrderSuccess"
      :order-number="lastOrderNumber"
      :saved-offline="savedOffline"
      :is-update="orderJustUpdated"
      :is-return="orderJustReturned"
      @close="handleOrderSuccessClose"
      @view-order="viewOrder"
    />

    <ClearCartDialog
      v-model:open="showClearCartConfirm"
      :item-count="cartStore.itemCount"
      @confirm="confirmClearCart"
    />

    <CheckoutConfirmDialog
      v-model:open="showCheckoutConfirm"
      :is-edit-mode="isEditMode"
      :is-return-mode="isReturnMode"
      :item-count="cartStore.itemCount"
      :total="cartStore.total"
      @confirm="confirmCheckout"
    />

    <ReturnableOrdersDialog
      v-model:open="showReturnableOrders"
      :orders="returnableOrders"
      :is-loading="isLoadingReturnableOrders"
      @select="selectReturnableOrder"
      @skip="skipReturnableOrderSelection"
    />

    <OutOfStockDialog
      v-model:open="showOutOfStockModal"
      :product="outOfStockProduct"
      :is-updating="isUpdatingAvailability"
      @set-availability="handleSetAvailability"
    />

    <ProductDetailDialog
      v-model:open="showProductDetail"
      :product="productDetail"
      :history="productDetailHistory"
      :is-loading-history="isLoadingProductHistory"
      @add-to-cart="addProductFromDetail"
    />

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
        class="fixed left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 bottom-[calc(6rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))] md:bottom-[calc(1rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]"
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
        class="fixed left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-3 bottom-[calc(6rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))] md:bottom-[calc(1rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]"
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
        class="fixed left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 bottom-[calc(6rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))] md:bottom-[calc(1rem+var(--safe-area-bottom,env(safe-area-inset-bottom,0px)))]"
      >
        <AlertTriangle class="h-4 w-4" />
        <span class="text-sm font-medium">{{ lowStockMessage }}</span>
      </div>
    </Transition>
  </AppLayout>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Search,
  Users,
  CheckCircle,
  X,
  QrCode,
  Loader2,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  Heart,
  Percent,
  ChevronDown,
  Pencil,
  RotateCcw,
} from 'lucide-vue-next'
import AppLayout from '@/components/layout/AppLayout.vue'
import ProductCard from '@/components/pos/ProductCard.vue'
import CartItem from '@/components/pos/CartItem.vue'
import CartSummary from '@/components/pos/CartSummary.vue'
import BarcodeScanner from '@/components/pos/BarcodeScanner.vue'
import OrderSuccessDialog from '@/components/pos/OrderSuccessDialog.vue'
import ClearCartDialog from '@/components/pos/ClearCartDialog.vue'
import CheckoutConfirmDialog from '@/components/pos/CheckoutConfirmDialog.vue'
import ReturnableOrdersDialog from '@/components/pos/ReturnableOrdersDialog.vue'
import OutOfStockDialog from '@/components/pos/OutOfStockDialog.vue'
import ProductDetailDialog from '@/components/pos/ProductDetailDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
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
import { orderApi } from '@/services/api'
import { TIER_COLORS, TIER_BADGE_COLORS } from '@/constants/customers'
import { useFormatters } from '@/composables/useFormatters'
import { useCustomerCache } from '@/composables/useCustomerCache'
import { useBarcodeScan } from '@/composables/pos/useBarcodeScan'
import { useProductBrowsing } from '@/composables/pos/useProductBrowsing'
import { useCustomerSelection } from '@/composables/pos/useCustomerSelection'
import { useCartOperations } from '@/composables/pos/useCartOperations'
import { useCheckout } from '@/composables/pos/useCheckout'
import { useReturnMode } from '@/composables/pos/useReturnMode'
import { logger } from '@/utils/logger'

const route = useRoute()
const cartStore = useCartStore()
const productStore = useProductStore()
const customerStore = useCustomerStore()
const categoryStore = useCategoryStore()
const tierColors = TIER_COLORS

const { formatPrice, formatDate } = useFormatters()
const { getInitials } = useCustomerCache()

// --- Composables ---

const {
  selectedCustomer,
  customerSearchQuery,
  showCustomerDetail,
  customerDetailTab,
  customerDetail,
  handleCustomerSelect,
  openCustomerDetail,
  clearCustomer,
  handleCustomerSearch,
  saveCustomerToStorage,
  loadCustomerFromStorage,
} = useCustomerSelection()

const {
  searchQuery,
  activeCategoryTab,
  productGridRef,
  handleProductScroll,
  handleSearchFocus,
  handleCategoryWheel,
  handleCategorySelect,
  handleSearchInput,
  handleSearch,
} = useProductBrowsing(selectedCustomer)

const {
  showMobileCart,
  showAddedToast,
  showUndoToast,
  showLowStockWarning,
  lowStockMessage,
  showOutOfStockModal,
  outOfStockProduct,
  isUpdatingAvailability,
  showProductDetail,
  productDetail,
  productDetailHistory,
  isLoadingProductHistory,
  stockWarnings,
  getStockWarning,
  showErrorToast,
  handleAddToCart,
  handleRemoveItem,
  handleUpdateQuantity,
  handleUndoRemove,
  handleSetAvailability,
  openProductDetail,
  addProductFromDetail,
} = useCartOperations(selectedCustomer)

const {
  isSubmitting,
  showOrderSuccess,
  lastOrderNumber,
  showCheckoutConfirm,
  showClearCartConfirm,
  savedOffline,
  orderJustUpdated,
  orderJustReturned,
  isEditMode,
  canCheckout,
  confirmCheckout,
  showMobileCheckoutConfirm,
  confirmClearCart,
  cancelEditMode,
  handleOrderSuccessClose,
  viewOrder,
} = useCheckout({
  selectedCustomer,
  showMobileCart,
  showErrorToast,
})

const {
  showReturnableOrders,
  returnableOrders,
  isLoadingReturnableOrders,
  isReturnMode,
  handleReturnToggle,
  selectReturnableOrder,
  skipReturnableOrderSelection,
  exitReturnMode,
} = useReturnMode(selectedCustomer)

const { showScanner, handleBarcodeScan } = useBarcodeScan({
  selectedCustomer,
  showErrorToast,
})

// --- Orchestration ---

// Reset category tab when customer changes
watch(selectedCustomer, (customer) => {
  if (customer) {
    activeCategoryTab.value = 'best-sellers'
  }
})

function handleClearCustomer() {
  clearCustomer()
  searchQuery.value = ''
}

onMounted(async () => {
  const editOrderId = route.query.editOrderId
  if (editOrderId) {
    try {
      const order = await orderApi.get(Number(editOrderId))
      cartStore.loadOrderForEditing(order)

      if (order.customer) {
        selectedCustomer.value = order.customer
        saveCustomerToStorage(order.customer)
      }
    } catch (error) {
      logger.error('Failed to load order for editing:', error)
    }
  } else {
    const storedCustomer = loadCustomerFromStorage()
    if (storedCustomer) {
      selectedCustomer.value = storedCustomer
    }
  }

  if (customerStore.customers.length === 0) {
    await customerStore.fetchCustomers()
  }
})
</script>
