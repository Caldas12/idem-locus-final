<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  image: string
  title: string
  description: string
  category: string
  condition: string
  location: string
  expiry: string
  detailsTo: string
  interestTo?: string
}>()

const isUrl = computed(() => /^https?:\/\//i.test(props.image))
</script>

<template>
  <NuxtLink
    :to="detailsTo"
    class="group block h-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
  >
    <div class="relative h-52 overflow-hidden bg-[var(--muted)]">
      <img
        v-if="isUrl"
        :src="image"
        :alt="title"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      >
      <div
        v-else
        class="flex h-full w-full items-center justify-center text-6xl"
      >
        {{ image || "🥬" }}
      </div>
      <span class="absolute left-3 top-3 rounded-full bg-[var(--primary)] px-3 py-1 text-xs text-[#F5EDD8]">
        {{ condition }}
      </span>
    </div>

    <div class="p-5">
      <div class="mb-2 flex items-start justify-between gap-3">
        <h3 class="font-serif text-xl font-semibold leading-tight text-[var(--foreground)]">
          {{ title }}
        </h3>
        <span class="shrink-0 rounded-full bg-[var(--muted)] px-2 py-1 text-xs text-[#5C6B5E]">
          {{ category }}
        </span>
      </div>

      <p class="mb-4 line-clamp-2 text-sm leading-relaxed text-[#5C6B5E]">
        {{ description }}
      </p>

      <div class="mb-4 flex items-center gap-1.5 text-sm text-[#5C6B5E]">
        <UIcon
          name="i-lucide-map-pin"
          class="h-3.5 w-3.5"
        />
        <span class="truncate">{{ location }}</span>
      </div>

      <div class="flex items-center justify-between border-t border-[var(--border)] pt-4 text-sm">
        <div class="flex items-center gap-2 text-[var(--foreground)]">
          <UIcon
            name="i-lucide-repeat-2"
            class="h-4 w-4 text-[var(--accent)]"
          />
          <span>Troca local</span>
        </div>
        <span class="text-xs text-[#5C6B5E]">{{ expiry }}</span>
      </div>
    </div>
  </NuxtLink>
</template>
