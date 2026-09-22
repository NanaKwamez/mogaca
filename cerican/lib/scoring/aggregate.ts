// lib/scoring/aggregate.ts
// computeAggregate: deterministic aggregate calculation from aggregate_rules table.
// NEVER use subjects.is_core alone. Only configured rules count.

import { createServerClient } from "@/lib/supabase/server"

export type AggregateResult =
  | { success: true; aggregate: number; subjects_used: string[] }
  | { success: false; error: string }

export async function computeAggregate(
  studentId: string,
  termId: string,
  ruleId: string
): Promise<AggregateResult> {
  const supabase = createServerClient()

  // Fetch the rule and its subject config
  const { data: rule, error: ruleErr } = await supabase
    .from("aggregate_rules")
    .select("selection_method, aggregate_rule_subjects(subject_id, category, rank)")
    .eq("id", ruleId)
    .single()

  if (ruleErr || !rule) return { success: false, error: "Aggregate rule not found." }

  // Fetch student scores for these subjects this term
  const subjectIds = rule.aggregate_rule_subjects.map((s: { subject_id: string }) => s.subject_id)
  const { data: scores, error: scoresErr } = await supabase
    .from("scores")
    .select("subject_id, total_score, grade")
    .eq("student_id", studentId)
    .eq("term_id", termId)
    .in("subject_id", subjectIds)
    .not("total_score", "is", null)

  if (scoresErr) return { success: false, error: "Failed to fetch scores: " + scoresErr.message }

  const scoreMap = new Map<string, number>(
    (scores ?? []).map((s: { subject_id: string; total_score: number }) => [s.subject_id, s.total_score])
  )

  let selected: { subject_id: string; score: number }[] = []

  if (rule.selection_method === "four_cores_two_electives") {
    const coreSubjects = rule.aggregate_rule_subjects
      .filter((s: { category: string }) => s.category === "core")
      .sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank)

    const electiveSubjects = rule.aggregate_rule_subjects
      .filter((s: { category: string }) => s.category === "elective")
      .sort((a: { rank: number }, b: { rank: number }) => a.rank - b.rank)

    // Take defined core subjects
    for (const s of coreSubjects.slice(0, 4)) {
      const score = scoreMap.get(s.subject_id)
      if (score !== undefined) selected.push({ subject_id: s.subject_id, score })
    }

    // Take best 2 electives by score
    const electiveScores = electiveSubjects
      .map((s: { subject_id: string }) => ({ subject_id: s.subject_id, score: scoreMap.get(s.subject_id) ?? null }))
      .filter((s: { score: number | null }) => s.score !== null)
      .sort((a: { score: number | null }, b: { score: number | null }) => (b.score as number) - (a.score as number))

    for (const s of electiveScores.slice(0, 2)) {
      selected.push({ subject_id: s.subject_id, score: s.score as number })
    }
  } else if (rule.selection_method === "best_six") {
    // Best 6 subjects by score
    const all = subjectIds
      .map((id: string) => ({ subject_id: id, score: scoreMap.get(id) ?? null }))
      .filter((s: { score: number | null }) => s.score !== null)
      .sort((a: { score: number | null }, b: { score: number | null }) => (b.score as number) - (a.score as number))

    selected = all.slice(0, 6) as { subject_id: string; score: number }[]
  } else {
    return { success: false, error: `Unknown selection method: ${rule.selection_method}` }
  }

  if (selected.length === 0) {
    return { success: false, error: "No complete scores found for aggregate computation." }
  }

  const aggregate = selected.reduce((sum, s) => sum + s.score, 0) / selected.length

  return {
    success: true,
    aggregate: Math.round(aggregate * 100) / 100,
    subjects_used: selected.map((s) => s.subject_id),
  }
}
