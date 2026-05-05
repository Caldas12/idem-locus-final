<script setup>
import { computed, watch } from 'vue'

const user = useSupabaseUser()
const supabase = useSupabaseClient()

async function logout() {
  await supabase.auth.signOut()
  navigateTo('/')
}
// y
const {
  data: currentProfile,
  refresh: refreshCurrentProfile
} = await useAsyncData('layout-current-profile', async () => {
  if (!user.value) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, role, account_type')
    .eq('id', user.value.id)
    .maybeSingle()

  return data || null
})

watch(() => user.value?.id, refreshCurrentProfile, { immediate: true })

const {
  data: unreadNotificationsCount,
  refresh: refreshNotifications
} = await useAsyncData('layout-unread-notifications', async () => {
  if (!user.value) return 0

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.value.id)
    .eq('is_read', false)

  return count || 0
})

watch(() => user.value?.id, refreshNotifications, { immediate: true })

const isAdmin = computed(() => currentProfile.value?.role === 'admin')

// 🎨 A MAGIA ACONTECE AQUI: Organizamos os botões num menu elegante!
const menuItems = computed(() => {
  if (!user.value) return []

  const items = [
    // Bloco 1: Conta (Não clicável, só para mostrar o email)
    [{
      label: user.value.email,
      slot: 'account',
      disabled: true
    }],
    // Bloco 2: Gestão Principal
    [{
      label: 'Dashboard',
      icon: 'i-heroicons-squares-2x2',
      to: '/dashboard',
      onSelect: () => navigateTo('/dashboard')
    }, {
      label: 'Caixa de Entrada',
      icon: 'i-heroicons-inbox',
      to: '/inbox',
      onSelect: () => navigateTo('/inbox')
    }],
    // Bloco 3: Configurações e Alertas
    [{
      label: 'Meus Alertas',
      icon: 'i-heroicons-bell-alert',
      to: '/alerts',
      onSelect: () => navigateTo('/alerts')
    }, {
      label: 'Pontos de Recolha',
      icon: 'i-heroicons-map-pin',
      to: '/pickup-points',
      onSelect: () => navigateTo('/pickup-points')
    }, {
      label: 'O Meu Perfil',
      icon: 'i-heroicons-user-circle',
      to: '/profile',
      onSelect: () => navigateTo('/profile')
    }]
  ]

  // Se for admin, adiciona o bloco de administração
  if (isAdmin.value) {
    items.push([{
      label: 'Administração',
      icon: 'i-heroicons-shield-check',
      to: '/admin',
      onSelect: () => navigateTo('/admin')
    }])
  }

  // Bloco Final: Sair
  items.push([{
    label: 'Terminar Sessão',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    onSelect: logout
  }])

  return items
})
</script>

<template>
  <div class="min-h-screen bg-stone-50">
    <!-- Header centralizado -->
    <header class="bg-[#1A3A2A] border-b border-transparent">
  <UContainer class="h-20 flex items-center justify-between">
    <!-- Logotipo -->
    <NuxtLink to="/" class="text-2xl font-serif font-bold text-white tracking-wide">
      Idem Locus
    </NuxtLink>
    
    <!-- Navegação Central -->
    <nav class="hidden md:flex gap-8 text-white/90 text-sm font-medium">
      <NuxtLink to="#como-funciona" class="hover:text-amber-400 transition">Como Funciona</NuxtLink>
      <NuxtLink to="/produtos" class="hover:text-amber-400 transition">Produtos</NuxtLink>
      <NuxtLink to="/pontos-recolha" class="hover:text-amber-400 transition">Pontos de Recolha</NuxtLink>
    </nav>
    
    <!-- Ações -->
    <div class="flex gap-4">
      <UButton 
        to="/register" 
        class="font-semibold px-6 py-2 rounded-lg bg-[#C5893C] hover:bg-[#A87431] text-white transition-colors"
      >
        Registar
      </UButton>
    </div>
  </UContainer>
</header>

    <!-- Conteúdo centralizado -->
    <main class="py-10">
      <UContainer>
        <slot />
      </UContainer>
    </main>
  </div>
</template>
