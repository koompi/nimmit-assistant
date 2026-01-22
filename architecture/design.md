# Nimmit Platform - Technical Architecture Design

**Last Updated:** January 22, 2026
**Status:** Pre-MVP Development Phase

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

### Business Model
**Quality-First Approach:**
- Curated talent pool (hired and vetted by platform)
- Core salaried team (15 workers) + flex workers hired as needed
- Focus on long-term client relationships with predictable workflow
- Scale by hiring quality workers when capacity is exceeded (not by opening marketplace)

**Worker Tiers:**
1. **Core Team** - Salaried workers with guaranteed income and priority assignments
2. **Flex Workers** - Hired per job/hour basis when capacity exceeded, all quality-vetted

### Key Differentiators
- AI-powered job matching and quality checks
- Timezone advantage (overnight delivery)
- Credit-based subscription model
- Curated quality (not open marketplace)
- Long-term client relationships

---

## Technology Stack

### Full-Stack Framework: Next.js 14+ (App Router)

**Framework: Next.js + React + TypeScript**

**Why Next.js instead of separate Vite + Express?**
- ✅ Full-stack in single codebase (API routes + frontend)
- ✅ Team already uses it (StadiumX experience)
- ✅ Server-side rendering for SEO and performance
- ✅ Edge functions for global performance
- ✅ Built-in API routes (replaces Express backend)
- ✅ TypeScript throughout
- ✅ Simplified deployment (single app to Vercel)
- ✅ Easier to maintain and iterate quickly

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

**Project Structure:**
```
nimmit/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth pages (login, register)
│   │   ├── (client)/          # Client portal routes
│   │   ├── (worker)/          # Worker portal routes
│   │   ├── (admin)/           # Admin dashboard routes
│   │   ├── api/               # API routes (replaces Express)
│   │   │   ├── auth/
│   │   │   ├── jobs/
│   │   │   ├── users/
│   │   │   ├── payments/
│   │   │   ├── ai/            # AI endpoints
│   │   │   └── webhooks/
│   │   └── layout.tsx
│   │
│   ├── components/             # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── client/            # Client-specific
│   │   ├── worker/            # Worker-specific
│   │   └── shared/            # Shared components
│   │
│   ├── lib/                    # Utilities and libraries
│   │   ├── db/                # Database models
│   │   ├── ai/                # AI integrations
│   │   ├── auth/              # Auth utilities
│   │   ├── storage/           # R2 file storage
│   │   └── payments/          # Stripe integration
│   │
│   └── types/                  # TypeScript types
│
├── public/                     # Static assets
└── tests/
```

### Backend (Next.js API Routes)

**Framework: Next.js API Routes (replaces Express)**

**Why Next.js API Routes?**
- ✅ Integrated with frontend (no CORS issues)
- ✅ Serverless by default on Vercel
- ✅ TypeScript throughout
- ✅ Easier to maintain single codebase
- ✅ Built-in edge runtime support

**API Routes Structure:**
```
/app/api/
├── auth/              # Authentication endpoints
├── jobs/              # Job CRUD operations
│   └── [id]/
│       ├── accept/
│       ├── messages/
│       ├── files/
│       └── ...
├── users/             # User management
├── payments/          # Stripe integration
├── ai/                # AI-powered features
│   ├── analyze-job/
│   ├── match-workers/
│   └── quality-check/
└── webhooks/          # External webhooks (Stripe, etc.)
```

**Key Libraries:**
- **Validation:** Zod (shared with frontend)
- **Authentication:** NextAuth.js
- **File Upload:** Direct to R2 with presigned URLs
- **Image Processing:** Sharp
- **Email:** SendGrid or Resend
- **Job Queue:** Bull or BullMQ (Redis-based)
- **Logging:** Built-in Next.js logging + Sentry
- **Testing:** Jest + Playwright
- **AI:** OpenAI SDK

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

**Full-Stack App:** Vercel
- Next.js native deployment
- Automatic deployments from Git
- Global CDN included
- Free SSL
- Edge functions support
- Serverless API routes
- Single deployment (simpler than separate frontend/backend)

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
    workerType: 'core' | 'flex',  // NEW: Worker tier

    // Core workers (salaried)
    employment?: {
      status: 'active' | 'inactive',
      startDate: Date,
      monthlySalary: number,       // Fixed salary
      currency: 'USD',
      paymentSchedule: 'monthly',
    },

    // Flex workers (per job/hour)
    flexTerms?: {
      hourlyRate: number,           // $8-12/hour
      availability: 'active' | 'inactive',
      minimumHours?: number,
    },

    skills: string[],  // ['video-editing', 'graphic-design', ...]
    skillLevel: {
      [skillId: string]: 'junior' | 'mid' | 'senior'
    },
    portfolio: {
      title: string,
      description: string,
      fileUrl: string,
      thumbnailUrl: string,
    }[],
    availability: {
      status: 'available' | 'busy' | 'offline',
      capacity: number,              // Max concurrent jobs
      currentLoad: number,            // Current active jobs
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
    company?: string,
    industry?: string,
    subscriptionTier: 'starter' | 'growth' | 'scale' | 'payAsYouGo' | 'enterprise',
    credits: {
      available: number,
      used: number,
      rolloverExpiry?: Date,
    },
    stripeCustomerId: string,
    stripeSubscriptionId?: string,

    // NEW: Long-term relationship tracking
    relationship: {
      status: 'trial' | 'active' | 'at_risk' | 'churned',
      startDate: Date,
      monthlyJobsAverage: number,
      preferredWorkers: ObjectId[],    // Favorite workers
      preferredSkills: string[],
      communicationStyle: string,      // AI-learned preferences
    },

    stats: {
      totalJobsPosted: number,
      totalSpent: number,
      averageRating: number,
      retentionMonths: number,
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
- `workerProfile.workerType`
- `workerProfile.skills` (for matching)
- `workerProfile.availability.status`
- `clientProfile.subscriptionTier`
- `clientProfile.relationship.status`

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

  // AI-extracted information
  aiAnalysis: {
    extractedSkills: string[],
    estimatedHours: number,
    complexity: 'simple' | 'medium' | 'complex',
    suggestedPrice: number,
    confidenceScore: number,      // How confident AI is
    rawResponse: string,          // GPT response for debugging
  },

  requiredSkills: string[],       // Confirmed skills after AI + human review

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
  status: 'pending' | 'ai_analyzing' | 'matching' | 'assigned' | 'in_progress' | 'review' | 'revision' | 'completed' | 'cancelled',

  // Matching (AI + Manual)
  matching: {
    algorithm: 'ai' | 'manual_admin' | 'client_requested',

    aiScores?: {
      workerId: ObjectId,
      score: number,
      reasoning: string,          // Why this worker was matched
      breakdown: {
        skillMatch: number,
        availability: number,
        performance: number,
        responseTime: number,
      },
    }[],

    matchingHistory: {
      workerId: ObjectId,
      action: 'offered' | 'accepted' | 'declined' | 'timeout' | 'reassigned',
      timestamp: Date,
      reason?: string,
    }[],

    assignedBy?: 'ai' | ObjectId, // Admin ID if manual
  },

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

    // AI quality check
    qualityCheck?: {
      passed: boolean,
      score: number,
      issues: string[],
      checkedAt: Date,
    },
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

#### 8. **WorkerCapacity Collection** (NEW - Capacity Management)

```typescript
{
  _id: ObjectId,
  date: Date (indexed),           // Daily snapshot

  overall: {
    totalWorkers: number,
    coreWorkers: number,
    flexWorkers: number,
    availableWorkers: number,
    busyWorkers: number,
  },

  bySkill: {
    [skillName: string]: {
      totalWorkers: number,
      available: number,
      currentJobs: number,
      capacityUtilization: number, // percentage
    }
  },

  // Predictive data (AI-generated)
  forecast: {
    nextWeek: {
      expectedJobs: number,
      expectedHours: number,
      capacityShortfall?: {
        skills: string[],
        hoursShort: number,
        recommendHire: boolean,
      },
    },
  },

  // Hiring recommendations
  hiringNeeded: {
    skill: string,
    urgency: 'low' | 'medium' | 'high',
    estimatedStartDate: Date,
    reasoning: string,
  }[],

  createdAt: Date,
}
```

**Indexes:**
- `date`

---

#### 9. **WorkerPayments Collection** (NEW - Worker Payouts)

```typescript
{
  _id: ObjectId,
  workerId: ObjectId (ref: Users, indexed),
  workerType: 'core' | 'flex',

  // Period
  period: {
    start: Date,
    end: Date,
    type: 'monthly' | 'weekly' | 'custom',
  },

  // Core workers (salary)
  salary?: {
    baseSalary: number,
    bonuses: {
      type: 'performance' | 'overtime' | 'holiday',
      amount: number,
      reason: string,
    }[],
    deductions: {
      type: string,
      amount: number,
      reason: string,
    }[],
    totalSalary: number,
  },

  // Flex workers (hours/jobs)
  flexEarnings?: {
    jobs: {
      jobId: ObjectId,
      hours: number,
      hourlyRate: number,
      amount: number,
    }[],
    totalHours: number,
    totalEarnings: number,
  },

  // Payment
  payment: {
    method: 'bank_transfer' | 'baray' | 'wise' | 'payoneer',
    status: 'pending' | 'processing' | 'paid' | 'failed',
    paidAt?: Date,
    transactionId?: string,
    currency: 'USD',
  },

  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
- `workerId` + `period.start`
- `payment.status`

---

#### 10. **ClientMetrics Collection** (NEW - Client Health Tracking)

```typescript
{
  _id: ObjectId,
  clientId: ObjectId (ref: Users, indexed),
  month: Date (indexed),          // First day of month

  jobMetrics: {
    totalJobs: number,
    completedJobs: number,
    cancelledJobs: number,
    averageDeliveryTime: number,  // hours
    revisionsRequested: number,
  },

  financialMetrics: {
    totalSpent: number,
    averageJobCost: number,
    creditsUsed: number,
    creditsRolledOver: number,
  },

  relationshipMetrics: {
    satisfactionScore: number,    // 1-5
    responseTime: number,         // hours to first message
    repeatWorkers: number,        // How many same workers used
    consistencyScore: number,     // How predictable is job volume
  },

  // AI-generated insights
  insights: {
    clientType: 'consistent' | 'sporadic' | 'growing' | 'declining',
    churnRisk: number,            // 0-1 probability
    upsellOpportunity: boolean,
    recommendations: string[],
  },

  createdAt: Date,
}
```

**Indexes:**
- `clientId` + `month`
- `insights.churnRisk`

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

**Strategy:** AI is a core differentiator from Day 1, not a future add-on. The platform combines AI automation with human expertise for optimal results.

### AI-Powered Features (Priority Order)

#### Phase 1 MVP - Core AI Features

**1. Intelligent Job Intake (Day 1)**
- AI analyzes job description and extracts structured data
- Identifies required skills, estimated hours, complexity
- Suggests pricing automatically
- Flags unclear requirements

**2. Smart Worker Matching (Day 1)**
- AI scores workers based on multiple factors
- Generates reasoning for why each worker is a good match
- Admin can review and override

**3. Brief Enhancement Assistant (Week 2-3)**
- Helps clients write better briefs
- Asks clarifying questions
- Generates structured requirements for workers

#### Phase 2 - Quality & Communication

**4. Quality Pre-Check**
- AI reviews deliverables before client sees them
- Catches obvious issues (resolution, format, etc.)
- Reduces revision requests

**5. Communication Assistant**
- Improves worker English in messages
- Suggests professional responses
- Translates intent clearly

#### Phase 3 - Intelligence & Prediction

**6. Capacity Forecasting**
- Predicts when to hire based on job trends
- Alerts admin before capacity issues
- Recommends which skills to hire for

**7. Client Health Monitoring**
- Identifies at-risk clients
- Suggests retention actions
- Predicts churn probability

---

### Implementation: Job-to-Worker Matching

**Goal:** Match incoming jobs with the best available workers based on skills, availability, performance history, and workload.

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

## Worker Management & Capacity Planning

### Worker Tier System

**Core Workers (Salaried):**
- Current team of 15 workers
- Fixed monthly salary ($400-800/month based on skill level)
- Guaranteed work and income
- Priority job assignment
- Long-term growth path
- Benefits: Predictable income, stability, training
- Tracked as `workerType: 'core'` in database

**Flex Workers (Hourly/Job-based):**
- Hired when core team capacity exceeded
- Paid $8-12/hour per job completed
- No guaranteed hours
- Quality-vetted before hiring
- Benefits: Extra income, flexible schedule
- Tracked as `workerType: 'flex'` in database

### Capacity Monitoring System

**Automated Daily Checks:**
```typescript
// Monitor capacity utilization by skill
function checkCapacity() {
  for each skill:
    utilization = currentJobs / maxCapacity

    if utilization > 85%:
      urgency = 'high'
      recommendHiring = true
      notifyAdmin()

    if utilization > 70%:
      urgency = 'medium'
      monitorClosely = true
}
```

**Admin Dashboard View:**
```
Current Capacity:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Video Editing:     [████████░░] 80% (4/5 workers busy)
Graphic Design:    [██████░░░░] 60% (3/5 workers busy)
Web Development:   [██████████] 100% (3/3 workers busy) ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hiring Recommendations:
🔴 URGENT: Web Development - Need +1 developer by Feb 1
🟡 SOON: Video Editing - Monitor, may need +1 by Feb 15
🟢 OK: Graphic Design - Capacity sufficient
```

### Hiring Trigger System

**Automatic Triggers:**
1. **Capacity Alert** - When utilization > 85% for 3+ days
2. **Wait Time Alert** - When jobs wait >24hrs for assignment
3. **Forecast Alert** - AI predicts shortage in next 2 weeks

**Hiring Workflow:**
```
1. Capacity alert triggered
2. Admin reviews recommendation
3. Decision: Core (salary) or Flex (hourly)?
4. Post job or recruit from network
5. Skills assessment + test task
6. Interview (video call)
7. Onboarding training
8. First assignment with oversight
```

### Worker Onboarding Process

**For All New Hires:**
1. Application received
2. Portfolio review + skills assessment
3. Paid test project (real client work with oversight)
4. Video interview
5. Training:
   - Platform usage
   - Quality standards
   - Client communication best practices
   - US cultural norms (existing guide)
6. Activate on platform
7. First 3 jobs with mentor oversight
8. Full independence after quality verification

### Long-Term Client Relationship Management

**Goal:** Predictable, recurring revenue from repeat clients

**Client Status Tracking:**
```typescript
type ClientStatus =
  | 'trial'      // First 1-3 jobs
  | 'active'     // Regular usage (2+ jobs/month)
  | 'at_risk'    // Declining usage or low satisfaction
  | 'churned'    // No jobs in 60+ days
```

**Retention Strategies:**
- Assign preferred workers (client favorites)
- Proactive check-ins from admin
- Dedicated account manager for enterprise clients
- AI-learned preferences (communication style, deliverable preferences)
- Early warning system for at-risk clients

**AI-Powered Client Insights:**
- Predict churn risk based on usage patterns
- Identify upsell opportunities
- Recommend retention actions
- Track satisfaction trends

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

### Worker Payout System

**Core Workers (Monthly Salary):**
```typescript
// Automated monthly payout (1st of each month)
async function processMonthlySalaries() {
  const coreWorkers = await User.find({
    role: 'worker',
    'workerProfile.workerType': 'core',
    'workerProfile.employment.status': 'active',
  });

  for (const worker of coreWorkers) {
    const salary = worker.workerProfile.employment.monthlySalary;

    // Create payment record
    await WorkerPayment.create({
      workerId: worker._id,
      workerType: 'core',
      period: {
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date()),
        type: 'monthly',
      },
      salary: {
        baseSalary: salary,
        bonuses: [], // Performance bonuses if applicable
        deductions: [],
        totalSalary: salary,
      },
      payment: {
        method: 'bank_transfer', // or 'baray' for Cambodian workers
        status: 'pending',
        currency: 'USD',
      },
    });

    // Process payment via bank transfer or Baray.io
    await processPayment(worker, salary);

    // Send notification
    await notifyWorker(worker, 'salary_processed', { amount: salary });
  }
}
```

**Flex Workers (Per Job/Hour):**
```typescript
// Process flex worker earnings (weekly or bi-weekly)
async function processFlexWorkerEarnings(workerId: string, periodEnd: Date) {
  // Get all completed jobs in period
  const jobs = await Job.find({
    workerId,
    status: 'completed',
    completedAt: { $gte: startOfPeriod(periodEnd), $lte: periodEnd },
  });

  const earnings = jobs.map(job => {
    const hours = job.totalTimeSpent / 60; // minutes to hours
    const rate = job.flexWorker.agreedRate; // $8-12/hour

    return {
      jobId: job._id,
      hours,
      hourlyRate: rate,
      amount: hours * rate,
    };
  });

  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);

  await WorkerPayment.create({
    workerId,
    workerType: 'flex',
    period: {
      start: startOfPeriod(periodEnd),
      end: periodEnd,
      type: 'weekly',
    },
    flexEarnings: {
      jobs: earnings,
      totalHours: earnings.reduce((sum, e) => sum + e.hours, 0),
      totalEarnings,
    },
    payment: {
      method: 'bank_transfer',
      status: 'pending',
      currency: 'USD',
    },
  });

  return totalEarnings;
}
```

**Payment Methods:**
- **Bank Transfer:** Direct deposit for Cambodian bank accounts
- **Baray.io:** Can integrate with existing Baray payment system if applicable
- **Wise/Payoneer:** For international transfers if needed

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

### Phase 1: MVP (Weeks 1-6) - Fast Track

**Goal:** Launch with core features + AI job intake

**Timeline:** 4-6 weeks (your team can move fast)

**Week 1-2: Foundation**
- [ ] Initialize Next.js 14 project with App Router
- [ ] Set up MongoDB Atlas + Upstash Redis
- [ ] Implement NextAuth.js authentication
- [ ] Build core data models (Users, Jobs)
- [ ] Set up Cloudflare R2 integration
- [ ] Build basic UI components (shadcn/ui)

**Week 3-4: Core Features + AI**
- [ ] Client portal: Job creation form
- [ ] **AI job analysis endpoint (OpenAI integration)** ✨
- [ ] Worker portal: Available jobs view
- [ ] Admin portal: Manual job assignment
- [ ] File upload/download (R2 presigned URLs)
- [ ] Basic messaging system

**Week 5-6: Payments & Launch**
- [ ] Stripe integration (start with pay-per-job)
- [ ] Job status workflow (pending → completed)
- [ ] Email notifications (SendGrid/Resend)
- [ ] Admin dashboard (capacity view)
- [ ] Testing with 3-5 real clients
- [ ] Bug fixes and polish

**Tech Stack:**
- **Full-Stack:** Next.js 14 + TypeScript
- **Database:** MongoDB Atlas
- **Cache:** Redis (Upstash)
- **Storage:** Cloudflare R2
- **AI:** OpenAI GPT-4
- **Payments:** Stripe
- **Deployment:** Vercel (single app)

**Launch Criteria:**
- ✅ 5 clients onboarded and actively using
- ✅ All 15 core workers trained on platform
- ✅ AI job analysis working reliably
- ✅ File uploads/downloads working
- ✅ Payments processing correctly
- ✅ Manual job assignment smooth

**Explicitly NOT in Phase 1:**
- ❌ AI worker matching (admin assigns manually)
- ❌ Subscriptions (start pay-per-job, add later)
- ❌ Real-time messaging (async is fine)
- ❌ Worker time tracking
- ❌ Quality pre-checks
- ❌ Advanced analytics

---

### Phase 2: AI & Automation (Weeks 7-12)

**Goal:** Add AI matching, subscriptions, and quality features

**Success Metrics:**
- 20+ active clients
- $10K+ MRR
- 80%+ AI matching accuracy
- <24hr avg job assignment time

**Features:**
- [ ] AI worker matching algorithm ✨
- [ ] Subscription tiers with credits
- [ ] Quality pre-check for deliverables ✨
- [ ] Communication assistant (message enhancement) ✨
- [ ] Real-time notifications
- [ ] Worker capacity dashboard
- [ ] Client metrics dashboard
- [ ] Worker performance tracking
- [ ] Preferred worker system
- [ ] Flex worker management (hire first flex workers)

**Business Focus:**
- Prove AI matching works better than manual
- Convert clients from pay-per-job to subscriptions
- Begin hiring flex workers as needed

---

### Phase 3: Scale & Intelligence (Months 4-6)

**Goal:** Achieve exit-ready metrics and intelligent automation

**Success Metrics:**
- 50+ active clients
- $25K+ MRR
- 25+ workers (core + flex)
- Acquisition-ready (strong unit economics)

**Features:**
- [ ] Capacity forecasting (AI predictions) ✨
- [ ] Hiring triggers and recommendations ✨
- [ ] Client health scoring (churn prediction) ✨
- [ ] Advanced analytics
- [ ] Real-time messaging (if needed)
- [ ] Worker time tracking
- [ ] White-label capability (for acquisition appeal)
- [ ] API for integrations (if acquirer wants it)

**Business Focus:**
- Optimize unit economics for acquisition
- Build metrics dashboard that shows growth
- Prepare for acquisition conversations
- Scale quality without scaling headcount (AI does heavy lifting)

**What Makes You Attractive to Acquirers:**
- Defensible worker supply (curated, trained team)
- AI differentiation (not just human VAs)
- Strong unit economics (clear margin structure)
- Proven demand (MRR growth, retention rates)
- Scalable operations (AI reduces overhead)

---

### Phase 4: Exit Strategy (Months 6-12)

**Goal:** Scale to acquisition target or beyond

**Target Metrics:**
- $50K+ MRR ($600K ARR)
- 100+ active clients
- 50+ workers
- 90%+ customer retention
- Clear path to $1M+ ARR

**Potential Acquirers:**
- Upwork/Fiverr (add curated tier)
- SE Asian super-apps (Grab, Gojek)
- Global VA services (Time Doctor, Belay)
- AI companies (Jasper, Copy.ai - want human fallback)

**Valuation Targets:**
- Conservative: 3-5x ARR = $1.8M - $3M
- Optimistic: 8-10x ARR = $4.8M - $6M

**Business Focus:**
- Maximize MRR and retention
- Document all processes
- Build white-label capability
- Prepare for due diligence
- Negotiate from position of strength

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
