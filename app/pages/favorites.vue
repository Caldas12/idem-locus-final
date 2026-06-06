<script setup>
import { computed } from 'vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Favoritos' })

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const toast = useToast()

const {
  data: favorites,
  pending,
  refresh
} = await useAsyncData(
  'favorites-list',
  async () => {
    if (!user.value?.id) return []

    const { data, error } = await supabase
      .from('favorites')
      .select(
        `
          id,
          product_id,
          products (
            id,
            title,
            description,
            image,
            condition,
            status,
            categories ( name ),
            profiles ( location )
          )
        `
      )
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })

    if (error) {
      if (import.meta.client) {
        toast.add({
          title: 'Erro ao carregar favoritos',
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

const mappedFavorites = computed(() => {
  return (favorites.value || [])
    .map((row) => {
      const product = row.products
      if (!product?.id) return null

      return {
        favoriteId: row.id,
        id: product.id,
        image:
          product.image
          || 'https://images.unsplash.com/photo-1498575207490-1698c5d8f2b6?q=80&w=1200&auto=format&fit=crop',
        title: product.title || 'Produto sem título',
        description: product.description || 'Sem descrição disponível.',
        category: product.categories?.name || 'Sem categoria',
        location: product.profiles?.location || 'Localização não definida'
      }
    })
    .filter(Boolean)
})

function isImageUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

async function removeFavorite(item) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('id', item.favoriteId)
    .eq('user_id', user.value.id)

  if (error) {
    toast.add({
      title: 'Erro ao remover favorito',
      description: error.message,
      color: 'error'
    })
    return
  }

  toast.add({ title: 'Removido dos favoritos', color: 'success' })
  await refresh()
}
</script>

<template>
  <div class="idem-page py-10">
    <section class="mx-auto w-full max-w-6xl px-6">
      <h1 class="font-serif text-6xl font-bold text-[var(--primary-deep)]">
        Favoritos
      </h1>
      <p class="mt-2 text-xl text-[#5C6B5E]">
        Produtos que guardou para trocar mais tarde
      </p>

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
        v-else-if="mappedFavorites.length === 0"
        class="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 text-center"
      >
        <p class="text-[#5C6B5E]">
          Ainda não guardaste produtos nos favoritos.
        </p>
      </div>

      <div
        v-else
        class="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3"
      >
        <article
          v-for="item in mappedFavorites"
          :key="item.favoriteId"
          class="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
        >
          <div class="relative h-52 bg-[var(--muted)]">
            <img
              v-if="isImageUrl(item.image)"
              :src="item.image"
              :alt="item.title"
              class="h-full w-full object-cover"
            >
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-7xl"
            >
              {{ item.image }}
            </div>

            <span
              class="absolute left-3 top-3 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--primary-deep)]"
            >
              {{ item.category }}
            </span>

            <button
              type="button"
              class="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-red-500 shadow"
              @click="removeFavorite(item)"
            >
              <UIcon
                name="i-lucide-heart"
                class="h-5 w-5"
              />
            </button>
          </div>

          <div class="space-y-3 p-5">
            <h2
              class="font-serif text-4xl font-semibold text-[var(--primary-deep)]"
            >
              {{ item.title }}
            </h2>
            <p class="text-lg text-[#5C6B5E]">
              {{ item.category }} • {{ item.location }}
            </p>
            <p class="text-lg text-[var(--primary-deep)]">
              Procura: {{ item.description }}
            </p>

            <div class="mt-2 flex items-center gap-2">
              <UButton
                :to="`/produto/${item.id}`"
                class="flex-1 justify-center rounded-xl bg-[var(--accent)] text-[var(--primary-deep)]"
              >
                Ver Detalhes
              </UButton>

              <button
                type="button"
                class="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-2.5 text-[var(--primary-deep)]"
                @click="removeFavorite(item)"
              >
                <UIcon
                  name="i-lucide-trash-2"
                  class="h-5 w-5"
                />
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
