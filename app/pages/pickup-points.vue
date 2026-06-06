<script setup>
import { computed, ref } from 'vue'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Pontos de Recolha' })

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const toast = useToast()

const showCreateForm = ref(false)
const isLoading = ref(false)

const form = ref({
  name: '',
  address: ''
})

const { data: profile } = await useAsyncData(
  'pickup-page-profile',
  async () => {
    if (!user.value?.id) return null
    const { data } = await supabase
      .from('profiles')
      .select('id, account_type')
      .eq('id', user.value.id)
      .maybeSingle()

    return data || null
  },
  { watch: [() => user.value?.id] }
)

const {
  data: pickupPoints,
  pending,
  refresh: refreshPickupPoints
} = await useAsyncData('pickup-points-list', async () => {
  const { data, error } = await supabase
    .from('pickup_points')
    .select('id, owner_id, name, address, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
})

const myPickupPointIds = computed(() => {
  if (!user.value?.id) return []

  return (pickupPoints.value || [])
    .filter(point => point.owner_id === user.value.id)
    .map(point => point.id)
})

const { data: pointOrders, refresh: refreshPointOrders } = await useAsyncData(
  'pickup-point-orders',
  async () => {
    if (myPickupPointIds.value.length === 0) return []

    const { data, error } = await supabase
      .from('proposals')
      .select(
        'id, product_id, pickup_point_id, pickup_status, status, created_at'
      )
      .in('pickup_point_id', myPickupPointIds.value)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
)

const { data: productsMap } = await useAsyncData(
  'pickup-products-map',
  async () => {
    const ids = [
      ...new Set(
        (pointOrders.value || [])
          .map(item => item.product_id)
          .filter(Boolean)
      )
    ]
    if (!ids.length) return {}

    const { data, error } = await supabase
      .from('products')
      .select('id, title')
      .in('id', ids)

    if (error) throw error

    return (data || []).reduce((acc, item) => {
      acc[item.id] = item
      return acc
    }, {})
  }
)

const mappedPoints = computed(() => {
  return (pickupPoints.value || []).map((point, index) => {
    const city = point.address?.split(',')[0]?.trim() || 'Cidade'

    return {
      ...point,
      city,
      phone: index % 2 === 0 ? '210 123 456' : '220 987 654',
      schedule:
        index % 2 === 0 ? 'Seg–Sex: 9h–18h | Sáb: 10h–14h' : 'Ter–Dom: 8h–20h'
    }
  })
})

const isPickupPointAccount = computed(() => {
  return profile.value?.account_type === 'pickup_point'
})

async function createPickupPoint() {
  if (!user.value?.id) return
  if (!form.value.name.trim() || !form.value.address.trim()) {
    toast.add({ title: 'Preencha nome e morada', color: 'warning' })
    return
  }

  isLoading.value = true

  try {
    const { error } = await supabase.from('pickup_points').insert({
      owner_id: user.value.id,
      name: form.value.name.trim(),
      address: form.value.address.trim()
    })

    if (error) throw error

    toast.add({ title: 'Ponto de recolha criado', color: 'success' })
    form.value.name = ''
    form.value.address = ''
    showCreateForm.value = false
    await refreshPickupPoints()
  } catch (error) {
    toast.add({
      title: 'Erro ao criar ponto',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      color: 'error'
    })
  } finally {
    isLoading.value = false
  }
}

function selectForTrade(point) {
  toast.add({
    title: 'Ponto selecionado',
    description: `${point.name} foi selecionado para a troca.`,
    color: 'success'
  })
}

async function updateDeliveryStatus(order, status) {
  const { error } = await supabase
    .from('proposals')
    .update({ pickup_status: status })
    .eq('id', order.id)

  if (error) {
    toast.add({ title: 'Erro', description: error.message, color: 'error' })
    return
  }

  if (status === 'delivered') {
    await supabase
      .from('proposals')
      .update({ status: 'completed' })
      .eq('id', order.id)
    await supabase
      .from('products')
      .update({ status: 'Esgotado' })
      .eq('id', order.product_id)
  }

  toast.add({ title: 'Estado logístico atualizado', color: 'success' })
  await refreshPointOrders()
}
</script>

<template>
  <div class="idem-page py-10">
    <section class="mx-auto w-full max-w-5xl px-6">
      <h1 class="font-serif text-6xl font-bold text-[var(--primary-deep)]">
        Pontos de Recolha
      </h1>
      <p class="mt-2 text-xl text-[#5C6B5E]">
        Registo de pontos e validação de receção/entrega
      </p>

      <UButton
        class="mt-8 rounded-xl bg-[var(--accent)] px-5 py-3 text-[var(--primary-deep)]"
        @click="showCreateForm = !showCreateForm"
      >
        <UIcon
          name="i-lucide-plus"
          class="mr-2 h-4 w-4"
        />
        Registar Novo Ponto de Recolha
      </UButton>

      <div
        v-if="showCreateForm"
        class="mt-4 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6"
      >
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="mb-2 block text-sm text-[#5C6B5E]">Nome</label>
            <UInput
              v-model="form.name"
              placeholder="Ex: Loja Solidária Centro"
            />
          </div>
          <div>
            <label class="mb-2 block text-sm text-[#5C6B5E]">Morada</label>
            <UInput
              v-model="form.address"
              placeholder="Ex: Rua da Liberdade, Lisboa"
            />
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <UButton
            :loading="isLoading"
            class="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-white"
            @click="createPickupPoint"
          >
            Guardar ponto
          </UButton>
        </div>
      </div>

      <h2
        class="mt-10 font-serif text-5xl font-semibold text-[var(--primary-deep)]"
      >
        Pontos Disponíveis
      </h2>

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
        v-else-if="mappedPoints.length === 0"
        class="mt-4 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center"
      >
        <p class="text-[#5C6B5E]">
          Ainda não existem pontos de recolha registados.
        </p>
      </div>

      <div
        v-else
        class="mt-6 grid gap-6 md:grid-cols-2"
      >
        <article
          v-for="point in mappedPoints"
          :key="point.id"
          class="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
        >
          <div class="mb-2 flex items-start justify-between gap-3">
            <h3
              class="font-serif text-4xl font-semibold text-[var(--primary-deep)]"
            >
              {{ point.name }}
            </h3>
            <span
              class="inline-flex items-center gap-1 rounded-full bg-[#BEEBCF] px-3 py-1 text-sm text-green-800"
            >
              <UIcon
                name="i-lucide-badge-check"
                class="h-4 w-4"
              />
              Verificado
            </span>
          </div>

          <ul class="space-y-3 text-lg text-[#2E4634]">
            <li class="flex items-center gap-2">
              <UIcon
                name="i-lucide-map-pin"
                class="h-4 w-4"
              /> {{ point.city }}
            </li>
            <li class="flex items-center gap-2">
              <UIcon
                name="i-lucide-navigation"
                class="h-4 w-4"
              />
              {{ point.address }}
            </li>
            <li class="flex items-center gap-2">
              <UIcon
                name="i-lucide-clock-3"
                class="h-4 w-4"
              />
              {{ point.schedule }}
            </li>
            <li class="flex items-center gap-2">
              <UIcon
                name="i-lucide-phone"
                class="h-4 w-4"
              /> {{ point.phone }}
            </li>
          </ul>

          <UButton
            class="mt-5 w-full justify-center rounded-xl bg-[var(--muted)] text-[var(--primary-deep)]"
            @click="selectForTrade(point)"
          >
            Selecionar para troca
          </UButton>
        </article>
      </div>

      <div
        v-if="isPickupPointAccount"
        class="mt-10 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6"
      >
        <h3
          class="font-serif text-4xl font-semibold text-[var(--primary-deep)]"
        >
          Validação de Encomendas
        </h3>

        <div
          v-if="!pointOrders || pointOrders.length === 0"
          class="mt-4 text-[#5C6B5E]"
        >
          Não existem encomendas atribuídas aos teus pontos.
        </div>

        <div
          v-else
          class="mt-4 space-y-3"
        >
          <div
            v-for="order in pointOrders"
            :key="order.id"
            class="rounded-2xl border border-[var(--border)] p-4"
          >
            <p class="font-medium">
              {{ productsMap?.[order.product_id]?.title || "Produto" }}
            </p>
            <p class="text-sm text-[#5C6B5E]">
              Estado da proposta: {{ order.status }}
            </p>
            <p class="text-sm text-[#5C6B5E]">
              Estado logístico: {{ order.pickup_status || "pending" }}
            </p>

            <div class="mt-3 flex gap-2">
              <UButton
                variant="outline"
                class="rounded-xl"
                @click="updateDeliveryStatus(order, 'received')"
              >
                Validar receção
              </UButton>
              <UButton
                class="rounded-xl bg-[var(--primary)] text-white"
                @click="updateDeliveryStatus(order, 'delivered')"
              >
                Validar entrega
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
