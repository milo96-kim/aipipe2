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
