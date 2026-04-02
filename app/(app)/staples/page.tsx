import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import StaplesManager from "@/components/staples/StaplesManager"

export default async function StaplesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: {
      userStaples: { include: { stapleItem: { include: { category: true } } } },
    },
  })

  if (!profile) redirect("/onboarding")

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staple Items</h1>
        <p className="text-sm text-gray-500 mt-1">
          These items are added to every grocery list automatically.
        </p>
      </div>
      <StaplesManager
        initialStaples={profile.userStaples.map((us) => ({
          id: us.id,
          name: us.stapleItem?.name ?? us.customName ?? "",
          category: us.stapleItem?.category.name ?? "Custom",
          isRecurring: us.isRecurring,
          isCustom: !us.stapleItemId,
        }))}
      />
    </div>
  )
}
