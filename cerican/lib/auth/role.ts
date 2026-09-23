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
const TEACHER_STAFF_TYPES = ['Teacher', 'Computing Teacher']
const ADMIN_UP_ROLES = ['proprietress', 'headmaster', 'accountant', 'bursar', 'administrator']

// Canonical map for class login emails to teacher names / identities
const CLASS_EMAIL_MAP: Record<string, { email?: string; nameQuery?: string }> = {
  'nursery1@morningglory.edu.gh': { email: 'nursery1@morningglory.edu.gh' },
  'nursery2@morningglory.edu.gh': { email: 'nursery2@morningglory.edu.gh' },
  'kg1@morningglory.edu.gh': { email: 'kg1@morningglory.edu.gh' },
  'kg2@morningglory.edu.gh': { email: 'kg2@morningglory.edu.gh' },
  'primary1@morningglory.edu.gh': { email: 'primary1@morningglory.edu.gh' },
  'basic1@morningglory.edu.gh': { email: 'primary1@morningglory.edu.gh' },
  'primary2@morningglory.edu.gh': { email: 'primary2@morningglory.edu.gh' },
  'primary3@morningglory.edu.gh': { email: 'primary3@morningglory.edu.gh' },
  'primary4@morningglory.edu.gh': { email: 'francis.twi@mogasco.edu.gh' },
  'primary5@morningglory.edu.gh': { email: 'primary5@morningglory.edu.gh' },
  'primary6@morningglory.edu.gh': { email: 'bismark.darko@mogasco.edu.gh' },
  'jhs1@morningglory.edu.gh': { email: 'jhs1@morningglory.edu.gh' },
  'jhs2@morningglory.edu.gh': { email: 'daniel.atsidefe@mogasco.edu.gh' },
  'jhs3@morningglory.edu.gh': { email: 'anthony.kokonu@mogasco.edu.gh' },
  'margarita.boateng@mogasco.edu.gh': { email: 'primary2@morningglory.edu.gh' },
  'rita.kwakye@mogasco.edu.gh': { email: 'kg1@morningglory.edu.gh' },
  'jemima.quaye@mogasco.edu.gh': { email: 'kg2@morningglory.edu.gh' },
  'eunice.quaye@mogasco.edu.gh': { email: 'primary3@morningglory.edu.gh' },
  'samaria.mustapha@mogasco.edu.gh': { email: 'primary1@morningglory.edu.gh' },
}

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
  const cleanEmail = (userEmail ?? '').trim().toLowerCase()

  // 1. Direct match by user_id
  let { data: staffRow } = await supabase
    .from('staff')
    .select('id, school_id, staff_id_code, first_name, surname, other_names, gender, staff_type, email, photo_url, is_active')
    .eq('user_id', userId)
    .maybeSingle()

  // 2. Exact match by email
  if (!staffRow && cleanEmail) {
    const { data: byEmail } = await supabase
      .from('staff')
      .select('id, school_id, staff_id_code, first_name, surname, other_names, gender, staff_type, email, photo_url, is_active')
      .ilike('email', cleanEmail)
      .maybeSingle()
    if (byEmail) staffRow = byEmail
  }

  // 3. Known class email alias match
  if (!staffRow && cleanEmail && CLASS_EMAIL_MAP[cleanEmail]) {
    const targetEmail = CLASS_EMAIL_MAP[cleanEmail].email
    if (targetEmail) {
      const { data: byAlias } = await supabase
        .from('staff')
        .select('id, school_id, staff_id_code, first_name, surname, other_names, gender, staff_type, email, photo_url, is_active')
        .ilike('email', targetEmail)
        .maybeSingle()
      if (byAlias) staffRow = byAlias
    }
  }

  // If staff found, resolve role precisely
  if (staffRow) {
    const type = (staffRow.staff_type ?? '').trim()
    let role: UserRole = null
    if (ADMIN_STAFF_TYPES.some(t => t.toLowerCase() === type.toLowerCase())) {
      role = 'ADMIN'
    } else {
      role = 'TEACHER'
    }
    return {
      role,
      staff: staffRow as StaffProfile,
    }
  }

  // Check students
  const { data: studentRow } = await supabase
    .from('students')
    .select('id, school_id, student_id_code, first_name, surname, other_names, class_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (studentRow) {
    return {
      role: 'STUDENT',
      student: studentRow as StudentProfile,
    }
  }

  // Check guardians
  let { data: guardianRow } = await supabase
    .from('guardians')
    .select('id, full_name, email')
    .eq('user_id', userId)
    .maybeSingle()

  if (!guardianRow && cleanEmail) {
    const { data: fallbackGuardian } = await supabase
      .from('guardians')
      .select('id, full_name, email')
      .ilike('email', cleanEmail)
      .maybeSingle()
    guardianRow = fallbackGuardian
  }

  if (guardianRow) {
    return {
      role: 'PARENT',
      guardian: guardianRow as GuardianProfile,
    }
  }

  // Fallback: user_profiles legacy table
  const { data: upData } = await supabase
    .from('user_profiles')
    .select('id, full_name, role, class_id, is_active')
    .eq('id', userId)
    .maybeSingle()

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
      email: cleanEmail || null,
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
