import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSchoolStore } from '@/store/useSchoolStore'

export function useCurrentContext() {
  const { context, setContext } = useSchoolStore()
  const [loading, setLoading] = useState(!context)
  
  useEffect(() => {
    if (context) {
      setLoading(false)
      return
    }

    const fetchContext = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('school_current_context')
        .select('*')
        .limit(1)
        .single()
        
      if (data) {
        setContext(data)
      }
      setLoading(false)
    }
    
    fetchContext()
  }, [context, setContext])

  return { context, loading }
}
