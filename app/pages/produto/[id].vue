<script setup>
import { ref, watch } from 'vue'

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const productId = Number(route.params.id)
const errorMessage = ref('')
const favoriteIds = ref([])
const isInterestLoading = ref(false)
const hasHandledInterestIntent = ref(false)
const isReviewSubmitting = ref(false)
const reviewForm = ref({
  rating: 5,
  comment: ''
})
const canReview = ref(false)

const { data: product, pending } = await useAsyncData(`product-${productId}`, async () => {
  const { data } = await supabase
    .from('products')
    .select(`
      id,
      title,
      description,
      image,
      condition,
      type,
      status,
      expires_at,
      is_surprise_basket,
      created_at,
      profile_id,
      category_id,
      profiles (id, name, location, avatar_url),
      categories (name)
    `)
    .eq('id', productId)
    .single()

  return data || null
})

const {
  data: reviews,
  refresh: refreshReviews
} = await useAsyncData(`reviews-${productId}`, async () => {
  const { data: rawReviews } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, reviewer_id')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  const reviewerIds = [...new Set((rawReviews || []).map(item => item.reviewer_id).filter(Boolean))]

  if (reviewerIds.length === 0) {
    return rawReviews || []
  }

  const { data: reviewers } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', reviewerIds)

  const namesById = (reviewers || []).reduce((acc, reviewer) => {
    acc[reviewer.id] = reviewer.name
    return acc
  }, {})

  return (rawReviews || []).map(item => ({
    ...item,
    reviewer_name: namesById[item.reviewer_id] || 'Utilizador'
  }))
})

function isImageUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function isFavorite() {
  if (!product.value) {
    return false
  }

  return favoriteIds.value.includes(product.value.id)
}

async function loadFavorites() {
  if (!user.value) {
    favoriteIds.value = []
    return
  }

  const { data } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', user.value.id)

  favoriteIds.value = (data || []).map(item => item.product_id)
}

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function validateReviewPermission() {
  if (!user.value || !product.value) {
    canReview.value = false
    return
  }

  if (!isUuid(user.value.id)) {
    canReview.value = false
    return
  }

  const { data } = await supabase
    .from('proposals')
    .select('id')
    .eq('product_id', product.value.id)
    .eq('status', 'completed')
    .or(`buyer_id.eq.${user.value.id},seller_id.eq.${user.value.id}`)
    .limit(1)

  canReview.value = (data || []).length > 0
}

watch(
  () => user.value?.id,
  async () => {
    await Promise.all([loadFavorites(), validateReviewPermission()])
  },
  { immediate: true }
)

watch(
  () => product.value?.id,
  async () => {
    await validateReviewPermission()
  }
)

async function toggleFavorite() {
  if (!user.value) {
    navigateTo('/login')
    return
  }

  if (!product.value) {
    return
  }

  if (isFavorite()) {
    await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.value.id)
      .eq('product_id', product.value.id)
  } else {
    await supabase
      .from('favorites')
      .insert({
        user_id: user.value.id,
        product_id: product.value.id
      })
  }

  await loadFavorites()
}

async function startInterestConversation() {
  if (!user.value) {
    navigateTo('/login')
    return
  }

  if (!product.value) {
    return
  }

  const buyerId = user.value.id
  const sellerId = product.value.profile_id

  if (!isUuid(buyerId) || !isUuid(sellerId)) {
    errorMessage.value = 'Não foi possível iniciar a conversa: identificação de utilizador inválida.'
    return
  }

  if (sellerId === buyerId) {
    errorMessage.value = 'Não podes abrir conversa no teu próprio produto.'
    return
  }

  isInterestLoading.value = true
  errorMessage.value = ''

  try {
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('product_id', product.value.id)
      .eq('buyer_id', buyerId)
      .eq('seller_id', sellerId)
      .maybeSingle()

    let conversationId = existingConversation?.id

    if (!conversationId) {
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          product_id: product.value.id,
          buyer_id: buyerId,
          seller_id: sellerId
        })
        .select('id')
        .single()

      if (conversationError || !newConversation?.id) {
        throw new Error(conversationError?.message || 'Não foi possível criar a conversa.')
      }

      conversationId = newConversation.id
    }

    const { data: existingProposal } = await supabase
      .from('proposals')
      .select('id, status')
      .eq('conversation_id', conversationId)
      .eq('buyer_id', buyerId)
      .eq('product_id', product.value.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const latestProposal = existingProposal?.[0]

    if (!latestProposal || ['rejected', 'completed'].includes(latestProposal.status)) {
      await supabase
        .from('proposals')
        .insert({
          product_id: product.value.id,
          conversation_id: conversationId,
          buyer_id: buyerId,
          seller_id: sellerId,
          status: 'pending'
        })
    }

    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: buyerId,
        body: `Olá! Tenho interesse no produto "${product.value.title}".`
      })

    await supabase
      .from('notifications')
      .insert({
        user_id: sellerId,
        type: 'interest',
        title: 'Novo interesse num produto',
        body: `Recebeste interesse no produto "${product.value.title}".`,
        payload: { product_id: product.value.id, conversation_id: conversationId }
      })

    navigateTo(`/inbox/${conversationId}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    errorMessage.value = message || 'Não foi possível iniciar a conversa.'
  } finally {
    isInterestLoading.value = false
  }
}

async function submitReview() {
  if (!user.value || !product.value) {
    navigateTo('/login')
    return
  }

  if (!isUuid(user.value.id) || !isUuid(product.value.profile_id)) {
    errorMessage.value = 'Não foi possível submeter a avaliação: identificação inválida.'
    return
  }

  if (!canReview.value) {
    errorMessage.value = 'A avaliação só pode ser feita após a troca concluída.'
    return
  }

  isReviewSubmitting.value = true
  errorMessage.value = ''

  try {
    await supabase
      .from('reviews')
      .insert({
        product_id: product.value.id,
        reviewer_id: user.value.id,
        reviewed_user_id: product.value.profile_id,
        rating: Number(reviewForm.value.rating),
        comment: reviewForm.value.comment
      })

    reviewForm.value.comment = ''
    reviewForm.value.rating = 5
    await refreshReviews()
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível submeter a avaliação.'
  } finally {
    isReviewSubmitting.value = false
  }
}

watch(
  [() => route.query.intent, () => product.value?.id],
  async ([intent, currentProductId]) => {
    if (intent !== 'interest' || !currentProductId || hasHandledInterestIntent.value) {
      return
    }

    hasHandledInterestIntent.value = true
    await startInterestConversation()
  },
  { immediate: true }
)
</script>

<template>
  <UContainer class="py-10 space-y-6">
    <div
      v-if="pending"
      class="text-center py-20"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin text-5xl text-green-500"
      />
      <p class="mt-4 text-gray-500">
        A carregar detalhes...
      </p>
    </div>

    <div
      v-else-if="!product"
      class="text-center py-20"
    >
      <h2 class="text-2xl font-bold text-red-600">
        Produto não encontrado
      </h2>
      <UButton
        to="/"
        class="mt-4"
        color="gray"
      >
        Voltar ao Início
      </UButton>
    </div>

    <template v-else>
      <UButton
        to="/"
        color="gray"
        variant="ghost"
        icon="i-heroicons-arrow-left"
      >
        Voltar à Praça
      </UButton>

      <UAlert
        v-if="errorMessage"
        color="red"
        variant="soft"
        :title="errorMessage"
      />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="bg-gray-100 rounded-xl h-96 flex items-center justify-center relative overflow-hidden">
          <img
            v-if="isImageUrl(product.image)"
            :src="product.image"
            alt="Imagem do produto"
            class="w-full h-full object-cover"
          >
          <span
            v-else
            class="text-9xl"
          >
            {{ product.image || '🧺' }}
          </span>

          <UBadge
            class="absolute top-4 right-4"
            color="green"
          >
            {{ product.categories?.name || 'Sem categoria' }}
          </UBadge>

          <UBadge
            v-if="product.is_surprise_basket"
            class="absolute top-4 left-4"
            color="orange"
          >
            Cabaz Surpresa
          </UBadge>
        </div>

        <div class="space-y-4">
          <div class="flex items-start justify-between gap-3">
            <h1 class="text-4xl font-bold text-gray-900">
              {{ product.title }}
            </h1>
            <UButton
              color="gray"
              variant="ghost"
              :icon="isFavorite() ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
              @click="toggleFavorite"
            />
          </div>

          <p class="text-green-700 font-semibold">
            {{ product.type }}
          </p>
          <p class="text-sm">
            <strong>Estado de disponibilidade:</strong> {{ product.status }}
          </p>
          <p class="text-sm">
            <strong>Estado físico:</strong> {{ product.condition }}
          </p>
          <p class="text-sm">
            <strong>Validade:</strong> {{ product.expires_at ? new Date(product.expires_at).toLocaleDateString() : 'Não definida' }}
          </p>

          <div>
            <p class="font-semibold mb-1">
              Descrição
            </p>
            <p class="text-gray-700">
              {{ product.description || 'Sem descrição.' }}
            </p>
          </div>

          <UCard>
            <div class="space-y-1">
              <p class="text-xs text-gray-500 uppercase tracking-wide font-bold">
                Produtor
              </p>
              <p class="text-lg font-medium">
                {{ product.profiles?.name || 'Produtor' }}
              </p>
              <p class="text-sm text-gray-600">
                {{ product.profiles?.location || 'Localização não definida' }}
              </p>
            </div>
          </UCard>

          <UButton
            block
            size="lg"
            color="green"
            icon="i-heroicons-chat-bubble-left-right"
            :loading="isInterestLoading"
            @click="startInterestConversation"
          >
            Tenho Interesse / Iniciar Conversa
          </UButton>
        </div>
      </div>

      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">
            Avaliações
          </h2>
        </template>

        <div class="space-y-4">
          <div
            v-if="!reviews || reviews.length === 0"
            class="text-sm text-gray-500"
          >
            Ainda não existem avaliações para este produto.
          </div>

          <div
            v-for="item in reviews"
            :key="item.id"
            class="border border-gray-100 rounded-lg p-4"
          >
            <div class="flex justify-between items-center mb-1">
              <p class="font-medium">
                {{ item.reviewer_name || 'Utilizador' }}
              </p>
              <p class="text-sm text-amber-700 font-semibold">
                {{ item.rating }}/5
              </p>
            </div>
            <p class="text-sm text-gray-700">
              {{ item.comment || 'Sem comentário.' }}
            </p>
          </div>

          <div class="border-t border-gray-100 pt-4 space-y-3">
            <p class="text-sm font-medium">
              Submeter avaliação
            </p>
            <UFormGroup label="Pontuação (1 a 5)">
              <UInput
                v-model="reviewForm.rating"
                type="number"
                min="1"
                max="5"
              />
            </UFormGroup>
            <UFormGroup label="Comentário">
              <UTextarea
                v-model="reviewForm.comment"
                autoresize
                placeholder="Partilha a tua experiência"
              />
            </UFormGroup>
            <UButton
              color="gray"
              :loading="isReviewSubmitting"
              @click="submitReview"
            >
              Enviar Avaliação
            </UButton>
            <p
              v-if="!canReview"
              class="text-xs text-gray-500"
            >
              A submissão fica disponível após uma troca concluída.
            </p>
          </div>
        </div>
      </UCard>
    </template>
  </UContainer>
</template>
