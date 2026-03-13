# New Task Page Redesign - Two-Column Layout

## Overview
Redesign the ReactJS "New Task" page to match the USA Prime Sports reference design with a two-column layout while maintaining the current dark theme.

## Reference Design Analysis (USA Prime Sports)

**Left Column (Wider):**
- Subject field (full width, prominent)
- Description field with rich text editor (full width, large)

**Right Column (Narrower):**
- Tracker dropdown
- Status dropdown  
- Priority dropdown
- Assigned To dropdown
- Start Date & Estimated Time (side by side)
- Due Date & % Done (side by side)
- Parent task search
- Milestone/Sprint dropdown
- Private checkbox
- Files upload section

## Current ReactJS Structure
Currently uses a single-column layout with all fields stacked vertically.

## Required Changes

### 1. Update Grid Layout
Change from single column to two-column grid:
```jsx
<div className="grid grid-cols-1 lg:grid-cols-[1.5fr,1fr] gap-6">
```

### 2. Left Column Structure
```jsx
<div className="space-y-6">
  {/* Subject Card */}
  <div className="bg-[var(--theme-cardBg)] rounded-lg border border-[var(--theme-border)] p-6">
    <label>Subject *</label>
    <input type="text" ... />
  </div>
  
  {/* Description Card */}
  <div className="bg-[var(--theme-cardBg)] rounded-lg border border-[var(--theme-border)] p-6">
    <label>Description</label>
    <CKEditor ... />
  </div>
</div>
```

### 3. Right Column Structure
```jsx
<div className="space-y-6">
  {/* Metadata Fields Card */}
  <div className="bg-[var(--theme-cardBg)] rounded-lg border border-[var(--theme-border)] p-6 space-y-4">
    {/* Tracker */}
    <div>
      <label>Tracker</label>
      <select ... />
    </div>
    
    {/* Priority */}
    <div>
      <label>Priority</label>
      <select ... />
    </div>
    
    {/* Version */}
    <div>
      <label>Version</label>
      <select ... />
    </div>
    
    {/* Milestone */}
    <div>
      <label>Milestone</label>
      <select ... />
    </div>
    
    {/* Assigned To */}
    <div>
      <label>Assigned To</label>
      <select ... />
    </div>
    
    {/* Start Date & Due Date (side by side) */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label>Start Date</label>
        <input type="date" ... />
      </div>
      <div>
        <label>Due Date</label>
        <input type="date" ... />
      </div>
    </div>
    
    {/* Estimated Hours */}
    <div>
      <label>Estimated Hours</label>
      <input type="text" ... />
    </div>
    
    {/* Parent Task */}
    <div>
      <label>Parent Task</label>
      <input type="text" with search ... />
    </div>
    
    {/* Private Checkbox */}
    <div className="flex items-center gap-2 pt-2">
      <input type="checkbox" ... />
      <label>Private</label>
    </div>
  </div>
  
  {/* Files Card */}
  <div className="bg-[var(--theme-cardBg)] rounded-lg border border-[var(--theme-border)] p-6">
    <label>Files</label>
    <input type="file" ... />
    {/* File list */}
  </div>
</div>
```

## Key Layout Principles

1. **Two-Column Grid**: Use `grid-cols-[1.5fr,1fr]` for left-wider layout
2. **Card-Based**: Each section wrapped in card with consistent styling
3. **Vertical Spacing**: Use `space-y-6` between cards, `space-y-4` within cards
4. **Field Grouping**: Related fields stay together (dates, etc.)
5. **Responsive**: Collapses to single column on mobile (`grid-cols-1 lg:grid-cols-[1.5fr,1fr]`)

## Theme Preservation

Keep all existing theme variables:
- `var(--theme-cardBg)` - Card backgrounds
- `var(--theme-border)` - Borders
- `var(--theme-inputBg)` - Input backgrounds
- `var(--theme-text)` - Text color
- `var(--theme-textSecondary)` - Secondary text
- `var(--theme-primary)` - Primary color for focus states
- `var(--theme-surface)` - Hover states

## Implementation Location

File: `redmine-frontend/src/pages/tasks/TaskFormPage.js`
Lines: 842-1166 (the `else` branch for new task form)

## Testing Checklist

- [ ] Two-column layout displays correctly on desktop
- [ ] Layout collapses to single column on mobile
- [ ] All fields remain functional
- [ ] Form submission works
- [ ] File upload works
- [ ] Parent task search works
- [ ] Dark theme preserved
- [ ] Spacing and alignment match reference
- [ ] All existing functionality intact

## Notes

- Only modify the NEW task form (non-edit mode)
- Keep the edit mode layout as-is (it already has a good two-column layout)
- Maintain all existing field validations
- Keep all existing event handlers
- Preserve all accessibility features
