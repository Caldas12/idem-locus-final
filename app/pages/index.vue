<script setup lang="ts">
import { computed, ref } from 'vue'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { getFeedProducts } = useProducts()

const selectedFilter = ref<number | string | null>(null)
const searchLocation = ref('')
const heroSearch = ref('')

const categoryStyles = [
  {
    color: '#2D5016',
    icon: 'i-lucide-shopping-basket',
    count: 'Produtos frescos'
  },
  { color: '#6B3A2A', icon: 'i-lucide-paintbrush', count: 'Feito à mão' },
  { color: '#1E4D3E', icon: 'i-lucide-leaf', count: 'Plantas e sementes' },
  { color: '#4A3728', icon: 'i-lucide-package', count: 'Itens úteis' }
]

type Category = { id: number, name: string }

const heroImages = [
  {
    src: 'https://images.unsplash.com/photo-1568583528604-e3a4cd4445cb?w=400&h=350&fit=crop&auto=format',
    alt: 'Produtos frescos',
    class: 'mt-8 h-56'
  },
  {
    src: 'https://images.unsplash.com/photo-1743485754062-b6ad79fd3278?w=400&h=350&fit=crop&auto=format',
    alt: 'Artesanato',
    class: 'h-56'
  },
  {
    src: 'https://images.unsplash.com/photo-1775919422010-a363264f344b?w=400&h=280&fit=crop&auto=format',
    alt: 'Pão artesanal',
    class: 'h-44'
  },
  {
    src: 'https://images.unsplash.com/photo-1769102084755-d09ab8e453d9?w=400&h=280&fit=crop&auto=format',
    alt: 'Têxteis coloridos',
    class: 'mt-4 h-44'
  }
]

const steps = [
  {
    number: '01',
    title: 'Publica o que tens',
    description:
      'Regista produtos locais, excedentes, plantas, artesanato ou outros itens prontos para trocar.'
  },
  {
    number: '02',
    title: 'Encontra o que precisas',
    description:
      'Explora itens da tua zona e descobre o que outros membros da comunidade estão a oferecer.'
  },
  {
    number: '03',
    title: 'Troca com confiança',
    description:
      'Combina a troca por mensagem, avalia a experiência e fortalece a tua rede local.'
  }
]

const { data: categories } = await useAsyncData<Category[]>(
  'home-categories',
  async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true })
    return (data || []) as Category[]
  }
)

type FeedProduct = {
  id?: number | string
  image?: string
  title?: string
  description?: string
  category_id?: number
  condition?: string
  created_at?: string
  categories?: { name?: string } | null
  profiles?: { location?: string } | null
}

const { data: feedProducts, pending } = await useAsyncData(
  'home-feed-products',
  async () => {
    const { products } = await getFeedProducts(0, 50, searchLocation.value)
    return products
  },
  { watch: [searchLocation] }
)

const categoryCards = computed(() => {
  return (categories.value || []).slice(0, 4).map((category, index) => ({
    ...category,
    ...(categoryStyles[index] || categoryStyles[3])
  }))
})

// REMOVIDA A LÓGICA DO CABAZ SURPRESA DAQUI
const featuredProducts = computed(() => {
  let products = (feedProducts.value || []) as FeedProduct[]

  if (selectedFilter.value !== null) {
    products = products.filter(p => p.category_id === selectedFilter.value)
  }

  return products.slice(0, 6).map(product => ({
    id: Number(product.id),
    image:
      product.image
      || 'https://images.unsplash.com/photo-1498575207490-1698c5d8f2b6?q=80&w=1200&auto=format&fit=crop',
    title: product.title || 'Produto sem título',
    description: product.description || 'Sem descrição disponível.',
    category: product.categories?.name || 'Sem categoria',
    condition: product.condition || 'Disponível',
    location: product.profiles?.location || 'Localização definida',
    expiry: formatDate(product.created_at),
    detailsTo: `/produto/${product.id}`
  }))
})

function formatDate(value?: string) {
  if (!value) return 'Data não definida'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data não definida'
  return date.toLocaleDateString('pt-PT')
}

function submitHeroSearch() {
  const query = heroSearch.value.trim()
  navigateTo(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
}
</script>

<template>
  <div class="idem-page">
    <section
      v-if="user"
      class="relative overflow-hidden bg-[var(--primary)] py-16 text-[#F5EDD8]"
    >
      <div
        class="absolute inset-0 opacity-20"
        style="
          background-image: url(https://images.unsplash.com/photo-1770462957003-d7f5ac079362?w=1600&h=900&fit=crop&auto=format);
          background-size: cover;
          background-position: center;
        "
      />
      <div
        class="relative idem-container flex flex-col justify-between gap-8 md:flex-row md:items-center"
      >
        <div class="max-w-2xl">
          <p class="idem-eyebrow mb-3">
            Comunidade local
          </p>
          <h1 class="mb-3 text-4xl font-bold leading-tight md:text-5xl">
            Olá, {{ user.email?.split("@")[0] }}.
          </h1>
          <p class="text-lg leading-relaxed text-[var(--primary-soft)]">
            Pronto para encontrar uma nova troca ou partilhar excedentes hoje?
          </p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row">
          <UButton
            to="/publish"
            icon="i-lucide-plus"
            class="rounded-full bg-[var(--accent)] px-8 py-3 text-[var(--primary-deep)] hover:bg-[#d5ad34]"
          >
            Publicar troca
          </UButton>
          <UButton
            to="/dashboard"
            variant="outline"
            class="rounded-full border-[#A8C5AC] px-8 py-3 text-[#F5EDD8] hover:border-[#F5EDD8] hover:bg-white/5"
          >
            Dashboard
          </UButton>
        </div>
      </div>
    </section>

    <section
      v-else
      class="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden bg-[var(--primary)] py-20 text-[#F5EDD8]"
    >
      <div
        class="absolute inset-0 opacity-20"
        style="
          background-image: url(https://images.unsplash.com/photo-1770462957003-d7f5ac079362?w=1600&h=900&fit=crop&auto=format);
          background-size: cover;
          background-position: center;
        "
      />
      <div
        class="absolute inset-0 bg-gradient-to-b from-[#1E3932]/60 to-[#1E3932]/95"
      />
      <div
        class="relative z-10 idem-container grid items-center gap-16 md:grid-cols-2"
      >
        <div>
          <p class="idem-eyebrow mb-6 inline-flex items-center gap-2">
            <UIcon
              name="i-lucide-leaf"
              class="h-4 w-4"
            /> Comunidade local
          </p>
          <h1 class="mb-6 text-5xl font-bold leading-[1.15] md:text-6xl">
            Troca o que tens pelo que
            <em class="not-italic text-[var(--accent)]">precisas</em>
          </h1>
          <p
            class="mb-10 max-w-md text-lg leading-relaxed text-[var(--primary-soft)]"
          >
            Ligamos vizinhos e produtores locais para trocar alimentos, plantas
            e artesanato sem dinheiro envolvido.
          </p>
          <form
            class="mb-10 flex flex-col gap-3 sm:flex-row"
            @submit.prevent="submitHeroSearch"
          >
            <div class="relative flex-1">
              <UIcon
                name="i-lucide-search"
                class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6B5E]"
              />
              <input
                v-model="heroSearch"
                type="text"
                placeholder="Buscar produtos ou trocas..."
                class="w-full rounded-full bg-[#F5EDD8] py-3.5 pl-11 pr-4 text-[var(--foreground)] outline-none placeholder:text-[#5C6B5E] focus:ring-2 focus:ring-[var(--accent)]"
              >
            </div>
            <button
              type="submit"
              class="flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-8 py-3.5 text-[var(--primary-deep)] transition-opacity hover:opacity-90"
            >
              Buscar <UIcon
                name="i-lucide-arrow-right"
                class="h-4 w-4"
              />
            </button>
          </form>
          <div
            class="flex flex-wrap items-center gap-5 text-sm text-[var(--primary-soft)]"
          >
            <span class="flex items-center gap-1.5"><UIcon
              name="i-lucide-map-pin"
              class="h-4 w-4"
            /> Trocas perto de
              ti</span>
            <span class="hidden h-4 w-px bg-white/20 sm:block" />
            <span class="flex items-center gap-1.5"><UIcon
              name="i-lucide-repeat-2"
              class="h-4 w-4"
            /> Comunidade
              circular</span>
          </div>
        </div>
        <div class="relative hidden md:block">
          <div class="grid grid-cols-2 gap-4">
            <div
              v-for="image in heroImages"
              :key="image.src"
              :class="image.class"
              class="overflow-hidden rounded-2xl bg-[#2D5016]"
            >
              <img
                :src="image.src"
                :alt="image.alt"
                class="h-full w-full object-cover opacity-90"
              >
            </div>
          </div>
          <div
            class="absolute -bottom-4 -left-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-[var(--foreground)] shadow-xl"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full bg-[#D4E9D7]"
              >
                <UIcon
                  name="i-lucide-star"
                  class="h-4 w-4 text-[var(--accent)]"
                />
              </div>
              <div>
                <p class="text-xs text-[#5C6B5E]">
                  Trocas avaliadas
                </p>
                <p class="font-semibold">
                  4.9 / 5.0
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="categoryCards.length"
      class="bg-[var(--background)] py-20"
    >
      <div class="idem-container">
        <div class="mb-12 flex items-end justify-between gap-6">
          <div>
            <p class="idem-eyebrow mb-2">
              Categorias
            </p>
            <h2 class="text-4xl font-semibold leading-tight">
              O que podes trocar
            </h2>
          </div>
          <NuxtLink
            to="/search"
            class="hidden items-center gap-1 text-sm text-[var(--primary)] transition-colors hover:text-[var(--accent)] md:flex"
          >
            Ver todas <UIcon
              name="i-lucide-chevron-right"
              class="h-4 w-4"
            />
          </NuxtLink>
        </div>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          <NuxtLink
            v-for="cat in categoryCards"
            :key="cat.id"
            :to="`/search?categoria=${cat.id}`"
            class="group relative block overflow-hidden rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-1"
            :style="{ background: cat.color }"
          >
            <UIcon
              :name="cat.icon"
              class="mb-4 h-7 w-7 text-[#F5EDD8] opacity-80"
            />
            <h3 class="mb-1 font-serif text-xl font-semibold text-[#F5EDD8]">
              {{ cat.name }}
            </h3>
            <p class="text-sm text-[var(--primary-soft)]">{{ cat.count }}</p>
            <UIcon
              name="i-lucide-arrow-right"
              class="absolute bottom-5 right-5 h-4 w-4 text-[#F5EDD8] opacity-0 transition-opacity group-hover:opacity-60"
            />
          </NuxtLink>
        </div>
      </div>
    </section>

    <section
      id="como-funciona"
      class="bg-[var(--primary)] py-20 text-[#F5EDD8]"
    >
      <div class="idem-container">
        <div class="mb-16 text-center">
          <p class="idem-eyebrow mb-2">
            Simples assim
          </p>
          <h2 class="text-4xl font-semibold leading-tight">
            Como funciona a Idem Locus
          </h2>
        </div>
        <div class="grid gap-8 md:grid-cols-3">
          <div
            v-for="(step, index) in steps"
            :key="step.number"
            class="relative"
          >
            <div
              v-if="index < steps.length - 1"
              class="absolute left-full top-8 z-0 hidden h-px w-full bg-white/10 md:block"
            />
            <div class="relative z-10">
              <span
                class="mb-4 block font-serif text-5xl font-bold text-[var(--accent)]/30"
              >{{ step.number }}</span>
              <h3 class="mb-3 font-serif text-2xl font-semibold">
                {{ step.title }}
              </h3>
              <p class="leading-relaxed text-[var(--primary-soft)]">
                {{ step.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-[var(--background)] py-20">
      <div class="idem-container">
        <div
          class="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p class="idem-eyebrow mb-2">
              Novidades
            </p>
            <h2 class="text-4xl font-semibold leading-tight">
              Trocas recentes
            </h2>
          </div>
          <div class="flex max-w-sm items-center gap-2">
            <UInput
              v-model="searchLocation"
              placeholder="Filtrar por localidade..."
              icon="i-lucide-map-pin"
              size="lg"
              class="w-full"
            />
          </div>
        </div>
        <div
          v-if="categories?.length"
          class="mb-8 flex gap-2 overflow-x-auto pb-2 hide-scrollbar"
        >
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            class="idem-pill whitespace-nowrap"
            :class="
              selectedFilter === cat.id
                ? 'bg-[var(--primary)] text-[#F5EDD8]'
                : 'bg-[var(--muted)] text-[var(--primary-deep)]'
            "
            @click="selectedFilter = selectedFilter === cat.id ? null : cat.id"
          >
            {{ cat.name }}
          </button>
        </div>
        <div
          v-if="pending"
          class="py-16 text-center"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="mx-auto h-10 w-10 animate-spin text-[var(--accent)]"
          />
        </div>
        <div
          v-else-if="featuredProducts.length"
          class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          <ProductCard
            v-for="product in featuredProducts"
            :key="product.id"
            v-bind="product"
          />
        </div>
        <div
          v-else
          class="rounded-2xl border border-[var(--border)] bg-[var(--card)] py-16 text-center"
        >
          <p class="font-medium text-[#5C6B5E]">
            Nenhum produto encontrado com estes filtros.
          </p>
        </div>
        <div class="mt-12 text-center">
          <NuxtLink
            to="/search"
            class="inline-flex items-center gap-2 rounded-full border border-[var(--primary)] px-8 py-3.5 text-[var(--primary)] transition-all duration-200 hover:bg-[var(--primary)] hover:text-[#F5EDD8]"
          >
            Ver todas as trocas
            <UIcon
              name="i-lucide-arrow-right"
              class="h-4 w-4"
            />
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="bg-[var(--primary-deep)] py-24 text-center text-[#F5EDD8]">
      <div class="mx-auto max-w-3xl px-6">
        <UIcon
          name="i-lucide-repeat-2"
          class="mx-auto mb-6 h-10 w-10 text-[var(--accent)]"
        />
        <h2 class="mb-6 text-5xl font-bold leading-tight">
          Pronto para a tua primeira troca?
        </h2>
        <p class="mb-10 text-lg leading-relaxed text-[var(--primary-soft)]">
          Junta-te a pessoas que já descobriram o valor da troca local. É
          simples, gratuito e fortalece a comunidade.
        </p>
        <div class="flex flex-col justify-center gap-4 sm:flex-row">
          <NuxtLink
            to="/register"
            class="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-10 py-4 text-[var(--primary-deep)] transition-opacity hover:opacity-90"
          >
            Criar conta gratuita
            <UIcon
              name="i-lucide-arrow-right"
              class="h-5 w-5"
            />
          </NuxtLink>
          <NuxtLink
            to="/search"
            class="inline-flex items-center justify-center rounded-full border border-[var(--primary-soft)] px-10 py-4 text-[#F5EDD8] transition-colors hover:border-[#F5EDD8]"
          >
            Explorar trocas
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
