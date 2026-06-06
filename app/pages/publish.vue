<script setup lang="ts">
import { computed, ref } from 'vue'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const selectedFile = ref<File | null>(null)
const imagePreview = ref('')

type Category = {
  id: number
  name: string
}

const form = ref({
  title: '',
  description: '',
  condition: 'Fresco',
  type: 'Make your offer', // Pode ser 'Donativo', 'Make your offer' ou 'Preço Fixo'
  price: 0, // NOVO CAMPO DE PREÇO
  categoryId: '' as number | string,
  expiresAt: '',
  status: 'Disponível'
})

const { data: dbCategories } = await useAsyncData<Category[]>(
  'publish-categories',
  async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id,name')
      .order('name')

    if (error) {
      console.error(error)
      return []
    }
    return (data ?? []) as Category[]
  }
)

const canPublish = computed(() => {
  return !!form.value.title.trim() && !!form.value.categoryId
})

function handleFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  selectedFile.value = file
  const reader = new FileReader()

  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string
  }

  reader.readAsDataURL(file)
}

async function publishProduct() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!form.value.title.trim() || !form.value.categoryId) {
    errorMessage.value = 'Título e Categoria são obrigatórios.'
    return
  }

  isLoading.value = true

  try {
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) {
      throw new Error('Sessão inválida.')
    }

    let finalImageUrl = ''

    if (selectedFile.value) {
      const fileName = `${Date.now()}-${selectedFile.value.name.replace(/[^a-zA-Z0-9.]/g, '')}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(fileName, selectedFile.value)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('produtos')
        .getPublicUrl(uploadData.path)

      finalImageUrl = publicUrlData.publicUrl
    }

    const payload = {
      title: form.value.title,
      description: form.value.description,
      profile_id: authData.user.id,
      category_id: form.value.categoryId,
      condition: form.value.condition,
      type: form.value.type,
      // Grava o preço apenas se for um preço fixo, senão grava 0
      price: form.value.type === 'Preço Fixo' ? form.value.price : 0,
      status: form.value.status,
      expires_at: form.value.expiresAt || null,
      image: finalImageUrl || null
    }

    const { error } = await supabase.from('products').insert(payload)

    if (error) throw error

    successMessage.value = 'Produto publicado com sucesso.'

    setTimeout(() => {
      navigateTo('/dashboard')
    }, 1000)
  } catch (err) {
    console.error(err)
    errorMessage.value
      = err instanceof Error ? err.message : 'Erro ao publicar.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="idem-page min-h-screen">
    <section class="bg-[var(--primary)] py-12 text-[#F5EDD8]">
      <div class="mx-auto max-w-3xl px-6">
        <p class="idem-eyebrow mb-2">
          Partilhar
        </p>
        <h1 class="mb-3 text-5xl font-bold leading-tight">
          Publicar troca
        </h1>
        <p class="text-[var(--primary-soft)]">
          Conta à comunidade o que tens disponível e como gostarias de trocar.
        </p>
      </div>
    </section>

    <section class="mx-auto max-w-3xl px-6 py-12">
      <UAlert
        v-if="errorMessage"
        color="red"
        variant="soft"
        :title="errorMessage"
        icon="i-heroicons-exclamation-triangle"
        class="mb-6"
      />
      <UAlert
        v-if="successMessage"
        color="green"
        variant="soft"
        :title="successMessage"
        icon="i-heroicons-check-circle"
        class="mb-6"
      />

      <form
        class="space-y-8"
        @submit.prevent="publishProduct"
      >
        <div>
          <label
            class="mb-3 block text-sm font-semibold text-[var(--foreground)]"
          >Foto do produto</label>
          <label
            class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] py-12 text-center transition-colors hover:border-[var(--primary)]"
          >
            <input
              type="file"
              accept="image/*"
              class="sr-only"
              @change="handleFile"
            >
            <template v-if="imagePreview">
              <img
                :src="imagePreview"
                alt="Pré-visualização"
                class="mb-4 h-40 w-40 rounded-xl border border-[var(--border)] object-cover shadow-sm"
              >
              <button
                type="button"
                class="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]"
                @click.prevent="
                  imagePreview = '';
                  selectedFile = null;
                "
              >
                Remover foto
              </button>
            </template>
            <template v-else>
              <UIcon
                name="i-lucide-upload"
                class="mb-3 h-8 w-8 text-[#5C6B5E] opacity-50"
              />
              <p class="text-sm text-[#5C6B5E]">
                Clica para enviar ou arrasta a foto aqui
              </p>
              <p class="mt-1 text-xs text-[#5C6B5E] opacity-70">
                PNG ou JPG até 10MB
              </p>
            </template>
          </label>
        </div>

        <div class="grid gap-6 sm:grid-cols-2">
          <div class="space-y-1.5">
            <label class="block text-sm font-semibold text-[var(--foreground)]">Título do produto <span class="text-red-500">*</span></label>
            <UInput
              v-model="form.title"
              placeholder="Ex: Cesto de laranjas doces"
              size="lg"
              class="w-full bg-white"
            />
          </div>

          <div class="space-y-1.5 relative">
            <label class="block text-sm font-semibold text-[var(--foreground)]">Categoria <span class="text-red-500">*</span></label>
            <select
              v-model="form.categoryId"
              class="w-full h-[44px] bg-white border border-stone-200 rounded-lg px-4 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none shadow-sm cursor-pointer"
            >
              <option
                value=""
                disabled
                selected
              >
                Seleciona uma categoria...
              </option>
              <option
                v-for="cat in dbCategories"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.name }}
              </option>
            </select>
            <UIcon
              name="i-lucide-chevron-down"
              class="absolute right-3 bottom-3.5 h-4 w-4 text-stone-400 pointer-events-none"
            />
          </div>
        </div>

        <div class="grid gap-6 sm:grid-cols-2">
          <div class="space-y-1.5">
            <label class="block text-sm font-semibold text-[var(--foreground)]">Validade / Consumir até</label>
            <UInput
              v-model="form.expiresAt"
              type="date"
              icon="i-lucide-calendar"
              size="lg"
              class="w-full bg-white"
            />
          </div>

          <div class="space-y-1.5 relative">
            <label class="block text-sm font-semibold text-[var(--foreground)]">Estado físico</label>
            <select
              v-model="form.condition"
              class="w-full h-[44px] bg-white border border-stone-200 rounded-lg px-4 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none shadow-sm cursor-pointer"
            >
              <option value="Fresco">
                Fresco
              </option>
              <option value="Maduro">
                Maduro
              </option>
              <option value="Defeito Visual">
                Defeito Visual
              </option>
              <option value="Próximo da validade">
                Próximo da validade
              </option>
              <option value="Embalado">
                Embalado
              </option>
            </select>
            <UIcon
              name="i-lucide-chevron-down"
              class="absolute right-3 bottom-3.5 h-4 w-4 text-stone-400 pointer-events-none"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-[var(--foreground)]">Descrição detalhada</label>
          <UTextarea
            v-model="form.description"
            autoresize
            :rows="4"
            placeholder="Conta mais sobre o produto: origem, conservação, quantidade ou detalhes importantes..."
            size="lg"
            class="w-full bg-white"
          />
        </div>

        <div
          class="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-sm"
        >
          <div
            class="mb-5 flex items-center gap-2 border-b border-[var(--border)] pb-3"
          >
            <UIcon
              name="i-lucide-repeat-2"
              class="h-5 w-5 text-[var(--accent)]"
            />
            <p class="text-base font-semibold text-[var(--foreground)]">
              Como queres partilhar?
            </p>
          </div>

          <div class="grid gap-6 sm:grid-cols-2">
            <div class="space-y-1.5 relative">
              <label
                class="block text-sm font-semibold text-[var(--foreground)]"
              >Preço</label>
              <select
                v-model="form.type"
                class="w-full h-[44px] bg-white border border-stone-200 rounded-lg px-4 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none shadow-sm cursor-pointer"
              >
                <option value="Donativo">
                  Donativo (Grátis)
                </option>
                <option value="Make your offer">
                  Make your offer (Aberto a propostas)
                </option>
                <option value="Preço Fixo">
                  Preço Fixo
                </option>
              </select>
              <UIcon
                name="i-lucide-chevron-down"
                class="absolute right-3 bottom-3.5 h-4 w-4 text-stone-400 pointer-events-none"
              />
            </div>

            <div class="space-y-1.5 relative">
              <label
                class="block text-sm font-semibold text-[var(--foreground)]"
              >Visibilidade do anúncio</label>
              <select
                v-model="form.status"
                class="w-full h-[44px] bg-white border border-stone-200 rounded-lg px-4 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none shadow-sm cursor-pointer"
              >
                <option value="Disponível">
                  Disponível
                </option>
                <option value="Indisponível">
                  Indisponível (Pausado)
                </option>
                <option value="Esgotado">
                  Esgotado
                </option>
              </select>
              <UIcon
                name="i-lucide-chevron-down"
                class="absolute right-3 bottom-3.5 h-4 w-4 text-stone-400 pointer-events-none"
              />
            </div>
          </div>

          <div
            v-if="form.type === 'Preço Fixo'"
            class="mt-6 pt-4 border-t border-[var(--border)]"
          >
            <label
              class="block text-sm font-semibold text-[var(--foreground)] mb-2"
            >Valor da venda (€)</label>
            <UInput
              v-model="form.price"
              type="number"
              min="0"
              step="0.5"
              icon="i-heroicons-currency-euro"
              size="lg"
              class="w-full sm:max-w-xs bg-white"
              placeholder="0.00"
            />
          </div>
        </div>

        <div class="flex flex-col gap-4 pt-4 sm:flex-row">
          <button
            type="submit"
            class="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--primary)] py-4 text-[#F5EDD8] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canPublish || isLoading"
          >
            <UIcon
              v-if="isLoading"
              name="i-lucide-loader-circle"
              class="h-5 w-5 animate-spin"
            />
            <UIcon
              v-else
              name="i-lucide-arrow-right"
              class="h-5 w-5"
            />
            Publicar troca
          </button>

          <NuxtLink
            to="/dashboard"
            class="flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-8 py-4 font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--primary)] hover:bg-stone-50"
          >
            Cancelar
          </NuxtLink>
        </div>
      </form>
    </section>
  </div>
</template>
