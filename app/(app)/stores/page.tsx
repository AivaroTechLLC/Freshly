import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import StoresManager from "@/components/stores/StoresManager"

export default async function StoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: {
      userStores: {
        include: { store: true },
        orderBy: { priority: "asc" },
      },
    },
  })

  if (!profile) redirect("/onboarding")

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Stores</h1>
      <StoresManager
        zipCode={profile.zipCode ?? ""}
        initialUserStores={profile.userStores.map((us) => ({
          id: us.storeId,
          name: us.store.name,
          address: us.store.address ?? "",
          chain: us.store.chain,
          isBulkStore: us.isBulkStore,
        }))}
      />
    </div>
  )
}
