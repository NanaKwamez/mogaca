// lib/remarks/types.ts

export interface RemarkTemplateRecord {
  id: string
  pattern_key: string
  clause_slot: 'primary' | 'secondary'
  remark_type: 'headteacher' | 'class_teacher'
  gender: string
  tone: string
  division: string | null
  variant_index: number
  variant_text: string
  template_version: number
  max_chars: number
}

export interface StudentProfileForRemark {
  id: string
  first_name: string
  surname?: string
  gender: 'Male' | 'Female' | 'Other'
  division?: string | null
  // computed fields used in placeholders
  prev_pos?: number | null
  cur_pos?: number | null
  total_students?: number | null
  attendance_pct?: number | null
  strong_subject?: string | null
  focus_area?: string | null
}

export interface GenerateResult {
  status: 'GENERATED' | 'MANUAL_REVIEW_REQUIRED' | 'NOT_STARTED'
  remark?: string | null
  reason?: string | null
  primaryKey?: string | null
  secondaryKey?: string | null
  primaryTemplateId?: string | null
  secondaryTemplateId?: string | null
}
