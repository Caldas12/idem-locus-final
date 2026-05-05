<script setup>
import { computed, ref } from 'vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

definePageMeta({
  middleware: 'auth'
})

const errorMessage = ref('')
const successMessage = ref('')
const newCategoryName = ref('')

const { data: myProfile } = await useAsyncData('admin-profile', async () => {
  if (!user.value) {
    return null
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, role, account_type')
    .eq('id', user.value.id)
    .maybeSingle()

  return data || null
})

const isAdmin = computed(() => myProfile.value?.role === 'admin')

const {
  data: metrics,
  refresh: refreshMetrics
} = await useAsyncData('admin-metrics', async () => {
  if (!isAdmin.value) {
    return {
      users: 0,
      transactions: 0,
      products: 0,
      impact: 0
    }
  }

  const [{ count: userCount = 0 }, { count: transactionCount = 0 }, { count: productCount = 0 }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('products').select('*', { count: 'exact', head: true })
  ])

  return {
    users: userCount,
    transactions: transactionCount,
    products: productCount,
    impact: Number(transactionCount || 0) * 1.5
  }
})

const {
  data: users,
  refresh: refreshUsers
} = await useAsyncData('admin-users', async () => {
  if (!isAdmin.value) {
    return []
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, name, account_type, role, is_suspended, is_banned, created_at')
    .order('created_at', { ascending: false })

  return data || []
})

const {
  data: categories,
  refresh: refreshCategories
} = await useAsyncData('admin-categories', async () => {
  if (!isAdmin.value) {
    return []
  }

  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true })

  return data || []
})

async function updateModeration(userToUpdate, fieldName, fieldValue) {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ [fieldName]: fieldValue })
      .eq('id', userToUpdate.id)

    if (error) {
      throw new Error(error.message)
    }

    successMessage.value = 'Estado de moderação atualizado.'
    await refreshUsers()
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível atualizar a moderação.'
  }
}

async function createCategory() {
  if (!newCategoryName.value.trim()) {
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { error } = await supabase
      .from('categories')
      .insert({ name: newCategoryName.value.trim() })

    if (error) {
      throw new Error(error.message)
    }

    newCategoryName.value = ''
    successMessage.value = 'Categoria criada.'
    await Promise.all([refreshCategories(), refreshMetrics()])
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível criar a categoria.'
  }
}

async function removeCategory(categoryId) {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)

    if (error) {
      throw new Error(error.message)
    }

    successMessage.value = 'Categoria removida.'
    await refreshCategories()
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível remover a categoria.'
  }
}
</script>

<template>
  <UContainer class="py-10 space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">
        Administração
      </h1>
      <p class="text-gray-500 mt-1">
        Métricas globais, moderação e gestão de taxonomia.
      </p>
    </div>

    <UAlert
      v-if="!isAdmin"
      color="amber"
      variant="soft"
      title="Acesso restrito a administradores."
    />

    <template v-else>
      <UAlert
        v-if="errorMessage"
        color="red"
        variant="soft"
        :title="errorMessage"
      />

      <UAlert
        v-if="successMessage"
        color="green"
        variant="soft"
        :title="successMessage"
      />

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UCard>
          <p class="text-sm text-gray-500">
            Utilizadores
          </p>
          <p class="text-2xl font-bold">
            {{ metrics?.users || 0 }}
          </p>
        </UCard>

        <UCard>
          <p class="text-sm text-gray-500">
            Transações concluídas
          </p>
          <p class="text-2xl font-bold">
            {{ metrics?.transactions || 0 }}
          </p>
        </UCard>

        <UCard>
          <p class="text-sm text-gray-500">
            Produtos publicados
          </p>
          <p class="text-2xl font-bold">
            {{ metrics?.products || 0 }}
          </p>
        </UCard>

        <UCard>
          <p class="text-sm text-gray-500">
            Impacto ambiental estimado
          </p>
          <p class="text-2xl font-bold">
            {{ metrics?.impact || 0 }} kg CO2e
          </p>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">
            Moderação de Utilizadores
          </h2>
        </template>

        <div class="space-y-3">
          <div
            v-for="profile in users"
            :key="profile.id"
            class="border border-gray-100 rounded-lg p-4"
          >
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p class="font-medium">
                  {{ profile.name || profile.id }}
                </p>
                <p class="text-sm text-gray-600">
                  Tipo: {{ profile.account_type || 'personal' }} | Role: {{ profile.role || 'user' }}
                </p>
                <p class="text-sm text-gray-600">
                  Suspenso: {{ profile.is_suspended ? 'Sim' : 'Não' }} | Banido: {{ profile.is_banned ? 'Sim' : 'Não' }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <UButton
                  color="gray"
                  variant="soft"
                  size="sm"
                  @click="updateModeration(profile, 'is_suspended', !profile.is_suspended)"
                >
                  {{ profile.is_suspended ? 'Reativar' : 'Suspender' }}
                </UButton>

                <UButton
                  color="red"
                  variant="soft"
                  size="sm"
                  @click="updateModeration(profile, 'is_banned', !profile.is_banned)"
                >
                  {{ profile.is_banned ? 'Retirar Ban' : 'Banir' }}
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-bold">
            Gestão de Categorias
          </h2>
        </template>

        <div class="flex gap-2 mb-4">
          <UInput
            v-model="newCategoryName"
            class="flex-1"
            placeholder="Nova categoria"
          />
          <UButton
            color="green"
            @click="createCategory"
          >
            Criar
          </UButton>
        </div>

        <div class="space-y-2">
          <div
            v-for="category in categories"
            :key="category.id"
            class="flex items-center justify-between border border-gray-100 rounded-lg p-3"
          >
            <span>{{ category.name }}</span>
            <UButton
              color="red"
              variant="ghost"
              size="sm"
              @click="removeCategory(category.id)"
            >
              Remover
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </UContainer>
</template>
