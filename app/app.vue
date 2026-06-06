<script setup lang="ts">
/**
 * Configurações de SEO e Meta Dados Globais
 * O título individual de cada página será inserido no %s
 */
useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk
      ? `${titleChunk} - Idem Locus`
      : 'Idem Locus - Partilha Local'
  },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    {
      name: 'description',
      content:
        'Plataforma de partilha de excedentes alimentares e trocas locais.'
    }
  ],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'pt'
  }
})

// Definição de SEO Meta (Social Media / Open Graph)
useSeoMeta({
  ogTitle: 'Idem Locus',
  ogDescription: 'Reduz o desperdício alimentar na tua comunidade.',
  ogImage:
    'https://images.unsplash.com/photo-1498575207490-1698c5d8f2b6?q=80&w=1200&auto=format&fit=crop',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <div class="min-h-screen bg-stone-50 font-sans antialiased text-stone-900">
    <!-- Indicador de progresso no topo durante navegação entre páginas -->
    <NuxtLoadingIndicator color="var(--color-primary-500)" />

    <!-- O NuxtLayout injeta o conteúdo de app/layouts/default.vue -->
    <NuxtLayout>
      <!-- O NuxtPage injeta o conteúdo da página atual (ex: app/pages/index.vue) -->
      <NuxtPage />
    </NuxtLayout>

    <!-- Componente global para notificações Toast (essencial no Nuxt UI) -->
    <UNotifications />

    <!-- Componente global para Modais (caso precises no futuro) -->
    <UModalProvider />

    <AppFooter />
  </div>
</template>

<style>
/* Estilos globais simples para transições de página suaves */
.page-enter-active,
.page-leave-active {
  transition: all 0.2s;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  filter: blur(0.5rem);
}
</style>
