# Backend

Express.js + TypeScript + MongoDB backend API

## Coming Soon

This directory will contain the backend application code in Phase 1 MVP development.

## Planned Structure

```
backend/
├── src/
│   ├── config/          # Configuration (database, env)
│   ├── models/          # Mongoose models
│   ├── controllers/     # Route controllers
│   ├── services/        # Business logic
│   ├── middleware/      # Auth, validation, error handling
│   ├── routes/          # API routes
│   ├── utils/           # Helpers and utilities
│   ├── jobs/            # Background jobs (Bull)
│   ├── websockets/      # Socket.io handlers
│   └── server.ts        # Entry point
├── tests/
├── package.json
└── tsconfig.json
```

## Tech Stack

- Node.js 18+
- Express.js
- TypeScript
- MongoDB + Mongoose
- Redis (Bull for queues)
- Socket.io
- Passport.js + JWT
- Zod (validation)

See [../../architecture/design.md](../../architecture/design.md) for complete architecture.
