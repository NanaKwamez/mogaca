// lib/scoring/weighted.ts
// Weighted Grading System calculations for Morning Glory Academy
// Assessment categories have fixed maximum raw scores:
// - Homework: Max 40
// - Classwork: Max 40
// - Class Test: Max 100
// - Exams: Max 100

export interface AssessmentScores {
  homework_score?: number | null
  classwork_score?: number | null
  classtest_score?: number | null
  exam_score?: number | null
}

export interface AssessmentWeights {
  hwWeight: number
  cwWeight: number
  ctWeight: number
  examWeight: number
}

export const RAW_MAX_SCORES = {
  homework: 40,
  classwork: 40,
  classtest: 100,
  exam: 100,
} as const

export const DEFAULT_WEIGHTS: AssessmentWeights = {
  hwWeight: 10,
  cwWeight: 10,
  ctWeight: 30,
  examWeight: 50,
}

/**
 * Validates that weights sum to exactly 100%
 */
export function validateWeights(weights: AssessmentWeights): { valid: boolean; sum: number; error?: string } {
  const sum = (weights.hwWeight || 0) + (weights.cwWeight || 0) + (weights.ctWeight || 0) + (weights.examWeight || 0)
  if (sum !== 100) {
    return {
      valid: false,
      sum,
      error: `Total weights must equal exactly 100%. Current sum: ${sum}%`,
    }
  }
  return { valid: true, sum }
}

/**
 * Calculates normalized weighted grade from raw student scores
 * Formula for each category:
 * Weighted Score = (Student Raw Score / Category Max Score) * Category Weight Percentage
 */
export function calculateFinalGrade(
  scores: AssessmentScores,
  weights: AssessmentWeights = DEFAULT_WEIGHTS
) {
  const parseNum = (v: any): number | null => {
    if (v === null || v === undefined || v === "") return null
    const n = Number(v)
    return isNaN(n) ? null : n
  }

  const hwRaw = parseNum(scores.homework_score)
  const cwRaw = parseNum(scores.classwork_score)
  const ctRaw = parseNum(scores.classtest_score)
  const examRaw = parseNum(scores.exam_score)

  const hwWeighted = hwRaw !== null
    ? Math.round(((hwRaw / RAW_MAX_SCORES.homework) * weights.hwWeight) * 100) / 100
    : null

  const cwWeighted = cwRaw !== null
    ? Math.round(((cwRaw / RAW_MAX_SCORES.classwork) * weights.cwWeight) * 100) / 100
    : null

  const ctWeighted = ctRaw !== null
    ? Math.round(((ctRaw / RAW_MAX_SCORES.classtest) * weights.ctWeight) * 100) / 100
    : null

  const examWeighted = examRaw !== null
    ? Math.round(((examRaw / RAW_MAX_SCORES.exam) * weights.examWeight) * 100) / 100
    : null

  // Class score = continuous assessment (HW + CW + CT)
  const classComponents = [hwWeighted, cwWeighted, ctWeighted].filter((v): v is number => v !== null)
  const classScore = classComponents.length > 0
    ? Math.round(classComponents.reduce((a, b) => a + b, 0) * 100) / 100
    : null

  // Total final grade (out of 100)
  const allComponents = [hwWeighted, cwWeighted, ctWeighted, examWeighted].filter((v): v is number => v !== null)
  const totalScore = allComponents.length > 0
    ? Math.round(allComponents.reduce((a, b) => a + b, 0) * 100) / 100
    : null

  return {
    raw: {
      homework: hwRaw,
      classwork: cwRaw,
      classtest: ctRaw,
      exam: examRaw,
    },
    weighted: {
      homework: hwWeighted,
      classwork: cwWeighted,
      classtest: ctWeighted,
      exam: examWeighted,
    },
    classScore,
    examScore: examWeighted,
    totalScore,
  }
}
