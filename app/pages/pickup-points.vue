<script setup>
import { computed, ref } from 'vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(false)

const form = ref({
  name: '',
  address: ''
})

const { data: myProfile } = await useAsyncData('pickup-points-profile', async () => {
  if (!user.value) {
    return null
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, account_type')
    .eq('id', user.value.id)
    .maybeSingle()

  return data || null
})

const {
  data: pickupPoints,
  refresh: refreshPickupPoints
} = await useAsyncData('pickup-points-list', async () => {
  await supabase
  .from('pickup_points')
  .insert({
    owner_id: user.value.id,
    name: form.value.name,
    address: form.value.address
  })
    .order('created_at', { ascending: false })

  return data || []
})

const myPickupPointIds = computed(() => {
  if (!user.value) {
    return []
  }

  return (pickupPoints.value || [])
    .filter(point => point.owner_id === user.value.id)
    .map(point => point.id)
})

const {
  data: pointOrders,
  refresh: refreshPointOrders
} = await useAsyncData('pickup-point-orders', async () => {
  if (myPickupPointIds.value.length === 0) {
    return []
  }

  const { data } = await supabase
    .from('proposals')
    .select('id, product_id, pickup_point_id, pickup_status, status, created_at')
    .in('pickup_point_id', myPickupPointIds.value)
    .order('created_at', { ascending: false })

  return data || []
})

const { data: productMap } = await useAsyncData('pickup-products-map', async () => {
  const ids = [...new Set((pointOrders.value || []).map(item => item.product_id).filter(Boolean))]

  if (ids.length === 0) {
    return {}
  }

  const { data } = await supabase
    .from('products')
    .select('id, title')
    .in('id', ids)

  return (data || []).reduce((acc, product) => {
    acc[product.id] = product
    return acc
  }, {})
})

const isPickupPointAccount = computed(() => myProfile.value?.account_type === 'pickup_point')

async function createPickupPoint() {
  if (!user.value) {
    navigateTo('/login')
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { error } = await supabase
      .from('pickup_points')
      .insert({
        owner_id: user.value.id,
        name: form.value.name,
        address: form.value.address,
      })

    if (error) {
      throw new Error(error.message)
    }

    successMessage.value = 'Ponto de recolha criado.'
    form.value.name = ''
    form.value.address = ''

    await refreshPickupPoints()
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível criar o ponto de recolha.'
  } finally {
    isLoading.value = false
  }
}

async function updateDeliveryStatus(order, newStatus) {
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { error } = await supabase
      .from('proposals')
      .update({ pickup_status: newStatus })
      .eq('id', order.id)

    if (error) {
      throw new Error(error.message)
    }

    if (newStatus === 'delivered') {
      await supabase
        .from('proposals')
        .update({ status: 'completed' })
        .eq('id', order.id)

      await supabase
        .from('products')
        .update({ status: 'Esgotado' })
        .eq('id', order.product_id)
    }

    successMessage.value = 'Estado logístico atualizado.'
    await refreshPointOrders()
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível atualizar o estado da encomenda.'
  }
}
</script>

<template>
  <UContainer class="py-10 space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">
        Pontos de Recolha
      </h1>
      <p class="text-gray-500 mt-1">
        Registo de pontos e validação de receção/entrega.
      </p>
    </div>

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

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          Registar Novo Ponto de Recolha
        </h2>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormGroup label="Nome">
            <UInput
              v-model="form.name"
              placeholder="Ex: Loja Solidária Centro"
            />
          </UFormGroup>

          <UFormGroup label="Morada">
            <UInput
              v-model="form.address"
              placeholder="Rua, cidade"
            />
          </UFormGroup>
        </div>

        <div class="flex justify-end">
          <UButton
            color="green"
            :loading="isLoading"
            @click="createPickupPoint"
          >
            Criar Ponto
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">
          Pontos Disponíveis
        </h2>
      </template>

      <div
        v-if="!pickupPoints || pickupPoints.length === 0"
        class="text-sm text-gray-500"
      >
        Ainda não existem pontos de recolha.
      </div>

      <div
        v-else
        class="space-y-3"
      >
        <div
          v-for="point in pickupPoints"
          :key="point.id"
          class="border border-gray-100 rounded-lg p-4"
        >
          <p class="font-medium text-gray-900">
            {{ point.name }}
          </p>
          <p class="text-sm text-gray-600">
            {{ point.address }}
          </p>
        </div>
      </div>
    </UCard>

    <UCard v-if="isPickupPointAccount">
      <template #header>
        <h2 class="text-lg font-semibold">
          Validação de Encomendas
        </h2>
      </template>

      <div
        v-if="!pointOrders || pointOrders.length === 0"
        class="text-sm text-gray-500"
      >
        Não existem encomendas atribuídas aos teus pontos.
      </div>

      <div
        v-else
        class="space-y-3"
      >
        <div
          v-for="order in pointOrders"
          :key="order.id"
          class="border border-gray-100 rounded-lg p-4"
        >
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p class="font-medium">
                {{ productMap?.[order.product_id]?.title || 'Produto' }}
              </p>
              <p class="text-sm text-gray-600">
                Estado da proposta: {{ order.status }}
              </p>
              <p class="text-sm text-gray-600">
                Estado logístico: {{ order.pickup_status || 'pending' }}
              </p>
            </div>

            <div class="flex gap-2">
              <UButton
                size="sm"
                color="gray"
                variant="soft"
                @click="updateDeliveryStatus(order, 'received')"
              >
                Validar Receção
              </UButton>
              <UButton
                size="sm"
                color="green"
                @click="updateDeliveryStatus(order, 'delivered')"
              >
                Validar Entrega
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
