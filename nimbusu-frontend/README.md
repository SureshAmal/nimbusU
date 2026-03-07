# NimbusU Frontend

NimbusU frontend is a Next.js application for the university content management platform. It provides role-based experiences for admins, faculty, and students, and integrates with the Django backend through a typed service layer.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Axios for API calls
- `next-themes` for theming
- `sonner` for toasts
- custom UI primitives for modal, select, range, stepper, toggle, and alerts

## Main Features

- JWT-based login and registration flows
- protected role-based routes for admin, faculty, and student areas
- academics, courses, enrollments, grades, and timetable screens
- daily questions for students and faculty analytics/assignment flows
- content management, announcements, discussions, and notifications
- runtime theme customization with shared tokens for color, border, radius, and motion
- responsive layouts for desktop and mobile

## Prerequisites

Before running the frontend, make sure you have:

- Node.js 20+
- npm, pnpm, yarn, or bun
- the backend running locally or on a reachable environment

## Environment Variables

Create `.env.local` inside [nimbusu-frontend](.) with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

If omitted, the app already defaults to `http://localhost:8000/api/v1` in [lib/api.ts](lib/api.ts).

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

Open http://localhost:3000.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project Structure

```text
nimbusu-frontend/
├── app/
│   ├── (authenticated)/
│   │   ├── admin/
│   │   ├── faculty/
│   │   ├── student/
│   │   └── settings/
│   ├── login/
│   ├── register/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── application/
│   ├── base/
│   ├── foundations/
│   ├── layout/
│   └── ui/
├── hooks/
├── lib/
├── public/
└── services/
```

## Important Folders

- [app](app) — route segments and page-level UI
- [app/(authenticated)](app/(authenticated)) — protected admin, faculty, student, and settings routes
- [components/ui](components/ui) — reusable UI building blocks including custom modal/select/alert components
- [components/layout](components/layout) — headers, search, nav, and shared page scaffolding
- [lib](lib) — auth context, API client, types, helpers, page header state
- [services/api.ts](services/api.ts) — typed API service wrappers used across the app
- [hooks](hooks) — responsive and websocket-related client hooks

## Authentication Flow

- Login and register pages call backend auth endpoints.
- Tokens are stored in cookies as `nimbusu_access` and `nimbusu_refresh`.
- [lib/api.ts](lib/api.ts) adds the bearer token to requests and refreshes it automatically on `401` responses.
- [proxy.ts](proxy.ts) protects non-public routes and redirects unauthenticated users to `/login`.
- [lib/auth.tsx](lib/auth.tsx) loads the current user and redirects by role after login or register.

## Backend Integration

The frontend expects the backend API to expose endpoints under `/api/v1`.

Examples used in the current app:

- `/auth/login/`
- `/auth/register/`
- `/users/me/`
- `/academics/offerings/`
- `/academics/daily-questions/`
- `/academics/daily-questions/student-scores/`

All request wrappers live in [services/api.ts](services/api.ts).

## UI System

NimbusU uses a shared theme/token approach:

- colors, borders, shadows, animation preferences, and radius values are applied through CSS variables
- settings are controlled from the in-app settings experience
- custom UI components are designed to respect those global tokens

Recent UI patterns in the codebase include:

- `CustomModal` for richer in-app workflows
- `CustomSelect` for theme-aligned dropdowns
- custom alert dialogs instead of browser confirms
- sticky headers and scroll-contained list regions for dense dashboards

## Current Functional Areas

The frontend already includes:

- admin dashboard and management pages
- faculty daily questions authoring, assigning, and student score analytics
- student daily question dashboard and performance views
- student and faculty course pages
- settings popup with runtime customization
- notifications and websocket-related hooks

## Development Notes

### Linting

Run:

```bash
npm run lint
```

### Production build

Run:

```bash
npm run build && npm run start
```

### API base URL mismatch

If data does not load, confirm:

- backend is running on port `8000`
- `NEXT_PUBLIC_API_URL` includes `/api/v1`
- backend CORS allows `http://localhost:3000`

## Recommended Local Workflow

1. Start PostgreSQL and MinIO for the backend.
2. Start the backend at `http://localhost:8000`.
3. Set `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`.
4. Start the frontend at `http://localhost:3000`.
5. Use seeded accounts from the backend for role-based testing.

## Related Docs

- Root project readme: [../README.md](../README.md)
- Requirements: [../requirements.md](../requirements.md)
- Backend readme: [../NimbusU-backend/README.md](../NimbusU-backend/README.md)

## Troubleshooting

### Redirect loop to login

Usually caused by missing or expired auth cookies. Clear cookies and log in again.

### Login works but pages remain empty

Usually caused by a wrong `NEXT_PUBLIC_API_URL` or backend CORS issue.

### Styling looks inconsistent

Check whether runtime theme settings were changed in-app; many components inherit CSS variables from the global settings layer.
