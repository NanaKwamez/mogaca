import { create } from 'zustand'

export interface SchoolContext {
  school_id: string
  academic_year_id: string
  term_id: string
}

interface SchoolState {
  context: SchoolContext | null
  setContext: (context: SchoolContext) => void
}

export const useSchoolStore = create<SchoolState>((set) => ({
  context: null,
  setContext: (context) => set({ context }),
}))
