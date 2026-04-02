import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { storeIds } = await req.json()
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const stores = await prisma.store.findMany({ where: { id: { in: storeIds } } })

  await prisma.userStore.deleteMany({ where: { profileId: profile.id } })
  await prisma.userStore.createMany({
    data: storeIds.map((storeId: string, i: number) => ({
      profileId: profile.id,
      storeId,
      isPreferred: true,
      isBulkStore: stores.find((s) => s.id === storeId)?.isBulkStore ?? false,
      priority: i,
    })),
  })

  return NextResponse.json({ ok: true })
}
