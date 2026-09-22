// lib/remarks/variants.ts
// Deterministic variant selection using a stable hash key per student + pattern.
// SelectionKey = hash(`${studentId}:${patternKey}:${clauseSlot}:${remarkType}`) % totalVariants

import { createServerClient } from "@/lib/supabase/server"
import crypto from "crypto"

export type VariantPickResult =
  | { success: true; template_id: string; variant_text: string; variant_index: number; template_version: number }
  | { success: false; error: string }

export async function pickVariant(
  patternKey: string,
  clauseSlot: "primary" | "secondary",
  remarkType: "headteacher" | "class_teacher",
  gender: string,
  division: string | null,
  studentId?: string, // used to make the selection deterministic
  preferredVariantIndex?: number // optional override
): Promise<VariantPickResult> {
  const supabase = createServerClient()

  // Fetch all active variants for this pattern + remark type
  // Try gender-specific first, fall back to 'Any'
  const genderOptions = gender === "Any" ? ["Any"] : [gender, "Any"]

  let templates: { id: string; variant_text: string; variant_index: number; template_version: number; gender: string; division: string | null }[] = []

  for (const g of genderOptions) {
    const query = supabase
      .from("remark_templates")
      .select("id, variant_text, variant_index, template_version, gender, division")
      .eq("pattern_key", patternKey)
      .eq("clause_slot", clauseSlot)
      .eq("remark_type", remarkType)
      .eq("is_active", true)
      .eq("gender", g)

    if (division) {
      query.or(`division.eq.${division},division.is.null`)
    }

    const { data } = await query.order("variant_index")
    if (data && data.length > 0) {
      templates = data
      break
    }
  }

  if (templates.length === 0) {
    // Fallback: try Any gender, no division filter
    const { data: fallback } = await supabase
      .from("remark_templates")
      .select("id, variant_text, variant_index, template_version, gender, division")
      .eq("pattern_key", patternKey)
      .eq("clause_slot", clauseSlot)
      .eq("remark_type", remarkType)
      .eq("is_active", true)
      .eq("gender", "Any")
      .order("variant_index")

    if (!fallback || fallback.length === 0) {
      return { success: false, error: `No remark template found for pattern "${patternKey}" (${remarkType}, ${gender}, slot: ${clauseSlot}). Add templates to seed data.` }
    }
    templates = fallback
  }

  // If a preferredVariantIndex is provided, use it (modulo length)
  if (typeof preferredVariantIndex === "number") {
    const idx = ((preferredVariantIndex % templates.length) + templates.length) % templates.length
    const pick = templates[idx]
    return {
      success: true,
      template_id: pick.id,
      variant_text: pick.variant_text,
      variant_index: pick.variant_index,
      template_version: pick.template_version,
    }
  }

  // Deterministic selection using stable hash of studentId + pattern info.
  // If studentId is not provided, fall back to hashing patternKey + clauseSlot + remarkType.
  const keySource = `${studentId ?? ""}:${patternKey}:${clauseSlot}:${remarkType}`
  const hash = crypto.createHash("sha256").update(keySource).digest()
  // Take first 6 bytes to form a positive integer
  const num = hash.readUIntBE(0, 6)
  const index = num % templates.length
  const pick = templates[index]

  return {
    success: true,
    template_id: pick.id,
    variant_text: pick.variant_text,
    variant_index: pick.variant_index,
    template_version: pick.template_version,
  }
}
