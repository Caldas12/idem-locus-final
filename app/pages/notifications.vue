<script setup>
import { computed } from 'vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Notificações' })

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const toast = useToast()

const {
  data: notifications,
  pending,
  refresh
} = await useAsyncData(
  'user-notifications',
  async () => {
    if (!user.value?.id) return []

    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, is_read, payload, created_at')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })

    if (error) {
      if (import.meta.client) {
        toast.add({
          title: 'Erro ao carregar notificações',
          description: error.message,
          color: 'error'
        })
      }
      return []
    }
    return data || []
  },
  { watch: [() => user.value?.id] }
)

const unreadCount = computed(() => {
  return (notifications.value || []).filter(item => !item.is_read).length
})

function formatWhen(value) {
  if (!value) return 'Agora'
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.floor(diffMs / 1000 / 60 / 60)
  if (diffHours < 1) return 'Agora'
  if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  const days = Math.floor(diffHours / 24)
  return `Há ${days} dia${days > 1 ? 's' : ''}`
}

function iconByType(type) {
  if (type === 'proposal') return 'i-lucide-message-circle'
  if (type === 'pickup') return 'i-lucide-map-pin'
  if (type === 'system') return 'i-lucide-info'
  return 'i-lucide-bell'
}

async function markAsRead(item) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', item.id)
    .eq('user_id', user.value.id)

  if (error) {
    toast.add({ title: 'Erro', description: error.message, color: 'error' })
    return
  }

  await refresh()
}

async function markAllAsRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.value.id)
    .eq('is_read', false)

  if (error) {
    toast.add({ title: 'Erro', description: error.message, color: 'error' })
    return
  }

  await refresh()
}

async function deleteNotification(item) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', item.id)
    .eq('user_id', user.value.id)

  if (error) {
    toast.add({ title: 'Erro', description: error.message, color: 'error' })
    return
  }

  await refresh()
}

function openDetails(item) {
  const productId = item.payload?.product_id
  if (productId) {
    navigateTo(`/produto/${productId}`)
    return
  }

  toast.add({
    title: item.title,
    description: item.body || 'Sem detalhes adicionais.',
    color: 'info'
  })
}
</script>

<template>
  <div class="idem-page py-10">
    <section class="mx-auto w-full max-w-5xl px-6">
      <div class="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 class="font-serif text-6xl font-bold text-[var(--primary-deep)]">
            Notificações
          </h1>
          <p class="mt-2 text-xl text-[#5C6B5E]">
            {{ unreadCount }} notificações não lidas
          </p>
        </div>

        <UButton
          variant="outline"
          class="rounded-xl border-[var(--border)] bg-[var(--card)] px-5 py-3 text-[var(--primary-deep)]"
          @click="markAllAsRead"
        >
          <UIcon
            name="i-lucide-check"
            class="mr-2 h-4 w-4"
          />
          Marcar todas como lidas
        </UButton>
      </div>

      <div
        v-if="pending"
        class="py-20 text-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="mx-auto h-10 w-10 animate-spin text-[var(--accent)]"
        />
      </div>

      <div
        v-else-if="!notifications || notifications.length === 0"
        class="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 text-center"
      >
        <p class="text-[#5C6B5E]">
          Sem notificações para mostrar.
        </p>
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <article
          v-for="item in notifications"
          :key="item.id"
          class="relative rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
        >
          <span
            v-if="!item.is_read"
            class="absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-[var(--accent)]"
          />

          <div class="flex gap-4">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--accent)]"
            >
              <UIcon
                :name="iconByType(item.type)"
                class="h-5 w-5"
              />
            </div>

            <div class="flex-1">
              <h2 class="text-3xl font-semibold text-[var(--primary-deep)]">
                {{ item.title }}
              </h2>
              <p class="mt-2 text-lg text-[#5C6B5E]">
                {{ item.body }}
              </p>
              <p class="mt-6 text-sm text-[#5C6B5E]">
                {{ formatWhen(item.created_at) }}
              </p>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap items-center justify-end gap-3">
            <UButton
              variant="outline"
              class="rounded-xl border-[var(--border)] bg-[var(--muted)] px-4 text-[var(--primary-deep)]"
              @click="openDetails(item)"
            >
              Ver detalhes
            </UButton>

            <button
              v-if="!item.is_read"
              type="button"
              class="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[var(--primary-deep)]"
              @click="markAsRead(item)"
            >
              <UIcon
                name="i-lucide-check"
                class="h-4 w-4"
              />
              Marcar como lida
            </button>

            <button
              type="button"
              class="rounded-xl p-2 text-red-600"
              @click="deleteNotification(item)"
            >
              <UIcon
                name="i-lucide-trash-2"
                class="h-5 w-5"
              />
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
