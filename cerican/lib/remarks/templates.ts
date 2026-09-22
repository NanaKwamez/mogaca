// lib/remarks/templates.ts
// Template fetching + fallback logic per the master spec

import { createServerClient } from '@/lib/supabase/server'
import type { RemarkTemplateRecord } from './types'

export async function fetchTemplatesForPattern(
  patternKey: string,
  clauseSlot: 'primary' | 'secondary',
  remarkType: 'headteacher' | 'class_teacher',
  gender: string,
  division: string | null
): Promise<RemarkTemplateRecord[]> {
  const supabase = createServerClient()

  // Try exact gender + division, then gender + any division, then Any gender + division, then Any/any
  const genderOptions = gender === 'Any' ? ['Any'] : [gender, 'Any']

  const candidates: RemarkTemplateRecord[] = []

  for (const g of genderOptions) {
    // Look for exact division first
    if (division) {
      const { data: dataExact } = await supabase
        .from('remark_templates')
        .select('*')
        .eq('pattern_key', patternKey)
        .eq('clause_slot', clauseSlot)
        .eq('remark_type', remarkType)
        .eq('is_active', true)
        .eq('gender', g)
        .eq('division', division)
        .order('variant_index', { ascending: true })

      if (dataExact && dataExact.length > 0) {
        return dataExact as RemarkTemplateRecord[]
      }
    }

    // Division null or any
    const { data } = await supabase
      .from('remark_templates')
      .select('*')
      .eq('pattern_key', patternKey)
      .eq('clause_slot', clauseSlot)
      .eq('remark_type', remarkType)
      .eq('is_active', true)
      .eq('gender', g)
      .order('variant_index', { ascending: true })

    if (data && data.length > 0) {
      return data as RemarkTemplateRecord[]
    }
  }

  // Last resort: Any gender, no division
  const { data: fallback } = await supabase
    .from('remark_templates')
    .select('*')
    .eq('pattern_key', patternKey)
    .eq('clause_slot', clauseSlot)
    .eq('remark_type', remarkType)
    .eq('is_active', true)
    .eq('gender', 'Any')
    .order('variant_index', { ascending: true })

  return (fallback || []) as RemarkTemplateRecord[]
}
