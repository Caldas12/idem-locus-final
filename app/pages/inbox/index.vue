<script setup>
import { computed } from 'vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

definePageMeta({
  middleware: 'auth'
})

const {
  data: conversations,
  pending,
  refresh: refreshConversations
} = await useAsyncData('inbox-conversations', async () => {
  if (!user.value) {
    return []
  }

  const { data } = await supabase
    .from('conversations')
    .select('id, product_id, buyer_id, seller_id, created_at')
    .or(`buyer_id.eq.${user.value.id},seller_id.eq.${user.value.id}`)
    .order('created_at', { ascending: false })

  return data || []
})

const { data: productMap } = await useAsyncData('inbox-products', async () => {
  const ids = [...new Set((conversations.value || []).map(conversation => conversation.product_id).filter(Boolean))]

  if (ids.length === 0) {
    return {}
  }

  const { data } = await supabase
    .from('products')
    .select('id, title')
    .in('id', ids)

  return (data || []).reduce((acc, product) => {
    acc[product.id] = product
    return acc
  }, {})
})

const { data: profileMap } = await useAsyncData('inbox-profiles', async () => {
  if (!user.value) {
    return {}
  }

  const ids = [...new Set(
    (conversations.value || []).flatMap(conversation => [conversation.buyer_id, conversation.seller_id])
  )]
    .filter(Boolean)
    .filter(id => id !== user.value.id)

  if (ids.length === 0) {
    return {}
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', ids)

  return (data || []).reduce((acc, profile) => {
    acc[profile.id] = profile
    return acc
  }, {})
})

const { data: proposalStatusMap } = await useAsyncData('inbox-proposals', async () => {
  const conversationIds = [...new Set((conversations.value || []).map(conversation => conversation.id).filter(Boolean))]

  if (conversationIds.length === 0) {
    return {}
  }

  const { data } = await supabase
    .from('proposals')
    .select('id, conversation_id, status, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })

  const map = {}

  for (const proposal of data || []) {
    if (!map[proposal.conversation_id]) {
      map[proposal.conversation_id] = proposal
    }
  }

  return map
})

const detailedConversations = computed(() => {
  if (!user.value) {
    return []
  }

  return (conversations.value || []).map((conversation) => {
    const otherUserId = conversation.buyer_id === user.value.id
      ? conversation.seller_id
      : conversation.buyer_id

    return {
      ...conversation,
      product: productMap.value?.[conversation.product_id] || null,
      otherUser: profileMap.value?.[otherUserId] || null,
      proposal: proposalStatusMap.value?.[conversation.id] || null
    }
  })
})
</script>

<template>
  <UContainer class="py-10 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">
          Inbox
        </h1>
        <p class="text-gray-500 mt-1">
          Histórico de conversas ativas e passadas.
        </p>
      </div>

      <UButton
        color="gray"
        variant="ghost"
        icon="i-heroicons-arrow-path"
        @click="refreshConversations"
      >
        Atualizar
      </UButton>
    </div>

    <div
      v-if="pending"
      class="text-center py-8 text-gray-500"
    >
      A carregar conversas...
    </div>

    <UCard v-else>
      <div
        v-if="detailedConversations.length === 0"
        class="text-sm text-gray-500"
      >
        Ainda não tens conversas.
      </div>

      <div
        v-else
        class="space-y-3"
      >
        <NuxtLink
          v-for="conversation in detailedConversations"
          :key="conversation.id"
          :to="`/inbox/${conversation.id}`"
          class="block border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition"
        >
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <p class="font-semibold text-gray-900">
                {{ conversation.product?.title || 'Produto' }}
              </p>
              <p class="text-sm text-gray-600">
                Com: {{ conversation.otherUser?.name || 'Utilizador' }}
              </p>
            </div>

            <div class="text-sm text-gray-600">
              Estado: {{ conversation.proposal?.status || 'sem proposta' }}
            </div>
          </div>
        </NuxtLink>
      </div>
    </UCard>
  </UContainer>
</template>
