# Settings & Profile Pages Design

**Date:** 2026-01-30
**Status:** Approved for Implementation
**Scope:** Settings and Profile pages for Admin, Client, and Worker roles

---

## Overview

Create settings and profile management pages for all three user roles in Nimmit. Each role has distinct data and needs, but pages should share consistent UI patterns (cards, forms, tabs where appropriate).

---

## Client Pages

### `/client/profile`

**Purpose:** View and edit personal profile information

**Features:**
1. **Personal Info Card** - First name, last name, email (read-only), phone, avatar upload
2. **Company Info Card** - Company name, optional company logo
3. **Timezone Selection** - Dropdown with common US timezones
4. **Preferred Worker Display** - Shows assigned preferred worker (if any), with option to request change

**Data Sources:** `user.profile`, `user.clientProfile`

### `/client/settings`

**Purpose:** Account preferences and notifications

**Features:**
1. **Notification Preferences** - Email notifications toggle (job updates, status changes, messages)
2. **Communication Preferences** - Preferred contact method, urgent notification settings
3. **Password Change** - Current + new password form
4. **Danger Zone** - Account deactivation request (soft delete)

**Note:** Billing is already handled at `/client/billing` - do NOT duplicate

---

## Worker Pages

### `/worker/profile`

**Purpose:** Public-facing profile that clients may see

**Features:**
1. **Personal Info Card** - First name, last name, avatar, phone
2. **Professional Bio** - Textarea for bio/description
3. **Skills Management** - Add/remove skills with skill level (junior/mid/senior) per skill
4. **Portfolio Links** - Optional portfolio URL, LinkedIn URL
5. **Stats Display** (read-only) - Completed jobs, average rating, total earnings

**Data Sources:** `user.profile`, `user.workerProfile`

### `/worker/settings`

**Purpose:** Work preferences and availability management

**Features:**
1. **Availability Control** - Toggle between available/busy/offline status
2. **Job Capacity** - Set max concurrent jobs (1-5 slider)
3. **Notification Preferences** - New job alerts, message notifications
4. **Password Change** - Current + new password form
5. **Payment Info Display** - Placeholder for future Stripe Connect integration

**Data Sources:** `user.workerProfile.availability`, `user.workerProfile.maxConcurrentJobs`

---

## Admin Pages

### `/admin/profile`

**Purpose:** Admin personal info management

**Features:**
1. **Personal Info Card** - First name, last name, email, phone, avatar
2. **Timezone Selection** - For scheduling/timezone displays
3. **Activity Log** (read-only) - Recent admin actions taken

**Data Sources:** `user.profile`

### `/admin/settings`

**Purpose:** System-level and personal preferences

**Features:**
1. **Notification Preferences** - New applications, system alerts, job escalations
2. **Password Change** - Current + new password form
3. **System Settings Link** - Link to future system config page (placeholder)

---

## Shared Components

Create these reusable components in `src/components/settings/`:

1. **`ProfileHeader`** - Avatar with upload, name display, role badge
2. **`PasswordChangeForm`** - Reusable current/new/confirm password form
3. **`NotificationToggle`** - Switch component with label and description
4. **`SettingsCard`** - Wrapper card with title, description, content slot
5. **`DangerZoneCard`** - Red-bordered card for destructive actions

---

## API Endpoints Required

```
GET/PATCH  /api/users/me/profile     - Profile CRUD
PATCH      /api/users/me/password    - Password change
GET/PATCH  /api/users/me/settings    - Settings/preferences
POST       /api/upload/avatar        - Avatar upload (use existing upload route)
```

---

## UI Patterns

Follow existing Nimmit patterns from `billing/page.tsx`:
- Use `var(--nimmit-*)` CSS variables
- Card-based layout with `Card`, `CardHeader`, `CardContent`
- `animate-fade-up` with `stagger-*` classes for entrance animations
- Loading skeletons matching page structure
- Toast notifications via `sonner` for save success/failure

---

## Implementation Priority

1. **Phase 1 (Critical Path):**
   - `/client/settings` - Most requested by clients
   - `/client/profile` - Basic profile management

2. **Phase 2:**
   - `/worker/profile` - Skills management is important
   - `/worker/settings` - Availability control

3. **Phase 3:**
   - `/admin/profile` - Lower priority
   - `/admin/settings` - Lower priority

---

## Not Included (YAGNI)

- Dark mode toggle (not in current design system)
- Language/localization settings (US-only for MVP)
- Two-factor authentication (future enhancement)
- API key management (not needed for MVP)
- Export data feature (future GDPR enhancement)
