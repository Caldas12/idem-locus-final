<script setup lang="ts">
import { computed, ref } from 'vue'
import { productSchema, validateForm } from '~/utils/validation'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const fieldErrors = ref<Record<string, string>>({})

const selectedFile = ref<File | null>(null)
const imagePreview = ref<string>('')

const form = ref({
  title: '',
  description: '',
  condition: 'Fresco' as const,
  type: 'Troca Direta' as const,
  categoryId: null as number | null,
  expiresAt: '',
  status: 'Disponível' as const,
  isSurpriseBasket: false
})

// 1. Opções fixas com a estrutura EXATA que o USelectMenu exige
const conditionOptions = [
  { label: 'Maduro', value: 'Maduro' },
  { label: 'Fresco', value: 'Fresco' },
  { label: 'Defeito Visual', value: 'Defeito Visual' },
  { label: 'Próximo da validade', value: 'Próximo da validade' },
  { label: 'Embalado', value: 'Embalado' }
]

const typeOptions = [
  { label: 'Donativo', value: 'Donativo' },
  { label: 'Troca Direta', value: 'Troca Direta' },
  { label: 'Preço Simbólico', value: 'Preço Simbólico' }
]

const statusOptions = [
  { label: 'Disponível', value: 'Disponível' },
  { label: 'Indisponível', value: 'Indisponível' },
  { label: 'Esgotado', value: 'Esgotado' }
]

// 2. Fetch apenas das Categorias (com tratamento de erro silencioso do Supabase)
const { data: dbCategories } = await useAsyncData('publish-categories', async () => {
  const { data, error } = await supabase.from('categories').select('id, name').order('name')
  if (error) console.error('Erro no Supabase:', error)
  return data || []
})

const categoryOptions = computed(() => {
  if (!dbCategories.value || dbCategories.value.length === 0) {
    return [] // Retorna vazio em vez das opções marcadas como (Teste)
  }
  return dbCategories.value.map(c => ({ label: c.name, value: c.id }))
})

const canPublish = computed(() => {
  return Boolean(form.value.title.trim()) && Boolean(form.value.categoryId)
})

function handleFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    selectedFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

async function publishProduct() {
  fieldErrors.value = {}
  errorMessage.value = ''
  successMessage.value = ''

  const validation = validateForm(productSchema, {
    title: form.value.title,
    description: form.value.description,
    categoryId: form.value.categoryId || 0,
    condition: form.value.condition,
    type: form.value.type,
    status: form.value.status,
    expiresAt: form.value.expiresAt,
    isSurpriseBasket: form.value.isSurpriseBasket
  })

  if (!validation.success) {
    fieldErrors.value = validation.errors || {}
    errorMessage.value = 'Por favor, preenche todos os campos obrigatórios.'
    return
  }

  isLoading.value = true

  try {
    const { data: authData } = await supabase.auth.getUser()
    const currentUser = authData.user

    if (!currentUser) throw new Error('Sessão inválida. Faz login novamente.')

    let finalImageUrl = ''

    if (selectedFile.value) {
      const uniqueName = `${Date.now()}-${selectedFile.value.name.replace(/[^a-zA-Z0-9.]/g, '')}`
      const { data: uploadData, error: uploadError } = await supabase.storage.from('produtos').upload(uniqueName, selectedFile.value)
      if (uploadError) throw new Error('Erro ao carregar a imagem: ' + uploadError.message)
      const { data: publicUrlData } = supabase.storage.from('produtos').getPublicUrl(uploadData.path)
      finalImageUrl = publicUrlData.publicUrl
    }

    const payload = {
      title: form.value.title,
      description: form.value.description,
      condition: form.value.condition,
      type: form.value.type,
      image: finalImageUrl || '🧺',
      profile_id: currentUser.id,
      category_id: form.value.categoryId,
      expires_at: form.value.expiresAt || null,
      status: form.value.status,
      is_surprise_basket: form.value.isSurpriseBasket
    }

    const { error: productError } = await supabase.from('products').insert(payload)
    if (productError) throw new Error(productError.message)

    successMessage.value = '✅ Produto publicado com sucesso!'

    // Reset form e redirecionar
    setTimeout(() => { navigateTo('/dashboard') }, 1500)

  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Erro ao publicar.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UContainer class="py-10 max-w-4xl space-y-8">
    <div>
      <h1 class="text-3xl font-bold text-[var(--primary)]">
        Publicar Excedente
      </h1>
      <p class="text-[var(--text-soft)] mt-2 text-lg">
        Preenche os detalhes com carinho para que a comunidade saiba o que partilhas.
      </p>
    </div>

    <UAlert v-if="errorMessage" color="red" variant="soft" :title="errorMessage" icon="i-heroicons-exclamation-triangle" />
    <UAlert v-if="successMessage" color="green" variant="soft" :title="successMessage" icon="i-heroicons-check-circle" />

    <UCard :ui="{ body: 'p-6 sm:p-8' }">
      <div class="space-y-10">

        <div class="space-y-5">
          <h2 class="text-xl font-semibold text-[var(--primary)] border-b border-[var(--border)] pb-2">
            1. O que tens para oferecer?
          </h2>
          <div class="grid grid-cols-1 gap-5">
            <UFormGroup label="Título do Produto" required :error="fieldErrors.title">
              <UInput v-model="form.title" placeholder="Ex: Cesto de Laranjas Doces" size="lg" />
            </UFormGroup>
            <UFormGroup label="Descrição detalhada" :error="fieldErrors.description">
              <UTextarea v-model="form.description" autoresize :rows="4" placeholder="Conta a história do produto..." />
            </UFormGroup>
          </div>
        </div>

        <div class="space-y-5">
          <h2 class="text-xl font-semibold text-[var(--primary)] border-b border-[var(--border)] pb-2">
            2. Fotografia (Opcional)
          </h2>
          <div class="border-2 border-dashed border-[var(--border)] rounded-xl p-6 bg-[var(--bg)] flex flex-col md:flex-row gap-6 items-center">
            <div class="flex-1 w-full">
              <label class="block mb-2 text-sm font-medium text-[var(--text)]">Carregar Imagem</label>
              <input type="file" accept="image/*" class="block w-full text-sm text-[var(--text-soft)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer" @change="handleFile">
            </div>
            <div v-if="imagePreview" class="relative">
              <img :src="imagePreview" alt="Prévia" class="w-32 h-32 object-cover rounded-lg shadow-sm border border-[var(--border)]">
              <UButton color="red" variant="solid" icon="i-heroicons-trash" size="2xs" class="absolute -top-2 -right-2 rounded-full" @click="imagePreview = ''; selectedFile = null" />
            </div>
          </div>
        </div>

        <div class="space-y-5">
          <h2 class="text-xl font-semibold text-[var(--primary)] border-b border-[var(--border)] pb-2">
            3. Detalhes e Logística
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

            <UFormGroup label="Categoria" required :error="fieldErrors.categoryId">
              <USelectMenu v-model="form.categoryId" :options="categoryOptions" option-attribute="label" value-attribute="value" placeholder="Seleciona uma categoria..." />
            </UFormGroup>

            <UFormGroup label="Validade / Consumir até">
              <UInput v-model="form.expiresAt" type="date" icon="i-heroicons-calendar" />
            </UFormGroup>

            <UFormGroup label="Estado Físico">
              <USelectMenu v-model="form.condition" :options="conditionOptions" option-attribute="label" value-attribute="value" />
            </UFormGroup>

            <UFormGroup label="Modelo de partilha">
              <USelectMenu v-model="form.type" :options="typeOptions" option-attribute="label" value-attribute="value" />
            </UFormGroup>

            <UFormGroup label="Visibilidade do Anúncio">
              <USelectMenu v-model="form.status" :options="statusOptions" option-attribute="label" value-attribute="value" />
            </UFormGroup>

            <UFormGroup class="flex items-end pb-1">
              <UCheckbox v-model="form.isSurpriseBasket" label="Isto é um Cabaz Surpresa 📦" />
            </UFormGroup>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-6 border-t border-[var(--border)]">
          <UButton to="/" color="gray" variant="ghost" size="lg">Cancelar</UButton>
          <UButton :loading="isLoading" :disabled="!canPublish" color="primary" icon="i-heroicons-paper-airplane" size="lg" @click="publishProduct">
            Publicar Excedente
          </UButton>
        </div>

      </div>
    </UCard>
  </UContainer>
</template>
