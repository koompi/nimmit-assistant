# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nimmit** is an on-demand marketplace connecting US clients with skilled Cambodian workers for remote work including video editing, graphic design, web development, social media management, and more. The platform leverages Cambodia's 12-hour timezone advantage to provide "overnight delivery" for US clients.

**Current Status:** Architecture & Planning Phase → Moving to MVP Development

## Tech Stack

### Full-Stack Framework
- **Framework:** Next.js 14+ (App Router) with TypeScript
- **Why Next.js:** Team already uses it (StadiumX), full-stack in one codebase, simpler deployment
- **Styling:** TailwindCSS + shadcn/ui
- **State Management:** Zustand + TanStack Query (React Query)
- **Forms:** React Hook Form + Zod
- **Authentication:** NextAuth.js
- **API Routes:** Built-in Next.js API routes (replaces Express)
- **Testing:** Jest + Playwright

### Backend (Next.js API Routes)
- **Database:** MongoDB (Atlas) with Mongoose ODM
- **Cache/Queue:** Redis (Upstash) + Bull/BullMQ
- **Validation:** Zod (shared between client and server)
- **WebSockets:** Socket.io or Pusher (Phase 2)

### Infrastructure
- **File Storage:** Cloudflare R2 (S3-compatible, zero egress fees)
- **Payments:** Stripe
- **Email:** SendGrid or Resend
- **AI:** OpenAI GPT-4 (job matching)
- **Frontend Hosting:** Vercel
- **Backend Hosting:** Railway or Render
- **Monitoring:** Sentry

## Project Structure

```
nimmit/
├── docs/                    # Business & operational documentation
│   ├── business/            # Business plans, concept paper, service menu
│   └── operations/          # Operational guides and training
├── architecture/            # Technical architecture & design docs
│   ├── design.md            # Comprehensive system architecture
│   └── diagrams.md          # Architecture diagrams
├── src/
│   ├── app/                 # Next.js App Router (not yet scaffolded)
│   │   ├── (auth)/         # Auth pages
│   │   ├── (client)/       # Client portal
│   │   ├── (worker)/       # Worker portal
│   │   ├── (admin)/        # Admin dashboard
│   │   └── api/            # API routes
│   ├── components/          # React components
│   ├── lib/                 # Utilities (db, ai, auth, storage, payments)
│   └── types/               # TypeScript types
└── README.md
```

## Architecture Highlights

### Business Model (Updated)

**Quality-First Approach:**
- Curated talent pool (all workers hired and vetted by platform)
- Core salaried team (15 workers) + flex workers hired as capacity is exceeded
- Focus on long-term client relationships with predictable workflow
- Scale by hiring quality workers, NOT by opening to marketplace

**Worker Tiers:**
1. **Core Team** - 15 salaried workers ($400-800/month), guaranteed income, priority assignments
2. **Flex Workers** - Hired per job/hour ($8-12/hour) when capacity >85%, all quality-vetted

**Client Strategy:**
- Target long-term relationships (2+ jobs/month)
- Track client health and churn risk
- Assign preferred workers to repeat clients
- AI learns client preferences over time

### Core User Types
1. **Clients** - US-based customers requesting work
2. **Workers** - Cambodia-based service providers (core or flex)
3. **Admins** - Platform managers

### Key Collections (MongoDB)
- **Users** - Client/Worker/Admin profiles with role-specific fields
  - Workers have `workerType: 'core' | 'flex'`
  - Clients have `relationship.status` for long-term tracking
- **Jobs** - Job requests with AI analysis, matching, files, messages
  - Includes `aiAnalysis` field with extracted skills, complexity, pricing
  - Quality checks on deliverables
- **Subscriptions** - Credit-based subscription tiers (Starter, Growth, Scale)
- **Transactions** - Payment tracking and worker payouts
- **Notifications** - Multi-channel notifications
- **Skills** - Reference data for matching
- **WorkerCapacity** - Daily capacity snapshots and hiring recommendations (NEW)
- **WorkerPayments** - Separate tracking for core salaries vs flex earnings (NEW)
- **ClientMetrics** - Monthly client health tracking with AI insights (NEW)

### File Storage Strategy (Cloudflare R2)
- Direct uploads using presigned URLs (no backend bandwidth usage)
- Bucket structure: `client-uploads/`, `deliverables/`, `avatars/`, `portfolio/`
- Presigned download URLs for security
- Zero egress fees (major cost advantage over S3)

### Authentication
- JWT access tokens (15 min) + refresh tokens (7 days)
- Refresh tokens stored as httpOnly cookies
- Role-based access control (client/worker/admin)

### AI Integration
- OpenAI GPT-4 for job description parsing and skill extraction
- Worker matching algorithm based on skills, availability, performance, workload
- Planned: Quality checking for deliverables

## Development Commands

### Initial Setup (Not Yet Configured)
The source code hasn't been scaffolded yet. When starting development:

```bash
# Initialize Next.js project
npx create-next-app@latest nimmit --typescript --tailwind --app --src-dir

# Install dependencies
cd nimmit
npm install

# Set up environment variables
cp .env.example .env.local  # Configure with credentials

# Run development server
npm run dev  # Next.js dev server on port 3000

# Local services (Docker Compose recommended)
docker-compose up -d  # MongoDB + Redis
```

### Testing (Planned)
```bash
# Backend tests
cd src/backend
npm test              # Run all tests
npm run test:watch    # Watch mode

# Frontend tests
cd src/frontend
npm test
```

### Database (Planned)
```bash
# Migrations/seeding not yet defined
# Will use MongoDB Atlas for managed hosting
```

## Development Guidelines

### Authentication Flow
1. Login returns access token (response body) + refresh token (httpOnly cookie)
2. Include access token in `Authorization: Bearer <token>` header
3. On 401 response, call `/auth/refresh` to get new access token
4. Tokens are validated by Passport middleware

### File Upload Flow
1. Request presigned upload URL from backend: `POST /jobs/:id/files/upload-url`
2. Upload file directly to R2 using presigned URL
3. Notify backend of successful upload: `POST /jobs/:id/files`
4. Backend saves file metadata to database

### Job Workflow States
```
pending → matching → assigned → in_progress → review → revision (if needed) → completed
                                            ↓
                                        cancelled
```

### API Response Format
**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Key Business Rules
- **Credit System:** Credits are allocated monthly based on subscription tier
- **Rollover:** Unused credits roll over for 2-6 months depending on tier
- **Matching:** AI scores workers based on skills (40%), availability (25%), performance (20%), response time (10%), expertise level (5%)
- **Revisions:** Number of revisions depends on job pricing tier
- **Delivery Times:** Standard (48h), Priority (24h), Rush (12h)

### Security Requirements
- Hash passwords with bcrypt (cost factor: 12)
- Rate limit login attempts (5 per 15 min)
- Validate all inputs with Zod schemas
- Use presigned URLs for file access (5-15 min expiry)
- Whitelist file MIME types
- Never store credit card data (Stripe handles this)
- Verify Stripe webhook signatures

### Code Organization Principles
- **Backend:** MVC pattern with separate services layer for business logic
- **Frontend:** Feature-based organization with shared components
- **Shared Types:** Define TypeScript types that can be shared between frontend and backend
- **Validation:** Use Zod schemas shared between frontend and backend for consistency

## AI Integration Strategy

**Philosophy:** AI is a core differentiator from Day 1, not a future add-on

**Phase 1 MVP AI Features:**
1. **Job Intake Assistant** - Extract skills, complexity, estimate hours from description (OpenAI GPT-4)
2. **Worker Matching** - Score workers based on skills, availability, performance (Day 1: manual override by admin)
3. **Brief Enhancement** - Help clients write clearer job descriptions

**Phase 2 AI Features:**
4. **Quality Pre-Check** - AI reviews deliverables before client sees them (reduce revisions)
5. **Communication Assistant** - Improve worker English, suggest professional responses

**Phase 3 AI Features:**
6. **Capacity Forecasting** - Predict when to hire based on job trends
7. **Client Health Monitoring** - Identify at-risk clients, predict churn

## Capacity Management

**Hiring Triggers:**
- Capacity utilization >85% for 3+ days → Hire alert
- Jobs waiting >24hrs for assignment → Hire alert
- AI forecasts shortage in next 2 weeks → Hire alert

**Onboarding Process:**
1. Portfolio review + skills assessment
2. Paid test project (real work with oversight)
3. Training (platform, quality, communication, US culture)
4. First 3 jobs with mentor
5. Full independence

**Worker Payout Schedule:**
- Core workers: Monthly salary (1st of each month)
- Flex workers: Weekly or bi-weekly based on completed jobs

## Phase 1 MVP Priorities

**Timeline:** 4-6 weeks (fast track)

**Week 1-2: Foundation**
1. Initialize Next.js project
2. Set up MongoDB + Redis
3. Implement NextAuth.js
4. Build core models (Users, Jobs)
5. Set up R2 integration

**Week 3-4: Features + AI**
6. Job creation with AI analysis ✨
7. Worker portal
8. Admin assignment interface
9. File uploads/downloads
10. Basic messaging

**Week 5-6: Launch**
11. Stripe integration (pay-per-job)
12. Email notifications
13. Test with 3-5 clients
14. Polish and deploy

**Explicitly NOT in MVP:**
- ❌ AI worker matching (admin assigns manually, AI just suggests)
- ❌ Subscription tiers (start pay-per-job, add Phase 2)
- ❌ Real-time messaging (async is fine)
- ❌ Worker time tracking
- ❌ Quality pre-checks (Phase 2)
- ❌ Advanced analytics

## Important Context

### Business Model
- **Primary:** Credit-based subscription tiers ($299-$1,499/month)
- **Alternative:** Pay-as-you-go for one-off jobs
- **Target Market:** US digital solopreneurs, small agencies, growing startups ($5K-50K/month revenue)

### Key Differentiator
**"Overnight Delivery"** - While US clients sleep (evening), Cambodian workers complete tasks during their daytime, enabling 12-24 hour turnarounds.

### Service Categories (Launch Focus)
1. Video Editing (social media, product videos)
2. Graphic Design (social posts, presentations)
3. Web Development (landing pages, WordPress, web apps)

### Platform Philosophy
- **Curated over marketplace:** Pre-vetted workers, not open marketplace chaos
- **Quality guarantees:** Direct platform relationship with dispute resolution
- **Simplicity:** Fixed pricing, clear deliverables vs endless hourly uncertainty
- **Fair pricing:** $15-35/hour to clients, $8-12/hour to workers (mid-market positioning)

## Reference Documentation

- **Complete Architecture:** [architecture/design.md](./architecture/design.md) - 1,975 lines covering system design, database schema, API endpoints, security, scalability
- **Business Model:** [docs/business/concept-paper.md](./docs/business/concept-paper.md) - Market analysis, pricing, financials
- **Service Catalog:** [docs/business/service-menu.md](./docs/business/service-menu.md) - Complete service offerings and pricing
- **Operations:** [docs/operations/us-brand-culture-guide.md](./docs/operations/us-brand-culture-guide.md) - Training materials for workers

## Development Status

**Current Phase:** Pre-MVP - Source code not yet scaffolded
**Team Context:** Proven technical team (built Baray.io, StadiumX, KOOMPI)
**Timeline:** 4-6 weeks to MVP

**Next Steps:**
1. Initialize Next.js 14 project with App Router
2. Set up MongoDB Atlas + Upstash Redis
3. Implement NextAuth.js authentication
4. Build core models (Users with worker types, Jobs with AI analysis)
5. Integrate OpenAI for job intake
6. Build three portals (client, worker, admin)
7. Integrate Cloudflare R2 for files
8. Stripe for payments
9. Test with 5 real clients

**Success Metrics:**
- 5 clients onboarded
- 15 core workers trained
- AI job analysis accuracy >80%
- Jobs assigned within 24 hours
- Payments processing smoothly

## Environment Variables

See `architecture/design.md` lines 1762-1804 for complete `.env.example` with all required credentials:
- MongoDB URI
- Redis URL
- JWT secrets
- Cloudflare R2 credentials (primary file storage)
- Stripe keys
- SendGrid/email API keys
- OpenAI API key
- Sentry DSN
