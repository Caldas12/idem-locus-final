import { ref, computed } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'

export function useRealtimeMessages(
  supabase: SupabaseClient,
  conversationId: number
) {
  const messages = ref<Array<{ id: number, sender_id: string, body: string, created_at: string }>>([])
  const isConnected = ref(false)
  const subscription = ref<ReturnType<SupabaseClient['channel']> | null>(null)

  async function loadInitialMessages() {
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    messages.value = data || []
  }

  function subscribeToMessages() {
    // Unsubscribe from previous subscription
    if (subscription.value) {
      subscription.value.unsubscribe()
    }

    subscription.value = supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: { new: { id: number, sender_id: string, body: string, created_at: string } }) => {
          // Add new message to list if not already there
          if (!messages.value.find(m => m.id === payload.new.id)) {
            messages.value.push(payload.new)
          }
        }
      )
      .subscribe((status: string) => {
        isConnected.value = status === 'SUBSCRIBED'
      })
  }

  async function initialize() {
    await loadInitialMessages()
    subscribeToMessages()
  }

  function cleanup() {
    if (subscription.value) {
      subscription.value.unsubscribe()
    }
  }

  return {
    messages,
    isConnected,
    initialize,
    cleanup,
    loadInitialMessages
  }
}

export function useRealtimeConversations(
  supabase: SupabaseClient,
  userId: string
) {
  const conversations = ref<Array<{ id: number, product_id: number, buyer_id: string, seller_id: string, created_at: string, updated_at: string }>>([])
  const isConnected = ref(false)
  const subscription = ref<ReturnType<SupabaseClient['channel']> | null>(null)

  async function loadInitialConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('id, product_id, buyer_id, seller_id, created_at, updated_at')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('updated_at', { ascending: false })

    conversations.value = data || []
  }

  function subscribeToConversations() {
    if (subscription.value) {
      subscription.value.unsubscribe()
    }

    subscription.value = supabase
      .channel(`user:${userId}:conversations`)
      .on('postgres_changes',
        {
          event: '*', // All events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'conversations'
        },
        (payload: { eventType: string, new: { id: number, buyer_id: string, seller_id: string } }) => {
          if (payload.eventType === 'INSERT') {
            // New conversation
            if (payload.new.buyer_id === userId || payload.new.seller_id === userId) {
              conversations.value.unshift(payload.new as typeof conversations.value[0])
            }
          } else if (payload.eventType === 'UPDATE') {
            // Update conversation (e.g., new message)
            const index = conversations.value.findIndex(c => c.id === payload.new.id)
            if (index !== -1) {
              conversations.value[index] = payload.new as typeof conversations.value[0]
              // Move to top
              conversations.value.splice(index, 1)
              conversations.value.unshift(payload.new as typeof conversations.value[0])
            }
          }
        }
      )
      .subscribe((status: string) => {
        isConnected.value = status === 'SUBSCRIBED'
      })
  }

  async function initialize() {
    await loadInitialConversations()
    subscribeToConversations()
  }

  function cleanup() {
    if (subscription.value) {
      subscription.value.unsubscribe()
    }
  }

  return {
    conversations,
    isConnected,
    initialize,
    cleanup,
    loadInitialConversations
  }
}

export function useRealtimeNotifications(
  supabase: SupabaseClient,
  userId: string
) {
  const notifications = ref<Array<{ id: number, is_read: boolean, created_at: string }>>([])
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
      .limit(50) // Load last 50

    notifications.value = data || []
  }

  function subscribeToNotifications() {
    if (subscription.value) {
      subscription.value.unsubscribe()
    }

    subscription.value = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: { new: { id: number, is_read: boolean, created_at: string } }) => {
          notifications.value.unshift(payload.new)
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: { new: { id: number, is_read: boolean, created_at: string } }) => {
          const index = notifications.value.findIndex(n => n.id === payload.new.id)
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
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (!error) {
      const index = notifications.value.findIndex(n => n.id === notificationId)
      if (index !== -1) {
        notifications.value[index].is_read = true
      }
    }
  }

  async function markAllAsRead() {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
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
