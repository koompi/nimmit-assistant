# Nimmit Platform - Architecture Diagrams

## 1. System Context Diagram

```
                                 EXTERNAL SERVICES
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    │  ┌──────────┐  ┌──────────┐           │
                    │  │ OpenAI   │  │  Stripe  │           │
                    │  │   API    │  │ Payment  │           │
                    │  └──────────┘  └──────────┘           │
                    │                                         │
                    │  ┌──────────┐  ┌──────────┐           │
                    │  │SendGrid/ │  │   AWS    │           │
                    │  │  Resend  │  │  S3/R2   │           │
                    │  └──────────┘  └──────────┘           │
                    │                                         │
                    └─────────────────────────────────────────┘
                                       ▲
                                       │ API Calls
                                       │
┌──────────────┐                ┌─────┴──────────┐
│              │    HTTPS       │                 │
│   CLIENTS    │───────────────▶│  NIMMIT         │
│  (US Based)  │                │  PLATFORM       │
│              │◀───────────────│                 │
└──────────────┘    Response    └─────┬──────────┘
                                       │
┌──────────────┐                       │
│              │    HTTPS              │
│   WORKERS    │───────────────────────┤
│ (Cambodia)   │                       │
│              │◀──────────────────────┘
└──────────────┘    Response

┌──────────────┐
│              │    HTTPS
│   ADMINS     │───────────────────────┐
│              │                       │
│              │◀──────────────────────┘
└──────────────┘    Response
```

---

## 2. Application Architecture (3-Tier)

```
┌───────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Client     │  │   Worker     │  │    Admin     │          │
│  │   Portal     │  │   Portal     │  │   Portal     │          │
│  │              │  │              │  │              │          │
│  │  React +     │  │  React +     │  │  React +     │          │
│  │  Vite +      │  │  Vite +      │  │  Vite +      │          │
│  │  TypeScript  │  │  TypeScript  │  │  TypeScript  │          │
│  │  Tailwind    │  │  Tailwind    │  │  Tailwind    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  Hosted on: Vercel / Netlify (CDN + Edge Functions)             │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
                              │ REST API + WebSockets
                              │ (HTTPS + WSS)
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                            │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              API Gateway (Express.js)                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                │  │
│  │  │   Auth   │  │   Rate   │  │Validation│                │  │
│  │  │Middleware│  │ Limiting │  │  (Zod)   │                │  │
│  │  └──────────┘  └──────────┘  └──────────┘                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │   RESTful APIs    │  │    WebSockets     │                   │
│  │                   │  │   (Socket.io)     │                   │
│  │  /auth            │  │                   │                   │
│  │  /users           │  │  - Real-time      │                   │
│  │  /jobs            │  │    messaging      │                   │
│  │  /payments        │  │  - Status updates │                   │
│  │  /subscriptions   │  │  - Notifications  │                   │
│  └───────────────────┘  └───────────────────┘                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                 Business Logic Services                    │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │   Job    │  │  Worker  │  │ Payment  │  │   File   │ │  │
│  │  │ Matching │  │Management│  │ Service  │  │  Service │ │  │
│  │  │ (AI)     │  │          │  │ (Stripe) │  │          │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │  Email   │  │   Auth   │  │Analytics │  │   Queue  │ │  │
│  │  │ Service  │  │ Service  │  │ Service  │  │  (Bull)  │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Hosted on: Railway / Render / AWS ECS                           │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                │
│                                                                   │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │     MongoDB         │  │       Redis         │               │
│  │  (Primary Store)    │  │                     │               │
│  │                     │  │  - Session Store    │               │
│  │  Collections:       │  │  - Job Queue        │               │
│  │  - users            │  │  - Cache Layer      │               │
│  │  - jobs             │  │  - Rate Limiting    │               │
│  │  - subscriptions    │  │                     │               │
│  │  - transactions     │  │  Upstash / Redis    │               │
│  │  - notifications    │  │  Cloud              │               │
│  │                     │  │                     │               │
│  │  MongoDB Atlas      │  └─────────────────────┘               │
│  └─────────────────────┘                                         │
│                                                                   │
│  ┌─────────────────────┐                                         │
│  │   File Storage      │                                         │
│  │   (AWS S3 / R2)     │                                         │
│  │                     │                                         │
│  │  - Client uploads   │                                         │
│  │  - Deliverables     │                                         │
│  │  - Avatars          │                                         │
│  │  - Portfolio        │                                         │
│  │                     │                                         │
│  │  Cloudflare R2      │                                         │
│  └─────────────────────┘                                         │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. Job Lifecycle Flow

```
┌─────────┐
│ CLIENT  │
│ SUBMITS │
│   JOB   │
└────┬────┘
     │
     ▼
┌────────────────────────────────┐
│  1. JOB CREATION               │
│  - Client fills form           │
│  - Uploads files               │
│  - Selects urgency             │
│  Status: 'pending'             │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  2. AI PARSING & ANALYSIS      │
│  - Extract required skills     │
│  - Determine complexity        │
│  - Estimate hours              │
│  Status: 'matching'            │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  3. WORKER MATCHING            │
│  - Score available workers     │
│  - Rank by fit                 │
│  - Select top 3 candidates     │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  4. JOB OFFER                  │
│  - Offer to #1 worker          │
│  - 15 min acceptance window    │
│                                │
│  ┌──────────┬──────────┐       │
│  │          │          │       │
│  ▼          ▼          ▼       │
│ Accept   Decline   Timeout     │
│  │          │          │       │
│  │          └──────────┘       │
│  │              │              │
│  │              ▼              │
│  │         Offer to #2         │
│  │              │              │
└──┼──────────────┼──────────────┘
   │              │
   ▼              ▼
┌────────────────────────────────┐
│  5. JOB ASSIGNED               │
│  - Worker accepts job          │
│  - Client notified             │
│  - Chat/messaging enabled      │
│  Status: 'assigned'            │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  6. WORK IN PROGRESS           │
│  - Worker starts work          │
│  - Time tracking begins        │
│  - Real-time status updates    │
│  - Client/worker messaging     │
│  Status: 'in_progress'         │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  7. DELIVERABLE SUBMISSION     │
│  - Worker uploads files        │
│  - Worker marks complete       │
│  - Client receives notification│
│  Status: 'review'              │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  8. CLIENT REVIEW              │
│                                │
│  ┌──────────┬──────────┐       │
│  │          │          │       │
│  ▼          ▼          │       │
│ Approve  Request       │       │
│           Revision     │       │
│  │          │          │       │
│  │          └──────────┘       │
│  │              │              │
└──┼──────────────┼──────────────┘
   │              │
   │              ▼
   │         ┌─────────────────┐
   │         │ REVISION CYCLE  │
   │         │ Status:         │
   │         │ 'revision'      │
   │         │                 │
   │         │ Back to step 6  │
   │         └─────────────────┘
   │
   ▼
┌────────────────────────────────┐
│  9. JOB COMPLETION             │
│  - Credits deducted            │
│  - Worker payment processed    │
│  - Ratings/reviews collected   │
│  Status: 'completed'           │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│  10. POST-COMPLETION           │
│  - Analytics updated           │
│  - Worker stats updated        │
│  - Client history recorded     │
│  - Archive job data            │
└────────────────────────────────┘
```

---

## 4. Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW                               │
└──────────────────────────────────────────────────────────────────┘

    CLIENT                    FRONTEND                  BACKEND
      │                          │                         │
      │  1. Enter credentials    │                         │
      ├─────────────────────────▶│                         │
      │                          │  2. POST /auth/login    │
      │                          ├────────────────────────▶│
      │                          │                         │
      │                          │  3. Validate credentials│
      │                          │     - Check password    │
      │                          │     - Verify email      │
      │                          │                         │
      │                          │  4. Generate tokens     │
      │                          │     - Access token (15m)│
      │                          │     - Refresh token(7d) │
      │                          │                         │
      │                          │  5. Response            │
      │                          │◀────────────────────────│
      │                          │  { accessToken,         │
      │                          │    user: {...} }        │
      │                          │  + Set-Cookie:          │
      │                          │    refreshToken         │
      │                          │    (httpOnly)           │
      │  6. Store access token   │                         │
      │     in memory/storage    │                         │
      │◀─────────────────────────│                         │
      │                          │                         │
      │  7. Redirect to dashboard│                         │
      │◀─────────────────────────│                         │
      │                          │                         │


┌──────────────────────────────────────────────────────────────────┐
│                   AUTHENTICATED REQUEST                          │
└──────────────────────────────────────────────────────────────────┘

    CLIENT                    FRONTEND                  BACKEND
      │                          │                         │
      │  1. User action          │                         │
      ├─────────────────────────▶│                         │
      │                          │  2. GET /jobs           │
      │                          │     Authorization:      │
      │                          │     Bearer <token>      │
      │                          ├────────────────────────▶│
      │                          │                         │
      │                          │  3. Verify JWT          │
      │                          │     - Check signature   │
      │                          │     - Check expiry      │
      │                          │     - Extract user info │
      │                          │                         │
      │                          │  4. Process request     │
      │                          │                         │
      │                          │  5. Response            │
      │                          │◀────────────────────────│
      │  6. Display data         │                         │
      │◀─────────────────────────│                         │
      │                          │                         │


┌──────────────────────────────────────────────────────────────────┐
│                     TOKEN REFRESH FLOW                           │
└──────────────────────────────────────────────────────────────────┘

    CLIENT                    FRONTEND                  BACKEND
      │                          │                         │
      │  1. API call             │                         │
      ├─────────────────────────▶│                         │
      │                          │  2. Request with        │
      │                          │     expired token       │
      │                          ├────────────────────────▶│
      │                          │                         │
      │                          │  3. 401 Unauthorized    │
      │                          │◀────────────────────────│
      │                          │                         │
      │                          │  4. POST /auth/refresh  │
      │                          │     (refreshToken in    │
      │                          │      httpOnly cookie)   │
      │                          ├────────────────────────▶│
      │                          │                         │
      │                          │  5. Verify refresh token│
      │                          │                         │
      │                          │  6. Generate new        │
      │                          │     access token        │
      │                          │                         │
      │                          │  7. Response            │
      │                          │◀────────────────────────│
      │                          │  { accessToken }        │
      │                          │                         │
      │                          │  8. Retry original      │
      │                          │     request with new    │
      │                          │     token               │
      │                          ├────────────────────────▶│
      │                          │                         │
      │                          │  9. Success             │
      │                          │◀────────────────────────│
      │  10. Display data        │                         │
      │◀─────────────────────────│                         │
      │                          │                         │
```

---

## 5. File Upload Flow (Presigned URL)

```
┌──────────────────────────────────────────────────────────────────┐
│                    FILE UPLOAD WORKFLOW                          │
└──────────────────────────────────────────────────────────────────┘

 CLIENT          FRONTEND         BACKEND         S3/R2
   │                │                │              │
   │ 1. Select file │                │              │
   ├───────────────▶│                │              │
   │                │                │              │
   │                │ 2. Request     │              │
   │                │    upload URL  │              │
   │                ├───────────────▶│              │
   │                │ POST /jobs/:id/│              │
   │                │ files/upload-url              │
   │                │ {filename,     │              │
   │                │  mimeType}     │              │
   │                │                │              │
   │                │                │ 3. Generate  │
   │                │                │    presigned │
   │                │                │    URL       │
   │                │                ├─────────────▶│
   │                │                │              │
   │                │                │ 4. Presigned │
   │                │                │    URL       │
   │                │                │◀─────────────│
   │                │                │              │
   │                │ 5. Upload URL  │              │
   │                │    + fileId    │              │
   │                │◀───────────────┤              │
   │                │                │              │
   │                │ 6. Upload file │              │
   │                │    directly    │              │
   │                ├───────────────────────────────▶│
   │                │    PUT presigned URL          │
   │                │                │              │
   │                │ 7. Upload      │              │
   │                │    success     │              │
   │                │◀───────────────────────────────│
   │                │                │              │
   │                │ 8. Confirm     │              │
   │                │    upload      │              │
   │                ├───────────────▶│              │
   │                │ POST /jobs/:id/│              │
   │                │ files          │              │
   │                │ {fileId, url,  │              │
   │                │  metadata}     │              │
   │                │                │              │
   │                │                │ 9. Save file │
   │                │                │    metadata  │
   │                │                │    to DB     │
   │                │                │              │
   │                │ 10. Success    │              │
   │                │◀───────────────┤              │
   │                │                │              │
   │ 11. Show       │                │              │
   │     success    │                │              │
   │◀───────────────│                │              │
   │                │                │              │


Benefits:
✅ Backend doesn't handle file data (no bandwidth usage)
✅ Faster uploads (direct to S3/R2)
✅ Scalable (S3/R2 handles load)
✅ Secure (presigned URL expires in 15 min)
```

---

## 6. Real-Time Communication (WebSocket)

```
┌──────────────────────────────────────────────────────────────────┐
│                 WebSocket Connection Flow                        │
└──────────────────────────────────────────────────────────────────┘

 CLIENT (Browser)          FRONTEND             BACKEND (Socket.io)
      │                       │                         │
      │ 1. User logs in       │                         │
      ├──────────────────────▶│                         │
      │                       │                         │
      │                       │ 2. Connect WebSocket    │
      │                       │    with JWT token       │
      │                       ├────────────────────────▶│
      │                       │                         │
      │                       │ 3. Verify JWT           │
      │                       │    Authenticate user    │
      │                       │                         │
      │                       │ 4. Connection success   │
      │                       │◀────────────────────────│
      │                       │                         │
      │                       │ 5. Join user room       │
      │                       │    `user:${userId}`     │
      │                       │                         │
      │                       │ 6. Join job rooms       │
      │                       │    for active jobs      │
      │                       │    `job:${jobId}`       │
      │                       │                         │


┌──────────────────────────────────────────────────────────────────┐
│                    Real-Time Messaging                           │
└──────────────────────────────────────────────────────────────────┘

 CLIENT A (Worker)         BACKEND                CLIENT B (Client)
      │                       │                         │
      │ 1. Send message       │                         │
      ├──────────────────────▶│                         │
      │ emit('job:message',   │                         │
      │   {jobId, message})   │                         │
      │                       │                         │
      │                       │ 2. Save to database     │
      │                       │                         │
      │                       │ 3. Broadcast to job room│
      │                       ├────────────────────────▶│
      │                       │ to('job:123')           │
      │                       │ .emit('job:new_message')│
      │                       │                         │
      │ 4. Acknowledgment     │                         │
      │◀──────────────────────│                         │
      │                       │                         │
      │                       │                         │
      │                       │ 5. Display message      │
      │                       │◀────────────────────────│
      │                       │                         │


┌──────────────────────────────────────────────────────────────────┐
│                    Status Update Broadcast                       │
└──────────────────────────────────────────────────────────────────┘

 BACKEND SERVICE           BACKEND WS              CLIENTS
      │                       │                         │
      │ 1. Job status         │                         │
      │    changes            │                         │
      │    (e.g., worker      │                         │
      │    submits work)      │                         │
      ├──────────────────────▶│                         │
      │                       │                         │
      │                       │ 2. Broadcast to         │
      │                       │    job room             │
      │                       ├────────────────────────▶│
      │                       │ to('job:123')           │
      │                       │ .emit('job:status',     │
      │                       │   {status: 'review'})   │
      │                       │                         │
      │                       │                         │
      │                       │ 3. Update UI            │
      │                       │◀────────────────────────│
      │                       │                         │


Events:
- job:message          # New message
- job:status_changed   # Job status update
- job:typing           # User is typing
- job:new_deliverable  # New file uploaded
- notification         # General notification
- worker:availability  # Worker status changed
```

---

## 7. Payment Flow (Stripe)

```
┌──────────────────────────────────────────────────────────────────┐
│              Subscription Payment Flow (Stripe)                  │
└──────────────────────────────────────────────────────────────────┘

 CLIENT           FRONTEND          BACKEND           STRIPE
   │                 │                 │                 │
   │ 1. Select tier  │                 │                 │
   ├────────────────▶│                 │                 │
   │                 │                 │                 │
   │                 │ 2. Create       │                 │
   │                 │    subscription │                 │
   │                 ├────────────────▶│                 │
   │                 │ POST /subs      │                 │
   │                 │ {tier: 'growth'}│                 │
   │                 │                 │                 │
   │                 │                 │ 3. Create       │
   │                 │                 │    Checkout     │
   │                 │                 │    Session      │
   │                 │                 ├────────────────▶│
   │                 │                 │                 │
   │                 │                 │ 4. Checkout URL │
   │                 │                 │◀────────────────│
   │                 │                 │                 │
   │                 │ 5. Redirect URL │                 │
   │                 │◀────────────────┤                 │
   │                 │                 │                 │
   │ 6. Redirect to  │                 │                 │
   │    Stripe       │                 │                 │
   ├─────────────────────────────────────────────────────▶│
   │                 │                 │                 │
   │ 7. Enter payment│                 │                 │
   │    details      │                 │                 │
   │◀─────────────────────────────────────────────────────│
   │                 │                 │                 │
   │                 │                 │ 8. Webhook:     │
   │                 │                 │    checkout.    │
   │                 │                 │    session.     │
   │                 │                 │    completed    │
   │                 │                 │◀────────────────│
   │                 │                 │                 │
   │                 │                 │ 9. Process:     │
   │                 │                 │    - Create sub │
   │                 │                 │    - Allocate   │
   │                 │                 │      credits    │
   │                 │                 │    - Send email │
   │                 │                 │                 │
   │                 │                 │ 10. Return 200  │
   │                 │                 ├────────────────▶│
   │                 │                 │                 │
   │ 11. Redirect to │                 │                 │
   │     success URL │                 │                 │
   │◀─────────────────────────────────────────────────────│
   │                 │                 │                 │
   │ 12. Show        │                 │                 │
   │     dashboard   │                 │                 │
   │◀────────────────│                 │                 │
   │                 │                 │                 │


Important Stripe Webhooks to Handle:
- checkout.session.completed    # Initial subscription
- invoice.payment_succeeded     # Recurring payment success
- invoice.payment_failed        # Payment failed
- customer.subscription.updated # Upgrade/downgrade
- customer.subscription.deleted # Cancellation
```

---

## 8. Database Schema Relationships

```
┌──────────────────────────────────────────────────────────────────┐
│                  Entity Relationship Diagram                     │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│        USERS            │
│─────────────────────────│
│ _id (PK)                │
│ email                   │
│ role                    │───┐
│ workerProfile { }       │   │
│ clientProfile { }       │   │
└───────┬─────────────────┘   │
        │                     │
        │ 1:M (as client)     │
        │                     │ 1:M (as worker)
        ▼                     │
┌─────────────────────────┐   │
│        JOBS             │◀──┘
│─────────────────────────│
│ _id (PK)                │
│ clientId (FK) ──────────┼───┐
│ workerId (FK) ──────────┼─┐ │
│ status                  │ │ │
│ category                │ │ │
│ pricing { }             │ │ │
│ messages [ ]            │ │ │
│ files [ ]               │ │ │
│ timeTracking [ ]        │ │ │
└───────┬─────────────────┘ │ │
        │                   │ │
        │ M:1               │ │
        │                   │ │
        ▼                   │ │
┌─────────────────────────┐ │ │
│   NOTIFICATIONS         │ │ │
│─────────────────────────│ │ │
│ _id (PK)                │ │ │
│ userId (FK) ────────────┼─┘ │
│ jobId (FK) ─────────────┼───┘
│ type                    │
│ message                 │
│ read                    │
└─────────────────────────┘


┌─────────────────────────┐
│    SUBSCRIPTIONS        │
│─────────────────────────│
│ _id (PK)                │
│ userId (FK) ────────────┼───┐
│ tier                    │   │
│ credits { }             │   │ 1:1
│ stripeSubscriptionId    │   │
└───────┬─────────────────┘   │
        │                     │
        │ 1:M                 │
        │                     │
        ▼                     ▼
┌─────────────────────────────────────┐
│         TRANSACTIONS                 │
│──────────────────────────────────────│
│ _id (PK)                             │
│ clientId (FK) ───────────────────────┼───▶ USERS
│ workerId (FK) ───────────────────────┼───▶ USERS
│ jobId (FK) ──────────────────────────┼───▶ JOBS
│ subscriptionId (FK) ─────────────────┼───▶ SUBSCRIPTIONS
│ amount                               │
│ status                               │
│ stripePaymentIntentId                │
└──────────────────────────────────────┘


┌─────────────────────────┐
│        SKILLS           │
│─────────────────────────│
│ _id (PK)                │
│ name                    │───┐
│ slug (unique)           │   │
│ category                │   │ Referenced by
│ pricing { }             │   │ users.workerProfile.skills
└─────────────────────────┘   │ jobs.requiredSkills
                              │
                              ▼
                         (Array of skill IDs)
```

---

## 9. Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ARCHITECTURE                       │
└──────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │                     │
                    │   CLOUDFLARE CDN    │
                    │   - DDoS Protection │
                    │   - SSL/TLS         │
                    │   - Caching         │
                    │                     │
                    └──────────┬──────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
  │   nimmit.com    │ │ api.nimmit.com  │ │ files.nimmit.com│
  │   (Frontend)    │ │   (Backend)     │ │  (File Storage) │
  │                 │ │                 │ │                 │
  │  Vercel Edge    │ │  Railway/Render │ │ Cloudflare R2   │
  │  Network        │ │                 │ │                 │
  │                 │ │  ┌───────────┐  │ │  (or AWS S3)    │
  │  - React SPA    │ │  │ Express   │  │ │                 │
  │  - Static       │ │  │ API       │  │ │  Buckets:       │
  │    Assets       │ │  │           │  │ │  - uploads      │
  │  - Edge         │ │  │ Node.js   │  │ │  - deliverables │
  │    Functions    │ │  │ Container │  │ │  - avatars      │
  │                 │ │  └───────────┘  │ │  - portfolio    │
  └─────────────────┘ └────────┬────────┘ └─────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
  │  MongoDB Atlas  │ │  Redis (Upstash)│ │  External APIs  │
  │                 │ │                 │ │                 │
  │  - Primary DB   │ │  - Cache        │ │  - Stripe       │
  │  - Replica Set  │ │  - Sessions     │ │  - OpenAI       │
  │  - Auto Backup  │ │  - Job Queue    │ │  - SendGrid     │
  │  - Multi-region │ │  - Rate Limit   │ │                 │
  │                 │ │                 │ │                 │
  │  Collections:   │ │  Serverless     │ │                 │
  │  - users        │ │  Redis          │ │                 │
  │  - jobs         │ │                 │ │                 │
  │  - subscriptions│ │                 │ │                 │
  │  - transactions │ │                 │ │                 │
  └─────────────────┘ └─────────────────┘ └─────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│                    MONITORING & LOGGING                          │
└──────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
  │     Sentry      │ │   LogRocket     │ │  Vercel/Railway │
  │                 │ │  (Optional)     │ │   Logs          │
  │  Error Tracking │ │  Session Replay │ │                 │
  │  Performance    │ │  User Analytics │ │  Application    │
  │  Monitoring     │ │                 │ │  Logs           │
  └─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 10. Security Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                         │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: Network Security                                        │
│  - Cloudflare: DDoS protection, WAF                             │
│  - SSL/TLS encryption (HTTPS only)                              │
│  - CORS policy (whitelist domains)                              │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: Application Gateway                                     │
│  - Rate limiting (express-rate-limit)                           │
│  - Request validation (Zod schemas)                             │
│  - Helmet.js security headers                                   │
│  - CSRF protection                                              │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: Authentication & Authorization                          │
│  - JWT token verification                                       │
│  - Role-based access control (RBAC)                             │
│  - Resource-level permissions                                   │
│  - Session management                                           │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: Business Logic Security                                │
│  - Input sanitization (XSS prevention)                          │
│  - SQL/NoSQL injection prevention                               │
│  - File upload validation                                       │
│  - Secure file access (presigned URLs)                          │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 5: Data Security                                           │
│  - Password hashing (bcrypt)                                    │
│  - Encryption at rest (MongoDB encryption)                      │
│  - Sensitive data masking in logs                               │
│  - Secure environment variables                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 6: Monitoring & Audit                                      │
│  - Audit logs (all actions tracked)                             │
│  - Error monitoring (Sentry)                                    │
│  - Security alerts                                              │
│  - Regular security audits                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

These diagrams provide visual representations of the key architectural components. Use them alongside the main architecture document for implementation planning.
