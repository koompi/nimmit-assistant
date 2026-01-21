# Frontend

React + Vite + TypeScript web application

## Coming Soon

This directory will contain the frontend application code in Phase 1 MVP development.

## Planned Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components (routes)
│   ├── features/        # Feature-specific components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API client services
│   ├── stores/          # Zustand stores
│   ├── utils/           # Utilities and helpers
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Portals

Three separate portals will be built:
1. **Client Portal** - For US clients to submit jobs, track status
2. **Worker Portal** - For Cambodian workers to accept jobs, deliver work
3. **Admin Portal** - For platform managers to oversee operations

## Tech Stack

- React 18+
- Vite
- TypeScript
- TailwindCSS
- shadcn/ui or Radix UI
- Zustand (state management)
- TanStack Query (React Query)
- React Router v6
- React Hook Form + Zod
- Socket.io-client

See [../../architecture/design.md](../../architecture/design.md) for complete architecture.
