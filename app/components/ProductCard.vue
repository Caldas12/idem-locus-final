<template>
  <UCard
    :ui="{
      base: 'border-none shadow-sm hover:shadow-md transition-shadow duration-200',
      background: 'bg-white', // Força fundo branco SEMPRE
      divide: 'divide-none',
      ring: 'ring-1 ring-stone-100',
      body: { padding: 'p-0 sm:p-0' },
      footer: { padding: 'p-4 sm:p-4' }
    }"
    class="overflow-hidden h-full flex flex-col group"
  >
    <!-- Área da Imagem com fundo creme suave -->
    <div class="h-48 bg-[#FAF9F6] flex items-center justify-center relative overflow-hidden border-b border-stone-50">
      <img v-if="isUrl" :src="image" class="w-full h-full object-cover transition-transform group-hover:scale-105" />
      <span v-else class="text-6xl drop-shadow-sm">{{ image || '🍎' }}</span>

      <div class="absolute top-3 left-3">
        <UBadge color="white" variant="solid" size="xs" class="text-stone-500 font-bold tracking-tight shadow-sm">
          {{ category }}
        </UBadge>
      </div>
    </div>

    <!-- Conteúdo com contraste real -->
    <div class="p-5 flex-1 space-y-3">
      <div class="flex justify-between items-start gap-2">
        <h3 class="font-bold text-lg text-stone-900 leading-tight">{{ title }}</h3>
        <UBadge color="amber" variant="subtle" size="sm" class="rounded-md">{{ condition }}</UBadge>
      </div>

      <p class="text-stone-500 text-sm line-clamp-2 leading-relaxed">
        {{ description }}
      </p>

      <div class="flex items-center gap-3 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
        <span class="flex items-center gap-1"><UIcon name="i-heroicons-map-pin" /> {{ location }}</span>
        <span class="flex items-center gap-1"><UIcon name="i-heroicons-calendar" /> {{ expiry }}</span>
      </div>
    </div>

    <template #footer>
      <UButton block color="amber" variant="solid" :to="interestTo" class="font-bold py-2.5 rounded-xl">
        Tenho Interesse
      </UButton>
    </template>
  </UCard>
</template>

<script setup lang="ts">
const props = defineProps<{
  image: string; title: string; description: string;
  category: string; condition: string; location: string;
  expiry: string; detailsTo: string; interestTo?: string;
}>()
const isUrl = computed(() => /^https?:\/\//i.test(props.image))
</script>
