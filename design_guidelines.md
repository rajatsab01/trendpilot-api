# Trend Pilot - Design Guidelines

## Design Approach

**Selected Approach**: Design System with Fintech-Focused Customization

**Justification**: Trend Pilot is a utility-focused financial application where trust, clarity, and efficiency are paramount. Users need to make quick trading decisions based on clear data visualization. The design follows a custom system optimized for financial data display, drawing inspiration from modern fintech apps like Robinhood and Zerodha while maintaining unique brand identity.

**Core Principles**:
- Data clarity over decoration
- Trust through consistency and professionalism
- Efficiency in user workflows
- Mobile-first responsive design
- Accessibility with high contrast ratios

---

## Color Palette

### Dark Mode (Primary)
**Background Colors**:
- Primary Background: `145 19% 8%` (#111714) - Main app background
- Secondary Background: `145 19% 12%` (#1c2620) - Cards and elevated surfaces
- Tertiary Background: `145 19% 16%` (#29382f) - Input fields and nested elements
- Border/Divider: `145 19% 20%` (#334139) - Subtle separators

**Brand & Accent Colors**:
- Primary Green: `145 77% 55%` (#38e07b) - CTAs, active states, positive sentiment
- Success Green: `145 77% 65%` - Lighter variant for highlights
- Error Red: `0 84% 60%` - Stop loss, negative sentiment, alerts
- Warning Amber: `38 92% 50%` - Caution states, pending actions
- Info Blue: `200 70% 50%` - Informational elements (use sparingly)

**Text Colors**:
- Primary Text: `0 0% 100%` - Headings, important data
- Secondary Text: `145 25% 70%` (#9eb7a8) - Labels, descriptions
- Tertiary Text: `145 25% 50%` (#6a7f72) - Placeholders, disabled states

### Light Mode (Optional/Future)
Not required for MVP - focus on dark mode excellence.

---

## Typography

**Font Families**:
- Primary: 'Spline Sans' - Modern geometric sans-serif for UI elements
- Secondary: 'Manrope' - Clean rounded sans for data-heavy sections
- Fallback: -apple-system, BlinkMacSystemFont, sans-serif

**Type Scale**:
- Display: text-3xl (30px), font-bold, tracking-tight - Welcome headlines
- Heading 1: text-2xl (24px), font-bold, tracking-tight - Section headers
- Heading 2: text-xl (20px), font-bold - Screen titles
- Heading 3: text-lg (18px), font-bold - Card titles
- Body Large: text-base (16px), font-medium - Primary content, button labels
- Body: text-base (16px), font-normal - Default text
- Body Small: text-sm (14px), font-normal - Secondary information
- Caption: text-xs (12px), font-normal - Disclaimers, metadata

**Data/Numbers Typography**:
- Large Numbers: text-5xl (48px), font-black - Token counts, percentages
- Medium Numbers: text-2xl (24px), font-bold - Prices, indicators
- Small Numbers: text-lg (18px), font-medium - Data points

---

## Layout System

**Spacing Primitives** (Tailwind units):
Use exclusively: `2, 4, 6, 8, 12, 16, 20, 24, 32` for consistency

**Common Patterns**:
- Screen padding: `px-4` (mobile), `px-6` (tablet+)
- Card padding: `p-4` or `p-6`
- Section gaps: `space-y-6` or `space-y-8`
- Component gaps: `gap-4`
- Bottom navigation: `pb-3 pt-2`

**Grid Systems**:
- Single column: Default mobile layout
- Two column: `grid-cols-2 gap-3` - Trade parameters (Entry/TP/SL)
- Three column: `grid-cols-3 gap-3` - Bracket order cards
- Responsive: Stack to single column on mobile always

**Container Widths**:
- Mobile: Full width with `px-4` padding
- Max content width: `max-w-md mx-auto` for centered forms
- Full bleed: `w-full` for navigation and headers

---

## Component Library

### Navigation
**Bottom Navigation Bar**:
- Sticky bottom position with border-top
- Background: `bg-[#1c2620]`
- 3-4 navigation items with icons and labels
- Active state: Primary green color (#38e07b)
- Inactive state: Secondary text color (#9eb7a8)
- Icon size: 24px Material Symbols Outlined
- Safe area padding: `h-5 bg-[#1c2620]` below nav

**Top Header**:
- Height: 64px (`h-16`)
- Flex justify-between with back button, title, action button
- Background: Semi-transparent with backdrop blur for scroll effect
- Title: text-xl font-bold, centered

### Buttons
**Primary CTA**:
- Full rounded: `rounded-full`
- Background: Primary green `bg-[#38e07b]`
- Text: Dark background color `text-[#111714]`
- Height: `h-12` or `h-14` for emphasis
- Font: text-base or text-lg, font-bold
- Hover: Slight opacity reduction `hover:bg-opacity-90`

**Secondary Button**:
- Background: `bg-[#29382f]`
- Text: White
- Same sizing as primary
- Hover: `hover:bg-opacity-80`

**Icon Buttons**:
- Size: `size-10` or `size-12`
- Rounded: `rounded-full`
- Background: `bg-[#1c2620]` or transparent
- Hover: `hover:bg-white/10`

### Forms & Inputs
**Text Inputs**:
- Height: `h-14`
- Rounded: `rounded-xl`
- Background: `bg-[#29382f]`
- Border: `border-transparent` (no border in default state)
- Placeholder: `placeholder:text-[#6a7f72]`
- Focus: `focus:ring-2 focus:ring-[#38e07b]`
- Text: White, text-base

**Select Dropdowns**:
- Same styling as text inputs
- Custom arrow icon in primary green
- Options dropdown with dark background

**Checkboxes**:
- Accent color: `accent-color: #38e07b`
- Size: 16px (`size-4`)
- Rounded: `rounded`

### Cards
**Standard Card**:
- Background: `bg-[#1c2620]`
- Rounded: `rounded-2xl`
- Padding: `p-4` or `p-6`
- No shadow (flat design)

**Highlighted Card** (e.g., most popular token package):
- Border: `border-2 border-[#38e07b]`
- Background: `bg-[#1a241f]`
- Badge: Small rounded pill in top-right with green background

**Data Display Cards**:
- Flex justify-between for label-value pairs
- Label: Secondary text color
- Value: White, font-medium or font-bold
- Spacing: `space-y-3`

### Data Visualization
**Circular Progress/Sentiment**:
- SVG circular progress indicator
- Stroke: `text-[#38e07b]` for active, `text-gray-700` for background
- Center: Large percentage + sentiment label
- Size: 160px (w-40 h-40)

**Indicator Rows**:
- Label-value pairs in cards
- Technical indicators (RSI, MACD, etc.)
- Even spacing with dividers if needed

**Recommendation Display**:
- Large text: BUY (green) or SELL (red)
- Supporting percentage with color coding
- Confidence indicator with visual weight

### Modals & Overlays
**Full Screen Modal**:
- Same background as main app
- Header with close/back button
- Content area with scroll
- Footer with primary action

### Language Selector
**Initial Screen**:
- Centered layout
- Large app icon (96px, rounded-3xl)
- Two prominent language buttons
- Primary language: Green background
- Secondary language: Gray background (#gray-800)

### Token Display
**Token Counter**:
- Card format: `bg-[#29382f]`
- Label: "Your Tokens"
- Value: Bold, white text showing current/total
- Prominent placement on dashboard

---

## Images

**App Icon/Logo**:
- Size: 96px × 96px (w-24 h-24)
- Placement: Language selection screen, welcome screen
- Style: Rounded-3xl container with gray background
- Icon: Trending up chart icon in primary green
- Format: SVG for crispness

**No Hero Images**: This is a utility app - no decorative hero images needed. Focus on data clarity.

---

## Animations

**Minimal Animation Strategy**:
- Transitions: `transition-colors duration-200` for hover states only
- No scroll animations
- No loading spinners unless required for data fetching
- Simple state changes without motion

**Allowed Animations**:
- Button hover opacity changes
- Focus ring appearance on inputs
- Page transitions (simple fade if needed)

---

## Accessibility

**Contrast Requirements**:
- All text meets WCAG AA standards (4.5:1 minimum)
- Primary green (#38e07b) on dark backgrounds exceeds requirements
- White text on dark backgrounds: excellent contrast

**Touch Targets**:
- Minimum 44px × 44px for all interactive elements
- Adequate spacing between clickable items
- Bottom navigation items clearly separated

**Focus States**:
- Visible focus rings using `focus:ring-2 focus:ring-[#38e07b]`
- Never remove focus indicators
- Keyboard navigation fully supported

---

## Screen-Specific Guidelines

**Language Selection**: Centered layout, large buttons, footer with terms
**Login**: Simple form, centered, large input fields, prominent CTA
**Welcome/Consent**: Icon at top, headline, paragraph text, disclaimer card with rounded corners, agreement button
**Dashboard**: Sticky header, input fields stacked, token display card, action buttons, bottom navigation
**Analysis Screen**: Sticky header, sections for indicators, AI analysis with circular chart, bracket order grid, execution button
**Token Purchase**: Plan cards with pricing, highlight most popular option
**Settings**: List of integrations with edit buttons, toggle switches for settings