import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

const ADMIN_STAFF_TYPES = ['Admin', 'Head Teacher', 'Accountant', 'Bursar', 'Administrator', 'Headteacher']

export async function middleware(request: NextRequest) {
  const { res, user, supabase } = await updateSession(request)

  const path = request.nextUrl.pathname
  const loginError = request.nextUrl.searchParams.get('error')

  const isPublicRoute = path === '/login' || path === '/'
  const isAdminRoute = path.startsWith('/admin')
  const isTeacherRoute = path.startsWith('/teacher')
  const isStudentRoute = path.startsWith('/student')
  const isParentRoute = path.startsWith('/parent')

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isPublicRoute) {
    let target = '/login?error=no_profile'
    let foundProfile: 'staff' | 'student' | 'guardian' | 'user_profiles' | 'none' = 'none'

    try {
      let { data: staffRow } = await supabase
        .from('staff')
        .select('staff_type, email')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!staffRow && user.email) {
        const fallbackStaff = await supabase
          .from('staff')
          .select('staff_type, email')
          .ilike('email', user.email)
          .maybeSingle()
        staffRow = fallbackStaff.data
      }
      if (staffRow) {
        foundProfile = 'staff'
        const type = (staffRow.staff_type ?? '').trim()
        target = ADMIN_STAFF_TYPES.includes(type) ? '/admin' : '/teacher'
      } else {
        const { data: studentRow } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (studentRow) {
          foundProfile = 'student'
          target = '/student'
        } else {
          let { data: guardianRow } = await supabase
            .from('guardians')
            .select('id, email')
            .eq('user_id', user.id)
            .maybeSingle()
          if (!guardianRow && user.email) {
            const fallbackGuardian = await supabase
              .from('guardians')
              .select('id, email')
              .ilike('email', user.email)
              .maybeSingle()
            guardianRow = fallbackGuardian.data
          }
          if (guardianRow) {
            foundProfile = 'guardian'
            target = '/parent'
          } else {
            const { data: upRow, error: upErr } = await supabase
              .from('user_profiles')
              .select('role')
              .eq('id', user.id)
              .maybeSingle()
            if (!upErr && upRow) {
              const upRole = String((upRow as any).role ?? '').toLowerCase()
              foundProfile = 'user_profiles'
              if (upRole === 'proprietress' || upRole === 'headmaster' || upRole === 'accountant' || upRole === 'bursar') {
                target = '/admin'
              } else if (upRole === 'teacher') {
                target = '/teacher'
              }
            }
          }
        }
      }
    } catch {
      target = '/login?error=no_profile'
    }

    if (path === '/login' && target === '/login?error=no_profile' && loginError === 'no_profile') {
      return res
    }

    return NextResponse.redirect(new URL(target, request.url))
  }

  if (user && (isAdminRoute || isTeacherRoute || isStudentRoute || isParentRoute)) {
    let resolvedRole: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | null = null
    try {
      let { data: staffRow } = await supabase
        .from('staff')
        .select('staff_type, email')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!staffRow && user.email) {
        const fallbackStaff = await supabase
          .from('staff')
          .select('staff_type, email')
          .ilike('email', user.email)
          .maybeSingle()
        staffRow = fallbackStaff.data
      }
      if (staffRow) {
        const type = (staffRow.staff_type ?? '').trim()
        resolvedRole = ADMIN_STAFF_TYPES.includes(type) ? 'ADMIN' : 'TEACHER'
      } else {
        const { data: studentRow } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (studentRow) resolvedRole = 'STUDENT'
        else {
          let { data: guardianRow } = await supabase
            .from('guardians')
            .select('id, email')
            .eq('user_id', user.id)
            .maybeSingle()
          if (!guardianRow && user.email) {
            const fallbackGuardian = await supabase
              .from('guardians')
              .select('id, email')
              .ilike('email', user.email)
              .maybeSingle()
            guardianRow = fallbackGuardian.data
          }
          if (guardianRow) resolvedRole = 'PARENT'
          else {
            const { data: upRow, error: upErr } = await supabase
              .from('user_profiles')
              .select('role')
              .eq('id', user.id)
              .maybeSingle()
            if (!upErr && upRow) {
              const upRole = String((upRow as any).role ?? '').toLowerCase()
              if (upRole === 'proprietress' || upRole === 'headmaster' || upRole === 'accountant' || upRole === 'bursar') {
                resolvedRole = 'ADMIN'
              } else if (upRole === 'teacher') {
                resolvedRole = 'TEACHER'
              }
            }
          }
        }
      }
    } catch {
      resolvedRole = null
    }

    if (!resolvedRole) {
      return NextResponse.redirect(new URL('/login?error=no_profile', request.url))
    }

    const mismatch =
      (isAdminRoute && resolvedRole !== 'ADMIN') ||
      (isTeacherRoute && resolvedRole !== 'TEACHER') ||
      (isStudentRoute && resolvedRole !== 'STUDENT') ||
      (isParentRoute && resolvedRole !== 'PARENT')

    if (mismatch) {
      const correctRoot =
        resolvedRole === 'ADMIN' ? '/admin' :
        resolvedRole === 'TEACHER' ? '/teacher' :
        resolvedRole === 'STUDENT' ? '/student' : '/parent'
      return NextResponse.redirect(new URL(correctRoot, request.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
