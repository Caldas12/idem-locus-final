<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSeller } from '~/composables/useSeller'

definePageMeta({
  middleware: 'auth'
})

const user = useSupabaseUser()
const supabase = useSupabaseClient()

const errorMessage = ref('')
const successMessage = ref('')
const isSaving = ref(false)
const isUpdatingProposal = ref(false)
const selectedPickupPointByProposal = ref({})

const statusOptions = ['Disponível', 'Indisponível', 'Esgotado']
const conditionOptions = ['Maduro', 'Fresco', 'Defeito Visual', 'Próximo da validade', 'Embalado']
const typeOptions = ['Donativo', 'Troca Direta', 'Preço Simbólico']

const editingProductId = ref(null)
const editForm = ref({
  id: null,
  title: '',
  description: '',
  image: '',
  condition: 'Fresco',
  type: 'Troca Direta',
  status: 'Disponível',
  category_id: null,
  expires_at: '',
  is_surprise_basket: false
})

const { data: categories } = await useAsyncData('dashboard-categories', async () => {
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true })

  return (data || []).map(category => ({
    label: category.name,
    value: category.id
  }))
})

const { data: pickupPoints } = await useAsyncData('dashboard-pickup-points', async () => {
  const { data } = await supabase
    .from('pickup_points')
    .select('id, name')
    .order('name', { ascending: true })

  return data || []
})

const {
  data: _myProducts,
  refresh: refreshMyProducts
} = await useAsyncData('dashboard-my-products', async () => {
  if (!user.value) {
    return []
  }

  const { data } = await supabase
    .from('products')
    .select('id, title, description, image, condition, type, status, category_id, expires_at, is_surprise_basket, created_at')
    .eq('profile_id', user.value.id)
    .order('created_at', { ascending: false })

  return data || []
})

const {
  data: proposalItems,
  refresh: refreshProposals
} = await useAsyncData('dashboard-proposals', async () => {
  if (!user.value) {
    return []
  }

  const { data } = await supabase
    .from('proposals')
    .select(`
      id, product_id, conversation_id, buyer_id, status, pickup_point_id, pickup_status, created_at,
      product:products (id, title),
      buyer:profiles!proposals_buyer_id_fkey (id, name)
    `)
    .eq('seller_id', user.value.id)
    .order('created_at', { ascending: false })

  return data || []
})

const _detailedProposals = computed(() => {
  return (proposalItems.value || []).map(proposal => ({
    ...proposal,
    pickupPoint: (pickupPoints.value || []).find(point => point.id === proposal.pickup_point_id) || null
  }))
})

const _pickupPointOptions = computed(() => {
  return (pickupPoints.value || []).map(point => ({
    label: point.name,
    value: point.id
  }))
})

function _openEdit(product: { id: number, title: string, description: string, image: string, condition: string, type: string, status: string, category_id: number, expires_at: string, is_surprise_basket: boolean }) {
  editingProductId.value = product.id
  editForm.value = {
    id: product.id,
    title: product.title,
    description: product.description || '',
    image: product.image || '',
    condition: product.condition || 'Fresco',
    type: product.type || 'Troca Direta',
    status: product.status || 'Disponível',
    category_id: product.category_id,
    expires_at: product.expires_at ? String(product.expires_at).slice(0, 10) : '',
    is_surprise_basket: Boolean(product.is_surprise_basket)
  }
}

function cancelEdit() {
  editingProductId.value = null
}

async function saveEdit() {
  if (!editForm.value.id) {
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { error } = await supabase
      .from('products')
      .update({
        title: editForm.value.title,
        description: editForm.value.description,
        image: editForm.value.image || '🧺',
        condition: editForm.value.condition,
        type: editForm.value.type,
        status: editForm.value.status,
        category_id: editForm.value.category_id,
        expires_at: editForm.value.expires_at || null,
        is_surprise_basket: editForm.value.is_surprise_basket
      })
      .eq('id', editForm.value.id)
      .eq('profile_id', user.value.id)

    if (error) {
      throw new Error(error.message)
    }

    successMessage.value = 'Produto atualizado.'
    editingProductId.value = null
    await refreshMyProducts()
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível atualizar o produto.'
  } finally {
    isSaving.value = false
  }
}

async function _updateQuickStatus(productId: number, newStatus: string) {
  await supabase
    .from('products')
    .update({ status: newStatus })
    .eq('id', productId)
    .eq('profile_id', user.value.id)

  await refreshMyProducts()
}

async function _removeProduct(productId: number) {
  if (!confirm('Queres mesmo remover este produto?')) {
    return
  }

  await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('profile_id', user.value.id)

  await refreshMyProducts()
}

async function _updateProposal(proposal: { id: number, product_id: number, buyer_id: string }, newStatus: string) {
  isUpdatingProposal.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { error } = await supabase
      .from('proposals')
      .update({ status: newStatus })
      .eq('id', proposal.id)
      .eq('seller_id', user.value.id)

    if (error) {
      throw new Error(error.message)
    }

    if (newStatus === 'accepted') {
      await supabase
        .from('products')
        .update({ status: 'Indisponível' })
        .eq('id', proposal.product_id)
        .eq('profile_id', user.value.id)
    }

    if (newStatus === 'completed') {
      await supabase
        .from('products')
        .update({ status: 'Esgotado' })
        .eq('id', proposal.product_id)
        .eq('profile_id', user.value.id)
    }

    await supabase
      .from('notifications')
      .insert({
        user_id: proposal.buyer_id,
        type: 'proposal',
        title: 'Atualização de proposta',
        body: `A tua proposta foi marcada como ${newStatus}.`,
        payload: { proposal_id: proposal.id, product_id: proposal.product_id }
      })

    successMessage.value = 'Proposta atualizada.'

    await Promise.all([
      refreshProposals(),
      refreshMyProducts()
    ])
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível atualizar a proposta.'
  } finally {
    isUpdatingProposal.value = false
  }
}

async function _assignPickupPoint(proposal: { id: number, buyer_id: string }) {
  const selectedPointId = Number(selectedPickupPointByProposal.value[proposal.id])

  if (!Number.isFinite(selectedPointId) || selectedPointId <= 0) {
    errorMessage.value = 'Seleciona um ponto de recolha válido.'
    return
  }

  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { error } = await supabase
      .from('proposals')
      .update({
        pickup_point_id: selectedPointId,
        pickup_status: 'pending'
      })
      .eq('id', proposal.id)
      .eq('seller_id', user.value.id)

    if (error) {
      throw new Error(error.message)
    }

    await supabase
      .from('notifications')
      .insert({
        user_id: proposal.buyer_id,
        type: 'pickup',
        title: 'Ponto de recolha definido',
        body: 'O vendedor associou um ponto de recolha à proposta.',
        payload: { proposal_id: proposal.id, pickup_point_id: selectedPointId }
      })

    successMessage.value = 'Ponto de recolha atribuído.'
    await refreshProposals()
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível atribuir o ponto de recolha.'
  }
}
</script>

<template v-if="editingProductId === product.id">
  <div class="space-y-6 bg-[#F5EFE6] p-6 rounded-xl border border-[#E6D5C3] shadow-inner">
    <div class="flex items-center gap-2 border-b border-[#E6D5C3] pb-3 mb-4">
      <UIcon
        name="i-heroicons-pencil-square"
        class="text-amber-600 text-xl"
      />
      <h3 class="font-bold text-lg text-[#4A3B32]">
        A Editar Produto
      </h3>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="space-y-6">
        <UFormGroup
          label="Título"
          description="O nome do teu anúncio."
        >
          <UInput
            v-model="editForm.title"
            placeholder="Título"
          />
        </UFormGroup>

        <UFormGroup
          label="Descrição"
          description="Detalhes sobre a tua oferta."
        >
          <UTextarea
            v-model="editForm.description"
            autoresize
            placeholder="Descrição"
          />
        </UFormGroup>

        <UFormGroup label="Imagem (URL ou Emoji)">
          <UInput
            v-model="editForm.image"
            placeholder="Ex: 🍎 ou https://..."
          />
        </UFormGroup>
      </div>

      <div class="space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <UFormGroup label="Estado Físico">
            <USelect
              v-model="editForm.condition"
              :options="conditionOptions"
            />
          </UFormGroup>
          <UFormGroup label="Tipo">
            <USelect
              v-model="editForm.type"
              :options="typeOptions"
            />
          </UFormGroup>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormGroup label="Visibilidade">
            <USelect
              v-model="editForm.status"
              :options="statusOptions"
            />
          </UFormGroup>
          <UFormGroup label="Categoria">
            <USelect
              v-model="editForm.category_id"
              :options="categories"
            />
          </UFormGroup>
        </div>

        <div class="grid grid-cols-2 gap-4 items-end">
          <UFormGroup label="Validade">
            <UInput
              v-model="editForm.expires_at"
              type="date"
            />
          </UFormGroup>

          <UFormGroup>
            <UCheckbox
              v-model="editForm.is_surprise_basket"
              label="Cabaz Surpresa"
            />
          </UFormGroup>
        </div>
      </div>
    </div>

    <div class="flex gap-3 justify-end pt-4 mt-2 border-t border-[#E6D5C3]">
      <UButton
        color="gray"
        variant="ghost"
        @click="cancelEdit"
      >
        Cancelar
      </UButton>
      <UButton
        color="primary"
        icon="i-heroicons-check"
        :loading="isSaving"
        @click="saveEdit"
      >
        Guardar Alterações
      </UButton>
    </div>
  </div>
</template>
