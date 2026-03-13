# Redmine Frontend Redesign - Design System

A modern, minimalist ClickUp-inspired UI design system for Redmine 6, built for performance, accessibility, and developer experience.

## 🎯 Project Overview

This design system provides a complete frontend replacement for Redmine's core modules (Projects, Issues, Dashboard) with a focus on:

- **Modern UI**: Clean, minimalist design inspired by ClickUp
- **Performance**: Fast-loading, optimized components
- **Accessibility**: WCAG AA compliant with keyboard navigation
- **Responsive**: Mobile-first design with desktop, tablet, and mobile breakpoints
- **Developer Experience**: Clear component API and comprehensive documentation

## 📁 File Structure

```
design-system/
├── tokens.css              # CSS custom properties (design tokens)
├── base.css                # Reset, typography, and utility classes
├── components.css          # Reusable UI components
├── layout.css              # App shell and layout components
├── modules.css             # Redmine-specific module styles
├── design-tokens.json      # Design tokens in JSON format
├── api-mapping.md          # API endpoint documentation
├── mock-data.json          # Mock data for development
├── index.html              # Design system showcase
└── README.md               # This file
```

## 🚀 Quick Start

1. **Include the CSS files** in your project:
```html
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="base.css">
<link rel="stylesheet" href="components.css">
<link rel="stylesheet" href="layout.css">
<link rel="stylesheet" href="modules.css">
```

2. **Use the HTML structure** from `index.html` as a template

3. **Reference the API mapping** in `api-mapping.md` for backend integration

## 🎨 Design Tokens

### Colors
- **Primary**: Blue-based palette (`--primary-50` to `--primary-900`)
- **Neutral**: Gray-based palette (`--neutral-0` to `--neutral-900`)
- **Semantic**: Success, warning, danger colors
- **Accent**: Purple, pink, indigo, teal, orange

### Typography
- **Font Family**: Inter (primary), JetBrains Mono (monospace)
- **Scale**: 12px to 48px (xs to 5xl)
- **Weights**: 300 to 800 (light to extrabold)

### Spacing
- **Base Unit**: 4px
- **Scale**: 0 to 16rem (0 to 64)
- **Consistent**: 4px baseline grid

### Border Radius
- **Scale**: 0 to 1.5rem
- **Default**: 0.5rem (8px) for most components

## 🧩 Component Library

### Buttons
```html
<!-- Primary Button -->
<button class="btn btn-primary">Save Changes</button>

<!-- Secondary Button -->
<button class="btn btn-secondary">Cancel</button>

<!-- Ghost Button -->
<button class="btn btn-ghost">Learn More</button>

<!-- Button Sizes -->
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary btn-lg">Large</button>
<button class="btn btn-primary btn-icon">
  <svg>...</svg>
</button>
```

### Forms
```html
<div class="form-group">
  <label class="form-label">Email Address</label>
  <input type="email" class="form-input" placeholder="Enter your email">
  <div class="form-help">We'll never share your email</div>
</div>
```

### Cards
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Project Title</h3>
  </div>
  <div class="card-body">
    <p class="card-subtitle">Project description</p>
  </div>
  <div class="card-footer">
    <button class="btn btn-primary">View Project</button>
  </div>
</div>
```

### Badges
```html
<span class="badge badge-primary">New</span>
<span class="badge badge-success">Completed</span>
<span class="badge badge-warning">Pending</span>
<span class="badge badge-danger">Error</span>
```

### Avatars
```html
<div class="avatar">JD</div>
<div class="avatar avatar-sm">JS</div>
<div class="avatar avatar-lg">MJ</div>
<div class="avatar avatar-xl">SW</div>
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: ≤ 767px
- **Tablet**: 768px - 1023px
- **Desktop**: ≥ 1024px

### Mobile-First Approach
```css
/* Mobile styles (default) */
.component { ... }

/* Tablet styles */
@media (min-width: 768px) {
  .component { ... }
}

/* Desktop styles */
@media (min-width: 1024px) {
  .component { ... }
}
```

## ♿ Accessibility

### WCAG AA Compliance
- **Color Contrast**: Minimum 4.5:1 for normal text
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators

### Accessibility Features
```html
<!-- Screen reader only text -->
<span class="sr-only">Screen reader only content</span>

<!-- Proper labeling -->
<label for="email">Email Address</label>
<input id="email" type="email" aria-describedby="email-help">
<div id="email-help" class="form-help">We'll never share your email</div>

<!-- ARIA attributes -->
<button aria-expanded="false" aria-controls="menu">Menu</button>
<div id="menu" role="menu" aria-hidden="true">...</div>
```

## 🎯 Redmine Modules

### Projects Module
- **Grid View**: Card-based project listing
- **Project Details**: Comprehensive project information
- **Project Settings**: Configuration and management

### Issues Module
- **Table View**: Sortable, filterable issue list
- **Board View**: Kanban-style issue management
- **Issue Details**: Slide-out panel with full issue information

### Dashboard Module
- **Widgets**: Customizable dashboard components
- **KPI Cards**: Key performance indicators
- **Activity Feed**: Recent project activity

## 🔌 API Integration

### Authentication
```javascript
// API Key Authentication
const headers = {
  'X-Redmine-API-Key': 'your-api-key',
  'Content-Type': 'application/json'
};
```

### Common API Calls
```javascript
// Get projects
const projects = await fetch('/projects.json', { headers }).then(r => r.json());

// Get issues
const issues = await fetch('/issues.json?project_id=123', { headers }).then(r => r.json());

// Create issue
const newIssue = await fetch('/issues.json', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    issue: {
      project_id: 123,
      subject: 'New Issue',
      description: 'Issue description'
    }
  })
}).then(r => r.json());
```

## 🛠️ Development Guidelines

### CSS Architecture
1. **Design Tokens**: Use CSS custom properties for consistency
2. **Utility Classes**: Prefer utility classes for common patterns
3. **Component Classes**: Create reusable component classes
4. **BEM Methodology**: Use Block__Element--Modifier naming

### JavaScript Guidelines
1. **Vanilla JS**: No framework dependencies
2. **Progressive Enhancement**: Works without JavaScript
3. **Event Delegation**: Efficient event handling
4. **Error Handling**: Graceful degradation

### Performance Optimization
1. **Critical CSS**: Inline critical styles
2. **Lazy Loading**: Load non-critical resources asynchronously
3. **Image Optimization**: Use appropriate formats and sizes
4. **Minification**: Minify CSS and JavaScript in production

## 📋 Implementation Checklist

### Phase 1: Foundation
- [ ] Set up design tokens
- [ ] Implement base styles
- [ ] Create component library
- [ ] Build app shell layout

### Phase 2: Core Modules
- [ ] Projects module
- [ ] Issues module (table view)
- [ ] Issues module (board view)
- [ ] Dashboard module

### Phase 3: Advanced Features
- [ ] Search functionality
- [ ] User management
- [ ] Settings pages
- [ ] Mobile optimization

### Phase 4: Polish
- [ ] Accessibility testing
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] User testing

## 🧪 Testing

### Browser Support
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### Testing Tools
- **Accessibility**: axe-core, WAVE
- **Performance**: Lighthouse, WebPageTest
- **Cross-browser**: BrowserStack, Sauce Labs

## 📚 Resources

### Design System
- [Figma File](https://figma.com/redmine-redesign) (Coming Soon)
- [Component Documentation](https://storybook.com/redmine-design-system) (Coming Soon)

### Redmine API
- [Redmine REST API Documentation](https://www.redmine.org/projects/redmine/wiki/Rest_api)
- [Redmine REST API Examples](https://www.redmine.org/projects/redmine/wiki/Rest_api_examples)

### Tools
- [Inter Font](https://rsms.me/inter/)
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

## 🤝 Contributing

1. Follow the established naming conventions
2. Maintain accessibility standards
3. Test across all supported browsers
4. Update documentation for new components
5. Ensure mobile responsiveness

## 📄 License

This design system is part of the Redmine frontend redesign project. Please refer to the main project license for usage terms.

---

**Need Help?** Check the [API Mapping Guide](api-mapping.md) for backend integration or review the [Mock Data](mock-data.json) for development examples.
