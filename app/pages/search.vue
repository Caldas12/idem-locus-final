<script setup lang="ts">
import { ref, computed } from 'vue'

const supabase = useSupabaseClient()

const query = ref('')

const { data: products, pending } = await useAsyncData(
  'search-products',
  async () => {
    let q = supabase
      .from('products')
      .select('id, title, description, image, condition, created_at, category_id, categories(name), profiles(location)')
      .eq('status', 'Disponível')
      .order('created_at', { ascending: false })

    if (query.value.trim()) {
      const term = query.value.trim()
      q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`)
    }

    const { data } = await q
    return data || []
  },
  { watch: [query] }
)

const results = computed(() => {
  return (products.value || []).map(product => ({
    id: Number(product.id),
    image: product.image || '🧺',
    title: product.title || 'Sem título',
    description: product.description || 'Sem descrição.',
    category: product.categories?.name || 'Sem categoria',
    condition: product.condition || 'Não definido',
    location: product.profiles?.location || 'Localização não definida',
    expiry: product.created_at ? new Date(product.created_at).toLocaleDateString('pt-PT') : 'Data não definida',
    detailsTo: `/produto/${product.id}`,
    interestTo: `/produto/${product.id}?intent=interest`
  }))
})
</script>

<template>
  <UContainer class="py-10 space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">
        Pesquisa
      </h1>
      <p class="text-gray-500 mt-1">
        Procura produtos por palavra‑chave.
      </p>
    </div>

    <UInput
      v-model="query"
      placeholder="Ex: laranja, cabaz, pão..."
      icon="i-heroicons-magnifying-glass"
    />

    <div v-if="pending" class="text-gray-500">
      A pesquisar...
    </div>

    <div v-else-if="results.length === 0" class="text-gray-500">
      Sem resultados.
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <ProductCard
        v-for="item in results"
        :key="item.id"
        v-bind="item"
      />
    </div>
  </UContainer>
</template>