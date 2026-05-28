# Next.js Boilerplate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a reusable Next.js 14 boilerplate with Google OAuth (NextAuth v5), Prisma ORM, Neon PostgreSQL, Tailwind CSS, and shadcn/ui — login page and protected dashboard page only.

**Architecture:** App Router route groups `(auth)` and `(dashboard)` isolate layout concerns. `middleware.ts` guards all protected routes centrally. `lib/auth.ts` exports NextAuth v5 handlers; `lib/db.ts` exports a Prisma client singleton. All session access in server components uses the `auth()` helper.

**Tech Stack:** Next.js 14, TypeScript strict, pnpm, next-auth@beta (Auth.js v5), @auth/prisma-adapter, Prisma 5, Neon (PostgreSQL), Tailwind CSS 3.4, shadcn/ui (neutral), Vitest, Playwright

---

## File Map

| Path | Role |
|------|------|
| `package.json` | Scripts: test, test:e2e, db:migrate, db:seed, lint:fix |
| `vitest.config.ts` | Vitest config with `@/*` alias |
| `playwright.config.ts` | Playwright config — dev server + chromium |
| `prisma/schema.prisma` | User, Account, Session, VerificationToken models |
| `lib/db.ts` | Prisma client singleton (hot-reload safe) |
| `lib/auth.ts` | NextAuth v5 config — Google provider + Prisma adapter |
| `types/next-auth.d.ts` | Extend Session type with `id` and `role` |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth GET/POST handler |
| `middleware.ts` | Route protection — redirects |
| `app/layout.tsx` | Root layout |
| `app/page.tsx` | Root → redirect to /dashboard |
| `app/(auth)/login/page.tsx` | Login page — Google sign-in Card |
| `app/(dashboard)/dashboard/page.tsx` | Dashboard — server component |
| `app/(dashboard)/dashboard/loading.tsx` | Dashboard loading state |
| `app/(dashboard)/dashboard/error.tsx` | Dashboard error boundary |
| `.env.example` | Env var template (committed) |
| `tests/unit/lib/db.test.ts` | Unit test — db singleton shape |
| `tests/e2e/auth.spec.ts` | Playwright — redirect + login page smoke |

---

### Task 1: Bootstrap Next.js 14 project

**Files:**
- Create: all base project files via create-next-app

- [ ] **Step 1: Run create-next-app in the existing directory**

From `nextjs-boilerplate/` (the working directory):

```
pnpm dlx create-next-app@14 . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-pnpm
```

If prompted to overwrite existing files (e.g. `README.md`), answer `y`.

Expected: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `app/` directory created.

- [ ] **Step 2: Verify the app starts**

```
pnpm dev
```

Expected: server starts on http://localhost:3000 with the default Next.js welcome page. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```
git add .
git commit -m "chore: bootstrap Next.js 14 project"
```

---

### Task 2: Install dependencies + configure Vitest and Playwright

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Install production dependencies**

```
pnpm add next-auth@beta @auth/prisma-adapter @prisma/client
```

- [ ] **Step 2: Install dev dependencies**

```
pnpm add -D prisma vitest @vitejs/plugin-react vite-tsconfig-paths @playwright/test
```

- [ ] **Step 3: Install Playwright browsers**

```
pnpm exec playwright install chromium
```

- [ ] **Step 4: Create vitest.config.ts**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
  },
})
```

- [ ] **Step 5: Create playwright.config.ts**

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 6: Replace the `"scripts"` section in package.json**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "lint:fix": "next lint --fix",
  "test": "vitest",
  "test:e2e": "playwright test",
  "db:migrate": "prisma migrate dev",
  "db:seed": "prisma db seed",
  "db:studio": "prisma studio"
}
```

- [ ] **Step 7: Commit**

```
git add .
git commit -m "chore: add deps, configure Vitest and Playwright"
```

---

### Task 3: Set up Prisma schema + db singleton (TDD)

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`
- Create: `.env.example`
- Create: `tests/unit/lib/db.test.ts`

- [ ] **Step 1: Create .env.example (committed) and .env.local (not committed)**

Create `.env.example`:

```
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DATABASE_URL=
DIRECT_URL=
```

Create `.env.local` (fill in real values — never commit this file):

```
NEXTAUTH_SECRET=change-me
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
# Neon pooled connection — used by the app at runtime
DATABASE_URL=postgresql://USER:PASS@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
# Neon direct connection — used by prisma migrate
DIRECT_URL=postgresql://USER:PASS@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Verify `.gitignore` already includes `.env.local` (create-next-app adds it). If not, append it.

- [ ] **Step 2: Initialize Prisma**

```
pnpm prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma`. Replace its full contents:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

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

- [ ] **Step 3: Write the failing unit test**

Create `tests/unit/lib/db.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"

vi.mock("@prisma/client", () => {
  const MockPrismaClient = vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  }))
  return { PrismaClient: MockPrismaClient }
})

describe("db singleton", () => {
  it("exports a PrismaClient instance with lifecycle methods", async () => {
    const { db } = await import("@/lib/db")
    expect(db).toBeDefined()
    expect(typeof db.$connect).toBe("function")
    expect(typeof db.$disconnect).toBe("function")
  })
})
```

- [ ] **Step 4: Run test to confirm it fails**

```
pnpm test
```

Expected: FAIL — `Cannot find module '@/lib/db'`

- [ ] **Step 5: Generate Prisma client**

```
pnpm prisma generate
```

- [ ] **Step 6: Create lib/db.ts**

```ts
// lib/db.ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
```

- [ ] **Step 7: Run test to confirm it passes**

```
pnpm test
```

Expected: PASS

- [ ] **Step 8: Run database migration**

Ensure `.env.local` has valid `DATABASE_URL` and `DIRECT_URL` from your Neon dashboard (dev branch).

```
pnpm db:migrate
```

When prompted for migration name, enter: `init`

Expected: migration file created in `prisma/migrations/`, tables created in Neon.

- [ ] **Step 9: Commit**

```
git add prisma/ lib/db.ts tests/unit/ vitest.config.ts .env.example
git commit -m "feat: Prisma schema + db singleton with unit test"
```

---

### Task 4: Configure NextAuth v5

**Files:**
- Create: `types/next-auth.d.ts`
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create types/next-auth.d.ts**

```ts
// types/next-auth.d.ts
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession["user"]
  }
}
```

- [ ] **Step 2: Create lib/auth.ts**

```ts
// lib/auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      session.user.role = (user as { role?: string }).role ?? "user"
      return session
    },
  },
})
```

- [ ] **Step 3: Create app/api/auth/[...nextauth]/route.ts**

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
```

- [ ] **Step 4: Generate NEXTAUTH_SECRET and update .env.local**

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and replace `change-me` in `.env.local` with it.

- [ ] **Step 5: Verify TypeScript compilation**

```
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add lib/auth.ts types/ app/api/
git commit -m "feat: NextAuth v5 with Google provider and Prisma adapter"
```

---

### Task 5: Create route protection middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware.ts**

```ts
// middleware.ts
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (!isLoggedIn && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
})

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add middleware.ts
git commit -m "feat: route protection middleware"
```

---

### Task 6: Build login page with shadcn/ui

**Files:**
- Modify: `globals.css`, `tailwind.config.ts` (shadcn init)
- Create: `components.json`
- Create: `components/ui/button.tsx`, `components/ui/card.tsx`
- Create: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Initialize shadcn/ui**

```
pnpm dlx shadcn@latest init -d
```

Accept the defaults (style: Default, base color: Neutral, CSS variables: Yes).

Expected: `components.json` created, `globals.css` and `tailwind.config.ts` updated.

- [ ] **Step 2: Add Button and Card components**

```
pnpm dlx shadcn@latest add button card
```

Expected: `components/ui/button.tsx` and `components/ui/card.tsx` created.

- [ ] **Step 3: Create app/(auth)/login/page.tsx**

```tsx
// app/(auth)/login/page.tsx
import { signIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Boilerplate</CardTitle>
          <CardDescription>계속하려면 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/dashboard" })
            }}
          >
            <Button type="submit" className="w-full">
              Google로 로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 4: Verify TypeScript compilation**

```
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```
git add components/ app/\(auth\)/ components.json
git commit -m "feat: login page with shadcn/ui Card and Google sign-in"
```

---

### Task 7: Build dashboard page + loading/error states

**Files:**
- Create: `components/ui/avatar.tsx`
- Create: `app/(dashboard)/dashboard/page.tsx`
- Create: `app/(dashboard)/dashboard/loading.tsx`
- Create: `app/(dashboard)/dashboard/error.tsx`

- [ ] **Step 1: Add Avatar component**

```
pnpm dlx shadcn@latest add avatar
```

Expected: `components/ui/avatar.tsx` created.

- [ ] **Step 2: Create app/(dashboard)/dashboard/page.tsx**

```tsx
// app/(dashboard)/dashboard/page.tsx
import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const { name, email, image } = session.user
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (email?.[0]?.toUpperCase() ?? "U")

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-semibold text-lg">Boilerplate</span>
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={image ?? undefined} alt={name ?? "User"} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                로그아웃
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
        <h1 className="text-2xl font-bold mb-6">
          안녕하세요, {name ?? email}님
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-2">카드 1</h2>
            <p className="text-sm text-muted-foreground">
              여기에 콘텐츠를 추가하세요.
            </p>
          </div>
          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-2">카드 2</h2>
            <p className="text-sm text-muted-foreground">
              여기에 콘텐츠를 추가하세요.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Create app/(dashboard)/dashboard/loading.tsx**

```tsx
// app/(dashboard)/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">로딩 중...</p>
    </div>
  )
}
```

- [ ] **Step 4: Create app/(dashboard)/dashboard/error.tsx**

```tsx
// app/(dashboard)/dashboard/error.tsx
"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-destructive">오류가 발생했습니다.</p>
      <button onClick={reset} className="text-sm underline">
        다시 시도
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript compilation**

```
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add app/\(dashboard\)/
git commit -m "feat: dashboard page with user info, avatar, and sign-out"
```

---

### Task 8: Root redirect + update root layout

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace app/page.tsx**

```tsx
// app/page.tsx
import { redirect } from "next/navigation"

export default function HomePage() {
  redirect("/dashboard")
}
```

- [ ] **Step 2: Replace app/layout.tsx**

```tsx
// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Boilerplate",
  description: "Next.js 14 boilerplate with Auth + DB",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Verify TypeScript compilation**

```
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```
git add app/layout.tsx app/page.tsx
git commit -m "feat: root redirect and layout"
```

---

### Task 9: Playwright E2E tests

**Files:**
- Create: `tests/e2e/auth.spec.ts`

- [ ] **Step 1: Create tests/e2e/auth.spec.ts**

```ts
// tests/e2e/auth.spec.ts
import { test, expect } from "@playwright/test"

test("root redirects unauthenticated user to /login", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL("/login")
})

test("unauthenticated user accessing /dashboard is redirected to /login", async ({
  page,
}) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL("/login")
})

test("login page shows Google sign-in button", async ({ page }) => {
  await page.goto("/login")
  await expect(
    page.getByRole("button", { name: /google로 로그인/i })
  ).toBeVisible()
})

test("login page shows app title", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByText("Boilerplate")).toBeVisible()
})
```

- [ ] **Step 2: Run E2E tests**

```
pnpm test:e2e
```

Expected: all 4 tests PASS. These tests do not require Google credentials — they cover redirect behavior and UI rendering only.

- [ ] **Step 3: Commit**

```
git add tests/e2e/ playwright.config.ts
git commit -m "test: Playwright E2E for auth redirects and login page"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run unit tests**

```
pnpm test
```

Expected: PASS (1 test)

- [ ] **Step 2: Run E2E tests**

```
pnpm test:e2e
```

Expected: PASS (4 tests)

- [ ] **Step 3: TypeScript check**

```
pnpm exec tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Lint**

```
pnpm lint
```

Expected: no errors (fix any with `pnpm lint:fix`)

- [ ] **Step 5: Start dev server and verify manually**

```
pnpm dev
```

Visit http://localhost:3000. Confirm:
- Redirects to `/login`
- Login page shows "Boilerplate" title and "Google로 로그인" button
- Stop with Ctrl+C

- [ ] **Step 6: Final commit**

```
git add .
git commit -m "chore: boilerplate complete — all tests passing"
```
