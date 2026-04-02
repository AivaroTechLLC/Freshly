import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ProfileForm from "@/components/profile/ProfileForm"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { dietaryRestrictions: true },
  })

  if (!profile) redirect("/onboarding")

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile & Settings</h1>
      <ProfileForm
        initialData={{
          displayName: profile.displayName ?? "",
          zipCode: profile.zipCode ?? "",
          weeklyBudget: profile.weeklyBudget ? Number(profile.weeklyBudget) : 150,
          dietaryRestrictions: profile.dietaryRestrictions.map((r) => r.restriction),
        }}
        email={user.email ?? ""}
      />
    </div>
  )
}
