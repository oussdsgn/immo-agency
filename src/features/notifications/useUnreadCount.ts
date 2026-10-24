import { useAsync } from '@/lib/useAsync'
import { services } from '@/services'

export function useUnreadCount(): number {
  const { data } = useAsync(() => services.notifications.listNotifications(), [], ['notifications', 'reports'])
  return data?.filter((n) => !n.read).length ?? 0
}
