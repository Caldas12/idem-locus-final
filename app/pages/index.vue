<template>
  <div class="w-full pb-12">
    <!-- Hero Section -->
    <section class="bg-[#F3EFE6] w-full pt-16 pb-24">
      <UContainer>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <!-- Coluna de Texto -->
          <div class="space-y-6 max-w-lg">
            <h1 class="text-5xl md:text-6xl font-serif text-stone-900 leading-[1.1]">
              Partilha local com<br>sabor a comunidade
            </h1>
            <p class="text-stone-700 text-lg">
              Descobre excedentes de agricultores e hortas locais na tua região, e reduz o desperdício alimentar.
            </p>
            <UButton 
              size="xl" 
              class="bg-[#C5893C] hover:bg-[#A87431] text-white font-medium px-8 py-3 rounded-lg shadow-sm"
            >
              Começar a Explorar
            </UButton>
          </div>
          
          <!-- Coluna da Imagem -->
          <div class="relative h-72 md:h-[420px] w-full rounded-xl overflow-hidden shadow-xl">
            <!-- Utiliza a imagem já referenciada nas meta tags do projeto -->
            <img 
              src="https://images.unsplash.com/photo-1498575207490-1698c5d8f2b6?q=80&w=1200&auto=format&fit=crop" 
              alt="Mesa com vegetais e pão" 
              class="w-full h-full object-cover" 
            />
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Secção de Funcionalidades (Três Colunas) -->
    <section class="py-20 bg-[#FDFCFB]" id="como-funciona">
      <UContainer>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div class="flex flex-col items-center space-y-4">
            <UIcon name="i-heroicons-map-pin" class="w-16 h-16 text-stone-800" />
            <h3 class="text-xl font-bold text-stone-900">Find Local Food</h3>
            <p class="text-stone-600 text-sm px-4">
              Descobre excedentes de agricultores e hortas locais na tua região, e reduz o desperdício.
            </p>
          </div>
          
          <div class="flex flex-col items-center space-y-4">
            <UIcon name="i-heroicons-shopping-basket" class="w-16 h-16 text-stone-800" />
            <h3 class="text-xl font-bold text-stone-900">Reserve Excedentes</h3>
            <p class="text-stone-600 text-sm px-4">
              Reserve excedentes de agricultores e hortas locais na tua região, e reduz o desperdício.
            </p>
          </div>
          
          <div class="flex flex-col items-center space-y-4">
            <UIcon name="i-heroicons-building-storefront" class="w-16 h-16 text-stone-800" />
            <h3 class="text-xl font-bold text-stone-900">Collect in a Locus</h3>
            <p class="text-stone-600 text-sm px-4">
              Collect in a locus with agricultores e hortas locais na tua região, e reduz o desperdício.
            </p>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Grelha de Produtos Existente -->
    <UContainer class="space-y-6 pt-10">
      <div class="flex items-center justify-between border-b border-stone-200 pb-4">
        <h2 class="text-sm font-bold text-stone-400 uppercase tracking-widest">Mais recentes</h2>
        <div class="flex gap-2 overflow-x-auto pb-2">
          <UButton
            v-for="cat in categories"
            :key="cat.id"
            size="xs"
            :variant="selectedFilter === cat.id ? 'solid' : 'soft'"
            color="stone"
            class="rounded-full px-4"
            @click="selectedFilter = cat.id"
          >
            {{ cat.name }}
          </UButton>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ProductCard
          v-for="product in featuredProducts"
          :key="product.id"
          v-bind="product"
        />
      </div>

      <div class="flex items-center gap-4 mb-4">
        <div class="flex-1 max-w-sm">
          <UInput
            v-model="searchLocation"
            placeholder="Filtrar por localidade..."
            icon="i-heroicons-map-pin"
          />
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const supabase = useSupabaseClient()
const { getFeedProducts } = useProducts()

// Variável de estado para saber qual o filtro clicado
const selectedFilter = ref<number | string | null>(null)

// 1. Ir buscar as Categorias Reais à Base de Dados
const { data: categories } = await useAsyncData('home-categories', async () => {
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true })
  return data || []
})

// Tipagem atualizada para incluir a category_id e o cabaz
type FeedProduct = {
  id?: number | string
  image?: string
  title?: string
  description?: string
  category_id?: number
  is_surprise_basket?: boolean
  condition?: string
  created_at?: string
  categories?: { name?: string } | null
  profiles?: { location?: string } | null
}

const searchLocation = ref('')

// Atualizar a recolha de dados para incluir a localização e reagir a mudanças
const { data: feedProducts, pending } = await useAsyncData(
  'home-feed-products',
  async () => {
    const { products } = await getFeedProducts(0, 50, searchLocation.value)
    return products
  },
  { watch: [searchLocation] }
)

// 3. A Magia do Filtro: A lista altera-se automaticamente quando clicas num botão
const featuredProducts = computed(() => {
  let products = (feedProducts.value || []) as FeedProduct[]

  // Aplicar o filtro
  if (selectedFilter.value === 'cabazes') {
    products = products.filter(p => p.is_surprise_basket)
  } else if (selectedFilter.value !== null) {
    products = products.filter(p => p.category_id === selectedFilter.value)
  }

  // Formatar para o Cartão
  return products.map(product => ({
    id: Number(product.id),
    image: product.image || 'https://images.unsplash.com/photo-1498575207490-1698c5d8f2b6?q=80&w=1200&auto=format&fit=crop',
    title: product.title || 'Produto sem título',
    description: product.description || 'Sem descrição disponível.',
    category: product.categories?.name || 'Sem categoria',
    condition: product.condition || 'Não definido',
    location: product.profiles?.location || 'Localização não definida',
    expiry: formatDate(product.created_at),
    detailsTo: `/produto/${product.id}`,
    interestTo: `/produto/${product.id}?intent=interest`
  }))
})

function formatDate(value?: string) {
  if (!value) return 'Data nao definida'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data nao definida'
  return date.toLocaleDateString('pt-PT')
}

function scrollToRecent() {
  const section = document.getElementById('recent-products')
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
.hero{ padding: 22px 0 8px; }

.hero-content{
  padding: 28px 2px 10px;
}
h1{
  font-family: "Playfair Display", serif;
  font-size: clamp(1.8rem, 3vw, 2.8rem);
  margin: 0 0 8px;
}
.hero-content p{
  color: var(--text-soft);
  max-width: 680px;
  margin-bottom: 14px;
}
.hero-actions{
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.list-section{ padding: 14px 0 40px; }
.section-head{
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
h2{
  font-family: "Playfair Display", serif;
  margin: 10px 0;
}
.filters{
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pill{
  border: 1px solid var(--border);
  background: #fffaf4;
  color: var(--text-soft);
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
}
.pill.active{
  background: var(--secondary);
  color: var(--text);
}

.list{
  display: grid;
  gap: 14px;
  margin-top: 8px;
}

.empty-products {
  color: var(--text-soft);
  margin-top: 18px;
}
</style>
