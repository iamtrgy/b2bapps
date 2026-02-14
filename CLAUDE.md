# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B2B wholesale POS (Point of Sale) desktop/mobile app built with **Tauri 2 + Vue 3 + TypeScript**. Multi-tenant architecture with offline-first capabilities. UI language is Turkish.

## Build & Dev Commands

```bash
npm run tauri dev          # Start Tauri desktop app with Vite dev server (port 1420)
npm run dev                # Start Vite dev server only (no Tauri shell)
npm run build              # Type-check (vue-tsc --noEmit) + Vite production build
npm run tauri build        # Full production build with Tauri bundling
```

**Important:** Never run `vite build` directly — use `npm run tauri dev` for development. The build command runs `vue-tsc --noEmit` first, so all TypeScript errors must be resolved before building.

## Architecture

### State Management (Pinia - Composition API)
- **auth.ts** — Tenant verification, login/logout, token persistence via Tauri Store plugin. Sets `api.defaults.baseURL` dynamically per tenant.
- **cart.ts** — Cart items, customer assignment, pricing (subtotal/VAT/discount), order payload generation. Supports edit mode (existing orders) and return mode (İade).
- **products.ts** — Product catalog with tabs (search, all, category, best-sellers, favorites, discounted). Pagination with offset/hasMore. Offline fallback.
- **customer.ts** — Customer list, search, selection. Paginated.
- **offline.ts** — Network detection (`navigator.onLine`), IndexedDB caching, pending order sync queue.

### API Layer (`src/services/api.ts`)
Single axios instance with dynamic `baseURL` set at login. 401 interceptor dispatches `auth:unauthorized` event. All endpoints are namespaced: `productApi`, `customerApi`, `orderApi`, `authApi`, `categoryApi`, `promotionApi`.

### Offline Support (`src/services/db.ts`)
IndexedDB database `pos_offline_db` with stores: products, customers, categories, pending_orders, orders, sync_meta. Products are cached per customer (customer-specific pricing).

### Routing (`src/router/index.ts`)
Auth guard with session restoration. Flow: `/tenant` → `/login` → `/pos`. All views except tenant/login require authentication.

## Key Patterns

- All components use `<script setup lang="ts">` with Composition API
- Stores use `defineStore('name', () => { ... })` setup syntax
- UI components are shadcn-vue (in `src/components/ui/`)
- Pricing is multi-level: base → price list → promotion → customer-specific, with VAT breakdown by rate
- Cart stores positive amounts; returns display negative with `-` prefix
- Unit types: `piece` or `box` with `pieces_per_box` conversion
- Tenant feature flags: `afas_enabled`, `broken_case_enabled`

## Backend

Laravel API at `b2becommerce/` repo (github.com/iamtrgy/b2becommerce). POS endpoints under `Api/Pos/` controllers. AFAS ERP integration for order sync. Central tenant API at `b2bnord.com/api/pos/tenant/verify`.

## CI/CD

GitHub Actions workflow (`.github/workflows/build.yml`) triggers on push to main. Builds: macOS ARM64, macOS Intel, Windows x64, Android APK (signed). Artifacts uploaded; releases created on version tags.
