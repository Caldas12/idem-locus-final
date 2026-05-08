<template>
  <div class="min-h-screen bg-stone-50">
    <header class="bg-[#1A3A2A] border-b border-transparent">
      <UContainer class="h-20 flex items-center justify-between">
        <NuxtLink to="/" class="text-2xl font-serif font-bold text-white tracking-wide">
          Idem Locus
        </NuxtLink>

        <nav class="hidden md:flex gap-8 text-white/90 text-sm font-medium">
          <NuxtLink to="#como-funciona" class="hover:text-amber-400 transition">Como Funciona</NuxtLink>
          <NuxtLink to="/produtos" class="hover:text-amber-400 transition">Produtos</NuxtLink>
          <NuxtLink to="/pickup-points" class="hover:text-amber-400 transition">Pontos de Recolha</NuxtLink>
        </nav>

        <div class="flex items-center gap-4">
          <template v-if="user">
            <UButton to="/publish" color="amber" variant="solid" icon="i-heroicons-plus" class="hidden sm:flex">Publicar</UButton>

            <UDropdown :items="menuItems" :ui="{ item: { disabled: 'cursor-default opacity-100' } }">
              <UAvatar
                :alt="currentProfile?.name || user.email"
                size="md"
                class="cursor-pointer border-2 border-[#C5893C] bg-[#C5893C] text-white font-bold"
              />

              <template #account="{ item }">
                <div class="text-left">
                  <p class="text-xs text-stone-500">Sessão iniciada como</p>
                  <p class="truncate font-medium text-stone-900">{{ item.label }}</p>
                </div>
              </template>
            </UDropdown>
          </template>

          <template v-else>
            <UButton to="/login" variant="ghost" class="text-white hover:text-amber-400">Entrar</UButton>
            <UButton
              to="/register"
              class="font-semibold px-6 py-2 rounded-lg bg-[#C5893C] hover:bg-[#A87431] text-white transition-colors"
            >
              Registar
            </UButton>
          </template>
        </div>
      </UContainer>
    </header>

    <main class="py-10">
      <UContainer>
        <slot />
      </UContainer>
    </main>
  </div>
</template>
