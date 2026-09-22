// app/api/remarks/generate-all/[classId]/[termId]/route.ts
// POST handler to run deterministic remark generation for a class and term

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateRemarksForClassTerm } from '@/lib/remarks/batch'

export async function POST(req: Request, { params }: { params: { classId: string; termId: string } }) {
  try {
    const supabase = createServerClient()

    // Verify session / auth - createServerClient should be session-aware. If unauthenticated, reject.
    const { data: user, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user?.user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const classId = params.classId
    const termId = params.termId
    const generatedBy = user.user.id

    const summary = await generateRemarksForClassTerm(classId, termId, generatedBy)

    return NextResponse.json({ ok: true, summary })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
