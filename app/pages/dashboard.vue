<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({ middleware: 'auth' })

const user = useSupabaseUser()
const supabase = useSupabaseClient()

const errorMessage = ref('')
const successMessage = ref('')

// 1. PROPOSTAS (Agora com reatividade ao utilizador)
const { data: myProposals, refresh: refreshProposals } = await useAsyncData(
  'dashboard-proposals',
  async () => {
    if (!user.value?.id) return []

    const { data, error } = await supabase
      .from('proposals')
      .select(
        `
      id, status, offered_price, product_id, buyer_id, seller_id,
      products (title),
      buyer:profiles!proposals_buyer_id_fkey (name)
    `
      )
      .eq('seller_id', user.value.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return []
    }

    return data.map(p => ({
      ...p,
      product: p.products,
      buyer: p.buyer
    }))
  },
  {
    watch: [user] // <-- Faz o fetch automático assim que o utilizador é reconhecido
  }
)

const isUpdatingProposal = ref(false)
type DashboardProposal = {
  id: number
  product_id: number
}

async function updateProposal(prop: DashboardProposal, newStatus: string) {
  isUpdatingProposal.value = true
  try {
    await supabase
      .from('proposals')
      .update({ status: newStatus })
      .eq('id', prop.id)
    if (newStatus === 'accepted') {
      await supabase
        .from('products')
        .update({ status: 'Indisponível' })
        .eq('id', prop.product_id)
    } else if (newStatus === 'completed') {
      await supabase
        .from('products')
        .update({ status: 'Esgotado' })
        .eq('id', prop.product_id)
    }
    await refreshProposals()
    await refreshProducts()
    successMessage.value = 'Estado da proposta atualizado.'
  } catch {
    errorMessage.value = 'Erro ao atualizar a proposta.'
  } finally {
    isUpdatingProposal.value = false
  }
}

// 2. PRODUTOS (Agora com reatividade ao utilizador)
const { data: myProducts, refresh: refreshProducts } = await useAsyncData(
  'dashboard-products',
  async () => {
    if (!user.value?.id) return []

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('profile_id', user.value.id)
      .order('created_at', { ascending: false })

    return data || []
  },
  {
    watch: [user] // <-- O SEGREDO ESTÁ AQUI
  }
)

const editingProductId = ref(null)
const editForm = ref({
  title: '',
  description: '',
  image: '',
  status: '',
  condition: ''
})
const statusOptions = ['Disponível', 'Indisponível', 'Esgotado']
const conditionOptions = [
  'Maduro',
  'Fresco',
  'Defeito Visual',
  'Próximo da validade',
  'Embalado'
]
const isSaving = ref(false)

type DashboardProduct = {
  id: number
  title: string
  description: string
  image: string
  status: string
  condition: string
}

function openEdit(product: DashboardProduct) {
  editingProductId.value = product.id
  editForm.value = { ...product }
}

function cancelEdit() {
  editingProductId.value = null
}

async function saveEdit() {
  isSaving.value = true
  try {
    await supabase
      .from('products')
      .update({
        title: editForm.value.title,
        description: editForm.value.description,
        image: editForm.value.image,
        status: editForm.value.status,
        condition: editForm.value.condition
      })
      .eq('id', editingProductId.value)

    cancelEdit()
    await refreshProducts()
    successMessage.value = 'Produto atualizado com sucesso.'
  } catch {
    errorMessage.value = 'Erro ao guardar alterações.'
  } finally {
    isSaving.value = false
  }
}

async function removeProduct(id: number) {
  if (confirm('Tens a certeza que pretendes remover este anúncio?')) {
    await supabase.from('products').delete().eq('id', id)
    await refreshProducts()
  }
}
</script>

<template>
  <UContainer class="py-10 space-y-12">
    <div
      class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-200 pb-6"
    >
      <div>
        <h1 class="text-3xl font-bold text-gray-900 font-serif">
          O Meu Dashboard
        </h1>
        <p class="text-gray-500 mt-1">
          Gere os teus produtos e responde às propostas da comunidade.
        </p>
      </div>
      <UButton
        to="/publish"
        color="amber"
        icon="i-heroicons-plus"
        size="lg"
        class="bg-[#C5893C] hover:bg-[#A87431]"
      >
        Publicar Novo
      </UButton>
    </div>

    <UAlert
      v-if="errorMessage"
      color="red"
      variant="soft"
      :title="errorMessage"
      class="mb-4"
    />
    <UAlert
      v-if="successMessage"
      color="green"
      variant="soft"
      :title="successMessage"
      class="mb-4"
    />

    <section>
      <h2 class="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
        <UIcon
          name="i-heroicons-inbox-arrow-down"
          class="text-[#C5893C]"
        />
        Propostas Recebidas
      </h2>
      <div
        v-if="!myProposals || myProposals.length === 0"
        class="text-center py-8 bg-white rounded-xl border border-stone-200 shadow-sm"
      >
        <p class="text-stone-500">
          Ainda não recebeste nenhuma manifestação de interesse.
        </p>
      </div>
      <div
        v-else
        class="space-y-4"
      >
        <UCard
          v-for="prop in myProposals"
          :key="prop.id"
          class="shadow-sm border-stone-200"
        >
          <div
            class="flex flex-col md:flex-row justify-between md:items-center gap-4"
          >
            <div>
              <p class="font-bold text-stone-900 text-lg">
                {{ prop.product?.title || "Produto Removido" }}
              </p>
              <p class="text-sm text-stone-600 flex items-center gap-1 mt-1">
                <UIcon name="i-heroicons-user" /> De:
                <strong>{{ prop.buyer?.name || "Utilizador" }}</strong>
              </p>
              <p
                class="text-sm text-[#C5893C] flex items-center gap-1 mt-1 font-bold"
              >
                <UIcon name="i-heroicons-currency-euro" /> Oferta sugerida:
                {{ prop.offered_price || 0 }} €
              </p>
              <UBadge
                :color="
                  prop.status === 'pending'
                    ? 'amber'
                    : prop.status === 'accepted'
                      ? 'green'
                      : prop.status === 'completed'
                        ? 'gray'
                        : 'red'
                "
                class="mt-2 uppercase tracking-wider text-[10px]"
              >
                {{
                  prop.status === "pending"
                    ? "Pendente"
                    : prop.status === "accepted"
                      ? "Aceite"
                      : prop.status === "completed"
                        ? "Concluída"
                        : "Rejeitada"
                }}
              </UBadge>
            </div>
            <div class="flex flex-wrap gap-2">
              <template v-if="prop.status === 'pending'">
                <UButton
                  color="green"
                  :loading="isUpdatingProposal"
                  icon="i-heroicons-check"
                  @click="updateProposal(prop, 'accepted')"
                >
                  Aceitar Oferta
                </UButton>
                <UButton
                  color="red"
                  variant="soft"
                  :loading="isUpdatingProposal"
                  icon="i-heroicons-x-mark"
                  @click="updateProposal(prop, 'rejected')"
                >
                  Rejeitar
                </UButton>
              </template>
              <template v-else-if="prop.status === 'accepted'">
                <UButton
                  color="amber"
                  :loading="isUpdatingProposal"
                  icon="i-heroicons-check-circle"
                  class="bg-[#C5893C] text-white"
                  @click="updateProposal(prop, 'completed')"
                >
                  Marcar como Entregue
                </UButton>
              </template>
            </div>
          </div>
        </UCard>
      </div>
    </section>

    <section>
      <h2 class="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
        <UIcon
          name="i-heroicons-squares-2x2"
          class="text-[#C5893C]"
        /> Os Meus
        Produtos
      </h2>
      <div
        v-if="!myProducts || myProducts.length === 0"
        class="text-center py-12 bg-white rounded-xl border border-stone-200 shadow-sm"
      >
        <p class="text-stone-500">
          Ainda não publicaste nenhum produto.
        </p>
      </div>
      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <UCard
          v-for="product in myProducts"
          :key="product.id"
          class="flex flex-col h-full overflow-hidden shadow-sm hover:shadow-md transition-shadow border-stone-200"
          :ui="{ body: { padding: 'p-0 sm:p-0' } }"
        >
          <template v-if="editingProductId !== product.id">
            <div
              class="h-48 bg-[#FAF9F6] flex items-center justify-center border-b border-stone-100 overflow-hidden relative"
            >
              <img
                v-if="product.image && product.image.startsWith('http')"
                :src="product.image"
                class="w-full h-full object-cover"
              >
              <span
                v-else
                class="text-6xl"
              >{{ product.image || " " }}</span>
              <UBadge
                class="absolute top-2 left-2 shadow-sm font-bold"
                :color="product.status === 'Disponível' ? 'green' : 'red'"
              >
                {{ product.status }}
              </UBadge>
            </div>
            <div class="p-5 flex-1 flex flex-col">
              <h3 class="font-bold text-lg text-stone-900 line-clamp-1 mb-1">
                {{ product.title }}
              </h3>
              <p class="text-sm text-stone-500 line-clamp-2 mb-4 flex-1">
                {{ product.description }}
              </p>
              <div class="flex gap-2 mt-auto pt-4 border-t border-stone-100">
                <UButton
                  class="flex-1 justify-center font-bold"
                  size="sm"
                  color="amber"
                  variant="soft"
                  icon="i-heroicons-pencil"
                  @click="openEdit(product)"
                >
                  Editar
                </UButton>
                <UButton
                  size="sm"
                  color="red"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  @click="removeProduct(product.id)"
                />
              </div>
            </div>
          </template>

          <template v-else>
            <div class="p-4 bg-amber-50 h-full flex flex-col space-y-3">
              <div
                class="flex items-center gap-2 border-b border-amber-200 pb-2"
              >
                <UIcon
                  name="i-heroicons-pencil-square"
                  class="text-amber-700 text-lg"
                />
                <h3 class="font-bold text-amber-900 text-sm">
                  Editar Anúncio
                </h3>
              </div>
              <UInput
                v-model="editForm.title"
                placeholder="Título"
                size="sm"
                class="bg-white"
              />
              <UTextarea
                v-model="editForm.description"
                placeholder="Descrição"
                size="sm"
                :rows="2"
                autoresize
                class="bg-white"
              />
              <div class="grid grid-cols-2 gap-2">
                <select
                  v-model="editForm.status"
                  class="w-full h-8 bg-white border border-stone-200 rounded text-xs px-2 focus:outline-none"
                >
                  <option
                    v-for="opt in statusOptions"
                    :key="opt"
                    :value="opt"
                  >
                    {{ opt }}
                  </option>
                </select>
                <select
                  v-model="editForm.condition"
                  class="w-full h-8 bg-white border border-stone-200 rounded text-xs px-2 focus:outline-none"
                >
                  <option
                    v-for="opt in conditionOptions"
                    :key="opt"
                    :value="opt"
                  >
                    {{ opt }}
                  </option>
                </select>
              </div>
              <div class="flex gap-2 mt-auto pt-2 border-t border-amber-200">
                <UButton
                  class="flex-1 justify-center font-bold"
                  size="sm"
                  color="green"
                  :loading="isSaving"
                  @click="saveEdit"
                >
                  Guardar
                </UButton>
                <UButton
                  size="sm"
                  color="stone"
                  variant="ghost"
                  @click="cancelEdit"
                >
                  X
                </UButton>
              </div>
            </div>
          </template>
        </UCard>
      </div>
    </section>
  </UContainer>
</template>
