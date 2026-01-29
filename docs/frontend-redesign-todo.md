# Frontend Redesign TODO

## Design System: Claude.ai-Inspired Aesthetic

### Core Design Tokens

```css
/* Color Palette - Warm, approachable, professional */
--color-bg-primary: #FAF9F6;        /* Warm cream background */
--color-bg-secondary: #F5F3EF;      /* Slightly darker cream */
--color-bg-tertiary: #EDEAE3;       /* Card backgrounds */
--color-surface: #FFFFFF;           /* Pure white for elevated cards */

--color-accent-primary: #E07A5F;    /* Warm terracotta/coral */
--color-accent-secondary: #3D405B;  /* Deep slate blue */
--color-accent-tertiary: #81B29A;   /* Sage green for success */

--color-text-primary: #1A1A1A;      /* Near black */
--color-text-secondary: #6B6B6B;    /* Muted gray */
--color-text-tertiary: #9B9B9B;     /* Light gray */

--color-border: #E8E5DE;            /* Soft warm border */
--color-border-focus: #E07A5F;      /* Accent on focus */

/* Typography */
--font-display: 'Newsreader', Georgia, serif;  /* Elegant serif for headings */
--font-body: 'Source Sans 3', system-ui, sans-serif;  /* Clean readable body */
--font-mono: 'JetBrains Mono', monospace;  /* Code/technical */

/* Spacing Scale */
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */
--space-3xl: 4rem;     /* 64px */

/* Border Radius */
--radius-sm: 6px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;

/* Shadows - Soft and subtle */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
--shadow-md: 0 4px 12px rgba(0,0,0,0.06);
--shadow-lg: 0 8px 24px rgba(0,0,0,0.08);
--shadow-xl: 0 16px 48px rgba(0,0,0,0.10);
```

### Design Principles

1. **Warmth over sterility** - Cream backgrounds, not stark white
2. **Generous whitespace** - Let content breathe
3. **Subtle animations** - Purposeful micro-interactions, not flashy
4. **Typography hierarchy** - Serif headings, sans-serif body
5. **Soft edges** - Rounded corners, soft shadows
6. **Minimal chrome** - Content-first, reduce visual noise

---

## Task List

### Phase 1: Foundation (Priority: P0)

- [x] **DESIGN-001**: Create global design system
  - File: `src/styles/design-tokens.css`
  - Add CSS variables for all design tokens
  - Configure Tailwind with custom theme
  - Import Google Fonts (Newsreader, Source Sans 3)

- [x] **DESIGN-002**: Create base layout component
  - File: `src/components/layout/base-layout.tsx`
  - Warm cream background
  - Max-width container with generous padding
  - Smooth page transitions

- [x] **DESIGN-003**: Redesign UI primitives (shadcn overrides)
  - Files: `src/components/ui/*.tsx`
  - Button: Rounded, soft shadows, hover states
  - Card: Warm white, subtle border, soft shadow
  - Input: Warm background, accent focus ring
  - Badge: Soft colors, rounded pills

### Phase 2: Landing Page (Priority: P0)

- [x] **DESIGN-004**: Hero section redesign
  - File: `src/app/page.tsx`
  - Large serif headline
  - Warm gradient background or texture
  - Clear value proposition
  - Primary CTA with hover animation

- [x] **DESIGN-005**: Features/Benefits section
  - Three-column card grid
  - Icons or illustrations
  - Staggered reveal animation on scroll

- [x] **DESIGN-006**: How it works section
  - Step-by-step visual flow
  - Timeline or numbered steps
  - Subtle connecting lines

- [x] **DESIGN-007**: Social proof section
  - Testimonial cards
  - Client logos (if available)
  - Trust indicators

- [x] **DESIGN-008**: Footer redesign
  - File: `src/components/shared/footer.tsx`
  - Clean link organization
  - Newsletter signup (optional)
  - Warm background treatment

### Phase 3: Authentication (Priority: P0)

- [x] **DESIGN-009**: Login page redesign
  - File: `src/app/(auth)/login/page.tsx`
  - Centered card layout
  - Warm background with subtle pattern
  - Smooth form interactions
  - Error states with soft red

- [x] **DESIGN-010**: Register page redesign
  - File: `src/app/(auth)/register/page.tsx`
  - Match login aesthetic
  - Multi-step flow if complex
  - Progress indicator

### Phase 4: Client Portal (Priority: P1)

- [x] **DESIGN-011**: Client dashboard redesign
  - File: `src/app/client/dashboard/page.tsx`
  - Welcome message with user name
  - Stats cards with soft shadows
  - Recent jobs list with status badges
  - Quick action buttons

- [x] **DESIGN-012**: Job list page
  - File: `src/app/client/jobs/page.tsx`
  - Filterable job cards
  - Status color coding (warm palette)
  - Empty state illustration

- [x] **DESIGN-013**: Job detail page
  - File: `src/app/client/jobs/[id]/page.tsx`
  - Chat-style message thread
  - File attachment previews
  - Status timeline
  - Action buttons (approve, request revision)

- [ ] **DESIGN-014**: New job creation
  - File: `src/app/client/jobs/new/page.tsx`
  - Clean multi-step form
  - File upload with drag-drop
  - Preview before submit

- [ ] **DESIGN-015**: Billing page
  - File: `src/app/client/billing/page.tsx`
  - Subscription tier cards
  - Usage visualization
  - Invoice history table

### Phase 5: Worker Portal (Priority: P1)

- [x] **DESIGN-016**: Worker dashboard
  - File: `src/app/worker/dashboard/page.tsx`
  - Availability toggle (prominent)
  - Assigned jobs queue
  - Performance stats
  - Earnings summary

- [ ] **DESIGN-017**: Worker job list
  - File: `src/app/worker/jobs/page.tsx`
  - Priority-sorted cards
  - Due date indicators
  - Quick status update

- [ ] **DESIGN-018**: Worker job detail
  - File: `src/app/worker/jobs/[id]/page.tsx`
  - Client context panel
  - Reference files gallery
  - Deliverable upload area
  - Message thread

### Phase 6: Admin Portal (Priority: P1)

- [x] **DESIGN-019**: Admin dashboard
  - File: `src/app/admin/dashboard/page.tsx`
  - Key metrics overview
  - Pending assignments queue
  - Worker availability grid
  - Recent activity feed

- [ ] **DESIGN-020**: Admin jobs page
  - File: `src/app/admin/jobs/page.tsx`
  - Filterable data table
  - Bulk actions
  - Quick assign modal

- [ ] **DESIGN-021**: Admin job detail
  - File: `src/app/admin/jobs/[id]/page.tsx`
  - Full job context
  - Worker assignment dropdown
  - Audit trail

- [ ] **DESIGN-022**: Team management
  - File: `src/app/admin/team/page.tsx`
  - Worker cards with status
  - Skill tag management
  - Performance metrics

### Phase 7: Shared Components (Priority: P2)

- [ ] **DESIGN-023**: Navigation redesign
  - File: `src/components/shared/navbar.tsx`
  - Clean horizontal nav
  - User menu dropdown
  - Mobile responsive

- [ ] **DESIGN-024**: Empty states
  - Create reusable empty state component
  - Friendly illustrations or icons
  - Clear call-to-action

- [ ] **DESIGN-025**: Loading states
  - Skeleton screens (not spinners)
  - Match card dimensions
  - Subtle pulse animation

- [ ] **DESIGN-026**: Error states
  - Friendly error pages (404, 500)
  - Warm tone, not alarming
  - Recovery actions

### Phase 8: Polish (Priority: P2)

- [ ] **DESIGN-027**: Page transitions
  - Smooth fade/slide between routes
  - Staggered content reveals

- [ ] **DESIGN-028**: Micro-interactions
  - Button hover/press states
  - Form field focus animations
  - Toggle switches
  - Checkbox/radio styling

- [ ] **DESIGN-029**: Responsive audit
  - Test all breakpoints
  - Mobile-first refinements
  - Touch-friendly targets

- [ ] **DESIGN-030**: Accessibility audit
  - Color contrast verification
  - Focus states visible
  - Screen reader testing
  - Keyboard navigation

---

## Completion Checklist

Before marking phase complete:
- [ ] All pages match design system tokens
- [ ] No default shadcn styling visible
- [ ] Animations are subtle and purposeful
- [ ] Mobile responsive
- [ ] Dark mode support (optional, P3)
- [ ] Performance: No layout shift, optimized images
