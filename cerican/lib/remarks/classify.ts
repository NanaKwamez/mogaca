// lib/remarks/classify.ts
// DETERMINISTIC pattern classifier — NO LLM calls at runtime.
// All business rules are explicitly defined. Never use string matching for classification in UI.

export interface StudentClassificationInput {
  // Score vectors
  averageScore: number
  verbal_average: number | null     // VERBAL subject group
  numerical_average: number | null  // NUMERICAL subject group
  practical_average: number | null  // PRACTICAL subject group
  theory_average: number | null     // THEORY subject group
  classwork_average: number | null
  exam_average: number | null

  // Attendance and trend
  attendance_pct: number | null
  position_this_term: number | null
  position_last_term: number | null
  total_students: number

  // Context
  gender: "Male" | "Female" | "Other"
  division: string
}

export interface Thresholds {
  verbal_numerical_diff: number     // default 15
  practical_theory_diff: number     // default 15
  classwork_exam_diff: number       // default 15
  consistent_spread: number         // default 10
  inconsistent_spread: number       // default 30
  low_attendance_pct: number        // default 80
  excellent_attendance_pct: number  // default 95
  trend_position_change: number     // default 3
}

export interface PatternResult {
  primary_pattern: string
  secondary_pattern: string | null
  all_patterns: string[]
}

// Compute score performance tier
export function scoreTier(score: number): string {
  if (score >= 80) return "EXCELLENT"
  if (score >= 70) return "VERY_GOOD"
  if (score >= 60) return "GOOD"
  if (score >= 50) return "AVERAGE"
  if (score >= 40) return "BELOW_AVERAGE"
  return "WEAK"
}

export function classifyStudent(
  input: StudentClassificationInput,
  thresholds: Thresholds
): PatternResult {
  const patterns: string[] = []
  const tier = scoreTier(input.averageScore)

  // Primary performance tier
  patterns.push(`PERFORMANCE_${tier}`)

  // Verbal vs Numerical strength (only if both available)
  if (input.verbal_average !== null && input.numerical_average !== null) {
    const diff = input.verbal_average - input.numerical_average
    if (Math.abs(diff) >= thresholds.verbal_numerical_diff) {
      patterns.push(diff > 0 ? "STRENGTH_VERBAL" : "STRENGTH_NUMERICAL")
    }
  }

  // Practical vs Theory strength
  if (input.practical_average !== null && input.theory_average !== null) {
    const diff = input.practical_average - input.theory_average
    if (Math.abs(diff) >= thresholds.practical_theory_diff) {
      patterns.push(diff > 0 ? "STRENGTH_PRACTICAL" : "STRENGTH_THEORY")
    }
  }

  // Classwork vs exam consistency
  if (input.classwork_average !== null && input.exam_average !== null) {
    const diff = Math.abs(input.classwork_average - input.exam_average)
    if (diff <= thresholds.consistent_spread) {
      patterns.push("ASSESSMENT_CONSISTENT")
    } else if (diff >= thresholds.inconsistent_spread) {
      patterns.push(
        input.classwork_average > input.exam_average
          ? "ASSESSMENT_CLASSWORK_BETTER"
          : "ASSESSMENT_EXAM_BETTER"
      )
    }
  }

  // Attendance
  if (input.attendance_pct !== null) {
    if (input.attendance_pct < thresholds.low_attendance_pct) {
      patterns.push("ATTENDANCE_LOW")
    } else if (input.attendance_pct >= thresholds.excellent_attendance_pct) {
      patterns.push("ATTENDANCE_EXCELLENT")
    }
  }

  // Position trend
  if (input.position_this_term !== null && input.position_last_term !== null) {
    const change = input.position_last_term - input.position_this_term // positive = improved
    if (change >= thresholds.trend_position_change) {
      patterns.push("TREND_IMPROVED")
    } else if (change <= -thresholds.trend_position_change) {
      patterns.push("TREND_DECLINED")
    } else {
      patterns.push("TREND_STABLE")
    }
  }

  // Position category
  const percentile = input.position_this_term
    ? ((input.total_students - input.position_this_term) / input.total_students) * 100
    : null
  if (percentile !== null) {
    if (percentile >= 90) patterns.push("POSITION_TOP_10PCT")
    else if (percentile >= 70) patterns.push("POSITION_TOP_THIRD")
    else if (percentile < 30) patterns.push("POSITION_BOTTOM_THIRD")
  }

  // Determine primary and secondary patterns
  const primary = patterns[0] ?? "PERFORMANCE_AVERAGE"
  // Secondary: first non-performance, non-assessment consistency pattern (most informative)
  const secondary = patterns.find(
    (p) =>
      p !== primary &&
      !p.startsWith("POSITION_") &&
      p !== "ASSESSMENT_CONSISTENT"
  ) ?? null

  return { primary_pattern: primary, secondary_pattern: secondary, all_patterns: patterns }
}
