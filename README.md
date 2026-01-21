# Nimmit

**Premium Asian Talent. Overnight Delivery. Fraction of US Cost.**

An on-demand marketplace connecting US clients with skilled Cambodian workers for remote work including video editing, graphic design, web development, social media management, and more.

---

## 🚀 Project Status

**Phase:** Architecture & Planning
**Next:** MVP Development (Weeks 1-6)

---

## 📋 Project Overview

Nimmit is a curated platform that leverages Cambodia's timezone advantage to provide "overnight delivery" for US clients. While US clients sleep, skilled Cambodian workers complete their tasks.

### Key Features
- 🤖 AI-powered job matching
- 📊 Credit-based subscription model
- 💬 Real-time messaging and status tracking
- 🎯 Quality guarantees and revisions
- ⚡ Fast turnaround (12-48 hours)

### Target Market
- Digital solopreneurs ($5K-50K/month revenue)
- Small agencies (5-20 employees)
- Growing startups (pre-seed to Series A)

---

## 📚 Documentation

### Business Documentation
Located in [`docs/business/`](./docs/business/)
- [Concept Paper](./docs/business/concept-paper.md) - Business model, market analysis, financials
- [Deep Dive Analysis](./docs/business/deep-dive-analysis.md) - Legal, compliance, operations
- [Service Menu](./docs/business/service-menu.md) - Complete service catalog with pricing

### Operational Documentation
Located in [`docs/operations/`](./docs/operations/)
- [US Brand & Culture Guide](./docs/operations/us-brand-culture-guide.md) - Training for team members

### Technical Documentation
Located in [`architecture/`](./architecture/)
- [Architecture Design](./architecture/design.md) - System architecture, tech stack, database design
- [Architecture Diagrams](./architecture/diagrams.md) - Visual system diagrams

See [docs/README.md](./docs/README.md) for a complete documentation index.

---

## 🏗️ Technology Stack

### Frontend
- **Framework:** React + Vite + TypeScript
- **Styling:** TailwindCSS + shadcn/ui
- **State:** Zustand + TanStack Query
- **Deployment:** Vercel

### Backend
- **Framework:** Node.js + Express + TypeScript
- **Database:** MongoDB (Atlas)
- **Cache:** Redis (Upstash)
- **Queue:** Bull/BullMQ
- **Deployment:** Railway or Render

### Infrastructure
- **File Storage:** Cloudflare R2 (zero egress fees!)
- **Payments:** Stripe
- **Email:** SendGrid or Resend
- **AI:** OpenAI GPT-4 (job matching)
- **Monitoring:** Sentry

---

## 📁 Project Structure

```
nimmit/
├── docs/                    # Business & operational documentation
│   ├── business/            # Business plans, analysis, service menu
│   ├── operations/          # Operational guides and training
│   └── README.md            # Documentation index
│
├── architecture/            # Technical architecture & design
│   ├── design.md            # System architecture document
│   └── diagrams.md          # Architecture diagrams
│
├── src/                     # Source code (coming soon)
│   ├── backend/             # Express API server
│   └── frontend/            # React web application
│
├── .gitignore
└── README.md                # This file
```

---

## 🎯 Roadmap

### Phase 1: MVP (Weeks 1-6)
- [ ] User authentication (client, worker, admin)
- [ ] Job creation and assignment
- [ ] File upload/download
- [ ] Basic messaging
- [ ] Stripe payment integration
- [ ] Admin dashboard

### Phase 2: Automation (Weeks 7-12)
- [ ] AI-powered job matching
- [ ] Subscription tiers with credits
- [ ] Real-time notifications
- [ ] Email notifications
- [ ] Worker performance tracking

### Phase 3: Scale (Months 4-6)
- [ ] Real-time messaging
- [ ] Time tracking
- [ ] Advanced analytics
- [ ] Referral system
- [ ] Quality assurance workflows

### Phase 4: Growth (Months 6-12)
- [ ] Mobile apps
- [ ] Advanced AI features
- [ ] Video processing automation
- [ ] API for integrations

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Redis (local or Upstash)
- Cloudflare R2 account
- Stripe account

### Development Setup

```bash
# Clone repository
git clone https://github.com/rithythul/nimmit.git
cd nimmit

# Install dependencies (coming soon)
# npm install

# Set up environment variables
# cp .env.example .env
# Edit .env with your credentials

# Run development server
# npm run dev
```

**Note:** Source code setup coming in Phase 1 MVP development.

---

## 🤝 Contributing

This is a private project currently in development. Contribution guidelines will be added when the project moves to collaborative development.

---

## 📄 License

Proprietary - All rights reserved

---

## 📞 Contact

**Project Lead:** Rithy Thul
**Repository:** https://github.com/rithythul/nimmit

---

**Built with ❤️ in Cambodia, serving clients in the US**
