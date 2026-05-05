<script setup>
import { ref } from 'vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

definePageMeta({
  middleware: 'auth'
})

const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const form = ref({
  name: '',
  location: '',
  accountType: 'personal'
})

const accountTypes = [
  { label: 'Perfil Pessoal', value: 'personal' },
  { label: 'Entidade Comercial', value: 'business' },
  { label: 'Ponto de Recolha', value: 'pickup_point' }
]

const { refresh: refreshProfile } = await useAsyncData('user-profile', async () => {
  if (!user.value) {
    return null
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, name, location, account_type')
    .eq('id', user.value.id)
    .maybeSingle()

  if (data) {
    form.value = {
      name: data.name || '',
      location: data.location || '',
      accountType: data.account_type || 'personal'
    }
  } else {
    form.value.name = user.value.email?.split('@')[0] || ''
  }

  return data || null
})

async function saveProfile() {
  if (!user.value) {
    navigateTo('/login')
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: form.value.name || null,
        location: form.value.location || null,
        account_type: form.value.accountType
      })
      .eq('id', user.value.id)
      .select('id')
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!data) {
      throw new Error('Perfil ainda não está disponível para edição. Termina sessão e entra novamente.')
    }

    successMessage.value = 'Perfil atualizado com sucesso.'
    await refreshProfile()
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Não foi possível guardar o perfil.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UContainer class="py-10 max-w-2xl space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">
        Meu Perfil
      </h1>
      <p class="text-gray-500 mt-1">
        Atualiza os teus dados públicos para facilitar contactos e recolhas.
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
      <div class="space-y-4">
        <UFormGroup label="Nome público">
          <UInput
            v-model="form.name"
            placeholder="Como queres aparecer na praça"
          />
        </UFormGroup>

        <UFormGroup label="Localização geral">
          <UInput
            v-model="form.location"
            placeholder="Ex: Braga, São Victor"
          />
        </UFormGroup>

        <UFormGroup label="Tipo de conta">
          <USelect
            v-model="form.accountType"
            :options="accountTypes"
          />
        </UFormGroup>

        <div class="flex justify-end">
          <UButton
            color="green"
            :loading="isLoading"
            @click="saveProfile"
          >
            Guardar Alterações
          </UButton>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
