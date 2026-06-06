import { computed, ref } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'

export function useRealtimeNotifications(
  supabase: SupabaseClient,
  userId: string
) {
  const notifications = ref<
    Array<{ id: number, is_read: boolean, created_at: string }>
  >([])
  const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.is_read).length
  })
  const isConnected = ref(false)
  const subscription = ref<ReturnType<SupabaseClient['channel']> | null>(null)

  async function loadInitialNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    notifications.value = data || []
  }

  function subscribeToNotifications() {
    if (subscription.value) {
      subscription.value.unsubscribe()
    }

    subscription.value = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: {
          new: { id: number, is_read: boolean, created_at: string }
        }) => {
          notifications.value.unshift(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: {
          new: { id: number, is_read: boolean, created_at: string }
        }) => {
          const index = notifications.value.findIndex(
            n => n.id === payload.new.id
          )
          if (index !== -1) {
            notifications.value[index] = payload.new
          }
        }
      )
      .subscribe((status: string) => {
        isConnected.value = status === 'SUBSCRIBED'
      })
  }

  async function markAsRead(notificationId: number) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (!error) {
      const index = notifications.value.findIndex(
        n => n.id === notificationId
      )
      if (index !== -1) {
        notifications.value[index].is_read = true
      }
    }
  }

  async function markAllAsRead() {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (!error) {
      notifications.value.forEach((n) => {
        n.is_read = true
      })
    }
  }

  async function initialize() {
    await loadInitialNotifications()
    subscribeToNotifications()
  }

  function cleanup() {
    if (subscription.value) {
      subscription.value.unsubscribe()
    }
  }

  return {
    notifications,
    unreadCount,
    isConnected,
    initialize,
    cleanup,
    loadInitialNotifications,
    markAsRead,
    markAllAsRead
  }
}
