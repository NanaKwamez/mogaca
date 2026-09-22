import { createServerClient } from '@/lib/supabase/server'

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | null

export interface StaffProfile {
  id: string
  school_id: string
  staff_id_code: string | null
  first_name: string
  surname: string
  other_names: string | null
  gender: string | null
  staff_type: string
  email: string | null
  photo_url: string | null
  is_active: boolean
}

export interface StudentProfile {
  id: string
  school_id: string
  student_id_code: string | null
  first_name: string
  surname: string
  other_names: string | null
  class_id: string | null
}

export interface GuardianProfile {
  id: string
  full_name: string
  email: string | null
}

export interface UserRoleResult {
  role: UserRole
  staff?: StaffProfile
  student?: StudentProfile
  guardian?: GuardianProfile
}

const ADMIN_STAFF_TYPES = ['Admin', 'Head Teacher', 'Accountant', 'Bursar', 'Administrator', 'Headteacher']
const TEACHER_STAFF_TYPES = ['Teacher']
const ADMIN_UP_ROLES = ['proprietress', 'headmaster', 'accountant', 'bursar', 'administrator']

function splitFullName(fullName: string): { first_name: string; surname: string } {
  const trimmed = (fullName ?? '').trim()
  const spaceIdx = trimmed.indexOf(' ')
  if (spaceIdx > 0) {
    return { first_name: trimmed.slice(0, spaceIdx), surname: trimmed.slice(spaceIdx + 1) }
  }
  return { first_name: trimmed, surname: '' }
}

export async function getUserRoleAndProfile(userId: string, userEmail?: string | null): Promise<UserRoleResult> {
  const supabase = createServerClient()

  let { data: staffRow, error: staffErr } = await supabase
    .from('staff')
    .select('id, school_id, staff_id_code, first_name, surname, other_names, gender, staff_type, email, photo_url, is_active')
    .eq('user_id', userId)
    .maybeSingle()

  if (staffErr) throw new Error('staff lookup failed: ' + staffErr.message)

  // ===== FALLBACK #1: match by email (even if user_id is not set on staff row)
  if (!staffRow && userEmail) {
    const fallbackStaff = await supabase
      .from('staff')
      .select('id, school_id, staff_id_code, first_name, surname, other_names, gender, staff_type, email, photo_url, is_active')
      .ilike('email', userEmail)
      .maybeSingle()
    if (fallbackStaff.error) throw new Error('staff email fallback failed: ' + fallbackStaff.error.message)
    staffRow = fallbackStaff.data
  }

  // ===== FALLBACK #2: match by first_name/surname fuzzy against user email prefix + user_profiles
  if (!staffRow && userEmail) {
    const prefix = userEmail.split('@')[0].replace(/[._-]/g, ' ').toLowerCase()
    const fallbackStaff = await supabase
      .from('staff')
      .select('id, school_id, staff_id_code, first_name, surname, other_names, gender, staff_type, email, photo_url, is_active')
      .limit(50)
    if (!fallbackStaff.error && fallbackStaff.data) {
      staffRow = fallbackStaff.data.find((s: any) => {
        const full = ((s.first_name ?? '') + ' ' + (s.surname ?? '')).toLowerCase()
        const fullRev = ((s.surname ?? '') + ' ' + (s.first_name ?? '')).toLowerCase()
        return full && (prefix.includes(full.split(' ')[0] ?? '') || full.includes(prefix.split(' ')[0] ?? '') || fullRev.includes(prefix.split(' ')[0] ?? ''))
      }) as any
    }
  }

  if (staffRow) {
    const type = (staffRow.staff_type ?? '').trim()
    let role: UserRole = null
    if (ADMIN_STAFF_TYPES.includes(type)) {
      role = 'ADMIN'
    } else if (TEACHER_STAFF_TYPES.includes(type)) {
      role = 'TEACHER'
    } else if (type) {
      role = 'TEACHER'
    }
    return {
      role,
      staff: staffRow as StaffProfile,
    }
  }

  const { data: studentRow, error: studentErr } = await supabase
    .from('students')
    .select('id, school_id, student_id_code, first_name, surname, other_names, class_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (studentErr) throw new Error('student lookup failed: ' + studentErr.message)

  if (studentRow) {
    return {
      role: 'STUDENT',
      student: studentRow as StudentProfile,
    }
  }

  let { data: guardianRow, error: guardianErr } = await supabase
    .from('guardians')
    .select('id, full_name, email')
    .eq('user_id', userId)
    .maybeSingle()

  if (guardianErr) throw new Error('guardian lookup failed: ' + guardianErr.message)

  if (!guardianRow && userEmail) {
    const fallbackGuardian = await supabase
      .from('guardians')
      .select('id, full_name, email')
      .ilike('email', userEmail)
      .maybeSingle()
    if (fallbackGuardian.error) throw new Error('guardian email fallback failed: ' + fallbackGuardian.error.message)
    guardianRow = fallbackGuardian.data
  }

  if (guardianRow) {
    return {
      role: 'PARENT',
      guardian: guardianRow as GuardianProfile,
    }
  }

  // ===== FALLBACK LAYER: user_profiles unified profile resolver
  // The legacy system used a single `user_profiles` table with `id = auth.users.id`
  // with role enum [proprietress, headmaster, teacher, accountant].
  // This bridges users whose row was lost /not
  const { data: upData, error: upErr } = await supabase
    .from('user_profiles')
    .select('id, full_name, role, class_id, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (upErr) {
    return { role: null }
  }

  if (upData) {
    const upRole = String((upData as any).role ?? '').toLowerCase()
    const parts = splitFullName((upData as any).full_name ?? '')
    const fakeStaff: StaffProfile = {
      id: userId,
      school_id: null as any,
      staff_id_code: null,
      first_name: parts.first_name,
      surname: parts.surname,
      other_names: null,
      gender: null,
      staff_type:
        upRole === 'proprietress' ? 'Admin'
        : upRole === 'headmaster' ? 'Head Teacher'
        : upRole === 'accountant' ? 'Accountant'
        : upRole === 'bursar' ? 'Accountant'
        : 'Teacher',
      email: userEmail ?? null,
      photo_url: null,
      is_active: Boolean((upData as any).is_active ?? true),
    }
    if (ADMIN_UP_ROLES.includes(upRole)) {
      return { role: 'ADMIN', staff: fakeStaff }
    }
    if (upRole === 'teacher') {
      return { role: 'TEACHER', staff: fakeStaff }
    }
  }

  return { role: null }
}

export function roleToPortalRoot(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'TEACHER':
      return '/teacher'
    case 'STUDENT':
      return '/student'
    case 'PARENT':
      return '/parent'
    default:
      return '/login?error=no_profile'
  }
}
