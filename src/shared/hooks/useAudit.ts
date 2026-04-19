import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

export const useAudit = () => {
  const { cafe, staff, type } = useAuthStore()

  const logAction = async (action: string, details: any = {}) => {
    if (!cafe) return
    try {
      await supabase.from('audit_log').insert({
        cafe_id: cafe.id,
        staff_id: type === 'staff' ? staff?.id : null,
        is_owner: type === 'owner',
        action,
        details,
      })
    } catch (err) {}
  }

  return { logAction }
}
