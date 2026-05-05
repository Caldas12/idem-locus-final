<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRealtimeMessages } from '~/composables/useRealtime'

const route = useRoute()
const user = useSupabaseUser()
const supabase = useSupabaseClient()

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

definePageMeta({
  middleware: 'auth'
})

const conversationId = Number(route.params.id)
const newMessage = ref('')
const isSending = ref(false)
const errorMessage = ref('')

const {
  data: conversation,
  pending: conversationPending
} = await useAsyncData(`conversation-${conversationId}`, async () => {
  const { data } = await supabase
    .from('conversations')
    .select('id, product_id, buyer_id, seller_id, created_at')
    .eq('id', conversationId)
    .maybeSingle()

  return data || null
})

if (!conversation.value) {
  navigateTo('/inbox')
}

const isParticipant = computed(() => {
  if (!conversation.value || !user.value) {
    return false
  }

  return [conversation.value.buyer_id, conversation.value.seller_id].includes(user.value.id)
})

if (!isParticipant.value) {
  navigateTo('/inbox')
}

const {
  data: product
} = await useAsyncData(`conversation-product-${conversationId}`, async () => {
  if (!conversation.value?.product_id) {
    return null
  }

  const { data } = await supabase
    .from('products')
    .select('id, title')
    .eq('id', conversation.value.product_id)
    .maybeSingle()

  return data || null
})

const {
  data: participantProfiles
} = await useAsyncData(`conversation-profiles-${conversationId}`, async () => {
  if (!conversation.value) {
    return {}
  }

  const ids = [conversation.value.buyer_id, conversation.value.seller_id].filter(Boolean)
  const { data } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', ids)

  return (data || []).reduce((acc, profile) => {
    acc[profile.id] = profile
    return acc
  }, {})
})

// Use Realtime for messages instead of manual refresh
const { messages, initialize: initRealtime, cleanup: cleanupRealtime } = useRealtimeMessages(supabase, conversationId)

onMounted(async () => {
  await initRealtime()
})

onUnmounted(() => {
  cleanupRealtime()
})

const {
  data: currentProposal,
  refresh: refreshCurrentProposal
} = await useAsyncData(`conversation-proposal-${conversationId}`, async () => {
  const { data } = await supabase
    .from('proposals')
    .select('id, status, buyer_id, seller_id, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)

  return data?.[0] || null
})

const isSeller = computed(() => {
  return Boolean(conversation.value && user.value && conversation.value.seller_id === user.value.id)
})

const otherParticipantName = computed(() => {
  if (!conversation.value || !user.value) {
    return 'Utilizador'
  }

  const otherId = conversation.value.buyer_id === user.value.id
    ? conversation.value.seller_id
    : conversation.value.buyer_id

  return participantProfiles.value?.[otherId]?.name || 'Utilizador'
})

function senderName(senderId: string) {
  return participantProfiles.value?.[senderId]?.name || senderId
}

async function sendMessage() {
  if (!newMessage.value.trim() || !user.value || !conversation.value) {
    return
  }

  const senderId = user.value.id
  if (!isUuid(senderId)) {
    errorMessage.value = 'Não foi possível enviar: utilizador inválido.'
    return
  }

  isSending.value = true
  errorMessage.value = ''

  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        body: newMessage.value.trim()
      })

    if (error) {
      throw new Error(error.message)
    }

    const recipientId = conversation.value.buyer_id === senderId
      ? conversation.value.seller_id
      : conversation.value.buyer_id

    if (isUuid(recipientId)) {
      await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          type: 'message',
          title: 'Nova mensagem',
          body: `Recebeste uma nova mensagem sobre "${product.value?.title || 'produto'}".`,
          payload: { conversation_id: conversationId }
        })
    }

    newMessage.value = ''
    // Realtime will automatically add the message to the list
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.'
  } finally {
    isSending.value = false
  }
}

async function updateProposalStatus(newStatus) {
  if (!currentProposal.value || !isSeller.value) {
    return
  }

  errorMessage.value = ''

  try {
    const { error } = await supabase
      .from('proposals')
      .update({ status: newStatus })
      .eq('id', currentProposal.value.id)

    if (error) {
      throw new Error(error.message)
    }

    if (newStatus === 'accepted') {
      await supabase
        .from('products')
        .update({ status: 'Indisponível' })
        .eq('id', conversation.value.product_id)
    }

    if (newStatus === 'completed') {
      await supabase
        .from('products')
        .update({ status: 'Esgotado' })
        .eq('id', conversation.value.product_id)
    }

    const recipientId = currentProposal.value.buyer_id

    if (isUuid(recipientId)) {
      await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          type: 'proposal',
          title: 'Proposta atualizada',
          body: `A proposta foi marcada como ${newStatus}.`,
          payload: { conversation_id: conversationId, proposal_id: currentProposal.value.id }
        })
    }

    await refreshCurrentProposal()
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível atualizar a proposta.'
  }
}
</script>

<template>
  <UContainer class="py-10 space-y-6">
    <div
      v-if="conversationPending"
      class="text-gray-500"
    >
      A carregar conversa...
    </div>

    <template v-else-if="conversation">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">
            Conversa sobre: {{ product?.title || 'Produto' }}
          </h1>
          <p class="text-sm text-gray-500">
            Com: {{ otherParticipantName }}
          </p>
        </div>

        <UButton
          to="/inbox"
          color="gray"
          variant="ghost"
          icon="i-heroicons-arrow-left"
        >
          Voltar
        </UButton>
      </div>

      <UAlert
        v-if="errorMessage"
        color="red"
        variant="soft"
        :title="errorMessage"
      />

      <UCard>
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            color="gray"
            variant="soft"
          >
            Estado da proposta: {{ currentProposal?.status || 'sem proposta' }}
          </UBadge>

          <UButton
            v-if="isSeller && currentProposal?.status === 'pending'"
            size="sm"
            color="green"
            @click="updateProposalStatus('accepted')"
          >
            Aceitar
          </UButton>

          <UButton
            v-if="isSeller && currentProposal?.status === 'pending'"
            size="sm"
            color="red"
            @click="updateProposalStatus('rejected')"
          >
            Rejeitar
          </UButton>

          <UButton
            v-if="isSeller && currentProposal?.status === 'accepted'"
            size="sm"
            color="gray"
            @click="updateProposalStatus('completed')"
          >
            Marcar Concluída
          </UButton>
        </div>
      </UCard>

      <UCard>
        <div class="space-y-3 max-h-[420px] overflow-y-auto">
          <div
            v-for="message in messages"
            :key="message.id"
            class="flex"
            :class="message.sender_id === user?.id ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[80%] rounded-lg px-3 py-2"
              :class="message.sender_id === user?.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-900'"
            >
              <p class="text-xs opacity-80 mb-1">
                {{ senderName(message.sender_id) }}
              </p>
              <p>{{ message.body }}</p>
            </div>
          </div>
        </div>

        <div class="mt-4 flex gap-2">
          <UInput
            v-model="newMessage"
            class="flex-1"
            placeholder="Escreve a tua mensagem..."
            @keydown.enter.prevent="sendMessage"
          />
          <UButton
            color="green"
            :loading="isSending"
            @click="sendMessage"
          >
            Enviar
          </UButton>
          <UButton
            color="gray"
            variant="ghost"
            @click="refreshMessages"
          >
            Atualizar
          </UButton>
        </div>
      </UCard>
    </template>
  </UContainer>
</template>
