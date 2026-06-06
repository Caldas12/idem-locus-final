<script setup lang="ts">
import { ref } from 'vue'

const supabase = useSupabaseClient()
const email = ref('')
const password = ref('')
const name = ref('')
const username = ref('') // <- NOVO CAMPO
const loading = ref(false)
const toast = useToast()

async function handleRegister() {
  try {
    loading.value = true

    // Validação do Username antes de enviar para a base de dados
    const usernameRegex = /^[a-z0-9_]{3,15}$/
    if (!usernameRegex.test(username.value)) {
      throw new Error(
        'O username deve ter entre 3 e 15 caracteres (minúsculas, números ou _ sem espaços).'
      )
    }

    const { error: authError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        // Guardamos o Nome e o Username nos metadados da autenticação
        data: {
          full_name: name.value,
          username: username.value
        }
      }
    })

    if (authError) throw authError

    toast.add({
      title: 'Conta criada!',
      description: 'Podes agora iniciar sessão com a tua nova conta.',
      color: 'success'
    })

    navigateTo('/login')
  } catch (error: unknown) {
    toast.add({
      title: 'Erro no registo',
      description:
        error instanceof Error ? error.message : 'Falha ao registar conta.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UContainer class="max-w-md py-20">
    <UCard class="shadow-lg border border-stone-200">
      <template #header>
        <h1 class="text-2xl font-bold text-center text-stone-900 font-serif">
          Criar Conta
        </h1>
      </template>

      <form
        class="space-y-6"
        @submit.prevent="handleRegister"
      >
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-stone-800">Nome Completo</label>
          <UInput
            v-model="name"
            placeholder="Como gostarias de ser chamado"
            icon="i-heroicons-user"
            size="lg"
            required
            class="w-full"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-stone-800">Username</label>
          <UInput
            v-model="username"
            placeholder="ex: maria_silva"
            icon="i-heroicons-at-symbol"
            size="lg"
            required
            class="w-full"
          />
          <p class="text-xs text-stone-500">
            O teu link público será: /profile/{{ username || "..." }}
          </p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-stone-800">Email</label>
          <UInput
            v-model="email"
            type="email"
            placeholder="exemplo@dominio.com"
            icon="i-heroicons-envelope"
            size="lg"
            required
            class="w-full"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-stone-800">Palavra-passe</label>
          <UInput
            v-model="password"
            type="password"
            icon="i-heroicons-lock-closed"
            size="lg"
            required
            class="w-full"
          />
        </div>

        <div class="pt-4">
          <UButton
            type="submit"
            size="lg"
            :loading="loading"
            class="w-full flex justify-center bg-[#C5893C] hover:bg-[#A87431] text-white font-bold py-3 rounded-lg transition-colors"
          >
            Registar
          </UButton>
        </div>
      </form>

      <template #footer>
        <p class="text-sm text-center text-stone-500">
          Já tem uma conta?
          <NuxtLink
            to="/login"
            class="text-[#C5893C] font-bold hover:underline"
          >Inicie sessão</NuxtLink>
        </p>
      </template>
    </UCard>
  </UContainer>
</template>
