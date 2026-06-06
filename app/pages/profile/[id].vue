<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const urlUsername = route.params.id as string

// 1. Procurar o perfil correspondente a este USERNAME na BD
const { data: profile, pending: profilePending } = await useAsyncData(
  `public-profile-${urlUsername}`,
  async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, username, location, account_type, avatar_url')
      .eq('username', urlUsername) // <- MUDOU DE 'id' PARA 'username'
      .maybeSingle()
    return data || null
  }
)

// 2. Procurar os produtos ativos usando o ID real que descobrimos no passo 1
const { data: products, pending: productsPending } = await useAsyncData(
  `profile-products-${urlUsername}`,
  async () => {
    if (!profile.value?.id) return []

    const { data } = await supabase
      .from('products')
      .select(
        'id, title, description, image, condition, status, created_at, categories(name)'
      )
      .eq('profile_id', profile.value.id) // <- Usa o ID interno do perfil encontrado
      .eq('status', 'Disponível')
      .order('created_at', { ascending: false })
    return data || []
  }
)

// 3. Verifica se o visitante logado é o dono desta página
const isOwner = computed(() => {
  return user.value && profile.value && user.value.id === profile.value.id
})

const mappedProducts = computed(() => {
  return (products.value || []).map(product => ({
    id: Number(product.id),
    image: product.image || '🧺',
    title: product.title || 'Sem título',
    description: product.description || 'Sem descrição.',
    category:
      (product.categories as { name?: string } | null)?.name || 'Sem categoria',
    condition: product.condition || 'Não definido',
    location: profile.value?.location || 'Localização não definida',
    expiry: product.created_at
      ? new Date(product.created_at).toLocaleDateString('pt-PT')
      : 'Data não definida',
    detailsTo: `/produto/${product.id}`,
    interestTo: `/produto/${product.id}?intent=interest`
  }))
})

function getAccountTypeLabel(type: string) {
  if (type === 'business') return 'Entidade Comercial'
  if (type === 'pickup_point') return 'Ponto de Recolha'
  return 'Produtor Local'
}
</script>

<template>
  <UContainer class="py-10 space-y-10">
    <div
      v-if="profilePending"
      class="text-center py-20"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="animate-spin text-5xl text-[#C5893C]"
      />
      <p class="mt-4 text-stone-500 font-medium">
        A colher dados do produtor...
      </p>
    </div>

    <div
      v-else-if="!profile"
      class="text-center py-16 bg-white rounded-2xl border border-stone-200 shadow-sm"
    >
      <UIcon
        name="i-heroicons-user-minus"
        class="text-5xl text-stone-300 mb-3"
      />
      <h3 class="text-xl font-bold text-stone-800 font-serif">
        Utilizador não encontrado
      </h3>
      <p class="text-stone-500 max-w-sm mx-auto mt-1 text-sm">
        O username "@{{ urlUsername }}" não está registado na nossa praça.
      </p>
      <UButton
        to="/"
        color="stone"
        class="mt-4 bg-stone-800 hover:bg-stone-700 text-white"
      >
        Voltar à Praça
      </UButton>
    </div>

    <template v-else>
      <div
        class="bg-white border border-stone-200 rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6"
      >
        <div
          class="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left"
        >
          <UAvatar
            :src="profile.avatar_url"
            :alt="profile.name || 'Utilizador'"
            size="3xl"
            class="w-24 h-24 text-3xl shadow-md border-2 border-white bg-[#C5893C] text-white font-bold"
          />
          <div class="space-y-1.5">
            <div class="flex flex-col sm:flex-row items-center gap-2">
              <h1 class="text-3xl font-bold text-stone-900 font-serif">
                {{ profile.name || "Utilizador" }}
              </h1>
              <UBadge
                color="amber"
                variant="subtle"
                class="rounded-full font-bold uppercase tracking-wider text-[10px]"
              >
                {{ getAccountTypeLabel(profile.account_type) }}
              </UBadge>
            </div>
            <p class="text-stone-400 text-xs font-medium -mt-1">
              @{{ profile.username }}
            </p>
            <p
              class="text-stone-500 flex items-center justify-center sm:justify-start gap-1 text-sm mt-1"
            >
              <UIcon
                name="i-heroicons-map-pin"
                class="text-[#C5893C]"
              />
              {{ profile.location || "Sem localização definida" }}
            </p>
          </div>
        </div>

        <div v-if="isOwner">
          <UButton
            to="/profile"
            icon="i-heroicons-pencil-square"
            size="lg"
            variant="outline"
            color="amber"
            class="font-bold border-2 hover:bg-amber-50 rounded-xl"
          >
            Editar Perfil
          </UButton>
        </div>
      </div>

      <section class="space-y-6">
        <div class="border-b border-stone-200 pb-4">
          <h2
            class="text-2xl font-bold text-stone-900 font-serif flex items-center gap-2"
          >
            <UIcon
              name="i-heroicons-building-storefront"
              class="text-[#1A3A2A]"
            />
            Banca de {{ profile.name?.split(" ")[0] || "Excedentes" }}
          </h2>
          <p class="text-stone-500 text-sm mt-0.5">
            Espreita os produtos ativos que este membro tem para oferecer na
            comunidade.
          </p>
        </div>

        <div
          v-if="productsPending"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <div
            v-for="n in 4"
            :key="n"
            class="h-64 bg-stone-100 rounded-xl animate-pulse"
          />
        </div>

        <div
          v-else-if="mappedProducts.length === 0"
          class="text-center py-16 bg-stone-50 rounded-2xl border border-stone-100 italic text-stone-500"
        >
          Este produtor não tem nenhum excedente publicado na praça de momento.
        </div>

        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <ProductCard
            v-for="product in mappedProducts"
            :key="product.id"
            v-bind="product"
          />
        </div>
      </section>
    </template>
  </UContainer>
</template>
