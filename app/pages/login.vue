<script setup lang="ts">
const supabase = useSupabaseClient()
const email = ref('')
const password = ref('')
const loading = ref(false)
const toast = useToast()

async function handleLogin() {
  try {
    loading.value = true
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (error) throw error

    toast.add({ title: 'Bem-vindo de volta!', color: 'success' })
    navigateTo('/dashboard')
  } catch (error: unknown) {
    toast.add({
      title: 'Erro no login',
      description:
        error instanceof Error ? error.message : 'Falha ao iniciar sessão.',
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
          Entrar
        </h1>
      </template>

      <form
        class="space-y-6"
        @submit.prevent="handleLogin"
      >
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-stone-800">Email</label>
          <UInput
            v-model="email"
            type="email"
            placeholder="teu@email.com"
            icon="i-heroicons-envelope"
            size="lg"
            required
            class="w-full"
          />
        </div>

        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <label class="block text-sm font-semibold text-stone-800">Palavra-passe</label>
            <NuxtLink
              to="/forgot-password"
              class="text-xs text-amber-600 hover:underline"
            >Esqueci-me</NuxtLink>
          </div>
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
            Entrar na Conta
          </UButton>
        </div>
      </form>

      <template #footer>
        <p class="text-sm text-center text-stone-500">
          Ainda não tem conta?
          <NuxtLink
            to="/register"
            class="text-[#C5893C] font-bold hover:underline"
          >Registe-se aqui</NuxtLink>
        </p>
      </template>
    </UCard>
  </UContainer>
</template>
