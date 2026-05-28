import { describe, expect, it, vi } from "vitest"

vi.mock("@prisma/client", () => {
  class MockPrismaClient {
    $connect = vi.fn()
    $disconnect = vi.fn()
  }
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
