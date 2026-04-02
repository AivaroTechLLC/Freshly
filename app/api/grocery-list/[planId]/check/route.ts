import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId, checked } = await req.json()

  await prisma.groceryListItem.update({
    where: { id: itemId },
    data: { isCheckedOff: checked },
  })

  return NextResponse.json({ ok: true })
}
