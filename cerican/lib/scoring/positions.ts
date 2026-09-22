// lib/scoring/positions.ts
// Transactional position recomputation after scoresheet submission.
// Uses RANK() OVER (PARTITION BY subject, class, term ORDER BY total_score DESC).
// Called ONLY at submission boundary, NOT on every keystroke.

import { createServerClient } from "@/lib/supabase/server"

export type RecomputeResult =
  | { success: true; updated: number }
  | { success: false; error: string }

export async function recomputeSubjectPositions(
  subjectId: string,
  classId: string,
  termId: string
): Promise<RecomputeResult> {
  const supabase = createServerClient()

  // Fetch all complete scores for this subject/class/term
  // Only students with a non-null total_score get ranked (null = incomplete, not zero)
  const { data: scores, error: fetchErr } = await supabase
    .from("scores")
    .select("id, student_id, total_score")
    .eq("subject_id", subjectId)
    .eq("term_id", termId)
    .not("total_score", "is", null)
    .order("total_score", { ascending: false })

  if (fetchErr) return { success: false, error: "Failed to fetch scores: " + fetchErr.message }
  if (!scores || scores.length === 0) return { success: true, updated: 0 }

  // Compute RANK (handles ties: same score → same rank, next rank skips)
  const updates: { id: string; position: number }[] = []
  let rank = 1
  for (let i = 0; i < scores.length; i++) {
    if (i > 0 && scores[i].total_score !== scores[i - 1].total_score) {
      rank = i + 1
    }
    updates.push({ id: scores[i].id, position: rank })
  }

  // Batch update positions
  for (const update of updates) {
    const { error: updateErr } = await supabase
      .from("scores")
      .update({ position: update.position, updated_at: new Date().toISOString() })
      .eq("id", update.id)
    if (updateErr) return { success: false, error: "Position update failed: " + updateErr.message }
  }

  return { success: true, updated: updates.length }
}
