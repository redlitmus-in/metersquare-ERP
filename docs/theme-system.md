# MeterSquare ERP - Theme System Documentation

## Overview
MeterSquare ERP implements a comprehensive multi-layered theme system designed specifically for enterprise applications in construction and manufacturing industries. The theme system combines modern web design principles with professional corporate aesthetics.

## Theme Architecture

### 1. Primary Framework Stack
- **Tailwind CSS** - Main utility-first CSS framework
- **Shadcn/ui** - Modern component library with semantic theming
- **Corporate Theme** - Custom business-focused design system
- **Framer Motion** - Animation and interaction library

### 2. Color System

#### Brand Colors
```css
:root {
  --corporate-blue: #1e40af;
  --corporate-dark: #111827;
  --corporate-light: #f9fafb;
  --corporate-accent: #3730a3;
  --corporate-success: #10b981;
  --corporate-warning: #f59e0b;
  --corporate-danger: #ef4444;
  --corporate-purple: #7c3aed;
}
```

#### Module-Specific Color Themes
- **Procurement Module**: Red theme palette (`red-50` to `red-700`)
- **Production Module**: Blue theme palette (`blue-50` to `blue-700`)
- **Site Operations**: Orange theme palette (`orange-50` to `orange-700`)
- **Vendor Management**: Purple theme palette (`purple-50` to `purple-700`)
- **Delivery Module**: Green theme palette (`green-50` to `green-700`)

#### Semantic Color Variables (Shadcn/ui)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --chart-1: 12 76% 61%;
  --chart-2: 173 58% 39%;
  --chart-3: 197 37% 24%;
  --chart-4: 43 74% 66%;
  --chart-5: 27 87% 67%;
  --radius: 0.5rem;
}
```

### 3. Typography System

#### Font Family
- **Primary**: Inter (Google Font)
- **Fallbacks**: system-ui, sans-serif

#### Typography Scale
- **Heading Primary**: 2rem, font-weight: 700, color: #111827
- **Heading Secondary**: 1.5rem, font-weight: 600, color: #374151
- **Body Text**: Standard Tailwind typography scale
- **Corporate Text**: Uses `--corporate-blue` color variable

### 4. Component Design System

#### Cards & Containers
- **Modern Cards**: 12px border radius, subtle shadows, hover animations
- **Glass Effect**: `backdrop-filter: blur(10px)` with transparency
- **Metric Cards**: Enhanced shadows and hover transform effects

#### Buttons & Interactive Elements
- **Modern Buttons**: 8px border radius, subtle shadows, transform animations
- **Gradient Buttons**: Linear gradients with hover state changes
- **Corporate Buttons**: Brand-specific styling with elevation effects

#### Form Elements
- **Modern Inputs**: 8px border radius, focus ring effects, 2px borders
- **Glass Inputs**: Semi-transparent with backdrop blur
- **Validation States**: Color-coded borders and shadows for error/success states

### 5. Animation System

#### CSS Animations
```css
/* Fade In Animation */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide Animations */
@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Scale In Animation */
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Gradient Shift Animation */
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

#### Animation Classes
- `.animate-fade-in` - 0.5s fade in effect
- `.animate-slide-up` - 0.3s slide up from bottom
- `.animate-slide-down` - 0.3s slide down from top
- `.animate-scale-in` - 0.2s scale in effect
- `.gradient-text` - Animated gradient text effect
- `.float` - 6s floating animation
- `.pulse-glow` - 2s pulsing glow effect
- `.shimmer` - Loading shimmer animation

### 6. Layout & Spacing System

#### Grid System
- **Dashboard Grid**: CSS Grid with responsive breakpoints
- **Columns**: 2, 3, and 4 column layouts with auto-fit
- **Spacing**: 4px, 8px, 16px, 24px grid system
- **Gap**: 1.5rem standard grid gap

#### Shadow System
```css
box-shadow: {
  soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
  medium: '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 30px -5px rgba(0, 0, 0, 0.05)',
  large: '0 10px 50px -12px rgba(0, 0, 0, 0.25)'
}
```

### 7. Dark Mode Support

#### CSS Variables for Dark Theme
```css
.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  --card: 0 0% 3.9%;
  --card-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 0 0% 9%;
  /* Additional dark mode variables */
}
```

#### Implementation
- Automatic dark mode detection via `prefers-color-scheme`
- Manual dark mode toggle via `.dark` class
- Glass effects adapted for dark backgrounds

### 8. Responsive Design

#### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

#### Mobile Adaptations
- Reduced backdrop blur for performance
- Simplified animations
- Adjusted spacing and typography
- Responsive navigation patterns

### 9. Performance Optimizations

#### CSS Optimizations
- Custom scrollbar styling for better UX
- Hardware-accelerated animations using `transform3d`
- Efficient gradient implementations
- Optimized shadow rendering

#### Loading States
- Skeleton loaders with shimmer effects
- Loading overlays with blur effects
- Progressive enhancement for animations

### 10. Accessibility Features

#### Focus Management
```css
*:focus {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}
```

#### Color Contrast
- WCAG 2.1 AA compliance
- High contrast ratios for all text
- Alternative text for color-coded information

#### Motion Preferences
- Respect for `prefers-reduced-motion`
- Fallback static states for animations

## Implementation Files

### Core Files
- `frontend/src/index.css` - Main CSS entry point
- `frontend/src/styles/corporate-theme.css` - Corporate theme definitions
- `frontend/tailwind.config.js` - Tailwind configuration
- `frontend/components.json` - Shadcn/ui configuration

### Component Integration
- All UI components use theme variables
- Consistent spacing and color application
- Modular theme switching capability

## Usage Guidelines

### Best Practices
1. **Consistency**: Always use defined color variables
2. **Accessibility**: Maintain contrast ratios and focus indicators
3. **Performance**: Use CSS transforms for animations
4. **Modularity**: Theme changes should cascade throughout the application
5. **Responsive**: Consider mobile-first design principles

### Customization
- Modify CSS variables in `:root` for brand changes
- Adjust Tailwind config for utility class modifications
- Use component props for contextual theming
- Implement dark mode toggles via CSS class manipulation

## Future Enhancements
- Theme configuration panel for administrators
- Additional color palette options
- Enhanced animation library
- Performance monitoring for theme assets
- A/B testing framework for theme variations

---

**Last Updated**: August 25, 2024  
**Version**: 1.0.0  
**Status**: Production Ready

*This documentation covers the complete theme system implementation for MeterSquare ERP. For technical support or theme customization requests, refer to the main project documentation.*