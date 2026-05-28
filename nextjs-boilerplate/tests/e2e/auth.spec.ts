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
