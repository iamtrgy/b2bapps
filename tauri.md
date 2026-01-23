# Tauri POS App Documentation

A native Point of Sale (POS) application for macOS, iOS, and Android built with Tauri v2, Vue 3, Tailwind CSS, and Headless UI.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Authentication Flow](#authentication-flow)
4. [API Endpoints](#api-endpoints)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Structure](#frontend-structure)
7. [Development Setup](#development-setup)
8. [Building for Platforms](#building-for-platforms)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Tauri POS App                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Vue 3 + Tailwind CSS                     │  │
│  │              Headless UI Components                   │  │
│  │              Pinia (State Management)                 │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Native Webview (System)                  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Tauri Rust Core                          │  │
│  │              - Secure token storage                   │  │
│  │              - Native APIs                            │  │
│  │              - Camera access (barcode scanning)       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Laravel Backend                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              API Routes (/api/pos/*)                  │  │
│  │              Laravel Sanctum (Token Auth)             │  │
│  │              Multi-tenant (Stancl/Tenancy)            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend (Tauri App)
| Technology | Version | Purpose |
|------------|---------|---------|
| Tauri | v2.x | Native app wrapper (macOS, iOS, Android) |
| Vue | 3.x | UI framework |
| Tailwind CSS | 3.x | Styling |
| Headless UI | 1.x | Accessible UI components |
| Pinia | 2.x | State management |
| Vue Router | 4.x | Navigation |
| Axios | 1.x | HTTP client |

### Backend (Laravel)
| Technology | Purpose |
|------------|---------|
| Laravel Sanctum | API token authentication |
| Stancl/Tenancy | Multi-tenant support |
| Existing POS logic | Reuse SalesRepController logic |

---

## Authentication Flow

### Step 1: Tenant Identification

User enters tenant domain (supports both subdomain and custom domain):

```
┌─────────────────────────────────────┐
│         Welcome to POS              │
│                                     │
│  Enter your store domain:           │
│  ┌─────────────────────────────┐    │
│  │ testco.platform.com        │    │
│  └─────────────────────────────┘    │
│         or                          │
│  ┌─────────────────────────────┐    │
│  │ store.customdomain.com     │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Continue]                         │
└─────────────────────────────────────┘
```

**API Request:**
```http
POST /api/pos/tenant/verify
Content-Type: application/json

{
  "domain": "testco.platform.com"
}
```

**API Response (Success):**
```json
{
  "success": true,
  "tenant": {
    "id": "testco",
    "name": "Test Company",
    "company_name": "Test Company B.V.",
    "logo_url": "https://testco.platform.com/storage/logo.png",
    "api_base_url": "https://testco.platform.com/api/pos"
  }
}
```

**API Response (Custom Domain):**
```json
{
  "success": true,
  "tenant": {
    "id": "customstore",
    "name": "Custom Store",
    "company_name": "Custom Store Ltd.",
    "logo_url": "https://store.customdomain.com/storage/logo.png",
    "api_base_url": "https://store.customdomain.com/api/pos"
  }
}
```

**API Response (Error):**
```json
{
  "success": false,
  "message": "Store not found. Please check the domain and try again."
}
```

### Step 2: User Authentication

After tenant is verified, user enters credentials:

```
┌─────────────────────────────────────┐
│  [Logo]  Test Company               │
│                                     │
│  Email:                             │
│  ┌─────────────────────────────┐    │
│  │ john@example.com           │    │
│  └─────────────────────────────┘    │
│                                     │
│  Password:                          │
│  ┌─────────────────────────────┐    │
│  │ ••••••••••                 │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Sign In]                          │
└─────────────────────────────────────┘
```

**API Request:**
```http
POST {api_base_url}/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "secret123",
  "device_name": "iPhone 15 Pro"
}
```

**API Response (Success):**
```json
{
  "success": true,
  "token": "1|abc123xyz...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "sales_representative"
  },
  "permissions": {
    "can_create_orders": true,
    "can_view_all_customers": false,
    "can_apply_discounts": true,
    "can_assign_barcodes": true
  }
}
```

**API Response (Error):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Step 3: Token Storage

After successful login, store token securely using Tauri's secure storage:

```typescript
// Using Tauri's secure storage (Keychain on macOS/iOS, Keystore on Android)
import { Store } from '@tauri-apps/plugin-store';

const store = new Store('.credentials.dat');
await store.set('auth_token', token);
await store.set('api_base_url', apiBaseUrl);
await store.set('tenant', tenant);
await store.save();
```

### Step 4: Authenticated Requests

All subsequent API requests include the token:

```http
GET {api_base_url}/customers
Authorization: Bearer 1|abc123xyz...
Content-Type: application/json
Accept: application/json
```

---

## API Endpoints

### Base URL
```
https://{tenant_domain}/api/pos
```

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/tenant/verify` | Verify tenant domain (called on central domain) | No |
| POST | `/auth/login` | Login and get token | No |
| POST | `/auth/logout` | Invalidate current token | Yes |
| POST | `/auth/logout-all` | Invalidate all user tokens | Yes |
| POST | `/auth/refresh` | Refresh token (get new token) | Yes |
| GET | `/auth/user` | Get current user info | Yes |

**Note:** The `/tenant/verify` endpoint is called on the central domain (e.g., `platform.com`), while all other endpoints are called on the tenant domain (e.g., `testco.platform.com`).

### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers` | List customers (paginated) |
| GET | `/customers?search={query}` | Search customers |
| GET | `/customers/{id}` | Get customer details |

**GET /customers Response:**
```json
{
  "data": [
    {
      "id": 1,
      "company_name": "ACME Corp",
      "contact_name": "John Doe",
      "contact_email": "john@acme.com",
      "contact_phone": "+31612345678",
      "customer_tier": "gold",
      "credit_limit": 10000.00,
      "current_balance": 2500.00
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 20,
    "total": 100
  }
}
```

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products/search?q={query}&customer_id={id}` | Search products |
| GET | `/products/barcode/{barcode}?customer_id={id}` | Find product by barcode |
| GET | `/products/best-sellers?customer_id={id}` | Get best selling products |
| GET | `/products/favorites?customer_id={id}` | Get customer's favorite products |
| GET | `/products/discounted?customer_id={id}` | Get discounted products |

**GET /products/search Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Product Name",
      "sku": "SKU-001",
      "barcode": "8710123456789",
      "barcode_box": "8710123456790",
      "image_url": "https://...",
      "customer_price": 10.50,
      "original_price": 12.00,
      "discount": 1.50,
      "pricing_source": "customer_price_list",
      "vat_rate": {
        "id": 1,
        "rate": 21.00
      },
      "stock_quantity": 150,
      "availability_status": "in_stock",
      "can_purchase": true,
      "moq_quantity": 1,
      "moq_unit": "box",
      "pieces_per_box": 12,
      "allow_broken_case": true
    }
  ],
  "total": 50,
  "hasMore": true
}
```

### Promotions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/promotions?customer_id={id}` | List all active promotions for customer |
| POST | `/promotions/applicable` | Get applicable promotions for cart items |
| POST | `/promotions/validate-coupon` | Validate a coupon code |

**GET /promotions Response:**
```json
{
  "success": true,
  "promotions": [
    {
      "id": 1,
      "name": "Summer Sale 20%",
      "code": "SUMMER20",
      "type": "percentage",
      "value": 20,
      "description": "20% off",
      "minimum_order_value": 50.00,
      "ends_at": "2026-08-31T23:59:59+00:00"
    }
  ]
}
```

**POST /promotions/applicable Request:**
```json
{
  "customer_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 5,
      "price": 10.50
    }
  ],
  "coupon_code": "SUMMER20"
}
```

**POST /promotions/applicable Response:**
```json
{
  "success": true,
  "promotions": [
    {
      "id": 1,
      "name": "Summer Sale 20%",
      "type": "percentage",
      "discount_amount": 10.50,
      "description": "20% off"
    }
  ],
  "discount_total": 10.50,
  "final_total": 42.00
}
```

**POST /promotions/validate-coupon Request:**
```json
{
  "customer_id": 1,
  "coupon_code": "SUMMER20",
  "order_total": 100.00
}
```

**POST /promotions/validate-coupon Response:**
```json
{
  "success": true,
  "valid": true,
  "promotion": {
    "id": 1,
    "name": "Summer Sale 20%",
    "type": "percentage",
    "value": 20,
    "description": "20% off",
    "minimum_order_value": 50.00
  }
}
```

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | List orders (paginated) |
| GET | `/orders/{id}` | Get order details |
| POST | `/orders` | Create new order |
| POST | `/orders/{id}/send-to-afas` | Sync order to AFAS |

**POST /orders Request:**
```json
{
  "customer_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 5,
      "price": 10.50,
      "original_price": 12.00,
      "unit_type": "box",
      "vat_rate": 21.00
    }
  ],
  "notes": "Deliver before noon",
  "applied_promotions": [
    {
      "promotion_id": 1,
      "discount_amount": 10.50
    }
  ]
}
```

**POST /orders Response:**
```json
{
  "success": true,
  "order_id": 123,
  "order_number": "POS-2026-0001",
  "message": "Order created successfully"
}
```

### Barcode Assignment

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/barcode-assignment/products` | List products for barcode assignment |
| POST | `/barcode-assignment/{product}/update` | Update product barcode |
| POST | `/barcode-assignment/{product}/clear` | Clear product barcode |

---

## Backend Implementation

### Implementation Status: ✅ COMPLETE

All backend API controllers and routes have been implemented. Here are the files:

**Controllers:**
- `app/Http/Controllers/Api/Pos/AuthController.php` - Authentication (tenant verify, login, logout, refresh)
- `app/Http/Controllers/Api/Pos/CustomerController.php` - Customer listing and details
- `app/Http/Controllers/Api/Pos/ProductController.php` - Product search, barcode lookup, best-sellers, favorites, discounted
- `app/Http/Controllers/Api/Pos/OrderController.php` - Order listing, creation, AFAS sync
- `app/Http/Controllers/Api/Pos/PromotionController.php` - Promotions listing, cart applicability, coupon validation
- `app/Http/Controllers/Api/Pos/BarcodeController.php` - Barcode assignment management

**Routes:**
- `routes/api-pos.php` - All POS API routes
- `routes/tenant.php` - POS routes registered under tenant middleware
- `routes/central.php` - Tenant verification endpoint (central domain)

---

### 1. Install Laravel Sanctum (if not already)

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

### 2. Create API Routes

Create `routes/api-pos.php`:

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Pos\AuthController;
use App\Http\Controllers\Api\Pos\CustomerController;
use App\Http\Controllers\Api\Pos\ProductController;
use App\Http\Controllers\Api\Pos\OrderController;
use App\Http\Controllers\Api\Pos\PromotionController;
use App\Http\Controllers\Api\Pos\BarcodeController;

// Tenant verification (no auth required)
Route::post('/tenant/verify', [AuthController::class, 'verifyTenant']);

// Authentication
Route::post('/auth/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware(['auth:sanctum', 'role:sales_representative|admin'])->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'user']);

    // Customers
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::get('/customers/{customer}', [CustomerController::class, 'show']);

    // Products
    Route::get('/products/search', [ProductController::class, 'search']);
    Route::get('/products/barcode/{barcode}', [ProductController::class, 'findByBarcode']);
    Route::get('/products/best-sellers', [ProductController::class, 'bestSellers']);
    Route::get('/products/favorites', [ProductController::class, 'favorites']);
    Route::get('/products/discounted', [ProductController::class, 'discounted']);

    // Promotions
    Route::post('/promotions', [PromotionController::class, 'getApplicable']);

    // Orders
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::post('/orders/{order}/send-to-afas', [OrderController::class, 'sendToAfas']);

    // Barcode Assignment
    Route::get('/barcode-assignment/products', [BarcodeController::class, 'products']);
    Route::post('/barcode-assignment/{product}/update', [BarcodeController::class, 'update']);
    Route::post('/barcode-assignment/{product}/clear', [BarcodeController::class, 'clear']);
});
```

### 3. Register Routes in RouteServiceProvider

In `app/Providers/RouteServiceProvider.php`, add:

```php
Route::middleware(['api', 'tenant'])
    ->prefix('api/pos')
    ->group(base_path('routes/api-pos.php'));
```

### 4. Create Auth Controller

Create `app/Http/Controllers/Api/Pos/AuthController.php`:

```php
<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Stancl\Tenancy\Database\Models\Domain;

class AuthController extends Controller
{
    /**
     * Verify tenant domain exists
     */
    public function verifyTenant(Request $request)
    {
        $request->validate([
            'domain' => 'required|string',
        ]);

        $domain = $request->domain;

        // Remove protocol if present
        $domain = preg_replace('#^https?://#', '', $domain);
        $domain = rtrim($domain, '/');

        // Find domain
        $domainRecord = Domain::where('domain', $domain)->first();

        if (!$domainRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Store not found. Please check the domain and try again.',
            ], 404);
        }

        $tenant = $domainRecord->tenant;

        return response()->json([
            'success' => true,
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'company_name' => $tenant->company_name,
                'logo_url' => $tenant->logo_url,
                'api_base_url' => 'https://' . $domain . '/api/pos',
            ],
        ]);
    }

    /**
     * Login and issue token
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'device_name' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials',
            ], 401);
        }

        // Check if user has sales_representative or admin role
        if (!$user->hasAnyRole(['sales_representative', 'admin'])) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to access the POS system',
            ], 403);
        }

        // Revoke old tokens for this device
        $user->tokens()->where('name', $request->device_name)->delete();

        // Create new token
        $token = $user->createToken($request->device_name)->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->roles->first()?->name,
            ],
            'permissions' => [
                'can_create_orders' => true,
                'can_view_all_customers' => $user->hasRole('admin'),
                'can_apply_discounts' => true,
                'can_assign_barcodes' => true,
            ],
        ]);
    }

    /**
     * Logout and revoke token
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get current user info
     */
    public function user(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->roles->first()?->name,
        ]);
    }
}
```

### 5. Create Product Controller

Create `app/Http/Controllers/Api/Pos/ProductController.php`:

```php
<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Product;
use App\Services\PricingService;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    protected PricingService $pricingService;

    public function __construct(PricingService $pricingService)
    {
        $this->pricingService = $pricingService;
    }

    /**
     * Search products
     */
    public function search(Request $request)
    {
        $request->validate([
            'q' => 'nullable|string|min:1',
            'customer_id' => 'required|exists:customers,id',
        ]);

        $customer = $this->getAuthorizedCustomer($request->customer_id);

        $query = Product::active()
            ->with(['vatRate:id,name,rate', 'unit:id,name,abbreviation', 'productUnits']);

        if ($request->filled('q')) {
            $search = $request->q;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhere('barcode_box', 'like', "%{$search}%");
            });
        }

        $products = $query->limit(50)->get();

        $this->enrichProductsWithPricing($products, $customer);

        return response()->json([
            'products' => $products,
            'total' => $products->count(),
            'hasMore' => false,
        ]);
    }

    /**
     * Find product by barcode
     */
    public function findByBarcode(Request $request, string $barcode)
    {
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
        ]);

        $customer = $this->getAuthorizedCustomer($request->customer_id);

        $product = Product::active()
            ->with(['vatRate:id,name,rate', 'unit:id,name,abbreviation', 'productUnits'])
            ->where(function ($q) use ($barcode) {
                $q->where('barcode', $barcode)
                  ->orWhere('barcode_box', $barcode);
            })
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
            ], 404);
        }

        $this->enrichProductsWithPricing(collect([$product]), $customer);

        // Determine if scanned barcode was box or piece
        $scannedUnit = $product->barcode_box === $barcode ? 'box' : 'piece';

        return response()->json([
            'success' => true,
            'product' => $product,
            'scanned_unit' => $scannedUnit,
        ]);
    }

    /**
     * Get best selling products
     */
    public function bestSellers(Request $request)
    {
        // Reuse logic from SalesRepController::getBestSellers
        // ...
    }

    /**
     * Get discounted products
     */
    public function discounted(Request $request)
    {
        // Reuse logic from SalesRepController::getDiscountedProducts
        // ...
    }

    /**
     * Enrich products with pricing info
     */
    protected function enrichProductsWithPricing($products, Customer $customer): void
    {
        $products->each(function ($product) use ($customer) {
            // Stock info
            $stock = $product->getAvailableStock();
            $product->stock_quantity = is_array($stock)
                ? ($stock['available_quantity'] ?? 0)
                : ($stock->available_quantity ?? 0);

            // Availability
            $availability = $product->getAvailabilityStatus();
            $product->availability_status = $availability['status'];
            $product->can_purchase = $availability['can_purchase'];

            // MOQ
            $moq = $product->moq()
                ->where(function ($q) use ($customer) {
                    $q->where('customer_tier', $customer->customer_tier ?? 'bronze')
                      ->orWhere('customer_tier', 'all');
                })
                ->orderBy('customer_tier', 'desc')
                ->first();

            $productUnits = $product->productUnits;
            $piecesPerBox = $productUnits?->pieces_per_box ?? 1;

            $product->moq_quantity = $moq->moq_quantity ?? 1;
            $product->moq_unit = $moq->moq_unit ?? ($piecesPerBox > 1 ? 'box' : 'piece');
            $product->pieces_per_box = $piecesPerBox;
            $product->allow_broken_case = ($moq?->allow_broken_case ?? false) || ($productUnits?->allow_broken_case ?? false);

            // Pricing
            $pricing = $this->pricingService->getBestPrice($product, $customer, 1);
            $product->customer_price = $pricing['price'];
            $product->original_price = $pricing['original_price'];
            $product->discount = $pricing['discount'];
            $product->pricing_source = $pricing['source'];
        });
    }

    /**
     * Get authorized customer (respects sales rep assignment)
     */
    protected function getAuthorizedCustomer(int $customerId): Customer
    {
        $user = auth()->user();

        $query = Customer::where('id', $customerId);

        if (!$user->hasRole('admin')) {
            $query->where(function ($q) use ($user) {
                $q->where('sales_rep_id', $user->id)
                  ->orWhereHas('salesReps', function ($sq) use ($user) {
                      $sq->where('users.id', $user->id);
                  });
            });
        }

        return $query->firstOrFail();
    }
}
```

### 6. Create Order Controller

Create `app/Http/Controllers/Api/Pos/OrderController.php`:

```php
<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Models\SalesOrder;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    /**
     * List orders
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        $query = SalesOrder::with(['customer:id,company_name', 'items'])
            ->where('order_source', 'pos')
            ->latest();

        // Filter by sales rep if not admin
        if (!$user->hasRole('admin')) {
            $query->where('created_by', $user->id);
        }

        $orders = $query->paginate(20);

        return response()->json($orders);
    }

    /**
     * Get order details
     */
    public function show(SalesOrder $order)
    {
        $this->authorizeOrder($order);

        $order->load(['customer', 'items.product', 'creator']);

        return response()->json($order);
    }

    /**
     * Create order
     */
    public function store(Request $request)
    {
        // Reuse logic from SalesRepController::createOrder
        // Return JSON response instead of redirect
    }

    /**
     * Send order to AFAS
     */
    public function sendToAfas(SalesOrder $order)
    {
        // Reuse logic from SalesRepController::sendToAfas
    }

    protected function authorizeOrder(SalesOrder $order): void
    {
        $user = auth()->user();

        if (!$user->hasRole('admin') && $order->created_by !== $user->id) {
            abort(403, 'Unauthorized');
        }
    }
}
```

---

## Frontend Structure

### Project Structure

```
tauri-pos-app/
├── src/
│   ├── assets/
│   │   └── logo.svg
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   │   ├── Button.vue
│   │   │   ├── Input.vue
│   │   │   ├── Modal.vue
│   │   │   ├── Select.vue
│   │   │   ├── Toast.vue
│   │   │   └── Loading.vue
│   │   ├── pos/                   # POS-specific components
│   │   │   ├── ProductCard.vue
│   │   │   ├── ProductSearch.vue
│   │   │   ├── CartItem.vue
│   │   │   ├── CartSummary.vue
│   │   │   ├── CustomerSelect.vue
│   │   │   ├── BarcodeScanner.vue
│   │   │   ├── QuantityEditor.vue
│   │   │   └── PromotionBadge.vue
│   │   └── layout/
│   │       ├── AppHeader.vue
│   │       └── AppLayout.vue
│   ├── composables/               # Vue composables (reusable logic)
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   ├── useCart.ts
│   │   ├── useProducts.ts
│   │   └── useBarcode.ts
│   ├── stores/                    # Pinia stores
│   │   ├── auth.ts
│   │   ├── cart.ts
│   │   ├── customer.ts
│   │   └── products.ts
│   ├── views/                     # Page components
│   │   ├── LoginView.vue
│   │   ├── TenantView.vue
│   │   ├── PosView.vue
│   │   ├── OrdersView.vue
│   │   ├── OrderDetailView.vue
│   │   └── BarcodeAssignmentView.vue
│   ├── router/
│   │   └── index.ts
│   ├── services/
│   │   └── api.ts                 # Axios instance & API calls
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces
│   ├── App.vue
│   └── main.ts
├── src-tauri/
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/
│       └── default.json
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

### Key Components

#### 1. Auth Store (`stores/auth.ts`)

```typescript
import { defineStore } from 'pinia';
import { Store } from '@tauri-apps/plugin-store';
import api from '@/services/api';

interface Tenant {
  id: string;
  name: string;
  company_name: string;
  logo_url: string | null;
  api_base_url: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    tenant: null as Tenant | null,
    user: null as User | null,
    token: null as string | null,
    isAuthenticated: false,
  }),

  actions: {
    async verifyTenant(domain: string) {
      const response = await api.post('/tenant/verify', { domain });
      if (response.data.success) {
        this.tenant = response.data.tenant;
        api.defaults.baseURL = this.tenant.api_base_url;
        return true;
      }
      throw new Error(response.data.message);
    },

    async login(email: string, password: string) {
      const response = await api.post('/auth/login', {
        email,
        password,
        device_name: await this.getDeviceName(),
      });

      if (response.data.success) {
        this.token = response.data.token;
        this.user = response.data.user;
        this.isAuthenticated = true;

        // Store credentials securely
        const store = new Store('.credentials.dat');
        await store.set('token', this.token);
        await store.set('tenant', this.tenant);
        await store.set('api_base_url', this.tenant?.api_base_url);
        await store.save();

        // Set auth header
        api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;

        return true;
      }
      throw new Error(response.data.message);
    },

    async logout() {
      try {
        await api.post('/auth/logout');
      } catch (e) {
        // Ignore errors
      }

      this.token = null;
      this.user = null;
      this.isAuthenticated = false;

      const store = new Store('.credentials.dat');
      await store.clear();
      await store.save();

      delete api.defaults.headers.common['Authorization'];
    },

    async restoreSession() {
      const store = new Store('.credentials.dat');
      const token = await store.get<string>('token');
      const tenant = await store.get<Tenant>('tenant');
      const apiBaseUrl = await store.get<string>('api_base_url');

      if (token && tenant && apiBaseUrl) {
        this.token = token;
        this.tenant = tenant;
        api.defaults.baseURL = apiBaseUrl;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        try {
          const response = await api.get('/auth/user');
          this.user = response.data;
          this.isAuthenticated = true;
          return true;
        } catch (e) {
          await this.logout();
        }
      }
      return false;
    },

    async getDeviceName(): Promise<string> {
      // Get device info from Tauri
      const { platform, arch } = await import('@tauri-apps/plugin-os');
      return `${await platform()}-${await arch()}`;
    },
  },
});
```

#### 2. Cart Store (`stores/cart.ts`)

```typescript
import { defineStore } from 'pinia';
import type { Product, CartItem } from '@/types';

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
    customerId: null as number | null,
    notes: '',
  }),

  getters: {
    itemCount: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),

    subtotal: (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),

    totalDiscount: (state) => state.items.reduce((sum, item) => {
      const discount = (item.original_price - item.price) * item.quantity;
      return sum + discount;
    }, 0),

    total: (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  },

  actions: {
    addItem(product: Product, quantity: number = 1, unitType: 'piece' | 'box' = 'box') {
      const existing = this.items.find(item =>
        item.product_id === product.id && item.unit_type === unitType
      );

      if (existing) {
        existing.quantity += quantity;
      } else {
        const piecesPerBox = product.pieces_per_box || 1;
        let price = product.customer_price;
        let originalPrice = product.original_price;

        // Adjust price for box
        if (unitType === 'box' && piecesPerBox > 1) {
          price *= piecesPerBox;
          originalPrice *= piecesPerBox;
        }

        this.items.unshift({
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          image_url: product.image_url,
          price,
          original_price: originalPrice,
          quantity,
          unit_type: unitType,
          pieces_per_box: piecesPerBox,
          vat_rate: product.vat_rate?.rate || 0,
        });
      }
    },

    updateQuantity(index: number, quantity: number) {
      if (quantity <= 0) {
        this.items.splice(index, 1);
      } else {
        this.items[index].quantity = quantity;
      }
    },

    removeItem(index: number) {
      this.items.splice(index, 1);
    },

    clear() {
      this.items = [];
      this.notes = '';
    },

    setCustomer(customerId: number) {
      this.customerId = customerId;
      this.clear(); // Clear cart when customer changes (prices may differ)
    },
  },
});
```

#### 3. POS View (`views/PosView.vue`)

```vue
<template>
  <AppLayout>
    <div class="h-screen flex flex-col md:flex-row">
      <!-- Products Panel -->
      <div class="flex-1 flex flex-col bg-gray-50">
        <!-- Customer & Search -->
        <div class="p-4 bg-white border-b space-y-3">
          <CustomerSelect v-model="selectedCustomer" />
          <ProductSearch
            v-model="searchQuery"
            @scan="handleBarcodeScan"
          />
        </div>

        <!-- Product Grid -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <ProductCard
              v-for="product in products"
              :key="product.id"
              :product="product"
              @add="addToCart"
            />
          </div>
        </div>
      </div>

      <!-- Cart Panel -->
      <div class="w-full md:w-96 bg-white border-l flex flex-col">
        <div class="p-4 border-b">
          <h2 class="text-lg font-semibold">Cart</h2>
        </div>

        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto">
          <CartItem
            v-for="(item, index) in cartStore.items"
            :key="index"
            :item="item"
            @update="(qty) => cartStore.updateQuantity(index, qty)"
            @remove="cartStore.removeItem(index)"
          />
        </div>

        <!-- Cart Summary -->
        <CartSummary
          :subtotal="cartStore.subtotal"
          :discount="cartStore.totalDiscount"
          :total="cartStore.total"
          @checkout="handleCheckout"
        />
      </div>
    </div>

    <!-- Barcode Scanner Modal -->
    <BarcodeScanner
      v-if="showScanner"
      @scan="handleBarcodeScan"
      @close="showScanner = false"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useCartStore } from '@/stores/cart';
import { useProducts } from '@/composables/useProducts';
import AppLayout from '@/components/layout/AppLayout.vue';
import CustomerSelect from '@/components/pos/CustomerSelect.vue';
import ProductSearch from '@/components/pos/ProductSearch.vue';
import ProductCard from '@/components/pos/ProductCard.vue';
import CartItem from '@/components/pos/CartItem.vue';
import CartSummary from '@/components/pos/CartSummary.vue';
import BarcodeScanner from '@/components/pos/BarcodeScanner.vue';

const cartStore = useCartStore();
const { products, searchProducts, findByBarcode } = useProducts();

const selectedCustomer = ref(null);
const searchQuery = ref('');
const showScanner = ref(false);

watch(searchQuery, (query) => {
  if (selectedCustomer.value) {
    searchProducts(query, selectedCustomer.value.id);
  }
});

async function handleBarcodeScan(barcode: string) {
  if (!selectedCustomer.value) return;

  const result = await findByBarcode(barcode, selectedCustomer.value.id);
  if (result.success) {
    addToCart(result.product, result.scanned_unit);
  }
}

function addToCart(product: Product, unitType: 'piece' | 'box' = 'box') {
  cartStore.addItem(product, 1, unitType);
}

async function handleCheckout() {
  // Create order
}
</script>
```

---

## Development Setup

### Prerequisites

- Node.js 18+
- Rust (latest stable)
- Xcode (for iOS/macOS)
- Android Studio (for Android)

### 1. Create Tauri Project

```bash
# Create new Tauri + Vue project
npm create tauri-app@latest tauri-pos-app -- --template vue-ts

cd tauri-pos-app
```

### 2. Install Dependencies

```bash
# Frontend dependencies
npm install vue-router@4 pinia axios
npm install @headlessui/vue @heroicons/vue
npm install -D tailwindcss postcss autoprefixer
npm install -D @tailwindcss/forms

# Tauri plugins
npm install @tauri-apps/plugin-store
npm install @tauri-apps/plugin-os
npm install @tauri-apps/plugin-http

# Initialize Tailwind
npx tailwindcss init -p
```

### 3. Configure Tailwind

`tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

### 4. Configure Tauri

`src-tauri/tauri.conf.json`:
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "POS App",
  "version": "1.0.0",
  "identifier": "com.yourcompany.pos",
  "build": {
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

### 5. Run Development

```bash
# Run in development mode
npm run tauri dev
```

---

## Building for Platforms

### macOS

```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/macos/
```

### iOS

```bash
# Initialize iOS project
npm run tauri ios init

# Run on simulator
npm run tauri ios dev

# Build for App Store
npm run tauri ios build
```

### Android

```bash
# Initialize Android project
npm run tauri android init

# Run on emulator
npm run tauri android dev

# Build APK
npm run tauri android build
```

---

## Security Considerations

1. **Token Storage**: Use Tauri's secure storage (Keychain/Keystore)
2. **HTTPS Only**: All API calls must use HTTPS
3. **Token Expiration**: Implement token refresh mechanism
4. **Certificate Pinning**: Consider for production builds
5. **Biometric Auth**: Optional - unlock app with Face ID/Touch ID

---

## Checklist

### Backend
- [x] Install Laravel Sanctum
- [x] Create `routes/api-pos.php`
- [x] Create `AuthController` with tenant verification
- [x] Create `ProductController` with search and barcode lookup
- [x] Create `OrderController` for order management
- [x] Create `CustomerController` for customer listing
- [x] Create `PromotionController` for promotions
- [x] Create `BarcodeController` for barcode assignment
- [ ] Test all API endpoints with Postman/Insomnia

### Frontend
- [ ] Setup Tauri project with Vue 3
- [ ] Configure Tailwind CSS + Headless UI
- [ ] Implement auth flow (tenant → login)
- [ ] Create Pinia stores (auth, cart, products)
- [ ] Build POS view with product search
- [ ] Implement cart functionality
- [ ] Add barcode scanner (camera)
- [ ] Create order submission flow
- [ ] Add orders list and detail views
- [ ] Implement barcode assignment view

### Testing
- [ ] Test on macOS
- [ ] Test on iOS Simulator
- [ ] Test on Android Emulator
- [ ] Test with real devices
- [ ] Performance testing
- [ ] Security audit

---

## Resources

- [Tauri v2 Documentation](https://v2.tauri.app/)
- [Vue 3 Documentation](https://vuejs.org/)
- [Headless UI Vue](https://headlessui.com/vue/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Laravel Sanctum](https://laravel.com/docs/sanctum)
- [Pinia](https://pinia.vuejs.org/)
