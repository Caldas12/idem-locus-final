<script setup lang="ts">
import { computed, ref } from 'vue'

const route = useRoute()
const supabase = useSupabaseClient()

const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const selectedCategory = ref<number | null>(
  typeof route.query.categoria === 'string'
  && !Number.isNaN(Number(route.query.categoria))
    ? Number(route.query.categoria)
    : null
)
const selectedCondition = ref<string | null>(null)
const showFilters = ref(false)

type Category = {
  id: number
  name: string
}

type ProductRow = {
  id?: number | string
  image?: string
  title?: string
  description?: string
  condition?: string
  created_at?: string
  categories?: { name?: string } | null
  profiles?: { location?: string } | null
}

type LooseSupabaseQuery = PromiseLike<{ data: unknown[] | null }> & {
  select: (columns: string) => LooseSupabaseQuery
  order: (
    column: string,
    options?: Record<string, unknown>
  ) => LooseSupabaseQuery
  eq: (column: string, value: unknown) => LooseSupabaseQuery
  or: (filters: string) => LooseSupabaseQuery
}

const conditionOptions = [
  { label: 'Qualquer estado', value: null },
  { label: 'Fresco', value: 'Fresco' },
  { label: 'Maduro', value: 'Maduro' },
  { label: 'Defeito visual', value: 'Defeito Visual' },
  { label: 'Próximo da validade', value: 'Próximo da validade' },
  { label: 'Embalado', value: 'Embalado' }
]

const { data: dbCategories } = await useAsyncData<Category[]>(
  'search-categories',
  async () => {
    const { data } = await (
      supabase.from('categories') as unknown as LooseSupabaseQuery
    )
      .select('id, name')
      .order('name', { ascending: true })
    return (data || []) as Category[]
  }
)

const activeCategoryName = computed(() => {
  if (selectedCategory.value === null) return 'Todas'
  return (
    dbCategories.value?.find(
      category => category.id === selectedCategory.value
    )?.name || 'Categoria'
  )
})

const categoryOptions = computed(() => {
  return [
    { label: 'Todas as categorias', value: null },
    ...(dbCategories.value || []).map(c => ({ label: c.name, value: c.id }))
  ]
})

const { data: products, pending } = await useAsyncData<ProductRow[]>(
  'search-products',
  async () => {
    let q = (supabase.from('products') as unknown as LooseSupabaseQuery)
      .select(
        'id, title, description, image, condition, created_at, category_id, categories(name), profiles(location)'
      )
      .eq('status', 'Disponível')
      .order('created_at', { ascending: false })

    if (query.value.trim()) {
      const term = query.value.trim()
      q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`)
    }

    if (selectedCategory.value !== null) {
      q = q.eq('category_id', selectedCategory.value)
    }

    if (selectedCondition.value !== null) {
      q = q.eq('condition', selectedCondition.value)
    }

    const { data } = await q
    return (data || []) as ProductRow[]
  },
  { watch: [query, selectedCategory, selectedCondition] }
)

const results = computed(() => {
  return (products.value || []).map(product => ({
    id: Number(product.id),
    image:
      product.image
      || 'https://images.unsplash.com/photo-1498575207490-1698c5d8f2b6?q=80&w=1200&auto=format&fit=crop',
    title: product.title || 'Sem título',
    description: product.description || 'Sem descrição.',
    category: product.categories?.name || 'Sem categoria',
    condition: product.condition || 'Disponível',
    location: product.profiles?.location || 'Localização não definida',
    expiry: product.created_at
      ? new Date(product.created_at).toLocaleDateString('pt-PT')
      : 'Data não definida',
    detailsTo: `/produto/${product.id}`,
    interestTo: `/produto/${product.id}?intent=interest`
  }))
})

function clearFilters() {
  query.value = ''
  selectedCategory.value = null
  selectedCondition.value = null
}
</script>

<template>
  <div class="idem-page min-h-screen">
    <section class="bg-[var(--primary)] py-12 text-[#F5EDD8]">
      <div class="idem-container">
        <p class="idem-eyebrow mb-2">
          Descobrir
        </p>
        <h1 class="mb-6 text-5xl font-bold leading-tight">
          Explorar trocas
        </h1>
        <form
          class="flex max-w-xl gap-3"
          @submit.prevent
        >
          <div class="relative flex-1">
            <UIcon
              name="i-lucide-search"
              class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6B5E]"
            />
            <input
              v-model="query"
              type="text"
              placeholder="Buscar por produto, cidade..."
              class="w-full rounded-full bg-[#F5EDD8] py-3 pl-11 pr-4 text-[var(--foreground)] outline-none placeholder:text-[#5C6B5E] focus:ring-2 focus:ring-[var(--accent)]"
            >
          </div>
          <button
            type="button"
            class="flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm text-[#F5EDD8] transition-colors hover:border-white/40"
            @click="showFilters = !showFilters"
          >
            <UIcon
              name="i-lucide-sliders-horizontal"
              class="h-4 w-4"
            />
            Filtros
          </button>
        </form>
      </div>
    </section>

    <section class="idem-container py-10">
      <div class="mb-8 flex flex-wrap gap-2">
        <button
          type="button"
          class="idem-pill"
          :class="
            selectedCategory === null
              ? 'bg-[var(--primary)] text-[#F5EDD8]'
              : 'bg-[var(--muted)] text-[var(--primary-deep)]'
          "
          @click="selectedCategory = null"
        >
          Todas
        </button>
        <button
          v-for="cat in dbCategories"
          :key="cat.id"
          type="button"
          class="idem-pill"
          :class="
            selectedCategory === cat.id
              ? 'bg-[var(--primary)] text-[#F5EDD8]'
              : 'bg-[var(--muted)] text-[var(--primary-deep)]'
          "
          @click="selectedCategory = cat.id"
        >
          {{ cat.name }}
        </button>
      </div>

      <div
        v-if="showFilters"
        class="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-1.5">
            <label class="block text-sm text-[var(--foreground)]">Categoria</label>
            <USelectMenu
              v-model="selectedCategory"
              :options="categoryOptions"
              value-attribute="value"
              option-attribute="label"
              size="lg"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-sm text-[var(--foreground)]">Estado do alimento</label>
            <USelectMenu
              v-model="selectedCondition"
              :options="conditionOptions"
              value-attribute="value"
              option-attribute="label"
              size="lg"
            />
          </div>
        </div>
      </div>

      <p class="mb-6 text-sm text-[#5C6B5E]">
        {{ results.length }}
        {{
          results.length === 1
            ? "resultado encontrado"
            : "resultados encontrados"
        }}
        <span v-if="selectedCategory !== null">
          em
          <strong class="text-[var(--foreground)]">{{
            activeCategoryName
          }}</strong>
        </span>
        <span v-if="query">
          para <strong class="text-[var(--foreground)]">"{{ query }}"</strong>
        </span>
      </p>

      <div
        v-if="pending"
        class="py-20 text-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="mx-auto h-12 w-12 animate-spin text-[var(--accent)]"
        />
      </div>

      <div
        v-else-if="results.length === 0"
        class="py-24 text-center"
      >
        <UIcon
          name="i-lucide-repeat-2"
          class="mx-auto mb-4 h-12 w-12 text-[#5C6B5E] opacity-40"
        />
        <h3 class="mb-2 font-serif text-2xl font-semibold">
          Nenhuma troca encontrada
        </h3>
        <p class="mb-6 text-[#5C6B5E]">
          Tenta outros termos ou categorias.
        </p>
        <button
          type="button"
          class="rounded-full border border-[var(--primary)] px-6 py-2.5 text-[var(--primary)] transition-all hover:bg-[var(--primary)] hover:text-[#F5EDD8]"
          @click="clearFilters"
        >
          Limpar filtros
        </button>
      </div>

      <div
        v-else
        class="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        <ProductCard
          v-for="item in results"
          :key="item.id"
          v-bind="item"
        />
      </div>
    </section>
  </div>
</template>
