/**
 * UI Design System Constants
 *
 * Standard sizes for consistent UI across the app.
 * Mobile-first approach with tablet (md:) overrides.
 */

// ===========================================
// TEXT SIZES
// ===========================================
export const TEXT = {
  // Page titles
  pageTitle: 'text-lg md:text-base font-semibold',

  // Section headers
  sectionTitle: 'text-sm md:text-xs font-medium text-muted-foreground uppercase',

  // Card/Item titles
  cardTitle: 'text-sm md:text-xs font-semibold',

  // Body text
  body: 'text-sm md:text-xs',

  // Small/secondary text
  small: 'text-xs md:text-[10px] text-muted-foreground',

  // Tiny text (badges, labels)
  tiny: 'text-[10px] md:text-[9px]',

  // Price text
  price: 'text-sm md:text-xs font-semibold',
  priceLarge: 'text-base md:text-sm font-bold',
} as const

// ===========================================
// ICON SIZES
// ===========================================
export const ICON = {
  // Large icons (empty states, headers)
  lg: 'h-12 w-12 md:h-10 md:w-10',

  // Medium icons (buttons, nav)
  md: 'h-5 w-5 md:h-4 md:w-4',

  // Small icons (inline, badges)
  sm: 'h-4 w-4 md:h-3.5 md:w-3.5',

  // Tiny icons (inside badges)
  xs: 'h-3 w-3 md:h-2.5 md:w-2.5',
} as const

// ===========================================
// SPACING
// ===========================================
export const SPACING = {
  // Page padding
  page: 'p-4 md:p-3',

  // Card/container padding
  card: 'p-4 md:p-3',
  cardCompact: 'p-3 md:p-2',

  // Grid gaps
  grid: 'gap-3 md:gap-2',
  gridTight: 'gap-2 md:gap-1.5',

  // Margin bottom
  mb: 'mb-4 md:mb-3',
  mbSmall: 'mb-3 md:mb-2',

  // Space between items
  spaceY: 'space-y-3 md:space-y-2',
  spaceYTight: 'space-y-2 md:space-y-1.5',
} as const

// ===========================================
// COMPONENTS
// ===========================================
export const COMPONENT = {
  // Input heights
  inputHeight: 'h-11 md:h-9',
  inputHeightSmall: 'h-9 md:h-8',

  // Button heights
  buttonHeight: 'h-11 md:h-9',
  buttonHeightSmall: 'h-9 md:h-8',
  buttonHeightTiny: 'h-8 md:h-7',

  // Avatar sizes
  avatarLg: 'h-14 w-14 md:h-12 md:w-12',
  avatarMd: 'h-11 w-11 md:h-9 md:w-9',
  avatarSm: 'h-9 w-9 md:h-8 md:w-8',

  // Touch targets (min size for mobile)
  touchTarget: 'min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px]',
  touchTargetSmall: 'min-h-[36px] min-w-[36px] md:min-h-[28px] md:min-w-[28px]',

  // Badge
  badge: 'text-xs md:text-[10px]',
  badgeSmall: 'text-[10px] md:text-[9px]',

  // Tabs
  tabsList: 'h-10 md:h-8',
  tabsTrigger: 'text-sm md:text-xs px-4 md:px-2.5',
} as const

// ===========================================
// GRID LAYOUTS
// ===========================================
export const GRID = {
  // Customer/Order cards
  cards: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',

  // Product grid
  products: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5',

  // Customer selection in POS
  customerSelect: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
} as const

// ===========================================
// CARD STYLES
// ===========================================
export const CARD = {
  // Base card style
  base: 'rounded-xl md:rounded-lg border bg-card',

  // Interactive card (button)
  interactive: 'rounded-xl md:rounded-lg border bg-card text-left hover:bg-accent active:scale-[0.99] transition-all',

  // Card padding
  padding: 'p-4 md:p-3',
} as const
