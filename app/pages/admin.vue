<script setup>
import { computed, ref } from 'vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Painel Administrativo' })

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const toast = useToast()

const activeTab = ref('users')
const searchUsers = ref('')
const searchProducts = ref('')
const busyUserId = ref(null)

const { data: myProfile } = await useAsyncData(
  'admin-access-profile',
  async () => {
    if (!user.value?.id) return null

    const { data } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.value.id)
      .maybeSingle()

    return data || null
  },
  { watch: [() => user.value?.id] }
)

const isAdmin = computed(() => myProfile.value?.role === 'admin')

const { data: metrics } = await useAsyncData(
  'admin-metrics-ui',
  async () => {
    if (!isAdmin.value) {
      return {
        users: 0,
        products: 0,
        activeTrades: 0,
        completedTrades: 0
      }
    }

    const [usersRes, productsRes, activeRes, completedRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'accepted']),
      supabase
        .from('proposals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
    ])

    return {
      users: usersRes.count || 0,
      products: productsRes.count || 0,
      activeTrades: activeRes.count || 0,
      completedTrades: completedRes.count || 0
    }
  },
  { watch: [isAdmin] }
)

const { data: users, refresh: refreshUsers } = await useAsyncData(
  'admin-users-ui',
  async () => {
    if (!isAdmin.value) return []

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, name, username, location, avatar_url, is_suspended, is_banned'
      )
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error
    return data || []
  },
  { watch: [isAdmin] }
)

const { data: products } = await useAsyncData(
  'admin-products-ui',
  async () => {
    if (!isAdmin.value) return []

    const { data, error } = await supabase
      .from('products')
      .select(
        'id, title, status, image, created_at, categories(name), profiles(name)'
      )
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error
    return data || []
  },
  { watch: [isAdmin] }
)

const { data: userStats } = await useAsyncData(
  'admin-user-stats-ui',
  async () => {
    if (!isAdmin.value || !users.value?.length) return []

    const ids = users.value.map(u => u.id)

    const [{ data: proposals }, { data: reviews }] = await Promise.all([
      supabase
        .from('proposals')
        .select('buyer_id, seller_id')
        .eq('status', 'completed')
        .or(`buyer_id.in.(${ids.join(',')}),seller_id.in.(${ids.join(',')})`),
      supabase
        .from('reviews')
        .select('reviewed_user_id, rating')
        .in('reviewed_user_id', ids)
    ])

    const trades = new Map()
    const ratings = new Map()

    for (const row of proposals || []) {
      if (row.buyer_id)
        trades.set(row.buyer_id, (trades.get(row.buyer_id) || 0) + 1)
      if (row.seller_id)
        trades.set(row.seller_id, (trades.get(row.seller_id) || 0) + 1)
    }

    for (const row of reviews || []) {
      const current = ratings.get(row.reviewed_user_id) || { sum: 0, count: 0 }
      ratings.set(row.reviewed_user_id, {
        sum: current.sum + Number(row.rating || 0),
        count: current.count + 1
      })
    }

    return ids.map((id) => {
      const ratingData = ratings.get(id)
      return {
        userId: id,
        trades: trades.get(id) || 0,
        rating: ratingData
          ? Number((ratingData.sum / ratingData.count).toFixed(1))
          : 0
      }
    })
  }
)

const mappedUsers = computed(() => {
  const statsMap = new Map((userStats.value || []).map(s => [s.userId, s]))
  const term = searchUsers.value.trim().toLowerCase()

  return (users.value || [])
    .map((item) => {
      const stats = statsMap.get(item.id)
      return {
        ...item,
        trades: stats?.trades || 0,
        rating: stats?.rating || 0,
        verified: !item.is_suspended && !item.is_banned
      }
    })
    .filter((item) => {
      if (!term) return true
      return (
        (item.name || '').toLowerCase().includes(term)
        || (item.location || '').toLowerCase().includes(term)
        || (item.username || '').toLowerCase().includes(term)
      )
    })
})

const mappedProducts = computed(() => {
  const term = searchProducts.value.trim().toLowerCase()

  return (products.value || []).filter((item) => {
    if (!term) return true
    return (
      (item.title || '').toLowerCase().includes(term)
      || (item.categories?.name || '').toLowerCase().includes(term)
      || (item.profiles?.name || '').toLowerCase().includes(term)
    )
  })
})

function ratingLabel(value) {
  if (!value) return '-'
  return value.toFixed(1)
}

async function toggleSuspend(target) {
  busyUserId.value = target.id

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: !target.is_suspended })
      .eq('id', target.id)

    if (error) throw error

    await refreshUsers()
  } catch (error) {
    toast.add({
      title: 'Erro de moderação',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      color: 'error'
    })
  } finally {
    busyUserId.value = null
  }
}

async function toggleBan(target) {
  busyUserId.value = target.id

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: !target.is_banned })
      .eq('id', target.id)

    if (error) throw error

    await refreshUsers()
  } catch (error) {
    toast.add({
      title: 'Erro de moderação',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      color: 'error'
    })
  } finally {
    busyUserId.value = null
  }
}

function profileUrl(item) {
  return item.username ? `/profile/${item.username}` : '/search'
}
</script>

<template>
  <div class="idem-page py-10">
    <section class="mx-auto w-full max-w-6xl space-y-8 px-6">
      <div>
        <h1 class="font-serif text-6xl font-bold text-[var(--primary-deep)]">
          Painel Administrativo
        </h1>
        <p class="mt-2 text-xl text-[#5C6B5E]">
          Gerir utilizadores, produtos e trocas da plataforma
        </p>
      </div>

      <UAlert
        v-if="!isAdmin"
        title="Acesso restrito"
        description="Apenas administradores podem aceder a esta página."
        color="warning"
        variant="soft"
      />

      <template v-else>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div
            class="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
          >
            <div class="mb-4 flex items-center justify-between">
              <span class="rounded-full bg-[#E7ECE7] p-3 text-[var(--primary)]"><UIcon
                name="i-lucide-users"
                class="h-5 w-5"
              /></span>
              <UIcon
                name="i-lucide-trending-up"
                class="h-5 w-5 text-green-600"
              />
            </div>
            <p class="font-serif text-5xl font-bold">
              {{ metrics?.users || 0 }}
            </p>
            <p class="mt-1 text-[#5C6B5E]">
              Total de Utilizadores
            </p>
          </div>

          <div
            class="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
          >
            <div class="mb-4 flex items-center justify-between">
              <span class="rounded-full bg-[#EFE6C7] p-3 text-[var(--accent)]"><UIcon
                name="i-lucide-package"
                class="h-5 w-5"
              /></span>
              <UIcon
                name="i-lucide-trending-up"
                class="h-5 w-5 text-green-600"
              />
            </div>
            <p class="font-serif text-5xl font-bold">
              {{ metrics?.products || 0 }}
            </p>
            <p class="mt-1 text-[#5C6B5E]">
              Produtos Publicados
            </p>
          </div>

          <div
            class="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
          >
            <div class="mb-4 flex items-center justify-between">
              <span class="rounded-full bg-[#DAF3E3] p-3 text-green-700"><UIcon
                name="i-lucide-repeat-2"
                class="h-5 w-5"
              /></span>
              <UIcon
                name="i-lucide-trending-up"
                class="h-5 w-5 text-green-600"
              />
            </div>
            <p class="font-serif text-5xl font-bold">
              {{ metrics?.activeTrades || 0 }}
            </p>
            <p class="mt-1 text-[#5C6B5E]">
              Trocas Ativas
            </p>
          </div>

          <div
            class="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
          >
            <div class="mb-4 flex items-center justify-between">
              <span class="rounded-full bg-[#DCE7FF] p-3 text-blue-700"><UIcon
                name="i-lucide-circle-check"
                class="h-5 w-5"
              /></span>
              <UIcon
                name="i-lucide-trending-up"
                class="h-5 w-5 text-green-600"
              />
            </div>
            <p class="font-serif text-5xl font-bold">
              {{ metrics?.completedTrades || 0 }}
            </p>
            <p class="mt-1 text-[#5C6B5E]">
              Trocas Concluídas
            </p>
          </div>
        </div>

        <div class="inline-flex rounded-full bg-[var(--muted)] p-1">
          <button
            type="button"
            class="rounded-full px-4 py-1.5 text-sm"
            :class="
              activeTab === 'users'
                ? 'bg-[var(--card)] text-[var(--primary-deep)]'
                : 'text-[#5C6B5E]'
            "
            @click="activeTab = 'users'"
          >
            <UIcon
              name="i-lucide-users"
              class="mr-1 inline h-4 w-4"
            />
            Utilizadores
          </button>
          <button
            type="button"
            class="rounded-full px-4 py-1.5 text-sm"
            :class="
              activeTab === 'products'
                ? 'bg-[var(--card)] text-[var(--primary-deep)]'
                : 'text-[#5C6B5E]'
            "
            @click="activeTab = 'products'"
          >
            <UIcon
              name="i-lucide-package"
              class="mr-1 inline h-4 w-4"
            />
            Produtos
          </button>
        </div>

        <div
          class="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
        >
          <template v-if="activeTab === 'users'">
            <div class="mb-4 max-w-lg">
              <div class="relative">
                <UIcon
                  name="i-lucide-search"
                  class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6B5E]"
                />
                <input
                  v-model="searchUsers"
                  type="text"
                  placeholder="Pesquisar utilizadores..."
                  class="w-full rounded-xl bg-[var(--muted)] py-3 pl-10 pr-4 outline-none"
                >
              </div>
            </div>

            <div class="space-y-3">
              <div
                v-for="item in mappedUsers"
                :key="item.id"
                class="flex flex-col gap-3 rounded-2xl border border-[var(--border)] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div class="flex items-center gap-3">
                  <UAvatar
                    :src="item.avatar_url || undefined"
                    :alt="item.name || 'Utilizador'"
                    size="lg"
                    class="bg-[var(--muted)]"
                  />
                  <div>
                    <div class="flex items-center gap-2">
                      <p
                        class="text-2xl font-semibold text-[var(--primary-deep)]"
                      >
                        {{ item.name || "Utilizador" }}
                      </p>
                      <span
                        v-if="item.verified"
                        class="rounded-full bg-[#BEEBCF] px-2 py-0.5 text-xs text-green-800"
                      >Verificado</span>
                    </div>
                    <p class="text-[#5C6B5E]">
                      {{ item.location || "Sem localização" }} •
                      {{ item.trades }} trocas • Rating
                      {{ ratingLabel(item.rating) }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <UButton
                    :to="profileUrl(item)"
                    variant="outline"
                    class="rounded-xl border-[var(--border)] bg-[var(--muted)] text-[var(--primary-deep)]"
                  >
                    Ver Perfil
                  </UButton>
                  <button
                    type="button"
                    class="rounded-xl p-2 text-red-600"
                    :disabled="busyUserId === item.id"
                    @click="toggleSuspend(item)"
                  >
                    <UIcon
                      name="i-lucide-ban"
                      class="h-5 w-5"
                    />
                  </button>
                  <button
                    type="button"
                    class="rounded-xl p-2 text-[var(--primary-deep)]"
                    :disabled="busyUserId === item.id"
                    @click="toggleBan(item)"
                  >
                    <UIcon
                      name="i-lucide-ellipsis-vertical"
                      class="h-5 w-5"
                    />
                  </button>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="mb-4 max-w-lg">
              <div class="relative">
                <UIcon
                  name="i-lucide-search"
                  class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6B5E]"
                />
                <input
                  v-model="searchProducts"
                  type="text"
                  placeholder="Pesquisar produtos..."
                  class="w-full rounded-xl bg-[var(--muted)] py-3 pl-10 pr-4 outline-none"
                >
              </div>
            </div>

            <div class="space-y-3">
              <div
                v-for="product in mappedProducts"
                :key="product.id"
                class="flex items-center justify-between rounded-2xl border border-[var(--border)] p-4"
              >
                <div>
                  <p class="font-medium text-[var(--primary-deep)]">
                    {{ product.title }}
                  </p>
                  <p class="text-sm text-[#5C6B5E]">
                    {{ product.categories?.name || "Sem categoria" }} •
                    {{ product.profiles?.name || "Sem produtor" }} •
                    {{ product.status }}
                  </p>
                </div>
                <UButton
                  :to="`/produto/${product.id}`"
                  variant="outline"
                  class="rounded-xl"
                >
                  Ver
                </UButton>
              </div>
            </div>
          </template>
        </div>
      </template>
    </section>
  </div>
</template>
