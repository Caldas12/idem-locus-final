<script setup lang="ts">
import { ref } from 'vue'
import { loginSchema, registerSchema, validateForm } from '~/utils/validation'

const supabase = useSupabaseClient()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')
const isRegistering = ref(false)
const fieldErrors = ref<Record<string, string>>({})

async function verifyUserBlockStatus(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_suspended, is_banned')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.is_banned) {
    await supabase.auth.signOut()
    throw new Error('Esta conta foi banida.')
  }

  if (profile?.is_suspended) {
    await supabase.auth.signOut()
    throw new Error('Esta conta está suspensa.')
  }
}

async function login() {
  fieldErrors.value = {}
  errorMessage.value = ''
  infoMessage.value = ''

  // Validate form
  const validation = validateForm(loginSchema, {
    email: email.value,
    password: password.value
  })

  if (!validation.success) {
    fieldErrors.value = validation.errors || {}
    return
  }

  isLoading.value = true

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (error) throw new Error('Email ou palavra-passe incorretos.')

    if (data.user) {
      await verifyUserBlockStatus(data.user.id)
    }

    navigateTo('/')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível iniciar sessão.'
  } finally {
    isLoading.value = false
  }
}

async function register() {
  fieldErrors.value = {}
  errorMessage.value = ''
  infoMessage.value = ''

  // Validate form
  const validation = validateForm(registerSchema, {
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value
  })

  if (!validation.success) {
    fieldErrors.value = validation.errors || {}
    return
  }

  isLoading.value = true

  try {
    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value
    })

    if (error) throw new Error(error.message)

    // The database now handles profile creation automatically.
    infoMessage.value = 'Conta criada com sucesso! Podes entrar.'
    email.value = ''
    password.value = ''
    confirmPassword.value = ''
    isRegistering.value = false
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível criar a conta.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UContainer class="py-20 flex justify-center">
    <UCard class="w-full max-w-md">
      <template #header>
        <h2 class="text-2xl font-bold text-center">
          {{ isRegistering ? 'Criar Conta' : 'Bem-vindo à Praça' }}
        </h2>
      </template>

      <div class="space-y-4">
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          :title="errorMessage"
          icon="i-heroicons-exclamation-triangle"
        />
        <UAlert
          v-if="infoMessage"
          color="success"
          variant="soft"
          :title="infoMessage"
          icon="i-heroicons-check-circle"
        />

        <UFormGroup
          label="E-mail"
          :error="fieldErrors.email"
        >
          <UInput
            v-model="email"
            type="email"
            placeholder="oteu@email.com"
            icon="i-heroicons-envelope"
            :color="fieldErrors.email ? 'error' : undefined"
          />
        </UFormGroup>

        <UFormGroup
          label="Palavra-passe"
          :error="fieldErrors.password"
        >
          <UInput
            v-model="password"
            type="password"
            placeholder="••••••••"
            icon="i-heroicons-lock-closed"
            :color="fieldErrors.password ? 'error' : undefined"
          />
        </UFormGroup>

        <UFormGroup
          v-if="isRegistering"
          label="Confirmar Palavra-passe"
          :error="fieldErrors.confirmPassword"
        >
          <UInput
            v-model="confirmPassword"
            type="password"
            placeholder="••••••••"
            icon="i-heroicons-lock-closed"
            :color="fieldErrors.confirmPassword ? 'error' : undefined"
          />
        </UFormGroup>

        <div class="flex flex-col gap-2 mt-6">
          <UButton
            :loading="isLoading"
            block
            color="primary"
            size="lg"
            @click="isRegistering ? register() : login()"
          >
            {{ isRegistering ? 'Criar Conta' : 'Entrar' }}
          </UButton>
          <UButton
            :loading="isLoading"
            block
            color="secondary"
            variant="ghost"
            @click="isRegistering = !isRegistering"
          >
            {{ isRegistering ? 'Voltar ao Login' : 'Criar nova conta' }}
          </UButton>
        </div>
      </div>
    </UCard>
  </UContainer>
</template>
