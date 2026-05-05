<script setup>
import { computed } from 'vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

definePageMeta({
  middleware: 'auth'
})

const {
  data: notifications,
  refresh: refreshNotifications
} = await useAsyncData('user-notifications', async () => {
  if (!user.value) {
    return []
  }

  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, is_read, payload, created_at')
    .eq('user_id', user.value.id)
    .order('created_at', { ascending: false })

  return data || []
})

const unreadNotifications = computed(() => {
  return (notifications.value || []).filter(item => !item.is_read).length
})

async function markAsRead(notificationId) {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.value.id)

  await refreshNotifications()
}

async function markAllAsRead() {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.value.id)
    .eq('is_read', false)

  await refreshNotifications()
}
</script>

<template>
  <UContainer class="py-10 space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">
          Notificações
        </h1>
        <p class="text-gray-500 mt-1">
          Tens {{ unreadNotifications }} notificações por ler.
        </p>
      </div>

      <UButton
        color="gray"
        variant="soft"
        @click="markAllAsRead"
      >
        Marcar todas como lidas
      </UButton>
    </div>

    <UCard>
      <div
        v-if="!notifications || notifications.length === 0"
        class="text-sm text-gray-500"
      >
        Não tens notificações.
      </div>

      <div
        v-else
        class="space-y-3"
      >
        <div
          v-for="item in notifications"
          :key="item.id"
          class="border rounded-lg p-4"
          :class="item.is_read ? 'border-gray-100' : 'border-green-200 bg-green-50'"
        >
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p class="font-medium text-gray-900">
                {{ item.title }}
              </p>
              <p class="text-sm text-gray-700">
                {{ item.body }}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                {{ new Date(item.created_at).toLocaleString() }}
              </p>
            </div>

            <UButton
              v-if="!item.is_read"
              color="gray"
              variant="soft"
              size="sm"
              @click="markAsRead(item.id)"
            >
              Marcar como lida
            </UButton>
          </div>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
