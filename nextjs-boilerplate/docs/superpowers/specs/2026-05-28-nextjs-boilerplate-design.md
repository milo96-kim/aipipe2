# Next.js Boilerplate Design

**Date:** 2026-05-28

## Overview

A reusable Next.js 14 boilerplate with Google OAuth authentication, Prisma ORM, Neon (PostgreSQL), Tailwind CSS, and shadcn/ui. Minimal page set: login and dashboard only.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.x (strict) |
| Styling | Tailwind CSS 3.4 + shadcn/ui (neutral theme) |
| Auth | NextAuth.js v5 (Auth.js) — Google Provider |
| ORM | Prisma |
| Database | Neon (serverless PostgreSQL) |
| Package Manager | pnpm |
| Unit Tests | Vitest |
| E2E Tests | Playwright |

## Project Structure

```
nextjs-boilerplate/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          # Google 로그인 버튼
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       └── page.tsx          # 인증 보호된 메인 페이지
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts      # NextAuth 핸들러
│   ├── layout.tsx
│   └── page.tsx                  # 루트 → /dashboard 리디렉션
├── components/
│   └── ui/                       # shadcn 컴포넌트
├── lib/
│   ├── auth.ts                   # NextAuth 설정 (handlers, auth, signIn, signOut export)
│   └── db.ts                     # Prisma 클라이언트 싱글턴
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── middleware.ts                  # 인증 미들웨어 (보호 경로 처리)
└── .env.local                    # 환경 변수
```

Route groups `(auth)` and `(dashboard)` isolate layout concerns for pre- and post-authentication pages.

## Database Schema

Prisma + Neon (PostgreSQL). Standard NextAuth v5 adapter tables with `role` and `createdAt` added to `User`.

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          String    @default("user")
  createdAt     DateTime  @default(now())
  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@unique([identifier, token])
}
```

## Authentication Flow

NextAuth v5 with Google OAuth provider and Prisma adapter.

```
사용자 접근
    │
    ▼
middleware.ts
    ├── 비인증 + 보호 경로 → /login 리디렉션
    └── 인증 + /login 접근 → /dashboard 리디렉션

/login
    └── "Google로 로그인" 버튼
            │
            ▼
        Google OAuth
            │
            ▼
        NextAuth 콜백
            ├── DB에 User/Account upsert (Prisma Adapter)
            └── 세션 생성 → /dashboard 리디렉션

/dashboard
    └── 서버 컴포넌트에서 auth() 호출로 세션 조회
```

`middleware.ts` guards all protected routes centrally — no per-page auth checks needed.

### Required Environment Variables

```
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DATABASE_URL=        # Neon connection string (dev branch for local, main branch for production)
```

> **개발 환경 DB:** CLAUDE.md 기본값(SQLite)을 덮어쓰고 Neon을 사용합니다. Neon의 브랜치 기능으로 개발(`dev`)과 프로덕션(`main`)을 분리합니다.

## Pages

### Login (`/login`)

- Centered shadcn `Card` component
- App name/logo
- Single "Google로 로그인" `Button` — no email/password form
- Redirects authenticated users to `/dashboard`

### Dashboard (`/dashboard`)

- Header: app name + user avatar (image or initials fallback) + sign-out button
- Body: welcome message (`안녕하세요, {name}님`) + placeholder cards for future content
- Implemented as a Server Component — session data fetched server-side via `auth()`

### Root (`/`)

- Immediate redirect to `/dashboard`; middleware handles unauthenticated redirect to `/login`

## Error & Loading States

- `loading.tsx` per route segment for Suspense boundaries
- `error.tsx` per route segment for error boundaries
- No custom error pages in the initial boilerplate scope

## Testing

- **Vitest** — unit tests for utility functions in `lib/`
- **Playwright** — E2E test covering the login → dashboard flow

## Out of Scope

- Dark mode toggle (shadcn default theme only)
- Additional pages (profile, settings, admin)
- Email/password authentication
- Role-based access control beyond storing the `role` field
