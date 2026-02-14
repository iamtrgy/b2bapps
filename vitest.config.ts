import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      include: ['src/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,vue}'],
        exclude: [
          'src/components/ui/**',
          'src/components/layout/**',
          'src/components/offline/**',
          'src/components/customers/**',
          'src/constants/ui.ts',
          'src/main.ts',
          'src/vite-env.d.ts',
          'src/types/**',
          'src/services/api.ts',
          'src/views/BarcodeAssignmentView.vue',
          'src/views/CustomersView.vue',
          'src/views/OrderDetailView.vue',
          'src/views/PosView.vue',
          'src/components/pos/BarcodeScanner.vue',
          'src/components/pos/ProductSearch.vue',
          'src/components/pos/PromotionBadge.vue',
          'src/components/pos/QuantityEditor.vue',
          'src/components/pos/ProductCard.vue',
          'src/components/pos/CartItem.vue',
          '**/*.d.ts',
          '**/*.test.ts',
        ],
      },
    },
  })
)
