// app/api/reports/generate/class/[classId]/[termId]/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateReportsForClassTerm } from '@/lib/reports/generate'

export async function POST(req: Request, { params }: { params: { classId: string; termId: string } }) {
  try {
    const supabase = createServerClient()
    const { data: user, error: uErr } = await supabase.auth.getUser()
    if (uErr || !user?.user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 })

    const classId = params.classId
    const termId = params.termId

    const summary = await generateReportsForClassTerm(classId, termId, user.user.id)
    return NextResponse.json({ ok: true, summary })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
