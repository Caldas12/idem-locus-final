<script setup>
import { computed, ref, watch } from 'vue'

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const productId = Number(route.params.id)

const errorMessage = ref('')
const favoriteIds = ref([])
const isReviewSubmitting = ref(false)
const reviewForm = ref({ rating: 5, comment: '' })
const canReview = ref(false)

const offerPrice = ref(0)
const isOfferSubmitting = ref(false)

const { data: product, pending } = await useAsyncData(
  `product-${productId}`,
  async () => {
    const { data } = await supabase
      .from('products')
      .select(
        `
      id, title, description, image, condition, type, status, expires_at, created_at, profile_id, category_id,
      profiles (id, name, location, avatar_url),
      categories (name)
    `
      )
      .eq('id', productId)
      .single()
    return data || null
  }
)

const { data: reviews, refresh: refreshReviews } = await useAsyncData(
  `reviews-${productId}`,
  async () => {
    const { data: rawReviews } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, reviewer_id')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    const reviewerIds = [
      ...new Set(
        (rawReviews || []).map(item => item.reviewer_id).filter(Boolean)
      )
    ]
    if (reviewerIds.length === 0) return rawReviews || []

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
  }
)

const formattedExpiry = computed(() => {
  if (!product.value?.expires_at) return 'Não definida'
  return new Date(product.value.expires_at).toLocaleDateString('pt-PT')
})

function isImageUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function isFavorite() {
  if (!product.value) return false
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
  return (
    typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
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
      .insert({ user_id: user.value.id, product_id: product.value.id })
  }
  await loadFavorites()
}

async function submitOffer() {
  if (!user.value) {
    navigateTo('/login')
    return
  }
  if (!product.value) return

  isOfferSubmitting.value = true
  errorMessage.value = ''

  try {
    const { error } = await supabase.from('proposals').insert({
      product_id: product.value.id,
      buyer_id: user.value.id,
      seller_id: product.value.profile_id,
      status: 'pending',
      offered_price: offerPrice.value
    })

    if (error) throw new Error(error.message)

    await supabase.from('notifications').insert({
      user_id: product.value.profile_id,
      type: 'proposal',
      title: 'Nova Proposta Recebida',
      body: `Recebeste uma oferta de ${offerPrice.value}€ pelo produto "${product.value.title}".`
    })

    alert(
      'Proposta enviada! Podes aguardar a resposta do produtor na tua página inicial.'
    )
    offerPrice.value = 0
  } catch (error) {
    errorMessage.value
      = error instanceof Error
        ? error.message
        : 'Não foi possível enviar a proposta.'
  } finally {
    isOfferSubmitting.value = false
  }
}

async function submitReview() {
  if (!user.value || !product.value) {
    navigateTo('/login')
    return
  }
  if (!isUuid(user.value.id) || !isUuid(product.value.profile_id)) {
    errorMessage.value
      = 'Não foi possível submeter a avaliação: identificação inválida.'
    return
  }
  if (!canReview.value) {
    errorMessage.value = 'A avaliação pode ser feita após a troca concluída.'
    return
  }

  isReviewSubmitting.value = true
  errorMessage.value = ''
  try {
    await supabase.from('reviews').insert({
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
    errorMessage.value
      = error instanceof Error
        ? error.message
        : 'Não foi possível submeter a avaliação.'
  } finally {
    isReviewSubmitting.value = false
  }
}
</script>

<template>
  <div class="idem-page min-h-screen">
    <section
      v-if="pending"
      class="py-24 text-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="mx-auto h-12 w-12 animate-spin text-[var(--accent)]"
      />
      <p class="mt-4 text-[#5C6B5E]">
        A colher os detalhes...
      </p>
    </section>

    <section
      v-else-if="!product"
      class="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 text-center"
    >
      <div>
        <UIcon
          name="i-lucide-archive-x"
          class="mx-auto mb-4 h-14 w-14 text-[#5C6B5E] opacity-40"
        />
        <h1 class="mb-3 text-3xl font-bold">
          Produto não encontrado
        </h1>
        <p class="mb-8 text-[#5C6B5E]">
          O produto que procuras pode ter sido removido ou já não estar
          disponível.
        </p>
        <NuxtLink
          to="/search"
          class="inline-flex rounded-full bg-[var(--primary)] px-8 py-3 text-[#F5EDD8]"
        >
          Voltar a explorar
        </NuxtLink>
      </div>
    </section>

    <template v-else>
      <section class="idem-container py-6">
        <NuxtLink
          to="/search"
          class="inline-flex items-center gap-2 text-sm text-[#5C6B5E] transition-colors hover:text-[var(--foreground)]"
        >
          <UIcon
            name="i-lucide-arrow-left"
            class="h-4 w-4"
          /> Voltar
        </NuxtLink>
      </section>

      <section class="idem-container pb-20">
        <UAlert
          v-if="errorMessage"
          color="red"
          variant="soft"
          :title="errorMessage"
          class="mb-6"
        />

        <div class="grid gap-12 lg:grid-cols-2">
          <div>
            <div
              class="relative h-96 overflow-hidden rounded-3xl bg-[var(--muted)] lg:h-[520px]"
            >
              <img
                v-if="isImageUrl(product.image)"
                :src="product.image"
                alt="Imagem do produto"
                class="h-full w-full object-cover"
              >
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-8xl"
              >
                {{ product.image || " " }}
              </div>
              <span
                class="absolute left-4 top-4 rounded-full bg-[var(--primary)] px-4 py-1.5 text-sm text-[#F5EDD8]"
              >
                {{ product.condition || "Disponível" }}
              </span>
              <button
                type="button"
                class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--card)] text-[#5C6B5E] shadow-md transition-transform hover:scale-105"
                :class="isFavorite() ? 'text-[var(--accent)]' : ''"
                @click="toggleFavorite"
              >
                <UIcon
                  :name="isFavorite() ? 'i-lucide-heart' : 'i-lucide-heart'"
                  class="h-5 w-5"
                />
              </button>
            </div>
          </div>

          <div>
            <div class="mb-3 flex flex-wrap items-center gap-2">
              <span
                class="rounded-full bg-[var(--muted)] px-3 py-1 text-xs text-[#5C6B5E]"
              >
                {{ product.categories?.name || "Sem categoria" }}
              </span>
              <span
                v-if="product.status === 'Disponível'"
                class="inline-flex items-center gap-1 rounded-full bg-[#D4E9D7] px-3 py-1 text-xs text-[#2D5016]"
              >
                <UIcon
                  name="i-lucide-check-circle"
                  class="h-3 w-3"
                />
                Disponível
              </span>
            </div>

            <h1 class="mb-4 text-4xl font-bold leading-tight md:text-5xl">
              {{ product.title }}
            </h1>

            <div
              class="mb-6 flex flex-wrap items-center gap-4 text-sm text-[#5C6B5E]"
            >
              <div class="flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-map-pin"
                  class="h-4 w-4"
                />
                {{ product.profiles?.location || "Localização não definida" }}
              </div>
              <div class="flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-calendar"
                  class="h-4 w-4"
                />
                {{ formattedExpiry }}
              </div>
            </div>

            <p class="mb-6 leading-relaxed">
              {{
                product.description
                  || "Sem detalhes adicionais sobre este produto."
              }}
            </p>

            <div class="mb-6 rounded-2xl bg-[var(--muted)] p-5">
              <p class="mb-1 text-sm text-[#5C6B5E]">
                Modelo de partilha:
              </p>
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-repeat-2"
                  class="h-5 w-5 text-[var(--accent)]"
                />
                <span>{{ product.type || "Troca direta" }}</span>
              </div>
            </div>

            <div
              class="mb-8 flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <UAvatar
                :src="product.profiles?.avatar_url"
                :alt="product.profiles?.name"
                size="lg"
                class="bg-[var(--primary)] text-[#F5EDD8]"
              />
              <div class="min-w-0 flex-1">
                <p class="font-medium">
                  {{ product.profiles?.name || "Produtor local" }}
                </p>
                <p class="truncate text-sm text-[#5C6B5E]">
                  {{ product.profiles?.location || "Localização não definida" }}
                </p>
              </div>
            </div>

            <!-- NOVA CAIXA: MAKE YOUR PRICE -->
            <div
              v-if="product.profile_id !== user?.id"
              class="mb-8 rounded-2xl bg-[var(--muted)] p-5 space-y-4"
            >
              <p class="font-medium text-[var(--foreground)]">
                Fazer Oferta / Proposta
              </p>
              <UFormGroup
                label="Valor sugerido (€) (Coloca 0 para donativo ou troca direta)"
              >
                <UInput
                  v-model="offerPrice"
                  type="number"
                  min="0"
                  step="0.5"
                  size="lg"
                  icon="i-heroicons-currency-euro"
                  class="bg-white"
                />
              </UFormGroup>
              <button
                type="button"
                class="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] py-4 text-[#F5EDD8] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                :disabled="isOfferSubmitting"
                @click="submitOffer"
              >
                <UIcon
                  v-if="isOfferSubmitting"
                  name="i-lucide-loader-circle"
                  class="h-5 w-5 animate-spin"
                />
                <UIcon
                  v-else
                  name="i-lucide-check-circle"
                  class="h-5 w-5"
                />
                Submeter Proposta
              </button>
            </div>
          </div>
        </div>

        <section class="mt-20">
          <h2 class="mb-8 text-3xl font-semibold">
            Avaliações da comunidade
          </h2>
          <div class="grid gap-8 md:grid-cols-2">
            <div class="space-y-4">
              <div
                v-if="!reviews || reviews.length === 0"
                class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-[#5C6B5E]"
              >
                Ainda não existem avaliações para este produto.
              </div>
              <div
                v-for="item in reviews"
                :key="item.id"
                class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
              >
                <div class="mb-2 flex items-center justify-between gap-3">
                  <p class="flex items-center gap-2 font-semibold">
                    <UIcon
                      name="i-lucide-user-circle"
                      class="h-5 w-5 text-[#5C6B5E]"
                    />
                    {{ item.reviewer_name || "Utilizador" }}
                  </p>
                  <div
                    class="flex items-center rounded-full bg-[var(--muted)] px-3 py-1 text-sm font-semibold text-[var(--primary)]"
                  >
                    <UIcon
                      name="i-lucide-star"
                      class="mr-1 h-4 w-4 text-[var(--accent)]"
                    />
                    {{ item.rating }}/5
                  </div>
                </div>
                <p class="text-[#5C6B5E]">
                  "{{ item.comment || "Sem comentário." }}"
                </p>
              </div>
            </div>

            <div class="h-fit rounded-2xl bg-[var(--muted)] p-6">
              <h3
                class="mb-4 border-b border-[var(--border)] pb-3 text-xl font-semibold"
              >
                Deixar avaliação
              </h3>
              <div class="space-y-4">
                <UFormGroup label="Pontuação (1 a 5)">
                  <UInput
                    v-model="reviewForm.rating"
                    type="number"
                    min="1"
                    max="5"
                    size="lg"
                  />
                </UFormGroup>
                <UFormGroup label="Comentário">
                  <UTextarea
                    v-model="reviewForm.comment"
                    autoresize
                    :rows="3"
                    placeholder="Partilha a tua experiência sobre esta troca..."
                    size="lg"
                  />
                </UFormGroup>
                <button
                  type="button"
                  class="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] py-3.5 text-[var(--primary-deep)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!canReview || isReviewSubmitting"
                  @click="submitReview"
                >
                  <UIcon
                    v-if="isReviewSubmitting"
                    name="i-lucide-loader-circle"
                    class="h-5 w-5 animate-spin"
                  />
                  Submeter avaliação
                </button>
                <p
                  v-if="!canReview"
                  class="rounded-xl bg-[#D4E9D7] p-3 text-center text-xs text-[#2D5016]"
                >
                  Apenas disponível após concluíres uma troca.
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </template>
  </div>
</template>
