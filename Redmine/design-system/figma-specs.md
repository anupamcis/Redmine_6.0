# Redmine Frontend Redesign - Figma Specifications

This document provides detailed specifications for implementing the Redmine frontend redesign in Figma, including component library, design tokens, and page layouts.

## 🎨 Design System Overview

### Design Principles
- **Minimalist**: Clean, uncluttered interface with focus on content
- **Performance-First**: Optimized for fast loading and smooth interactions
- **Accessible**: WCAG AA compliant with keyboard navigation
- **Responsive**: Mobile-first approach with desktop, tablet, and mobile breakpoints
- **Consistent**: Unified design language across all components

### Visual Style
- **Aesthetic**: Flat design with subtle shadows and rounded corners
- **Typography**: Inter font family for modern, readable text
- **Color Palette**: Blue-based primary with neutral grays and semantic colors
- **Spacing**: 4px baseline grid for consistent spacing
- **Border Radius**: 6-12px for subtle rounded corners

## 🎯 Figma File Structure

### Main File: `Redmine-Frontend-Redesign.fig`

#### 1. Design Tokens Page
- **Color Tokens**: Primary, neutral, success, warning, danger palettes
- **Typography Tokens**: Font families, sizes, weights, line heights
- **Spacing Tokens**: 4px grid system with consistent spacing scale
- **Shadow Tokens**: Elevation system with subtle shadows
- **Border Radius Tokens**: Consistent corner radius values

#### 2. Component Library Page
- **Atoms**: Buttons, inputs, badges, avatars, icons
- **Molecules**: Cards, form groups, navigation items
- **Organisms**: Headers, sidebars, tables, modals
- **Templates**: Page layouts and wireframes

#### 3. Page Designs
- **Dashboard**: Main dashboard with widgets and KPIs
- **Projects**: Project listing and detail pages
- **Issues**: Table and board views with detail panels
- **Authentication**: Login and API key entry screens

## 🧩 Component Specifications

### Button Component
```
Component Name: Button
Variants: Primary, Secondary, Ghost, Danger
Sizes: Small (32px), Medium (40px), Large (48px), Icon (40px)
States: Default, Hover, Active, Disabled, Loading
```

**Primary Button Specs:**
- Background: `--primary-500` (#0ea5e9)
- Text: `--text-inverse` (#ffffff)
- Border: 1px solid `--primary-500`
- Border Radius: 8px
- Padding: 8px 16px (medium)
- Font: Inter Medium 14px
- Hover: Background `--primary-600` (#0284c7)

### Input Component
```
Component Name: Input
Variants: Text, Email, Password, Search, Select, Textarea
Sizes: Small (32px), Medium (40px), Large (48px)
States: Default, Focus, Error, Disabled
```

**Text Input Specs:**
- Background: `--bg` (#ffffff)
- Border: 1px solid `--border` (#e2e8f0)
- Border Radius: 8px
- Padding: 12px 16px
- Font: Inter Regular 14px
- Focus: Border `--focus` (#0ea5e9), Shadow 0 0 0 3px `--primary-100`

### Card Component
```
Component Name: Card
Variants: Default, Elevated, Outlined
Sections: Header, Body, Footer
Sizes: Small, Medium, Large
```

**Default Card Specs:**
- Background: `--bg` (#ffffff)
- Border: 1px solid `--border` (#e2e8f0)
- Border Radius: 12px
- Shadow: `--shadow-sm` (0 1px 3px rgba(0,0,0,0.1))
- Padding: 24px

### Badge Component
```
Component Name: Badge
Variants: Primary, Secondary, Success, Warning, Danger
Sizes: Small, Medium, Large
Shapes: Pill, Rounded
```

**Primary Badge Specs:**
- Background: `--primary-100` (#e0f2fe)
- Text: `--primary-800` (#075985)
- Border Radius: 9999px (pill)
- Padding: 4px 8px
- Font: Inter Medium 12px

### Avatar Component
```
Component Name: Avatar
Variants: Image, Initials, Icon
Sizes: Small (24px), Medium (32px), Large (48px), Extra Large (64px)
Shapes: Circle
```

**Medium Avatar Specs:**
- Size: 32px × 32px
- Border Radius: 50%
- Background: `--primary-500` (#0ea5e9)
- Text: `--text-inverse` (#ffffff)
- Font: Inter Medium 14px

## 📱 Responsive Breakpoints

### Desktop (≥1280px)
- **Container Max Width**: 1280px
- **Grid Columns**: 12
- **Sidebar Width**: 256px (collapsed: 64px)
- **Header Height**: 64px

### Tablet (768px - 1279px)
- **Container Max Width**: 100%
- **Grid Columns**: 8
- **Sidebar**: Collapsible overlay
- **Header Height**: 64px

### Mobile (≤767px)
- **Container Max Width**: 100%
- **Grid Columns**: 4
- **Sidebar**: Full-screen overlay
- **Header Height**: 56px

## 🎨 Color System

### Primary Colors
```
Primary 50:  #f0f9ff
Primary 100: #e0f2fe
Primary 200: #bae6fd
Primary 300: #7dd3fc
Primary 400: #38bdf8
Primary 500: #0ea5e9  (Main)
Primary 600: #0284c7
Primary 700: #0369a1
Primary 800: #075985
Primary 900: #0c4a6e
```

### Neutral Colors
```
Neutral 0:   #ffffff  (White)
Neutral 50:  #f8fafc
Neutral 100: #f1f5f9
Neutral 200: #e2e8f0  (Border)
Neutral 300: #cbd5e1
Neutral 400: #94a3b8
Neutral 500: #64748b  (Text Tertiary)
Neutral 600: #475569  (Text Secondary)
Neutral 700: #334155
Neutral 800: #1e293b
Neutral 900: #0f172a  (Text Primary)
```

### Semantic Colors
```
Success: #22c55e
Warning: #f59e0b
Danger:  #ef4444
Info:    #0ea5e9
```

## 📝 Typography System

### Font Families
- **Primary**: Inter (Google Fonts)
- **Monospace**: JetBrains Mono

### Font Sizes
```
Text XS:   12px (0.75rem)
Text SM:   14px (0.875rem)
Text Base: 16px (1rem)
Text LG:   18px (1.125rem)
Text XL:   20px (1.25rem)
Text 2XL:  24px (1.5rem)
Text 3XL:  30px (1.875rem)
Text 4XL:  36px (2.25rem)
Text 5XL:  48px (3rem)
```

### Font Weights
```
Light:     300
Regular:   400
Medium:    500
Semibold:  600
Bold:      700
Extrabold: 800
```

### Line Heights
```
Tight:    1.25
Snug:     1.375
Normal:   1.5
Relaxed:  1.625
Loose:    2
```

## 📏 Spacing System

### 4px Baseline Grid
```
Space 0:   0px
Space 1:   4px
Space 2:   8px
Space 3:   12px
Space 4:   16px
Space 5:   20px
Space 6:   24px
Space 8:   32px
Space 10:  40px
Space 12:  48px
Space 16:  64px
Space 20:  80px
Space 24:  96px
Space 32:  128px
```

## 🎭 Shadow System

### Elevation Levels
```
Shadow XS:   0 1px 2px rgba(0,0,0,0.05)
Shadow SM:   0 1px 3px rgba(0,0,0,0.1)
Shadow Base: 0 4px 6px rgba(0,0,0,0.1)
Shadow MD:   0 10px 15px rgba(0,0,0,0.1)
Shadow LG:   0 20px 25px rgba(0,0,0,0.1)
Shadow XL:   0 25px 50px rgba(0,0,0,0.25)
```

## 🔧 Component States

### Interactive States
- **Default**: Base appearance
- **Hover**: Subtle background change, cursor pointer
- **Active**: Pressed state with slight scale or color change
- **Focus**: Outline ring for keyboard navigation
- **Disabled**: Reduced opacity, no interaction
- **Loading**: Spinner or skeleton state

### Form States
- **Valid**: Green border and checkmark
- **Invalid**: Red border and error message
- **Required**: Asterisk indicator
- **Optional**: No special indicator

## 📐 Layout Specifications

### App Shell
- **Header Height**: 64px (desktop), 56px (mobile)
- **Sidebar Width**: 256px (desktop), 64px (collapsed), 100% (mobile overlay)
- **Content Padding**: 24px (desktop), 16px (mobile)
- **Max Content Width**: 1280px

### Grid System
- **Desktop**: 12 columns, 24px gutters
- **Tablet**: 8 columns, 16px gutters
- **Mobile**: 4 columns, 16px gutters

### Component Spacing
- **Card Padding**: 24px
- **Form Group Margin**: 24px bottom
- **Button Padding**: 8px 16px (medium)
- **Input Padding**: 12px 16px

## 🎨 Icon Specifications

### Icon Library
- **Style**: Outline, 24px stroke width
- **Size**: 16px, 20px, 24px variants
- **Color**: Inherit from parent or use semantic colors
- **Library**: Heroicons or similar outline icon set

### Common Icons
- Search, Menu, Close, Plus, Edit, Delete
- User, Settings, Notifications, Calendar
- Arrow directions, Check, Warning, Error
- Project, Issue, Dashboard, File, Folder

## 📱 Mobile Adaptations

### Touch Targets
- **Minimum Size**: 44px × 44px
- **Recommended**: 48px × 48px
- **Spacing**: 8px minimum between targets

### Mobile-Specific Components
- **Bottom Navigation**: For primary actions
- **Swipe Gestures**: For card interactions
- **Pull-to-Refresh**: For data updates
- **Infinite Scroll**: For long lists

## ♿ Accessibility Specifications

### Color Contrast
- **Normal Text**: 4.5:1 minimum ratio
- **Large Text**: 3:1 minimum ratio
- **UI Components**: 3:1 minimum ratio

### Focus Indicators
- **Outline**: 2px solid `--focus` color
- **Offset**: 2px from element
- **Visible**: Always visible on keyboard navigation

### Screen Reader Support
- **Alt Text**: All images and icons
- **ARIA Labels**: Complex interactive elements
- **Semantic HTML**: Proper heading hierarchy
- **Form Labels**: Associated with inputs

## 🚀 Implementation Guidelines

### CSS Custom Properties
- Use design tokens as CSS custom properties
- Support light and dark mode variants
- Implement reduced motion preferences

### Component Naming
- Use BEM methodology: `.block__element--modifier`
- Be descriptive and consistent
- Avoid abbreviations when possible

### File Organization
- Separate files for tokens, base, components, layout
- Use logical grouping for related components
- Include comments for complex implementations

## 📋 Figma Setup Checklist

### Initial Setup
- [ ] Create main Figma file
- [ ] Set up design tokens page
- [ ] Create component library page
- [ ] Set up responsive frames
- [ ] Configure auto-layout settings

### Component Creation
- [ ] Create button variants and states
- [ ] Build form components
- [ ] Design card components
- [ ] Create navigation components
- [ ] Build data display components

### Page Layouts
- [ ] Design dashboard layout
- [ ] Create projects pages
- [ ] Build issues views
- [ ] Design authentication screens
- [ ] Create responsive variants

### Documentation
- [ ] Add component descriptions
- [ ] Include usage guidelines
- [ ] Document interaction patterns
- [ ] Create developer handoff notes
- [ ] Add accessibility annotations

## 🎯 Success Metrics

### Design Quality
- **Consistency**: All components follow design system
- **Accessibility**: WCAG AA compliance
- **Performance**: Fast loading and smooth interactions
- **Usability**: Intuitive user experience

### Developer Experience
- **Clear Documentation**: Comprehensive component specs
- **Easy Implementation**: Straightforward CSS and HTML
- **Maintainable**: Well-organized and documented code
- **Scalable**: Easy to extend and modify

---

This specification serves as the foundation for creating a comprehensive Figma design system that can be handed off to frontend developers for implementation.
