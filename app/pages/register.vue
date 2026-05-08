<script setup lang="ts">
import { ref } from 'vue'

const supabase = useSupabaseClient()
const email = ref('')
const password = ref('')
const name = ref('')
const loading = ref(false)
const toast = useToast()

async function handleRegister() {
  try {
    loading.value = true

    const { error: authError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: { full_name: name.value }
      }
    })

    if (authError) throw authError

    toast.add({
      title: 'Conta criada!',
      description: 'Verifique o seu email para confirmar o registo.',
      color: 'green'
    })

    navigateTo('/login')
  } catch (error: any) {
    toast.add({ title: 'Erro no registo', description: error.message, color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UContainer class="max-w-md py-20">
    <UCard class="shadow-lg border border-stone-200">
      <template #header>
        <h1 class="text-2xl font-bold text-center text-stone-900 font-serif">Criar Conta</h1>
      </template>

      <form @submit.prevent="handleRegister" class="space-y-6">

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-stone-800">Nome Completo</label>
          <UInput v-model="name" placeholder="Como o queríamos chamar" icon="i-heroicons-user" size="lg" required class="w-full" />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-stone-800">Email</label>
          <UInput v-model="email" type="email" placeholder="exemplo@dominio.com" icon="i-heroicons-envelope" size="lg" required class="w-full" />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-stone-800">Palavra-passe</label>
          <UInput v-model="password" type="password" icon="i-heroicons-lock-closed" size="lg" required class="w-full" />
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
          <NuxtLink to="/login" class="text-[#C5893C] font-bold hover:underline">Inicie sessão</NuxtLink>
        </p>
      </template>
    </UCard>
  </UContainer>
</template>
