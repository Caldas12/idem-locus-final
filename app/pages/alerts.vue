<script setup>
import { computed, ref } from 'vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

definePageMeta({
  middleware: 'auth'
})

const errorMessage = ref('')
const isLoading = ref(false)
const form = ref({
  keyword: '',
  category_id: null,
  radius_km: '',
  product_id: ''
})

const { data: categories } = await useAsyncData('categories-alerts', async () => {
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true })

  return data || []
})

const categoryOptions = computed(() => {
  return [
    { label: 'Sem categoria específica', value: null },
    ...(categories.value || []).map(category => ({
      label: category.name,
      value: category.id
    }))
  ]
})

const {
  data: alerts,
  refresh: refreshAlerts
} = await useAsyncData('user-alerts', async () => {
  if (!user.value) {
    return []
  }

  const { data } = await supabase
    .from('alerts')
    .select('id, keyword, category_id, radius_km, product_id, is_active, created_at')
    .eq('user_id', user.value.id)
    .order('created_at', { ascending: false })

  return data || []
})

function getCategoryName(id) {
  if (!id) {
    return 'Qualquer categoria'
  }

  return categories.value?.find(category => category.id === id)?.name || `Categoria ${id}`
}

async function createAlert() {
  if (!user.value) {
    navigateTo('/login')
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const { error } = await supabase
      .from('alerts')
      .insert({
        user_id: user.value.id,
        keyword: form.value.keyword || null,
        category_id: form.value.category_id,
        radius_km: form.value.radius_km === '' ? null : Number(form.value.radius_km),
        product_id: form.value.product_id === '' ? null : Number(form.value.product_id),
        is_active: true
      })

    if (error) {
      throw new Error(error.message)
    }

    form.value.keyword = ''
    form.value.category_id = null
    form.value.radius_km = ''
    form.value.product_id = ''

    await refreshAlerts()
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível criar o alerta.'
  } finally {
    isLoading.value = false
  }
}

async function toggleActive(alert) {
  await supabase
    .from('alerts')
    .update({ is_active: !alert.is_active })
    .eq('id', alert.id)
    .eq('user_id', user.value.id)

  await refreshAlerts()
}

async function removeAlert(alertId) {
  await supabase
    .from('alerts')
    .delete()
    .eq('id', alertId)
    .eq('user_id', user.value.id)

  await refreshAlerts()
}
</script>

<template>
  <UContainer class="py-10 max-w-3xl space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">
        Alertas
      </h1>
      <p class="text-gray-500 mt-1">
        Configura alertas por palavra-chave, categoria, produto ou raio.
      </p>
    </div>

    <UAlert
      v-if="errorMessage"
      color="red"
      variant="soft"
      :title="errorMessage"
    />

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          Novo Alerta
        </h2>
      </template>

      <div class="space-y-4">
        <UFormGroup label="Palavra-chave">
          <UInput
            v-model="form.keyword"
            placeholder="Ex: laranja, cabaz, fresco"
          />
        </UFormGroup>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UFormGroup label="Categoria">
            <USelect
              v-model="form.category_id"
              :options="categoryOptions"
            />
          </UFormGroup>

          <UFormGroup label="Raio (km)">
            <UInput
              v-model="form.radius_km"
              type="number"
              min="1"
            />
          </UFormGroup>

          <UFormGroup label="ID de Produto (opcional)">
            <UInput
              v-model="form.product_id"
              type="number"
              min="1"
            />
          </UFormGroup>
        </div>

        <div class="flex justify-end">
          <UButton
            color="green"
            :loading="isLoading"
            @click="createAlert"
          >
            Criar Alerta
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          Meus Alertas
        </h2>
      </template>

      <div
        v-if="!alerts || alerts.length === 0"
        class="text-sm text-gray-500"
      >
        Ainda não tens alertas configurados.
      </div>

      <div
        v-else
        class="space-y-3"
      >
        <div
          v-for="alert in alerts"
          :key="alert.id"
          class="border border-gray-100 rounded-lg p-4"
        >
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div class="text-sm text-gray-700 space-y-1">
              <p><strong>Palavra-chave:</strong> {{ alert.keyword || 'Não definida' }}</p>
              <p><strong>Categoria:</strong> {{ getCategoryName(alert.category_id) }}</p>
              <p><strong>Raio:</strong> {{ alert.radius_km || 'Sem limite' }} km</p>
              <p><strong>Produto:</strong> {{ alert.product_id || 'Qualquer produto' }}</p>
              <p><strong>Ativo:</strong> {{ alert.is_active ? 'Sim' : 'Não' }}</p>
            </div>

            <div class="flex gap-2">
              <UButton
                color="gray"
                variant="soft"
                @click="toggleActive(alert)"
              >
                {{ alert.is_active ? 'Desativar' : 'Ativar' }}
              </UButton>
              <UButton
                color="red"
                variant="soft"
                @click="removeAlert(alert.id)"
              >
                Remover
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
