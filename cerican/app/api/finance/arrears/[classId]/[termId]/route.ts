import { NextResponse } from 'next/server'
import { listArrearsForClassTerm } from '@/lib/finance/service'

export async function GET(req: Request, { params }: { params: { classId: string; termId: string } }) {
  try {
    const rows = await listArrearsForClassTerm(params.classId, params.termId)
    return NextResponse.json({ ok: true, arrears: rows })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
