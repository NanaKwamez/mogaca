// app/api/reports/readiness/[classId]/[termId]/route.ts
import { NextResponse } from 'next/server'
import { checkReportReadiness } from '@/lib/scoring/readiness'

export async function GET(req: Request, { params }: { params: { classId: string; termId: string } }) {
  try {
    const { classId, termId } = params
    const result = await checkReportReadiness(classId, termId)
    return NextResponse.json({ ok: true, result })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
