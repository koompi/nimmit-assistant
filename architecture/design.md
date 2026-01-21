# Nimmit Platform - Technical Architecture Design

**Version:** 1.0
**Last Updated:** January 21, 2026
**Status:** Architecture Design Phase

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Database Design](#database-design)
5. [API Design](#api-design)
6. [Authentication & Authorization](#authentication--authorization)
7. [File Storage Strategy](#file-storage-strategy)
8. [AI Integration](#ai-integration)
9. [Real-Time Features](#real-time-features)
10. [Payment Integration](#payment-integration)
11. [Email & Notifications](#email--notifications)
12. [Security Considerations](#security-considerations)
13. [Scalability & Performance](#scalability--performance)
14. [Deployment Architecture](#deployment-architecture)
15. [Development Phases](#development-phases)

---

## System Overview

### Platform Purpose
On-demand marketplace connecting US clients with skilled Cambodian workers for remote work (design, video editing, development, social media management, etc.).

### Core User Types
1. **Clients** - US-based customers requesting work
2. **Workers** - Cambodia-based service providers
3. **Admins** - Platform managers overseeing operations

### Key Differentiators
- AI-powered job matching
- Timezone advantage (overnight delivery)
- Credit-based subscription model
- Real-time status tracking
- Quality guarantees

---

## Technology Stack

### Frontend (Client + Worker + Admin Apps)

**Framework: Vite.js + React + TypeScript**

**Why Vite?**
- ✅ Extremely fast development server (HMR)
- ✅ Optimized production builds
- ✅ Better DX than Create React App
- ✅ Native ES modules support
- ✅ TypeScript support out of the box

**UI Libraries:**
- **Styling:** TailwindCSS (utility-first, fast development)
- **Components:** shadcn/ui or Radix UI (accessible, customizable)
- **Forms:** React Hook Form + Zod (validation)
- **State Management:**
  - Zustand (lightweight, simple global state)
  - TanStack Query (React Query) for server state
- **Routing:** React Router v6
- **Charts/Analytics:** Recharts or Chart.js
- **File Upload:** react-dropzone
- **Rich Text Editor:** Tiptap or Lexical (for messaging)

**Key Frontend Features:**
```
├── Client Portal
│   ├── Job submission form
│   ├── Job status dashboard
│   ├── Messaging interface
│   ├── File upload/download
│   ├── Subscription management
│   └── Payment history
│
├── Worker Portal
│   ├── Available jobs feed
│   ├── Accept/decline interface
│   ├── Active jobs dashboard
│   ├── File delivery system
│   ├── Time tracking
│   └── Earnings dashboard
│
└── Admin Portal
    ├── Capacity dashboard
    ├── Job assignment/routing
    ├── Quality metrics
    ├── Revenue tracking
    ├── Worker performance
    └── Client management
```

### Backend

**Framework: Node.js + Express.js + TypeScript**

**Why Express?**
- ✅ Mature, battle-tested
- ✅ Large ecosystem
- ✅ Flexible and unopinionated
- ✅ Good TypeScript support
- ✅ Easy to understand and maintain

**Alternative Considered:** Fastify (faster, modern) - Consider for v2 if performance becomes issue

**Backend Structure:**
```
src/
├── config/          # Configuration (env, database, etc.)
├── models/          # Mongoose models
├── controllers/     # Route controllers
├── services/        # Business logic
├── middleware/      # Auth, validation, error handling
├── routes/          # API routes
├── utils/           # Helpers, utilities
├── jobs/            # Background jobs (Bull/BullMQ)
├── websockets/      # Socket.io handlers
└── server.ts        # Entry point
```

**Key Backend Libraries:**
- **Validation:** Zod (shared with frontend)
- **Authentication:** Passport.js + JWT
- **File Upload:** Multer + Sharp (image processing)
- **Email:** Nodemailer or SendGrid
- **Job Queue:** Bull or BullMQ (Redis-based)
- **WebSockets:** Socket.io
- **Logging:** Winston or Pino
- **Testing:** Jest + Supertest
- **API Documentation:** Swagger/OpenAPI

### Database

**Primary Database: MongoDB (via Mongoose ODM)**

**Why MongoDB?**
- ✅ Flexible schema (evolving requirements)
- ✅ Good for rapid development
- ✅ Handles nested documents well (jobs with messages, files, etc.)
- ✅ Horizontal scalability
- ✅ Good Node.js ecosystem (Mongoose)

**Cache Layer: Redis**
- Session storage
- Job queue (Bull)
- Rate limiting
- Real-time data caching

**Search Engine: Elasticsearch (Optional, Phase 2)**
- Full-text search for jobs, workers, clients
- Analytics and reporting
- Consider for v2 if needed

### File Storage

**Primary: Cloudflare R2**

**Why Cloudflare R2?**
- ✅ S3-compatible API (easy migration path if needed)
- ✅ Zero egress fees (S3 charges for downloads)
- ✅ Cheaper storage ($0.015/GB vs S3's $0.023/GB)
- ✅ Automatic CDN integration with Cloudflare
- ✅ Direct browser uploads (presigned URLs)
- ✅ High performance globally
- ✅ Scalable and reliable

**Cost Comparison:**
- R2: $0.015/GB/month storage + $0 egress
- S3: $0.023/GB/month storage + $0.09/GB egress
- **At 500GB storage + 2TB egress/month: R2 = $7.50, S3 = $192**

**Backup: Backblaze B2 or cross-region R2 replication**

### AI/ML Services

**OpenAI API (GPT-4 or GPT-3.5-turbo)**
- Job description parsing
- Skill extraction
- Worker matching algorithm
- Content quality checking (future)

**Alternative:** Anthropic Claude API (you might want to use this!)

### Payment Processing

**Stripe**
- Subscription management
- One-time payments
- Webhook handling for payment events
- Customer portal

### Hosting & Infrastructure

**Frontend:** Vercel or Netlify
- Automatic deployments from Git
- CDN included
- Free SSL
- Edge functions support

**Backend:** Railway, Render, or AWS (ECS/Fargate)
- Railway: Easiest, good DX, affordable
- Render: Similar to Railway, slightly cheaper
- AWS: More control, scalable, but complex

**Database:** MongoDB Atlas (managed)
- Free tier for development
- Easy scaling
- Built-in backups

**Redis:** Upstash or Redis Cloud
- Serverless Redis (pay-per-use)
- Good for low-traffic start

**File Storage:** Cloudflare R2

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTS                              │
│  (Web Browsers - US-based users)                            │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ HTTPS
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     CDN / EDGE (Vercel)                      │
│  - Static Assets                                             │
│  - Frontend Application (React/Vite)                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ REST API / WebSocket
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND API (Express/Node.js)                   │
│  ┌──────────────────────────────────────────────────┐       │
│  │  API Gateway (Express Router)                    │       │
│  │  - Authentication Middleware                     │       │
│  │  - Rate Limiting                                 │       │
│  │  - Request Validation                            │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Jobs API   │  │  Users API   │  │ Payments API │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  AI Matching │  │  WebSockets  │  │ File Handler │      │
│  │   Service    │  │   (Socket.io)│  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────┬──────────────┬──────────────┬─────────────┬─────────┘
        │              │              │             │
        ▼              ▼              ▼             ▼
┌──────────────┐ ┌──────────┐ ┌─────────────┐ ┌──────────┐
│   MongoDB    │ │  Redis   │ │Cloudflare R2│ │  Stripe  │
│  (Database)  │ │ (Cache/  │ │(File Store) │ │(Payments)│
│              │ │  Queue)  │ │             │ │          │
└──────────────┘ └──────────┘ └─────────────┘ └──────────┘
        │              │
        ▼              ▼
┌──────────────┐ ┌──────────┐
│   OpenAI     │ │SendGrid/ │
│     API      │ │Nodemailer│
│ (AI Match)   │ │  (Email) │
└──────────────┘ └──────────┘
```

### Application Architecture (MVC Pattern)

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (View Layer)                  │
│  React Components + TailwindCSS + TypeScript             │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ API Calls (Axios/Fetch)
                     │ WebSocket Events
                     ▼
┌──────────────────────────────────────────────────────────┐
│                   API LAYER (Routes)                      │
│  Express Routes + Validation + Auth Middleware           │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│              BUSINESS LOGIC (Controllers/Services)        │
│  - Job Matching Service                                  │
│  - Payment Service                                       │
│  - Notification Service                                  │
│  - File Management Service                               │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│                 DATA LAYER (Models)                       │
│  Mongoose Models + MongoDB                               │
└──────────────────────────────────────────────────────────┘
```

---

## Database Design

### MongoDB Collections Schema

#### 1. **Users Collection**

```typescript
{
  _id: ObjectId,
  email: string (unique, indexed),
  passwordHash: string,
  role: 'client' | 'worker' | 'admin',
  profile: {
    firstName: string,
    lastName: string,
    company?: string,
    avatar?: string,
    phone?: string,
    timezone: string,
  },

  // Worker-specific fields
  workerProfile?: {
    skills: string[],  // ['video-editing', 'graphic-design', ...]
    skillLevel: {
      [skillId: string]: 'junior' | 'mid' | 'senior'
    },
    hourlyRate: number,
    portfolio: {
      title: string,
      description: string,
      fileUrl: string,
      thumbnailUrl: string,
    }[],
    availability: {
      status: 'available' | 'busy' | 'offline',
      hoursPerWeek: number,
      timezone: string,
    },
    stats: {
      totalJobs: number,
      completedJobs: number,
      averageRating: number,
      totalEarnings: number,
      responseTime: number, // minutes
      completionRate: number, // percentage
    },
    languages: string[],
    certifications?: string[],
  },

  // Client-specific fields
  clientProfile?: {
    company: string,
    industry: string,
    subscriptionTier: 'starter' | 'growth' | 'scale' | 'payAsYouGo',
    credits: {
      available: number,
      used: number,
      rolloverExpiry?: Date,
    },
    stripeCustomerId: string,
    stripeSubscriptionId?: string,
    preferredWorkers: ObjectId[], // Worker IDs
    stats: {
      totalJobsPosted: number,
      totalSpent: number,
      averageRating: number,
    },
  },

  // Common fields
  emailVerified: boolean,
  onboarded: boolean,
  lastLogin: Date,
  status: 'active' | 'suspended' | 'deactivated',
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
- `email` (unique)
- `role`
- `workerProfile.skills` (for matching)
- `workerProfile.availability.status`
- `clientProfile.subscriptionTier`

---

#### 2. **Jobs Collection**

```typescript
{
  _id: ObjectId,
  clientId: ObjectId (ref: Users, indexed),
  workerId?: ObjectId (ref: Users, indexed),

  // Job details
  title: string,
  description: string,
  category: 'video-editing' | 'graphic-design' | 'web-development' | 'social-media' | 'bookkeeping' | 'other',
  requiredSkills: string[],

  // Pricing
  pricing: {
    type: 'credit' | 'hourly' | 'fixed',
    amount: number,
    credits?: number,
    currency: 'USD',
  },

  // Timeline
  urgency: 'standard' | 'priority' | 'rush',
  deliveryTime: {
    estimated: number, // hours
    deadline: Date,
  },

  // Status workflow
  status: 'pending' | 'matching' | 'assigned' | 'in_progress' | 'review' | 'revision' | 'completed' | 'cancelled',

  // Matching
  aiMatchingScore?: {
    workerId: ObjectId,
    score: number,
    reasoning: string,
  }[],

  matchingHistory: {
    workerId: ObjectId,
    action: 'offered' | 'accepted' | 'declined' | 'timeout',
    timestamp: Date,
  }[],

  // Assignment
  assignedAt?: Date,
  acceptedAt?: Date,
  startedAt?: Date,

  // Files
  clientFiles: {
    id: string,
    filename: string,
    originalName: string,
    mimeType: string,
    size: number,
    url: string,
    uploadedAt: Date,
  }[],

  deliverables: {
    id: string,
    filename: string,
    originalName: string,
    mimeType: string,
    size: number,
    url: string,
    version: number,
    uploadedAt: Date,
    uploadedBy: ObjectId,
  }[],

  // Communication
  messages: {
    senderId: ObjectId,
    senderRole: 'client' | 'worker' | 'admin',
    message: string,
    attachments?: {
      filename: string,
      url: string,
    }[],
    timestamp: Date,
  }[],

  // Time tracking
  timeTracking: {
    startTime: Date,
    endTime?: Date,
    duration: number, // minutes
    notes?: string,
  }[],

  totalTimeSpent: number, // minutes

  // Revisions
  revisions: {
    round: number,
    requestedAt: Date,
    feedback: string,
    completedAt?: Date,
  }[],

  revisionsAllowed: number,
  revisionsUsed: number,

  // Completion
  completedAt?: Date,

  // Ratings & reviews
  clientRating?: {
    rating: number, // 1-5
    review?: string,
    createdAt: Date,
  },

  workerRating?: {
    rating: number, // 1-5
    review?: string,
    createdAt: Date,
  },

  // Quality metrics
  qualityScore?: number,
  onTimeDelivery: boolean,

  // Admin/system
  adminNotes?: string,
  flagged: boolean,
  flagReason?: string,

  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
- `clientId` + `status`
- `workerId` + `status`
- `status`
- `category` + `status`
- `deadline`
- `createdAt`

---

#### 3. **Subscriptions Collection**

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users, indexed),

  tier: 'starter' | 'growth' | 'scale',
  status: 'active' | 'cancelled' | 'past_due' | 'paused',

  credits: {
    monthlyAllocation: number,
    rolloverMonths: number, // 2, 3, or 6 depending on tier
    currentPeriodCredits: number,
    availableCredits: number,
    usedCredits: number,
  },

  pricing: {
    amount: number,
    currency: 'USD',
    interval: 'month' | 'year',
  },

  // Stripe integration
  stripeSubscriptionId: string,
  stripeCustomerId: string,

  // Billing cycle
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  billingCycleAnchor: Date,

  // Trial
  trialStart?: Date,
  trialEnd?: Date,

  // Cancellation
  cancelAtPeriodEnd: boolean,
  cancelledAt?: Date,
  cancellationReason?: string,

  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
- `userId` (unique)
- `stripeSubscriptionId`
- `status`

---

#### 4. **Transactions Collection**

```typescript
{
  _id: ObjectId,

  type: 'subscription_payment' | 'one_time_payment' | 'refund' | 'worker_payout' | 'credit_purchase',

  // Parties involved
  clientId?: ObjectId (ref: Users),
  workerId?: ObjectId (ref: Users),
  jobId?: ObjectId (ref: Jobs),
  subscriptionId?: ObjectId (ref: Subscriptions),

  // Financial details
  amount: number,
  currency: 'USD',
  fee: number, // Platform fee
  netAmount: number, // Amount after fees

  // Credits (if applicable)
  credits?: number,

  // Payment processor
  stripePaymentIntentId?: string,
  stripeChargeId?: string,
  paymentMethod: 'card' | 'bank_transfer' | 'other',

  // Status
  status: 'pending' | 'succeeded' | 'failed' | 'refunded',

  // Metadata
  description: string,
  metadata?: any,

  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
- `clientId` + `createdAt`
- `workerId` + `createdAt`
- `jobId`
- `stripePaymentIntentId`
- `status`

---

#### 5. **Notifications Collection**

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users, indexed),

  type: 'job_assigned' | 'job_completed' | 'message_received' | 'payment_received' | 'deadline_approaching' | 'system',

  title: string,
  message: string,

  // Related entities
  jobId?: ObjectId,
  senderId?: ObjectId,

  // Delivery
  read: boolean,
  readAt?: Date,

  // Channels
  channels: {
    inApp: boolean,
    email: boolean,
    push?: boolean,
  },

  emailSent: boolean,
  emailSentAt?: Date,

  // Actions
  actionUrl?: string,
  actionLabel?: string,

  createdAt: Date,
}
```

**Indexes:**
- `userId` + `read` + `createdAt`
- `type`

---

#### 6. **Skills Collection** (Reference Data)

```typescript
{
  _id: ObjectId,
  name: string,
  slug: string (unique, indexed),
  category: 'design' | 'video' | 'development' | 'marketing' | 'business' | 'other',
  description: string,
  icon?: string,
  active: boolean,
  pricing: {
    suggestedHourly: {
      junior: number,
      mid: number,
      senior: number,
    },
    creditEquivalent: number,
  },
  createdAt: Date,
  updatedAt: Date,
}
```

---

#### 7. **AuditLogs Collection** (Admin tracking)

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: Users),
  action: string, // 'job_created', 'worker_assigned', 'payment_processed', etc.
  entity: 'job' | 'user' | 'subscription' | 'payment',
  entityId: ObjectId,
  changes?: any, // What changed
  ipAddress: string,
  userAgent: string,
  timestamp: Date,
}
```

**Indexes:**
- `userId` + `timestamp`
- `entity` + `entityId`

---

### Database Relationships

```
Users (Clients)
  ├─── has many Jobs (as client)
  ├─── has one Subscription
  ├─── has many Transactions (as payer)
  └─── has many Notifications

Users (Workers)
  ├─── has many Jobs (as assigned worker)
  ├─── has many Transactions (as payee)
  └─── has many Notifications

Jobs
  ├─── belongs to one User (client)
  ├─── belongs to one User (worker, optional)
  ├─── has many Messages (embedded)
  ├─── has many Files (embedded)
  └─── has many TimeTracking entries (embedded)

Subscriptions
  ├─── belongs to one User (client)
  └─── has many Transactions

Skills
  └─── referenced by many Users (workers)
```

---

## API Design

### API Structure

**Base URL:** `https://api.nimmit.com/v1`

**Authentication:** JWT Bearer Token in `Authorization` header

### REST API Endpoints

#### Authentication

```
POST   /auth/register          # Register new user
POST   /auth/login             # Login
POST   /auth/logout            # Logout (invalidate token)
POST   /auth/refresh           # Refresh JWT token
POST   /auth/forgot-password   # Request password reset
POST   /auth/reset-password    # Reset password with token
POST   /auth/verify-email      # Verify email address
```

#### Users

```
GET    /users/me               # Get current user profile
PATCH  /users/me               # Update current user profile
PATCH  /users/me/password      # Change password
GET    /users/:id              # Get user by ID (admin/public profile)

# Worker-specific
PATCH  /users/me/worker-profile      # Update worker profile
POST   /users/me/portfolio            # Add portfolio item
DELETE /users/me/portfolio/:id       # Remove portfolio item
PATCH  /users/me/availability        # Update availability status

# Client-specific
GET    /users/me/subscription         # Get subscription details
GET    /users/me/credits              # Get credit balance
```

#### Jobs

```
# Client endpoints
GET    /jobs                   # List client's jobs (with filters)
POST   /jobs                   # Create new job request
GET    /jobs/:id               # Get job details
PATCH  /jobs/:id               # Update job (before assigned)
DELETE /jobs/:id               # Cancel job
POST   /jobs/:id/messages      # Send message
POST   /jobs/:id/files         # Upload files
GET    /jobs/:id/files/:fileId # Download file
POST   /jobs/:id/complete      # Mark job as complete
POST   /jobs/:id/request-revision    # Request revision
POST   /jobs/:id/rate          # Rate worker

# Worker endpoints
GET    /jobs/available         # Get available jobs (matching queue)
POST   /jobs/:id/accept        # Accept job assignment
POST   /jobs/:id/decline       # Decline job assignment
POST   /jobs/:id/deliverables  # Upload deliverable files
POST   /jobs/:id/time-tracking # Log time entry
POST   /jobs/:id/submit        # Submit completed work
POST   /jobs/:id/rate          # Rate client

# Admin endpoints
GET    /admin/jobs             # List all jobs
PATCH  /admin/jobs/:id/assign  # Manually assign job
POST   /admin/jobs/:id/reassign      # Reassign to different worker
```

#### Subscriptions

```
GET    /subscriptions/plans    # Get available subscription plans
POST   /subscriptions          # Create subscription
GET    /subscriptions/:id      # Get subscription details
PATCH  /subscriptions/:id      # Update subscription (upgrade/downgrade)
POST   /subscriptions/:id/cancel     # Cancel subscription
POST   /subscriptions/:id/reactivate # Reactivate cancelled subscription
GET    /subscriptions/:id/invoices   # Get billing history
```

#### Payments

```
POST   /payments/intent        # Create payment intent (Stripe)
POST   /payments/confirm       # Confirm payment
GET    /payments/methods       # Get saved payment methods
POST   /payments/methods       # Add payment method
DELETE /payments/methods/:id   # Remove payment method
GET    /payments/history       # Get payment history
POST   /webhooks/stripe        # Stripe webhook handler
```

#### Skills

```
GET    /skills                 # Get all skills
GET    /skills/:slug           # Get skill details
GET    /skills/categories      # Get skill categories
```

#### Notifications

```
GET    /notifications          # Get user notifications
PATCH  /notifications/:id/read # Mark as read
PATCH  /notifications/read-all # Mark all as read
DELETE /notifications/:id      # Delete notification
```

#### Analytics (Client & Worker)

```
# Client
GET    /analytics/spending     # Spending over time
GET    /analytics/jobs         # Job statistics
GET    /analytics/workers      # Top workers

# Worker
GET    /analytics/earnings     # Earnings over time
GET    /analytics/performance  # Performance metrics
GET    /analytics/clients      # Top clients
```

#### Admin

```
GET    /admin/dashboard        # Overview stats
GET    /admin/users            # List users (with filters)
PATCH  /admin/users/:id        # Update user (suspend, etc.)
GET    /admin/workers          # List workers with stats
GET    /admin/clients          # List clients with stats
GET    /admin/capacity         # Worker capacity dashboard
GET    /admin/quality-metrics  # Quality metrics
GET    /admin/revenue          # Revenue analytics
POST   /admin/workers/:id/verify    # Verify worker skill
```

### API Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional details
  }
}
```

**Pagination:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 157,
    "totalPages": 8
  }
}
```

### API Versioning

Use URL versioning: `/v1/`, `/v2/`, etc.

Maintain backward compatibility within a major version.

---

## Authentication & Authorization

### Authentication Strategy

**JWT (JSON Web Tokens)**

**Token Types:**
1. **Access Token** - Short-lived (15 minutes), for API requests
2. **Refresh Token** - Long-lived (7 days), to get new access tokens

**Token Storage:**
- Access token: Memory (React state) or sessionStorage
- Refresh token: httpOnly cookie (secure, not accessible to JS)

**Login Flow:**
```
1. User submits email + password
2. Backend validates credentials
3. Backend generates access token + refresh token
4. Access token sent in response body
5. Refresh token set as httpOnly cookie
6. Client stores access token in memory/sessionStorage
7. Client includes access token in Authorization header for API calls
```

**Token Refresh Flow:**
```
1. Access token expires (15 min)
2. Client attempts API call → gets 401 Unauthorized
3. Client calls /auth/refresh endpoint (refresh token in cookie)
4. Backend validates refresh token
5. Backend issues new access token (and optionally new refresh token)
6. Client retries original API call with new token
```

### Authorization (Role-Based Access Control)

**Roles:**
- `client` - Can create jobs, view own jobs, manage subscription
- `worker` - Can view available jobs, accept/decline, submit work
- `admin` - Full access to all resources

**Permission Middleware:**
```typescript
// Example middleware
const requireRole = (roles: string[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

// Usage
router.get('/admin/users', requireAuth, requireRole(['admin']), getUsersHandler);
```

**Resource-Level Authorization:**
- Clients can only access their own jobs
- Workers can only access jobs assigned to them
- Admins can access everything

---

## File Storage Strategy

### Storage Solution: Cloudflare R2

**Bucket Structure:**
```
nimmit-files/
├── client-uploads/
│   └── {clientId}/
│       └── {jobId}/
│           └── {timestamp}_{filename}
│
├── deliverables/
│   └── {workerId}/
│       └── {jobId}/
│           └── v{version}_{timestamp}_{filename}
│
├── avatars/
│   └── {userId}_{timestamp}.jpg
│
└── portfolio/
    └── {workerId}/
        └── {itemId}/
            └── {filename}
```

### File Upload Flow (Client → R2)

**Direct Upload (Presigned URLs):**

```
1. Client requests upload URL from backend
   POST /jobs/:id/files/upload-url
   Body: { filename: 'design.psd', mimeType: 'image/vnd.adobe.photoshop' }

2. Backend generates presigned R2 URL (valid for 15 min)
   Response: { uploadUrl: 'https://[account].r2.cloudflarestorage.com/...', fileId: 'abc123' }

3. Client uploads file directly to R2 using presigned URL
   PUT https://[account].r2.cloudflarestorage.com/...

4. Client notifies backend of successful upload
   POST /jobs/:id/files
   Body: { fileId: 'abc123', filename: 'design.psd', size: 12345678 }

5. Backend saves file metadata to database
```

**Benefits:**
- ✅ No backend bandwidth usage
- ✅ Faster uploads (Cloudflare's global network)
- ✅ R2 handles large files well
- ✅ Reduces backend server load
- ✅ Zero egress fees (free downloads)

### File Download Flow

**Presigned Download URLs (for security):**

```
1. Client requests file
   GET /jobs/:id/files/:fileId

2. Backend verifies authorization (user can access this job)

3. Backend generates presigned R2 download URL (valid for 5 min)

4. Backend redirects to presigned URL
   Response: 302 Redirect → https://[account].r2.cloudflarestorage.com/...

5. Client downloads file directly from R2 (zero egress cost!)
```

### File Processing

**Image Processing (with Sharp):**
- Resize avatars to 256x256, 512x512
- Generate thumbnails for portfolio images
- Compress images

**Video Processing (Optional, Phase 2):**
- Generate thumbnails
- Convert to web-friendly formats
- Cloudflare Stream (recommended) - integrates seamlessly with R2
- Alternative: FFmpeg on backend for basic processing

### File Size Limits

- Client uploads: 500 MB per file
- Deliverables: 2 GB per file
- Avatars: 5 MB
- Portfolio: 50 MB per item

### Storage Costs Estimate

**Cloudflare R2 Pricing:**
- Storage: $0.015/GB/month
- Egress: Free (this is HUGE!)

**Example:**
- 100 GB storage = $1.50/month
- 1 TB storage = $15/month

**S3 would cost more due to egress fees**

---

## AI Integration

### Use Case: Job-to-Worker Matching

**Goal:** Automatically match incoming jobs with the best available workers based on skills, availability, performance history, and workload.

### AI Matching Algorithm

**Step 1: Job Analysis (OpenAI GPT-4)**

```typescript
// Parse job description and extract structured data
const jobAnalysis = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{
    role: "system",
    content: "Extract skills, complexity, and estimated hours from job description. Return JSON."
  }, {
    role: "user",
    content: jobDescription
  }],
  response_format: { type: "json_object" }
});

// Result:
{
  requiredSkills: ['video-editing', 'motion-graphics'],
  complexity: 'medium',
  estimatedHours: 5,
  urgency: 'standard',
  deliverableType: 'video'
}
```

**Step 2: Worker Scoring**

```typescript
// Score each worker based on:
function calculateWorkerScore(worker, job) {
  let score = 0;

  // Skill match (40% weight)
  const skillMatch = worker.skills.filter(s =>
    job.requiredSkills.includes(s)
  ).length / job.requiredSkills.length;
  score += skillMatch * 0.4;

  // Availability (25% weight)
  if (worker.availability.status === 'available') {
    score += 0.25;
  } else if (worker.availability.status === 'busy') {
    const currentWorkload = worker.currentJobs.length;
    score += (1 - currentWorkload / 5) * 0.25; // Lower score if busy
  }

  // Performance history (20% weight)
  score += (worker.stats.averageRating / 5) * 0.2;
  score += (worker.stats.completionRate / 100) * 0.05;

  // Response time (10% weight)
  const responseBonus = Math.max(0, 1 - (worker.stats.responseTime / 60));
  score += responseBonus * 0.1;

  // Expertise level match (5% weight)
  if (job.complexity === 'high' && worker.skillLevel[job.category] === 'senior') {
    score += 0.05;
  }

  return score;
}
```

**Step 3: Worker Selection**

```typescript
// Get top 3 candidates
const scoredWorkers = availableWorkers
  .map(worker => ({
    worker,
    score: calculateWorkerScore(worker, job)
  }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 3);

// Offer job to top candidate first
// If declined or no response in 15 min, offer to next
```

### AI for Quality Checking (Future Phase)

Use AI to check deliverables before client review:
- Image quality assessment
- Video content analysis
- Text proofreading
- Brand guideline compliance

---

## Real-Time Features

### WebSocket Implementation (Socket.io)

**Use Cases:**
1. Real-time messaging between client and worker
2. Job status updates
3. Notifications
4. Worker availability updates (admin dashboard)
5. Live typing indicators

### Socket.io Architecture

**Namespaces:**
- `/jobs` - Job-related events
- `/messages` - Real-time messaging
- `/admin` - Admin dashboard updates

**Authentication:**
```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const user = verifyJWT(token);
  if (user) {
    socket.user = user;
    next();
  } else {
    next(new Error('Unauthorized'));
  }
});
```

**Rooms:**
- Each job gets a room: `job:${jobId}`
- Each user gets a room: `user:${userId}`

**Events:**

```typescript
// Client → Server
socket.emit('job:message', { jobId, message });
socket.emit('job:typing', { jobId });
socket.emit('worker:status', { status: 'available' });

// Server → Client
socket.on('job:status_changed', ({ jobId, status }) => {});
socket.on('job:new_message', ({ jobId, message }) => {});
socket.on('notification', ({ notification }) => {});
socket.on('worker:assigned', ({ jobId, worker }) => {});
```

### Fallback for Real-Time Features

**Polling as fallback:**
- If WebSocket connection fails, fall back to polling every 10-30 seconds
- Check for new messages, status updates

---

## Payment Integration

### Stripe Integration

**Features to Use:**
- Checkout Sessions (for subscriptions)
- Payment Intents (for one-time payments)
- Webhooks (for event handling)
- Customer Portal (for self-service)

### Subscription Flow

```
1. Client selects subscription tier on frontend

2. Frontend calls backend:
   POST /subscriptions
   Body: { tier: 'growth' }

3. Backend creates Stripe Checkout Session
   const session = await stripe.checkout.sessions.create({
     customer: stripeCustomerId,
     mode: 'subscription',
     line_items: [{
       price: 'price_growth_monthly',
       quantity: 1
     }],
     success_url: 'https://nimmit.com/dashboard?session_id={CHECKOUT_SESSION_ID}',
     cancel_url: 'https://nimmit.com/pricing'
   });

4. Backend returns checkout URL
   Response: { checkoutUrl: 'https://checkout.stripe.com/...' }

5. Frontend redirects to Stripe Checkout

6. Customer completes payment on Stripe

7. Stripe sends webhook to backend:
   POST /webhooks/stripe
   Event: 'checkout.session.completed'

8. Backend handles webhook:
   - Create subscription record
   - Allocate credits
   - Send confirmation email

9. Stripe redirects customer back to success_url
```

### Webhook Events to Handle

```typescript
switch (event.type) {
  case 'checkout.session.completed':
    // New subscription created
    await handleNewSubscription(event.data.object);
    break;

  case 'invoice.payment_succeeded':
    // Recurring payment succeeded
    await handlePaymentSuccess(event.data.object);
    break;

  case 'invoice.payment_failed':
    // Payment failed
    await handlePaymentFailure(event.data.object);
    break;

  case 'customer.subscription.updated':
    // Subscription changed (upgrade/downgrade)
    await handleSubscriptionUpdate(event.data.object);
    break;

  case 'customer.subscription.deleted':
    // Subscription cancelled
    await handleSubscriptionCancellation(event.data.object);
    break;
}
```

### Credit System Logic

**Allocating Credits:**
```typescript
// On subscription start/renewal
function allocateCredits(subscription) {
  const tierCredits = {
    starter: 10,
    growth: 25,
    scale: 60
  };

  subscription.credits.currentPeriodCredits = tierCredits[subscription.tier];
  subscription.credits.availableCredits += tierCredits[subscription.tier];

  // Handle rollover expiry
  if (subscription.credits.rolloverCredits > 0) {
    const rolloverExpiry = subscription.credits.rolloverExpiry;
    if (rolloverExpiry && rolloverExpiry < new Date()) {
      // Expire old rollover credits
      subscription.credits.rolloverCredits = 0;
    }
  }
}
```

**Using Credits:**
```typescript
// When job is completed
function deductCredits(clientId, jobId, creditsUsed) {
  const client = await User.findById(clientId);

  if (client.clientProfile.credits.available < creditsUsed) {
    throw new Error('Insufficient credits');
  }

  client.clientProfile.credits.available -= creditsUsed;
  client.clientProfile.credits.used += creditsUsed;

  await client.save();

  // Log transaction
  await Transaction.create({
    type: 'credit_usage',
    clientId,
    jobId,
    credits: creditsUsed
  });
}
```

---

## Email & Notifications

### Email Service

**Provider: SendGrid or Resend**

**Why SendGrid?**
- ✅ Reliable delivery
- ✅ Email templates
- ✅ Analytics
- ✅ Free tier: 100 emails/day

**Why Resend?**
- ✅ Modern, developer-friendly
- ✅ React Email integration (great DX)
- ✅ Affordable

**Email Types:**
1. Transactional
   - Welcome email
   - Email verification
   - Password reset
   - Job status updates
   - Payment receipts

2. Notifications
   - New job assigned
   - Message received
   - Deliverable submitted
   - Deadline approaching

3. Marketing (Future)
   - Newsletter
   - Feature announcements

### Notification System

**Multi-Channel:**
- In-app notifications (stored in database)
- Email notifications
- Push notifications (future)

**Notification Preferences:**
```typescript
{
  userId: ObjectId,
  preferences: {
    email: {
      jobUpdates: true,
      messages: true,
      marketing: false,
    },
    inApp: {
      jobUpdates: true,
      messages: true,
    },
    push: {
      jobUpdates: false,
      messages: true,
    }
  }
}
```

### Background Jobs (Bull Queue)

**Use Bull/BullMQ for:**
- Sending emails (don't block API response)
- Processing file uploads
- Running AI matching algorithm
- Generating reports
- Cleaning up old data

**Example:**
```typescript
// Add job to queue
await emailQueue.add('welcome-email', {
  userId,
  email: user.email,
  name: user.profile.firstName
});

// Process jobs
emailQueue.process('welcome-email', async (job) => {
  const { userId, email, name } = job.data;
  await sendEmail({
    to: email,
    template: 'welcome',
    data: { name }
  });
});
```

---

## Security Considerations

### 1. **Authentication Security**

- ✅ Hash passwords with bcrypt (cost factor: 12)
- ✅ Rate limit login attempts (5 attempts per 15 min)
- ✅ Require strong passwords (min 8 chars, mix of cases, numbers, symbols)
- ✅ Email verification required
- ✅ 2FA optional (future)
- ✅ JWT secret rotation policy
- ✅ Refresh token rotation

### 2. **API Security**

- ✅ Rate limiting (express-rate-limit)
  - General: 100 requests per 15 min per IP
  - Auth endpoints: 5 requests per 15 min
- ✅ Helmet.js for security headers
- ✅ CORS properly configured
- ✅ Input validation (Zod schemas)
- ✅ SQL/NoSQL injection prevention (Mongoose escaping)
- ✅ XSS prevention (sanitize inputs)
- ✅ CSRF protection for cookie-based auth

### 3. **File Upload Security**

- ✅ Validate file types (whitelist MIME types)
- ✅ Scan for malware (ClamAV or cloud service)
- ✅ File size limits
- ✅ Presigned URLs with expiration
- ✅ Virus scanning for downloads
- ✅ No executable files allowed

### 4. **Data Security**

- ✅ Encrypt sensitive data at rest (MongoDB encryption)
- ✅ TLS/SSL for data in transit
- ✅ Secure environment variables (.env, never commit)
- ✅ Database backups (daily)
- ✅ Access logs (audit trail)
- ✅ PII handling compliance

### 5. **Payment Security**

- ✅ Never store credit card data (Stripe handles this)
- ✅ Verify Stripe webhook signatures
- ✅ Use Stripe test mode in development
- ✅ Implement idempotency for payments

### 6. **Infrastructure Security**

- ✅ Keep dependencies updated (Dependabot)
- ✅ Regular security audits (`npm audit`)
- ✅ Environment separation (dev/staging/prod)
- ✅ Secrets management (env vars, not hardcoded)
- ✅ Database access restricted (whitelist IPs)
- ✅ No default credentials

---

## Scalability & Performance

### Database Optimization

**Indexes:**
- All foreign keys indexed
- Query patterns analyzed and indexed
- Compound indexes for common filters
- Text indexes for search (if needed)

**Sharding Strategy (Future):**
- Shard by `clientId` or geographic region
- Consider when database > 100GB

**Read Replicas:**
- Separate read/write operations
- Analytics queries go to replicas
- Consider when read load is high

### Caching Strategy

**Redis Cache:**

1. **User sessions** (15 min TTL)
2. **Worker availability** (5 min TTL)
3. **Job queue** (real-time)
4. **API responses** (for expensive queries)

**Example:**
```typescript
// Check cache first
const cachedWorkers = await redis.get(`available-workers:${skillId}`);
if (cachedWorkers) {
  return JSON.parse(cachedWorkers);
}

// Query database
const workers = await Worker.find({
  skills: skillId,
  'availability.status': 'available'
});

// Cache for 5 minutes
await redis.setex(
  `available-workers:${skillId}`,
  300,
  JSON.stringify(workers)
);

return workers;
```

### API Performance

- ✅ Pagination for list endpoints (default 20 per page)
- ✅ Field selection (only return requested fields)
- ✅ Compression (gzip/brotli)
- ✅ CDN for static assets
- ✅ Database connection pooling
- ✅ Query optimization (avoid N+1 queries)

### Frontend Performance

- ✅ Code splitting (lazy loading routes)
- ✅ Image optimization (WebP, lazy loading)
- ✅ Debounced API calls
- ✅ Optimistic UI updates
- ✅ Service Worker for offline support (PWA, future)

### Monitoring & Observability

**Tools:**
- **Sentry** - Error tracking
- **LogRocket** or **FullStory** - Session replay (optional)
- **Datadog** or **New Relic** - APM (if budget allows)
- **Simple Analytics** or **Plausible** - Privacy-focused analytics

**Metrics to Track:**
- API response times
- Error rates
- Database query performance
- Worker availability
- Job completion rates
- Payment success rates

---

## Deployment Architecture

### Development Environment

```
Local Machine
├── Frontend: localhost:5173 (Vite dev server)
├── Backend: localhost:3000 (Express with nodemon)
├── MongoDB: localhost:27017 (Docker or local install)
└── Redis: localhost:6379 (Docker)
```

**Docker Compose (optional but recommended):**
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  mongo-data:
```

### Staging Environment

**Purpose:** Test before production

```
Frontend: staging.nimmit.com (Vercel)
Backend: api-staging.nimmit.com (Railway/Render)
Database: MongoDB Atlas (Shared cluster)
Redis: Upstash (Free tier)
Storage: Cloudflare R2 (staging bucket)
Stripe: Test mode
```

### Production Environment

```
Frontend: nimmit.com (Vercel)
Backend: api.nimmit.com (Railway/Render/AWS)
Database: MongoDB Atlas (Dedicated cluster, Multi-region)
Redis: Upstash or Redis Cloud (Production tier)
Storage: Cloudflare R2 (production bucket)
Stripe: Live mode
CDN: Cloudflare
```

### CI/CD Pipeline

**GitHub Actions:**

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway
        # Deploy backend

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        # Deploy frontend
```

### Environment Variables

**.env.example:**
```bash
# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/nimmit
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# File Storage - Cloudflare R2 (Primary)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=nimmit-files
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev

# Alternative: AWS S3 (if needed)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=nimmit-files

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@nimmit.com

# OpenAI
OPENAI_API_KEY=sk-...

# Sentry (Error tracking)
SENTRY_DSN=
```

### Backup Strategy

**Database Backups:**
- MongoDB Atlas: Automatic daily backups (7-day retention)
- Additional weekly backups to R2 bucket (3-month retention)

**File Backups:**
- R2 object versioning enabled
- Cross-region R2 replication for critical files
- Optional: Backblaze B2 for additional redundancy

---

## Development Phases

### Phase 1: MVP (Weeks 1-6)

**Goal:** Launch with core features for manual operations

**Features:**
- ✅ User authentication (client, worker, admin)
- ✅ Job creation (simple form)
- ✅ Manual job assignment (admin)
- ✅ File upload/download (basic)
- ✅ Job status tracking
- ✅ Basic messaging
- ✅ Stripe payment integration (one-time payments)
- ✅ Basic admin dashboard

**Tech Stack:**
- Frontend: React + Vite + TypeScript + TailwindCSS
- Backend: Express + MongoDB + JWT auth
- Storage: Cloudflare R2
- Deployment: Vercel (frontend) + Railway (backend)

**NOT in Phase 1:**
- ❌ AI matching (manual assignment)
- ❌ Subscriptions (start with pay-per-job)
- ❌ Real-time messaging (basic async)
- ❌ Worker time tracking
- ❌ Advanced analytics

---

### Phase 2: Automation (Weeks 7-12)

**Goal:** Automate job matching and add subscriptions

**Features:**
- ✅ AI-powered job matching
- ✅ Subscription tiers with credits
- ✅ Worker availability management
- ✅ Smart job queue
- ✅ Real-time notifications (Socket.io)
- ✅ Email notifications
- ✅ Improved file management
- ✅ Worker performance tracking
- ✅ Client dashboard with analytics

**Enhancements:**
- Better admin dashboard (capacity, metrics)
- Worker portfolio showcase
- Client preferred workers
- Job templates

---

### Phase 3: Scale (Months 4-6)

**Goal:** Handle 100+ active clients, optimize operations

**Features:**
- ✅ Real-time messaging with typing indicators
- ✅ Time tracking for workers
- ✅ Advanced analytics (clients, workers, admins)
- ✅ Referral system
- ✅ Agency white-label support
- ✅ Mobile-responsive optimization
- ✅ API rate limiting and optimization
- ✅ Advanced search and filters
- ✅ Quality assurance workflows

**Infrastructure:**
- Database optimization (indexes, queries)
- Caching layer (Redis)
- CDN optimization
- Background job processing (Bull)
- Performance monitoring

---

### Phase 4: Growth (Months 6-12)

**Goal:** Scale to 500+ clients, expand features

**Features:**
- ✅ Mobile apps (React Native or PWA)
- ✅ Advanced AI features (quality checking)
- ✅ Video processing automation
- ✅ Team collaboration features
- ✅ API for third-party integrations
- ✅ Advanced reporting
- ✅ Worker certification program
- ✅ Client training resources

**Business:**
- Expand service offerings
- Geographic expansion
- Partnership integrations
- Marketing automation

---

## Technology Decisions Summary

| Category | Choice | Alternative Considered | Rationale |
|----------|--------|------------------------|-----------|
| Frontend Framework | React + Vite + TS | Next.js, Vue | Fast dev, familiar, flexible |
| Backend Framework | Express + TS | Fastify, NestJS | Mature, simple, widely used |
| Database | MongoDB | PostgreSQL | Flexible schema, good for MVP |
| Cache/Queue | Redis | - | Standard choice, reliable |
| File Storage | Cloudflare R2 | AWS S3 | Cheaper, free egress |
| Authentication | JWT + Passport | Auth0, Clerk | Full control, no vendor lock-in |
| Payments | Stripe | PayPal | Best developer experience |
| Email | SendGrid/Resend | Mailgun | Reliable, good templates |
| AI | OpenAI GPT-4 | Claude API | Established, good for matching |
| Hosting (Frontend) | Vercel | Netlify | Best DX, fast deployments |
| Hosting (Backend) | Railway | Render, AWS | Easy setup, affordable |
| Monitoring | Sentry | Datadog | Free tier, good error tracking |

---

## Next Steps

1. ✅ Review and approve architecture
2. ✅ Set up repositories (monorepo vs. separate repos?)
3. ✅ Set up development environment
4. ✅ Initialize projects (Vite + Express)
5. ✅ Set up MongoDB + Redis (Docker Compose)
6. ✅ Implement authentication first
7. ✅ Build core models (User, Job)
8. ✅ Develop MVP features iteratively

---

**Questions to Resolve:**

1. **Monorepo or separate repos?**
   - Monorepo (recommended): Easier to share types, single deployment
   - Separate: More separation, can version independently

2. **Start with subscriptions or pay-per-job?**
   - Recommendation: Pay-per-job for MVP, add subscriptions in Phase 2

3. **Worker payment method?**
   - Wise, Payoneer, or manual bank transfers initially?
   - Need to integrate payout API?

4. **Admin features priority?**
   - Which admin features are critical for launch?
   - Can some be manual processes initially?

5. **Testing strategy?**
   - Unit tests, integration tests, E2E tests?
   - Testing frameworks: Jest, Playwright?

---

**Ready to start coding once you approve this architecture!**
