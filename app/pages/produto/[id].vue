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
  if (!product.value) return

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
  if (!product.value) return

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
    <div v-if="pending" class="text-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-5xl text-[#C5893C]" />
      <p class="mt-4 text-stone-500 font-medium">A colher os detalhes...</p>
    </div>

    <div v-else-if="!product" class="text-center py-20 bg-white rounded-2xl shadow-sm border border-stone-200">
      <UIcon name="i-heroicons-archive-box-x-mark" class="text-6xl text-stone-300 mb-4" />
      <h2 class="text-2xl font-bold text-stone-800 font-serif">Produto não encontrado</h2>
      <p class="text-stone-500 mb-6 mt-2">O produto que procuras pode ter sido removido ou já não estar disponível.</p>
      <UButton to="/" color="stone" class="bg-stone-800 hover:bg-stone-700 text-white">
        Voltar à Praça
      </UButton>
    </div>

    <template v-else>
      <UButton to="/" color="stone" variant="ghost" icon="i-heroicons-arrow-left" class="mb-4 hover:bg-stone-100">
        Voltar à Praça
      </UButton>

      <UAlert v-if="errorMessage" color="red" variant="soft" :title="errorMessage" class="mb-6" />

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">

        <div class="bg-[#FAF9F6] rounded-[2rem] h-[450px] flex items-center justify-center relative overflow-hidden border border-stone-100 shadow-sm">
          <img v-if="isImageUrl(product.image)" :src="product.image" alt="Imagem do produto" class="w-full h-full object-cover">
          <span v-else class="text-9xl drop-shadow-md">{{ product.image || '🧺' }}</span>

          <UBadge class="absolute top-6 right-6 font-bold shadow-sm px-3 py-1" color="amber" variant="solid">
            {{ product.categories?.name || 'Sem categoria' }}
          </UBadge>

          <UBadge v-if="product.is_surprise_basket" class="absolute top-6 left-6 shadow-sm px-3 py-1" color="rose" variant="solid">
            Cabaz Surpresa
          </UBadge>
        </div>

        <div class="space-y-6 flex flex-col justify-center">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[#C5893C] font-semibold text-sm tracking-widest uppercase mb-2">{{ product.type }}</p>
              <h1 class="text-4xl md:text-5xl font-bold text-stone-900 font-serif leading-tight">
                {{ product.title }}
              </h1>
            </div>
            <UButton
              color="stone"
              variant="ghost"
              size="xl"
              class="hover:bg-rose-50"
              :class="isFavorite() ? 'text-rose-500' : 'text-stone-400'"
              :icon="isFavorite() ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
              @click="toggleFavorite"
            />
          </div>

          <div class="grid grid-cols-2 gap-4 py-4 border-y border-stone-100">
            <div>
              <p class="text-xs text-stone-400 uppercase font-bold tracking-wider mb-1">Disponibilidade</p>
              <UBadge :color="product.status === 'Disponível' ? 'green' : 'stone'" variant="subtle">{{ product.status }}</UBadge>
            </div>
            <div>
              <p class="text-xs text-stone-400 uppercase font-bold tracking-wider mb-1">Estado Físico</p>
              <p class="text-stone-800 font-medium">{{ product.condition }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-xs text-stone-400 uppercase font-bold tracking-wider mb-1">Data Limite / Validade</p>
              <p class="text-stone-800 flex items-center gap-2">
                <UIcon name="i-heroicons-calendar" class="text-stone-400"/>
                {{ product.expires_at ? new Date(product.expires_at).toLocaleDateString('pt-PT') : 'Não definida' }}
              </p>
            </div>
          </div>

          <div>
            <h3 class="font-bold text-lg text-stone-900 mb-2 font-serif">Descrição</h3>
            <p class="text-stone-600 leading-relaxed">
              {{ product.description || 'O produtor não forneceu detalhes adicionais sobre este excedente.' }}
            </p>
          </div>

          <div class="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <UAvatar :src="product.profiles?.avatar_url" :alt="product.profiles?.name" size="lg" class="bg-stone-100" />
            <div>
              <p class="text-xs text-stone-400 uppercase tracking-wider font-bold mb-0.5">Publicado por</p>
              <p class="text-lg font-bold text-stone-900">{{ product.profiles?.name || 'Produtor Local' }}</p>
              <p class="text-sm text-stone-500 flex items-center gap-1 mt-0.5">
                <UIcon name="i-heroicons-map-pin" /> {{ product.profiles?.location || 'Localização não definida' }}
              </p>
            </div>
          </div>

          <UButton
            block
            size="xl"
            class="bg-[#1A3A2A] hover:bg-[#122A1E] text-white font-bold py-4 rounded-xl shadow-md transition-all flex justify-center mt-4"
            icon="i-heroicons-chat-bubble-left-right"
            :loading="isInterestLoading"
            @click="startInterestConversation"
          >
            Tenho Interesse / Contactar
          </UButton>
        </div>
      </div>

      <UCard class="mt-12 border-stone-200 shadow-sm rounded-2xl">
        <template #header>
          <h2 class="text-2xl font-bold text-stone-900 font-serif flex items-center gap-2">
            <UIcon name="i-heroicons-star" class="text-amber-400" /> Avaliações da Comunidade
          </h2>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="space-y-4">
            <div v-if="!reviews || reviews.length === 0" class="text-stone-500 italic bg-stone-50 p-6 rounded-xl border border-stone-100">
              Ainda não existem avaliações para este produto.
            </div>

            <div v-for="item in reviews" :key="item.id" class="border border-stone-100 bg-white rounded-xl p-5 shadow-sm">
              <div class="flex justify-between items-center mb-2">
                <p class="font-bold text-stone-800 flex items-center gap-2">
                  <UIcon name="i-heroicons-user-circle" class="text-stone-400" />
                  {{ item.reviewer_name || 'Utilizador' }}
                </p>
                <div class="flex items-center text-[#C5893C] font-bold text-sm bg-amber-50 px-2 py-1 rounded-md">
                  <UIcon name="i-heroicons-star-solid" class="mr-1" /> {{ item.rating }}/5
                </div>
              </div>
              <p class="text-stone-600">
                "{{ item.comment || 'Sem comentário.' }}"
              </p>
            </div>
          </div>

          <div class="bg-stone-50 rounded-xl p-6 border border-stone-100 h-fit">
            <h3 class="text-lg font-bold text-stone-900 mb-4 border-b border-stone-200 pb-2">Deixar Avaliação</h3>

            <div class="space-y-4">
              <div class="space-y-2">
                <label class="block text-sm font-semibold text-stone-800">Pontuação (1 a 5)</label>
                <UInput v-model="reviewForm.rating" type="number" min="1" max="5" size="lg" class="bg-white" />
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-semibold text-stone-800">Comentário</label>
                <UTextarea v-model="reviewForm.comment" autoresize :rows="3" placeholder="Partilha a tua experiência sobre esta troca..." size="lg" class="bg-white" />
              </div>

              <UButton
                block
                size="lg"
                class="bg-[#C5893C] hover:bg-[#A87431] text-white font-bold mt-2"
                :loading="isReviewSubmitting"
                :disabled="!canReview"
                @click="submitReview"
              >
                Submeter Avaliação
              </UButton>

              <p v-if="!canReview" class="text-xs text-amber-700 bg-amber-100 p-2 rounded-lg mt-2 text-center flex items-center justify-center gap-1">
                <UIcon name="i-heroicons-information-circle" /> Apenas disponível após concluires uma troca.
              </p>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </UContainer>
</template>
