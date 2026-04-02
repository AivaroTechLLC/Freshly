import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { code, email } = await req.json()

  if (!code || !email) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  // Find the newly created profile by email via service role
  // The profile is created by a Supabase trigger on auth.users insert
  // We just mark the invite as used
  await prisma.inviteCode.updateMany({
    where: { code: code.toUpperCase(), usedById: null },
    data: { usedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
