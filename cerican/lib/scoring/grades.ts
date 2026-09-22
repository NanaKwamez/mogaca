// lib/scoring/grades.ts
// Server-side grade computation from grading_schema bands (JSONB)
// NEVER compute grades client-side authoritatively

export interface GradingBand {
  min: number
  max: number
  grade: string
  remark: string
}

export type ComputeGradeResult =
  | { success: true; grade: string; remark: string }
  | { success: false; error: string }

export function computeGrade(
  totalScore: number,
  bands: GradingBand[]
): ComputeGradeResult {
  if (!bands || bands.length === 0) {
    return { success: false, error: "No active grading schema found." }
  }

  // Sort bands descending by min to find correct band
  const sorted = [...bands].sort((a, b) => b.min - a.min)
  const match = sorted.find((b) => totalScore >= b.min && totalScore <= b.max)

  if (!match) {
    // Structured error — never silently return null
    return {
      success: false,
      error: `Score ${totalScore} does not match any grading band. Check grading schema configuration.`,
    }
  }

  return { success: true, grade: match.grade, remark: match.remark }
}

// GES standard seed data for validation
export const GES_STANDARD_BANDS: GradingBand[] = [
  { min: 80, max: 100, grade: "A1", remark: "Excellent" },
  { min: 70, max: 79,  grade: "B2", remark: "Very Good" },
  { min: 60, max: 69,  grade: "B3", remark: "Good" },
  { min: 50, max: 59,  grade: "C4", remark: "Credit" },
  { min: 45, max: 49,  grade: "C5", remark: "Credit" },
  { min: 40, max: 44,  grade: "C6", remark: "Credit" },
  { min: 35, max: 39,  grade: "D7", remark: "Pass" },
  { min: 30, max: 34,  grade: "E8", remark: "Pass" },
  { min: 0,  max: 29,  grade: "F9", remark: "Fail" },
]

export function validateGradingSchema(bands: GradingBand[]): { valid: boolean; error?: string } {
  if (!bands || bands.length === 0) return { valid: false, error: "Schema has no bands." }

  const sorted = [...bands].sort((a, b) => a.min - b.min)

  // Check full 0-100 coverage, no gaps, no overlaps
  let cursor = 0
  for (const band of sorted) {
    if (band.min < 0 || band.max > 100) return { valid: false, error: `Band ${band.grade} out of 0-100 range.` }
    if (band.min > band.max) return { valid: false, error: `Band ${band.grade}: min > max.` }
    if (band.min > cursor) return { valid: false, error: `Gap in grading schema between ${cursor} and ${band.min}.` }
    if (band.min < cursor) return { valid: false, error: `Overlap in grading schema at ${band.min}.` }
    cursor = band.max + 1
  }

  if (cursor < 101) return { valid: false, error: `Grading schema does not cover up to 100 (stops at ${cursor - 1}).` }

  return { valid: true }
}
