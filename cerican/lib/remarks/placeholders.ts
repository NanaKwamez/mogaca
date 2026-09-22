// lib/remarks/placeholders.ts
// Render placeholders and validate final remark text

import type { StudentProfileForRemark, RemarkTemplateRecord } from './types'

export function getPronouns(gender: string) {
  if (gender === 'Male') return { they: 'he', them: 'him', their: 'his' }
  if (gender === 'Female') return { they: 'she', them: 'her', their: 'her' }
  return { they: 'they', them: 'them', their: 'their' }
}

export function renderTemplates(
  templates: RemarkTemplateRecord[],
  profile: StudentProfileForRemark
): { text: string; max_chars: number } {
  const pronouns = getPronouns(profile.gender)

  const vars: Record<string, string> = {
    name: profile.first_name,
    they: pronouns.they,
    them: pronouns.them,
    their: pronouns.their,
    prev_pos: profile.prev_pos != null ? String(profile.prev_pos) : '',
    cur_pos: profile.cur_pos != null ? String(profile.cur_pos) : '',
    strong_subject: profile.strong_subject ?? '',
    focus_area: profile.focus_area ?? '',
  }

  const renderedParts: string[] = []
  let maxChars = 200

  for (const t of templates) {
    let text = t.variant_text
    // replace placeholders like {{name}} etc.
    text = text.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m, key) => {
      if (key in vars) return vars[key] || ''
      return `{{${key}}}` // keep unknown placeholder for validation to catch
    })
    renderedParts.push(text)
    if (t.max_chars && t.max_chars > 0) maxChars = Math.min(maxChars, t.max_chars)
  }

  const combined = renderedParts.join(' ')
  return { text: combined, max_chars: maxChars }
}

export function validateRenderedRemark(rendered: string, maxChars: number) {
  // No unresolved placeholders
  const unknown = rendered.match(/{{\s*([^}]+)\s*}}/g)
  if (unknown && unknown.length > 0) {
    throw new Error(`Rendered remark contains unknown placeholders: ${unknown.join(', ')}`)
  }

  if (rendered.length > maxChars) {
    throw new Error(`Rendered remark is too long (${rendered.length} > ${maxChars})`)
  }

  // No duplicated whitespace
  const cleaned = rendered.replace(/\s+/g, ' ').trim()
  return cleaned
}
