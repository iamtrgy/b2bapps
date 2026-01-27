# UI Kit - B2B POS App

## Color Palette

### Base Colors
```css
--background: 40 20% 96%        /* Warm light gray - #f7f5f2 */
--foreground: 0 0% 10%          /* Near black - #1a1a1a */
--card: 0 0% 100%               /* Pure white */
--card-foreground: 0 0% 10%     /* Near black */
```

### Accent Colors
```css
--primary: 32 60% 58%           /* Warm amber - #d4a574 */
--primary-foreground: 0 0% 100% /* White */
--secondary: 40 15% 92%         /* Light warm gray */
--secondary-foreground: 0 0% 20%
```

### Semantic Colors
```css
--destructive: 0 72% 51%        /* Red - #e53935 */
--muted: 40 10% 90%             /* Muted warm gray */
--muted-foreground: 0 0% 45%    /* Medium gray */
--border: 40 10% 88%            /* Subtle border */
```

---

## Typography

### Font Sizes
| Name | Size | Usage |
|------|------|-------|
| `text-xs` | 12px | Badges, meta info |
| `text-sm` | 14px | Secondary text, buttons |
| `text-base` | 16px | Body text |
| `text-lg` | 18px | Card titles |
| `text-xl` | 20px | Section headers |
| `text-2xl` | 24px | Page titles |

### Font Weights
- `font-normal` (400) - Body text
- `font-medium` (500) - Labels, buttons
- `font-semibold` (600) - Card titles
- `font-bold` (700) - Prices, totals

---

## Spacing

### Standard Spacing Scale
| Class | Value | Usage |
|-------|-------|-------|
| `gap-2` | 8px | Tight spacing (icons, badges) |
| `gap-3` | 12px | Card internal spacing |
| `gap-4` | 16px | Section spacing |
| `gap-6` | 24px | Large section gaps |
| `p-3` | 12px | Card padding (compact) |
| `p-4` | 16px | Card padding (normal) |
| `p-6` | 24px | Panel padding |

---

## Components

### 1. Product Card
```
┌─────────────────────────┐
│  ┌───────────────┐  [⤢] │  <- Expand icon top-right
│  │               │      │
│  │    IMAGE      │      │  <- Light gray bg (#f5f3f0)
│  │               │      │
│  └───────────────┘      │
│                         │
│  Product Name           │  <- text-base font-semibold
│  €12,83/koli (12)       │  <- text-sm text-muted
│                         │
│  €48,00         [+]     │  <- Price left, add btn right
└─────────────────────────┘

- Card: bg-white rounded-xl shadow-sm border
- Image area: aspect-[4/3] bg-[#f5f3f0] rounded-lg
- Add button: w-10 h-10 bg-foreground text-white rounded-lg
```

### 2. Cart Item
```
┌──────────────────────────────────────────────────┐
│ ┌────┐  Product Name                        [🗑] │
│ │IMG │  Koli • %15 indirim                       │
│ └────┘  €48,00    [✎]  [−]  2  [+]              │
└──────────────────────────────────────────────────┘

- Container: py-4 border-b
- Image: w-16 h-16 rounded-lg bg-[#f5f3f0]
- Delete: w-8 h-8 bg-destructive/10 text-destructive rounded-full
- Quantity buttons: w-8 h-8 border rounded-lg
```

### 3. Category Tab
```
┌─────────────┐  ┌─────────────────┐  ┌───────────┐
│  All  27    │  │  Coffee  [14]   │  │  Snack 8  │
└─────────────┘  └─────────────────┘  └───────────┘
     inactive         active              inactive

- Inactive: bg-transparent text-muted-foreground
- Active: bg-white text-foreground shadow-sm
- Active badge: bg-primary text-white px-2 rounded-md
```

### 4. Buttons

#### Primary Button (Pay Now style)
```
bg-primary text-white font-medium rounded-xl h-12
hover:bg-primary/90
```

#### Secondary Button (Open Bill style)
```
bg-white border text-foreground font-medium rounded-xl h-12
hover:bg-muted
```

#### Icon Button (Add to cart)
```
w-10 h-10 bg-foreground text-white rounded-lg
hover:bg-foreground/90
flex items-center justify-center
```

#### Quantity Button
```
w-8 h-8 border rounded-lg
hover:bg-muted
flex items-center justify-center
```

---

## Layout

### POS View Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header: Logo, Store, Tabs, Date, User                   │
├─────────────────────────────────────┬───────────────────┤
│                                     │                   │
│  Products Grid                      │  Order Details    │
│  (4 columns on desktop)             │  (Fixed width)    │
│                                     │                   │
│  - Category tabs                    │  - Cart items     │
│  - Search                           │  - Summary        │
│  - Product cards                    │  - Actions        │
│                                     │                   │
└─────────────────────────────────────┴───────────────────┘

- Products panel: flex-1 bg-background
- Cart panel: w-[380px] bg-white border-l
```

### Grid
```
Mobile: grid-cols-2
Tablet: grid-cols-3
Desktop: grid-cols-4
Gap: gap-4
```

---

## Shadows

```css
shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)
```

---

## Border Radius

```css
rounded-lg: 8px   /* Buttons, small elements */
rounded-xl: 12px  /* Cards */
rounded-2xl: 16px /* Large cards, panels */
```

---

## Wholesale-Specific Adaptations

Since this is a wholesale app (not restaurant POS):

| Restaurant | Wholesale |
|------------|-----------|
| Size: Small | Unit: Koli/Adet |
| Sugar: Normal | Discount: %15 |
| Dine In/Take Away | - |
| Table selection | Customer selection |
| Pay Now | Sipariş Ver |
| Open Bill | - |
